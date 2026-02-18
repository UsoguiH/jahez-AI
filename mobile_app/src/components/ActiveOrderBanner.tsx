import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

const ActiveOrderBanner = ({ userId }: { userId?: string }) => {
    const [activeOrder, setActiveOrder] = useState<any>(null);

    useEffect(() => {
        if (!userId) return;

        fetchActiveOrder();

        const channel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchActiveOrder();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const fetchActiveOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .neq('status', 'delivered')
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setActiveOrder(data);
        } catch (error) {
            console.log('Error fetching active order', error);
        }
    };

    if (!activeOrder) return null;

    return (
        <View className="bg-blue-600 p-4 mx-4 mt-2 rounded-xl flex-row items-center justify-between shadow-sm">
            <View>
                <Text className="text-white font-bold text-lg">Order #{activeOrder.id.slice(0, 8)}</Text>
                <Text className="text-blue-100">{activeOrder.status.toUpperCase()}</Text>
            </View>
            <ActivityIndicator color="white" />
        </View>
    );
};

export default ActiveOrderBanner;
