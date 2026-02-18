import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth Check (Relaxed for Demo)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.log("No Auth Header - Proceeding in Guest/Demo Mode");
        }

        // 2. Fetch Ephemeral Token from OpenAI
        const dateStr = new Date().toISOString();
        console.log(`[${dateStr}] Requesting Ephemeral Token from OpenAI...`);

        const openAIKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAIKey) {
            console.error("OPENAI_API_KEY not set in environment");
            return new Response(JSON.stringify({ error: "Server configuration error: OPENAI_API_KEY not set" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const openAIResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openAIKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview",
                voice: "alloy",
            }),
        });

        if (!openAIResponse.ok) {
            const errText = await openAIResponse.text();
            console.error("OpenAI Error:", openAIResponse.status, errText);
            return new Response(JSON.stringify({ error: "OpenAI Error", details: errText }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const data = await openAIResponse.json();
        console.log("Token received from OpenAI. Returning to client.");

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("Edge Fx Error:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
})
