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

        const { function_name, arguments: args, session_id } = await req.json()

        let result = {}

        switch (function_name) {
            case 'search_menu_items':
                // proxy to fuzzy-menu-match function or call DB directly
                // For simplicity, calling DB directly here or separate function
                // Ideally should call the dedicated fuzzy-match function
                const { data: searchResults, error: searchError } = await supabaseClient.functions.invoke('fuzzy-menu-match', {
                    body: { query: args.query, restaurant_id: args.restaurant_id }
                })
                if (searchError) throw searchError
                result = searchResults
                break

            case 'add_to_cart':
                // Check availability
                const { data: item } = await supabaseClient
                    .from('menu_items')
                    .select('price')
                    .eq('id', args.menu_item_id)
                    .single()

                if (!item) throw new Error('Item not found')

                // Get active cart or create one
                let { data: cart } = await supabaseClient
                    .from('carts')
                    .select('id')
                    .eq('user_id', args.user_id)
                    .eq('status', 'active')
                    .single()

                if (!cart) {
                    const { data: newCart, error: cartError } = await supabaseClient
                        .from('carts')
                        .insert({ user_id: args.user_id, restaurant_id: 'TODO_GET_RES_ID' }) // simplified
                        .select()
                        .single()
                    if (cartError) throw cartError
                    cart = newCart
                }

                const { data: addedItem, error: addError } = await supabaseClient
                    .from('cart_items')
                    .insert({
                        cart_id: cart.id,
                        menu_item_id: args.menu_item_id,
                        quantity: args.quantity || 1,
                        unit_price: item.price
                    })
                    .select()

                if (addError) throw addError
                result = addedItem
                break

            case 'get_cart_summary':
                const { data: cartSummary, error: summaryError } = await supabaseClient
                    .from('carts')
                    .select('*, cart_items(*, menu_items(name_en, name_ar))')
                    .eq('user_id', args.user_id)
                    .eq('status', 'active')
                    .single()

                if (summaryError && summaryError.code !== 'PGRST116') throw summaryError
                result = cartSummary || { items: [] }
                break

            case 'confirm_order':
                const { data: order, error: orderError } = await supabaseClient.functions.invoke('confirm-order', {
                    body: { user_id: args.user_id, delivery_address_id: args.delivery_address_id }
                })
                if (orderError) throw orderError
                result = order
                break

            default:
                throw new Error(`Function ${function_name} not implemented`)
        }

        // Log the function call
        await supabaseClient.from('gpt_function_call_logs').insert({
            session_id: session_id,
            user_id: (await supabaseClient.auth.getUser()).data.user?.id,
            function_name,
            arguments: args,
            result: result,
            was_successful: true
        })

        return new Response(JSON.stringify(result), {
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
