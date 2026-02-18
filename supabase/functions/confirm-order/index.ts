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

        const { user_id, delivery_address_id } = await req.json()

        // 1. Get active cart
        const { data: cart, error: cartError } = await supabaseClient
            .from('carts')
            .select('*, cart_items(*, menu_items(price, name_ar, name_en))')
            .eq('user_id', user_id)
            .eq('status', 'active')
            .single()

        if (!cart) throw new Error('No active cart found')

        // 2. Validate Cart (e.g. min order amount) here

        // 3. Create Order
        const total = cart.cart_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .insert({
                user_id: user_id,
                restaurant_id: cart.restaurant_id,
                cart_id: cart.id,
                subtotal_amount: total,
                total_amount: total, // + fees
                delivery_address: { id: delivery_address_id, text: "Default Address" }, // Mock
                status: 'placed'
            })
            .select()
            .single()

        if (orderError) throw orderError

        // 4. Create Order Items (snapshot)
        const orderItems = cart.cart_items.map(ci => ({
            order_id: order.id,
            menu_item_id: ci.menu_item_id,
            menu_item_name_ar: ci.menu_items.name_ar,
            menu_item_name_en: ci.menu_items.name_en,
            quantity: ci.quantity,
            unit_price: ci.unit_price,
            subtotal: ci.quantity * ci.unit_price
        }))

        const { error: itemsError } = await supabaseClient
            .from('order_items')
            .insert(orderItems)

        if (itemsError) throw itemsError

        // 5. Update Cart Status
        await supabaseClient
            .from('carts')
            .update({ status: 'checked_out' })
            .eq('id', cart.id)

        return new Response(JSON.stringify(order), {
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
