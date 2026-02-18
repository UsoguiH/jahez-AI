import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

const CartSummary = ({ userId }) => {
    const [cartCount, setCartCount] = useState(0);
    const [cartTotal, setCartTotal] = useState(0);

    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        fetchCart();

        // Real-time subscription
        const channel = supabase
            .channel('public:carts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'cart_items' },
                (payload) => {
                    console.log('Cart change received!', payload);
                    fetchCart();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const fetchCart = async () => {
        // Logic to fetch active cart total from DB
        // Simplified: Just count items for now
        // Ideally call 'get_cart_summary' edge function or select count
        const { data: cart } = await supabase
            .from('carts')
            .select('id, cart_items(quantity, unit_price)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (cart && cart.cart_items) {
            const count = cart.cart_items.reduce((acc, item) => acc + item.quantity, 0);
            const total = cart.cart_items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
            setCartCount(count);
            setCartTotal(total);
        }
    };

    const navigation = useNavigation<any>();

    if (cartCount === 0) return null;

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate('OrderSummary')}
            className="absolute bottom-24 left-4 right-4 bg-green-600 p-4 rounded-xl flex-row justify-between items-center shadow-lg"
        >
            <View className="flex-row items-center">
                <View className="bg-white/20 w-8 h-8 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold">{cartCount}</Text>
                </View>
                <Text className="text-white font-bold text-lg">View Basket</Text>
            </View>
            <Text className="text-white font-bold text-lg">{cartTotal.toFixed(2)} SAR</Text>
        </TouchableOpacity>
    );
};

export default CartSummary;
