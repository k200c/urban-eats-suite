import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdatePostPayload {
  post_id: string;
  status?: string;
  generated_caption?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: UpdatePostPayload = await req.json();

    // Validate required field
    if (!payload.post_id) {
      console.error("Missing post_id in payload");
      return new Response(
        JSON.stringify({ error: "Missing required field: post_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with Service Role Key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Build update object with only provided fields
    const updateData: Record<string, string> = {};
    if (payload.status !== undefined) {
      updateData.status = payload.status;
    }
    if (payload.generated_caption !== undefined) {
      updateData.generated_caption = payload.generated_caption;
    }

    if (Object.keys(updateData).length === 0) {
      console.error("No fields to update");
      return new Response(
        JSON.stringify({ error: "No fields to update. Provide status or generated_caption." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating post ${payload.post_id} with:`, updateData);

    // Perform the update
    const { data, error } = await supabase
      .from("social_media_posts")
      .update(updateData)
      .eq("id", payload.post_id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Post updated successfully:", data.id);
    return new Response(
      JSON.stringify({ success: true, post: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-social-post:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
