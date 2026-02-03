import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables (never exposed to client)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "";
const ADMIN_KEY = Deno.env.get("ADMIN_KEY") || "";

// Parse allowed origins into array
const allowedOriginsList = ALLOWED_ORIGINS
  ? ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

// CORS headers helper
function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    !origin ||
    allowedOriginsList.length === 0 ||
    allowedOriginsList.includes(origin) ||
    allowedOriginsList.includes("*");

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin || "*") : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// Error response helper
function errorResponse(
  status: number,
  error: string,
  details?: string,
  corsHeaders?: Record<string, string>
): Response {
  const body: { ok: false; error: string; details?: string } = { ok: false, error };
  if (details) body.details = details;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Simple in-memory rate limiting (best-effort, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Type definitions
type Audience = "customers" | "staff" | "customers_and_staff";
type Channel = "sms" | "email" | "both";

interface QueryParams {
  audience: Audience;
  channel: Channel;
  activeOnly: boolean;
  page: number;
  pageSize: number;
  search: string | null;
  includeTotals: boolean;
}

interface CustomerRecord {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface StaffRecord extends CustomerRecord {
  role: string | null;
}

interface ResponseMeta {
  audience: Audience;
  channel: Channel;
  page: number;
  pageSize: number;
  returned: number;
  total?: number;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Only GET and POST are supported", corsHeaders);
  }

  try {
    // Check origin if ALLOWED_ORIGINS is configured
    if (allowedOriginsList.length > 0 && origin && !allowedOriginsList.includes(origin) && !allowedOriginsList.includes("*")) {
      console.warn(`[get-customers] Blocked origin: ${origin}`);
      return errorResponse(403, "forbidden", "Origin not allowed", corsHeaders);
    }

    // Extract authorization
    const authHeader = req.headers.get("Authorization");
    const adminKeyHeader = req.headers.get("X-Admin-Key");
    
    let userId: string | null = null;
    let isAuthorized = false;

    // Create service role client for database queries
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Method 1: JWT Authorization
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.replace("Bearer ", "");
      
      // Create anon client with user's JWT to verify
      const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userError } = await supabaseAnon.auth.getUser(jwt);
      
      if (userError || !userData?.user) {
        console.warn("[get-customers] Invalid JWT:", userError?.message);
        return errorResponse(401, "unauthorized", "Invalid or expired token", corsHeaders);
      }

      userId = userData.user.id;

      // Rate limit by user ID
      if (!checkRateLimit(`user:${userId}`)) {
        return errorResponse(429, "rate_limited", "Too many requests, please wait", corsHeaders);
      }

      // Check role via user_roles table (preferred) or profiles table (fallback)
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "staff"])
        .limit(1)
        .maybeSingle();

      if (roleData) {
        isAuthorized = true;
      } else {
        // Fallback: check profiles.role
        const { data: profileData } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profileData?.role === "admin" || profileData?.role === "staff") {
          isAuthorized = true;
        }
      }
    }
    // Method 2: Admin Key fallback (for n8n/external workflows)
    else if (adminKeyHeader && ADMIN_KEY && adminKeyHeader === ADMIN_KEY) {
      isAuthorized = true;
      
      // Rate limit by IP for admin key usage
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      if (!checkRateLimit(`ip:${clientIp}`)) {
        return errorResponse(429, "rate_limited", "Too many requests, please wait", corsHeaders);
      }
    }
    // No valid auth provided
    else if (!authHeader && !adminKeyHeader) {
      return errorResponse(401, "unauthorized", "Authorization header required", corsHeaders);
    }

    if (!isAuthorized) {
      return errorResponse(403, "forbidden", "Insufficient permissions (staff/admin required)", corsHeaders);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const params = parseQueryParams(url.searchParams);

    // Build response
    const response: {
      ok: true;
      meta: ResponseMeta;
      customers?: CustomerRecord[];
      staff?: StaffRecord[];
    } = {
      ok: true,
      meta: {
        audience: params.audience,
        channel: params.channel,
        page: params.page,
        pageSize: params.pageSize,
        returned: 0,
      },
    };

    // Fetch customers if requested
    if (params.audience === "customers" || params.audience === "customers_and_staff") {
      const result = await fetchCustomers(supabaseAdmin, params);
      response.customers = result.data;
      response.meta.returned += result.data.length;
      if (params.includeTotals && result.total !== null) {
        response.meta.total = (response.meta.total || 0) + result.total;
      }
    }

    // Fetch staff if requested (check if table exists first)
    if (params.audience === "staff" || params.audience === "customers_and_staff") {
      const result = await fetchStaff(supabaseAdmin, params);
      if (result) {
        response.staff = result.data;
        response.meta.returned += result.data.length;
        if (params.includeTotals && result.total !== null) {
          response.meta.total = (response.meta.total || 0) + result.total;
        }
      } else {
        response.staff = [];
      }
    }

    console.log(`[get-customers] Success: returned ${response.meta.returned} records`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[get-customers] Server error:", error);
    return errorResponse(500, "server_error", undefined, corsHeaders);
  }
});

