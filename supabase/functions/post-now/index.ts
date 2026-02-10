import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseMediaUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((u) => String(u).trim()).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((u: unknown) => String(u).trim()).filter(Boolean);
      } catch { /* fall through to CSV */ }
    }
    return trimmed.split(",").map((u) => u.trim()).filter(Boolean);
  }
  return [];
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800));
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && attempt === 0) {
        console.warn(`⚠️ n8n returned ${res.status}, retrying...`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) console.warn("⚠️ Network error, retrying...", lastError.message);
    }
  }
  throw lastError ?? new Error("Fetch failed after retries");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // ── Input ─────────────────────────────────────────────────────
    const body = await req.json();
    const postId = body?.post_id;

    if (!postId || typeof postId !== "string" || postId.length < 10) {
      return new Response(JSON.stringify({ error: "post_id is required (valid UUID)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Load post (service role) ──────────────────────────────────
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: post, error: fetchErr } = await adminClient
      .from("social_media_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (fetchErr || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build payload ─────────────────────────────────────────────
    const mediaUrls = parseMediaUrls(post.media_urls);

    const payload = {
      event: "post_now",
      source: "lovable_command_center",
      timestamp: new Date().toISOString(),
      idempotency_key: `postnow_${post.id}`,
      post: {
        id: post.id,
        status: post.status,
        caption: post.generated_caption || "",
        media_urls: mediaUrls,
        title: post.content_idea || "",
        post_type: post.post_type || "single",
        platforms: ["instagram", "facebook"],
        account: {
          location_name: "Street Eatz Waterford",
          brand: "Street Eatz",
        },
        meta: {
          created_by: userId,
          app_env: "prod",
          ui_path: "command-center/social/content-queue",
        },
      },
    };

    console.log("🚀 [post-now] Sending payload keys:", Object.keys(payload.post));
    console.log("🚀 [post-now] media_urls count:", mediaUrls.length);

    // ── Send to n8n ───────────────────────────────────────────────
    const webhookUrl = Deno.env.get("N8N_POST_NOW_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("❌ N8N_POST_NOW_WEBHOOK_URL secret not set");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let webhookSuccess = false;
    let webhookStatus = 0;
    let webhookBody = "";

    try {
      const res = await fetchWithRetry(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      webhookStatus = res.status;
      webhookBody = await res.text();
      webhookSuccess = res.ok;

      console.log(`📡 [post-now] n8n responded: ${webhookStatus}`);
    } catch (err) {
      console.error("🚨 [post-now] Network error:", err);
      webhookBody = err instanceof Error ? err.message : String(err);
    }

    // ── Update DB status ──────────────────────────────────────────
    const newStatus = webhookSuccess ? "posting_queued" : "post_failed";

    const { data: updated, error: updateErr } = await adminClient
      .from("social_media_posts")
      .update({ status: newStatus })
      .eq("id", postId)
      .select()
      .single();

    if (updateErr) {
      console.error("❌ [post-now] DB update failed:", updateErr.message);
    }

    if (!webhookSuccess) {
      return new Response(
        JSON.stringify({ error: `Webhook failed: ${webhookStatus}`, status: webhookStatus }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, post: updated ?? post }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("🚨 [post-now] Unhandled:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
