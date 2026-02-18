import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { query, restaurant_id } = await req.json()

        // 1. Generate Embedding
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: query,
                model: 'text-embedding-3-small'
            })
        })

        const embeddingData = await embeddingResponse.json()
        if (embeddingData.error) throw new Error(embeddingData.error.message)

        const embedding = embeddingData.data[0].embedding

        // 2. Call RPC
        const { data: items, error } = await supabaseClient.rpc('match_menu_items', {
            query_embedding: embedding,
            match_threshold: 0.5, // tunable
            match_count: 5,
            restaurant_id_param: restaurant_id || null
        })

        if (error) throw error

        return new Response(JSON.stringify(items), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