function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  const audienceRaw = searchParams.get("audience") || "customers";
  const audience: Audience = ["customers", "staff", "customers_and_staff"].includes(audienceRaw)
    ? (audienceRaw as Audience)
    : "customers";

  const channelRaw = searchParams.get("channel") || "both";
  const channel: Channel = ["sms", "email", "both"].includes(channelRaw)
    ? (channelRaw as Channel)
    : "both";

  const activeOnlyRaw = searchParams.get("active_only") || "true";
  const activeOnly = activeOnlyRaw !== "false";

  const pageRaw = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const pageSizeRaw = parseInt(searchParams.get("pageSize") || "250", 10);
  const pageSize = isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 250 : Math.min(pageSizeRaw, 500);

  const search = searchParams.get("search") || null;

  const includeTotalsRaw = searchParams.get("includeTotals") || "false";
  const includeTotals = includeTotalsRaw === "true";

  return { audience, channel, activeOnly, page, pageSize, search, includeTotals };
}

async function fetchCustomers(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  params: QueryParams
): Promise<{ data: CustomerRecord[]; total: number | null }> {
  const offset = (params.page - 1) * params.pageSize;

  // Build query
  let query = supabase
    .from("customers")
    .select("phone_number, email, name", { count: params.includeTotals ? "exact" : undefined });

  // Channel filtering
  if (params.channel === "sms") {
    query = query.not("phone_number", "is", null).neq("phone_number", "");
  } else if (params.channel === "email") {
    query = query.not("email", "is", null).neq("email", "");
  } else {
    // both - require at least one contact method
    query = query.or("phone_number.neq.,email.neq.");
  }

  // Search filtering
  if (params.search) {
    const searchPattern = `%${params.search}%`;
    query = query.or(`name.ilike.${searchPattern},phone_number.ilike.${searchPattern},email.ilike.${searchPattern}`);
  }

  // Pagination
  query = query.range(offset, offset + params.pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[get-customers] Customers query error:", error.message);
    return { data: [], total: null };
  }

  // Map to output format
  const customers: CustomerRecord[] = (data || []).map((row: { phone_number: string; email: string | null; name: string | null }) => ({
    id: row.phone_number, // phone_number is the primary key
    name: row.name,
    phone: row.phone_number || null,
    email: row.email,
  }));

  return { data: customers, total: count };
}

async function fetchStaff(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  params: QueryParams
): Promise<{ data: StaffRecord[]; total: number | null } | null> {
  // Check if staff_contacts table exists by attempting a limited query
  const { error: checkError } = await supabase
    .from("staff_contacts")
    .select("id")
    .limit(1);

  if (checkError) {
    // Table doesn't exist or not accessible - staff feature disabled
    console.log("[get-customers] staff_contacts table not available, skipping staff fetch");
    return null;
  }

  const offset = (params.page - 1) * params.pageSize;

  let query = supabase
    .from("staff_contacts")
    .select("id, name, phone_e164, email, role, is_active", { count: params.includeTotals ? "exact" : undefined });

  // Active filtering
  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  // Channel filtering
  if (params.channel === "sms") {
    query = query.not("phone_e164", "is", null).neq("phone_e164", "");
  } else if (params.channel === "email") {
    query = query.not("email", "is", null).neq("email", "");
  }

  // Search filtering
  if (params.search) {
    const searchPattern = `%${params.search}%`;
    query = query.or(`name.ilike.${searchPattern},phone_e164.ilike.${searchPattern},email.ilike.${searchPattern}`);
  }

  // Pagination
  query = query.range(offset, offset + params.pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[get-customers] Staff query error:", error.message);
    return { data: [], total: null };
  }

  // Map to output format
  const staff: StaffRecord[] = (data || []).map((row: { id: string; name: string | null; phone_e164: string | null; email: string | null; role: string | null }) => ({
    id: row.id,
    name: row.name,
    phone: row.phone_e164,
    email: row.email,
    role: row.role,
  }));

  return { data: staff, total: count };
}
