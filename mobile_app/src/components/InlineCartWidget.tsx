import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from './OrderCartWidget';

interface InlineCartWidgetProps {
    items: CartItem[];
    onShowCart: () => void;
    onItemsChange?: (items: CartItem[]) => void;
}

const VAT_RATE = 0.15;

const getFoodImage = (nameEn: string): string => {
    const n = nameEn.toLowerCase();
    if (n.includes('burger') || n.includes('mac') || n.includes('big mac') || n.includes('crispy'))
        return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop';
    if (n.includes('chicken') || n.includes('nugget') || n.includes('mcnugget'))
        return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&h=200&fit=crop';
    if (n.includes('fries') || n.includes('fry'))
        return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&h=200&fit=crop';
    if (n.includes('drink') || n.includes('cola') || n.includes('pepsi') || n.includes('sprite'))
        return 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=200&h=200&fit=crop';
    if (n.includes('wrap') || n.includes('shawarma'))
        return 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop';
    if (n.includes('pizza'))
        return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop';
    if (n.includes('coffee') || n.includes('latte') || n.includes('cappuccino'))
        return 'https://images.unsplash.com/photo-1541167760496-9af0ab7f0da7?w=200&h=200&fit=crop';
    if (n.includes('ice cream') || n.includes('sundae') || n.includes('mcflurry'))
        return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&h=200&fit=crop';
    if (n.includes('salad'))
        return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop';
    if (n.includes('meal') || n.includes('combo'))
        return 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=200&h=200&fit=crop';
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
};

const InlineCartWidget: React.FC<InlineCartWidgetProps> = ({ items, onShowCart, onItemsChange }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(15)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 80,
                friction: 12,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    if (items.length === 0) return null;

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = subtotal + (subtotal * VAT_RATE);

    const handleIncrement = (idx: number) => {
        if (!onItemsChange) return;
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + 1 };
        onItemsChange(newItems);
    };

    const handleDecrement = (idx: number) => {
        if (!onItemsChange) return;
        const newItems = [...items];
        if (newItems[idx].quantity <= 1) {
            newItems.splice(idx, 1);
        } else {
            newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity - 1 };
        }
        onItemsChange(newItems);
    };

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                alignSelf: 'flex-start',
                width: '88%',
                marginBottom: 30,
            }}
        >
            <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 28,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 24,
                elevation: 10,
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.9)',
            }}>
                {/* Items */}
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                    <View style={{ gap: 0 }}>
                        {items.map((item, idx) => (
                            <View key={`${item.name_en}-${idx}`}>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                }}>
                                    {/* Stepper Pill (left in RTL) */}
                                    <View style={{
                                        backgroundColor: '#F2F2F7',
                                        borderRadius: 20,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 3,
                                        width: 90,
                                    }}>
                                        {/* Plus */}
                                        <TouchableOpacity
                                            onPress={() => handleIncrement(idx)}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Ionicons name="add" size={15} color="#1D1D1F" />
                                        </TouchableOpacity>

                                        {/* Qty Badge */}
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: '#E31837',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#E31837',
                                            shadowOffset: { width: 0, height: 3 },
                                            shadowOpacity: 0.35,
                                            shadowRadius: 6,
                                            elevation: 4,
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                                {item.quantity}
                                            </Text>
                                        </View>

                                        {/* Trash / Minus */}
                                        <TouchableOpacity
                                            onPress={() => handleDecrement(idx)}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {item.quantity <= 1 ? (
                                                <Ionicons name="trash-outline" size={14} color="#1D1D1F" />
                                            ) : (
                                                <Ionicons name="remove" size={15} color="#1D1D1F" />
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {/* Name + Price (right in RTL) */}
                                    <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D1D1F', textAlign: 'right' }}>
                                            {item.name_ar}
                                        </Text>
                                        {item.notes ? (
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '600',
                                                color: item.notes.includes('بدون') ? '#FF3B30' : '#34C759',
                                                textAlign: 'right',
                                                marginTop: 2,
                                            }}>
                                                {item.notes}
                                            </Text>
                                        ) : null}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1D1D1F' }}>﷼</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1D1D1F' }}>
                                                {(item.unit_price * item.quantity).toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Food Image */}
                                    <Image
                                        source={{ uri: getFoodImage(item.name_en) }}
                                        style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 14,
                                            marginLeft: 10,
                                        }}
                                        resizeMode="cover"
                                    />
                                </View>

                                {/* Divider between items */}
                                {idx < items.length - 1 && (
                                    <View style={{ height: 0.5, backgroundColor: '#F0F0F0', width: '100%' }} />
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Divider before total */}
                <View style={{ height: 0.5, backgroundColor: '#E5E5EA', marginTop: 8, marginBottom: 12 }} />

                {/* Total */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: '#D71920' }}>
                        {total.toFixed(2)} ر.س
                    </Text>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: '#1D1D1F', textAlign: 'right' }}>
                        المجموع الكلي
                    </Text>
                </View>

                {/* عرض الطلب Button */}
                <TouchableOpacity
                    onPress={onShowCart}
                    activeOpacity={0.85}
                    style={{
                        backgroundColor: '#FF3B30',
                        paddingVertical: 16,
                        borderRadius: 16,
                        alignItems: 'center',
                        marginTop: 16,
                        shadowColor: '#FF3B30',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>عرض الطلب</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

export default InlineCartWidget;
