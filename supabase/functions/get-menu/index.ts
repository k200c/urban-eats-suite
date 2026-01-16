import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_CATEGORIES = ['Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    let category: string | undefined;
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      category = body.category;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      category = url.searchParams.get('category') || undefined;
    }

    console.log('[get-menu] Request received:', { category });

    // Validate category if provided
    if (category) {
      // Case-insensitive matching
      const normalizedCategory = VALID_CATEGORIES.find(
        c => c.toLowerCase() === category!.toLowerCase()
      );
      
      if (!normalizedCategory) {
        console.log('[get-menu] Invalid category:', category);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid category',
            valid_categories: VALID_CATEGORIES
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      category = normalizedCategory;
    }

    // Build query
    let query = supabase
      .from('products')
      .select('name, price, description, category')
      .eq('is_available', true)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('[get-menu] Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch menu' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format response
    const items = products.map(p => ({
      name: p.name,
      price: p.price,
      description: p.description || ''
    }));

    console.log('[get-menu] Returning', items.length, 'items for category:', category || 'all');

    return new Response(
      JSON.stringify({
        success: true,
        category: category || 'all',
        count: items.length,
        items
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[get-menu] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
