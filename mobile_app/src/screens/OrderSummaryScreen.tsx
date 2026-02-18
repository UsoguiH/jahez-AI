import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import VoiceOverlay from '../components/VoiceOverlay';

export default function OrderSummaryScreen({ route }: { route: any }) {
    const { userId } = route.params || {};
    const navigation = useNavigation();
    const [cart, setCart] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);

    useEffect(() => {
        fetchCart();

        // Subscribe to real-time updates
        const channel = supabase
            .channel('public:cart_items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, () => {
                fetchCart();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const fetchCart = async () => {
        try {
            // Get Active Cart
            const { data: cartData, error } = await supabase
                .from('carts')
                .select('*, cart_items(*, menu_items(*))')
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setCart(cartData);
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        if (!cart || !cart.cart_items) return 0;
        return cart.cart_items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    };

    const handlePlaceOrder = async () => {
        setPlacingOrder(true);
        try {
            const { data, error } = await supabase.functions.invoke('confirm-order', {
                body: { user_id: userId, delivery_address_id: 'default' } // Simplified
            });

            if (error) throw error;

            Alert.alert('Success', 'Your order has been placed!', [
                { text: 'OK', onPress: () => navigation.navigate('Home') }
            ]);
            // Optimistic update or wait for realtime?
            setCart(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to place order. Please try again.');
            console.error(error);
        } finally {
            setPlacingOrder(false);
        }
    };

    if (loading) {
        return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#E8610A" /></View>;
    }

    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-white p-4">
                <Text className="text-xl font-bold text-gray-800 mb-4">Your Cart is Empty</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#E8610A] px-6 py-3 rounded-xl">
                    <Text className="text-white font-bold">Go to Menu</Text>
                </TouchableOpacity>
                <VoiceOverlay userId={userId} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="p-4 bg-white shadow-sm flex-row items-center">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-[#E8610A]">Order Summary</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                    <Text className="text-lg font-bold mb-4">Items</Text>
                    {cart.cart_items.map((item: any) => (
                        <View key={item.id} className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-0">
                            <View className="flex-1">
                                <Text className="font-semibold text-gray-800">{item.menu_items?.name_en}</Text>
                                <Text className="text-gray-500 text-xs">{item.quantity} x {item.unit_price} SAR</Text>
                            </View>
                            <Text className="font-bold text-[#E8610A]">{(item.quantity * item.unit_price).toFixed(2)} SAR</Text>
                        </View>
                    ))}
                </View>

                <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                    <Text className="text-lg font-bold mb-4">Payment Details</Text>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-600">Subtotal</Text>
                        <Text className="font-semibold">{calculateTotal().toFixed(2)} SAR</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-600">Delivery Fee</Text>
                        <Text className="font-semibold">15.00 SAR</Text>
                    </View>
                    <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
                        <Text className="text-lg font-bold">Total</Text>
                        <Text className="text-lg font-bold text-[#E8610A]">{(calculateTotal() + 15).toFixed(2)} SAR</Text>
                    </View>
                </View>

                <View className="h-24" />
            </ScrollView>

            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white shadow-lg rounded-t-3xl">
                <TouchableOpacity
                    onPress={handlePlaceOrder}
                    disabled={placingOrder}
                    className={`nav-button bg-[#E8610A] p-4 rounded-xl items-center ${placingOrder ? 'opacity-50' : ''}`}
                >
                    {placingOrder ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Place Order</Text>
                    )}
                </TouchableOpacity>
            </View>

            <VoiceOverlay userId={userId} />

        </View>
    );
}
