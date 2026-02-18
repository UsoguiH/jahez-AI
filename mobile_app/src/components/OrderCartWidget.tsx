import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface CartItem {
    name_ar: string;
    name_en: string;
    quantity: number;
    unit_price: number;
    notes?: string;
}

// ─────────────────────────────────────────────────────
// Inline Cart Card — appears as a chat message bubble
// ─────────────────────────────────────────────────────

interface InlineCartCardProps {
    items: CartItem[];
    restaurantName?: string;
}

const VAT_RATE = 0.15;

export const InlineCartCard: React.FC<InlineCartCardProps> = ({ items, restaurantName }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
        ]).start();
    }, []);

    if (items.length === 0) return null;

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                alignSelf: 'flex-start',
                maxWidth: '88%',
                marginBottom: 10,
            }}
        >
            <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                borderTopLeftRadius: 4,
                borderWidth: 1,
                borderColor: '#F0F0F0',
                paddingVertical: 14,
                paddingHorizontal: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 3,
            }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                        backgroundColor: '#FEF2F2',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                    }}>
                        <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '600' }}>
                            {items.reduce((s, i) => s + i.quantity, 0)} أصناف
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1D1D1F' }}>
                            {restaurantName || 'طلبك'} 🛒
                        </Text>
                    </View>
                </View>

                {/* Items */}
                {items.map((item, idx) => (
                    <View
                        key={`${item.name_en}-${idx}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingVertical: 6,
                            borderBottomWidth: idx < items.length - 1 ? 0.5 : 0,
                            borderBottomColor: '#F5F5F5',
                        }}
                    >
                        {/* Right: qty badge + name */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            {/* Quantity Badge */}
                            <View style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: '#E31837',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                    {item.quantity}
                                </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1D1D1F', textAlign: 'right' }} numberOfLines={1}>
                                    {item.name_ar}
                                </Text>
                                {item.notes ? (
                                    <Text style={{
                                        fontSize: 10,
                                        fontWeight: '600',
                                        color: item.notes.includes('بدون') ? '#FF3B30' : '#34C759',
                                        textAlign: 'right',
                                        marginTop: 1,
                                    }}>
                                        {item.notes}
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        {/* Price */}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#86868B', marginLeft: 10 }}>
                            {(item.unit_price * item.quantity).toFixed(0)} ر.س
                        </Text>
                    </View>
                ))}

                {/* Total Row */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E5EA',
                }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#D71920' }}>
                        {total.toFixed(2)} ر.س
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#86868B' }}>
                        المجموع (شامل الضريبة)
                    </Text>
                </View>
            </View>

            {/* Sender label */}
            <Text style={{ color: '#DC2626', fontSize: 10, textAlign: 'right', marginTop: 4, marginRight: 4 }}>
                جاهز AI
            </Text>
        </Animated.View>
    );
};

// ─────────────────────────────────────────────────────
// Pinned Mini Summary Bar — stays at top when cart has items
// ─────────────────────────────────────────────────────

interface MiniCartBarProps {
    items: CartItem[];
    restaurantName?: string;
    onConfirm: () => void;
}

export const MiniCartBar: React.FC<MiniCartBarProps> = ({ items, restaurantName, onConfirm }) => {
    const slideAnim = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        if (items.length > 0) {
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
        } else {
            Animated.timing(slideAnim, { toValue: -60, duration: 200, useNativeDriver: true }).start();
        }
    }, [items.length]);

    if (items.length === 0) return null;

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = subtotal * (1 + VAT_RATE);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: 'rgba(255,255,255,0.97)',
                borderBottomWidth: 0.5,
                borderBottomColor: '#E5E5EA',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 3,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Confirm Button */}
                <TouchableOpacity
                    onPress={onConfirm}
                    activeOpacity={0.85}
                    style={{
                        backgroundColor: '#E31837',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                        shadowColor: '#E31837',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>تأكيد</Text>
                </TouchableOpacity>

                {/* Summary */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#D71920' }}>
                        {total.toFixed(0)} ر.س
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1D1D1F' }}>
                            {restaurantName || 'طلبك'}
                        </Text>
                        <View style={{
                            backgroundColor: '#E31837',
                            borderRadius: 10,
                            width: 20,
                            height: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{totalQty}</Text>
                        </View>
                        <Text style={{ fontSize: 16 }}>🛒</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export default InlineCartCard;
