import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, TouchableOpacity } from 'react-native';

interface CartItem {
    name_ar: string;
    name_en: string;
    quantity: number;
    unit_price: number;
    notes?: string;
}

interface OrderConfirmationProps {
    items: CartItem[];
    totalPrice?: number;
    restaurantName?: string;
    onClose: () => void;
}

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ items, totalPrice, restaurantName, onClose }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const outerGlow1 = useRef(new Animated.Value(0)).current;
    const outerGlow2 = useRef(new Animated.Value(0)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;
    const textSlideAnim = useRef(new Animated.Value(25)).current;
    const cardFadeAnim = useRef(new Animated.Value(0)).current;
    const cardSlideAnim = useRef(new Animated.Value(20)).current;
    const btnFadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const sparkle1 = useRef(new Animated.Value(0)).current;
    const sparkle2 = useRef(new Animated.Value(0)).current;
    const sparkle3 = useRef(new Animated.Value(0)).current;
    const sparkle4 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(outerGlow1, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(outerGlow2, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
            Animated.stagger(70, [
                Animated.spring(sparkle1, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
                Animated.spring(sparkle2, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
                Animated.spring(sparkle3, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
                Animated.spring(sparkle4, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(textFadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(textSlideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(cardFadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(cardSlideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
            ]),
            Animated.timing(btnFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const VAT_RATE = 0.15;
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    return (
        <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.98)',
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 28,
        }}>
            {/* ─── Checkmark Area ─── */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
                <Animated.View style={{
                    position: 'absolute',
                    width: 170, height: 170, borderRadius: 85,
                    backgroundColor: 'rgba(74, 222, 128, 0.08)',
                    transform: [{ scale: Animated.multiply(outerGlow1, pulseAnim) }],
                    opacity: outerGlow1,
                }} />
                <Animated.View style={{
                    position: 'absolute',
                    width: 135, height: 135, borderRadius: 67.5,
                    backgroundColor: 'rgba(74, 222, 128, 0.14)',
                    transform: [{ scale: outerGlow2 }],
                    opacity: outerGlow2,
                }} />
                <Animated.View style={{
                    transform: [{ scale: scaleAnim }],
                    width: 100, height: 100, borderRadius: 50,
                    backgroundColor: '#4ADE80',
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#4ADE80',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.4,
                    shadowRadius: 22,
                    elevation: 14,
                }}>
                    <Text style={{ fontSize: 46, color: 'white', fontWeight: '300', marginTop: -2 }}>✓</Text>
                </Animated.View>

                {/* Sparkles */}
                <Animated.View style={{ position: 'absolute', top: -10, right: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', opacity: sparkle1, transform: [{ scale: sparkle1 }] }} />
                <Animated.View style={{ position: 'absolute', top: 5, left: 35, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#86EFAC', opacity: sparkle2, transform: [{ scale: sparkle2 }] }} />
                <Animated.View style={{ position: 'absolute', bottom: 10, left: 25, width: 6, height: 6, borderRadius: 3, backgroundColor: '#BBF7D0', opacity: sparkle3, transform: [{ scale: sparkle3 }] }} />
                <Animated.View style={{ position: 'absolute', bottom: 5, right: 30, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#A7F3D0', opacity: sparkle4, transform: [{ scale: sparkle4 }] }} />
            </View>

            {/* ─── Title ─── */}
            <Animated.View style={{
                opacity: textFadeAnim,
                transform: [{ translateY: textSlideAnim }],
                alignItems: 'center',
                marginBottom: 24,
            }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#1D1D1F', textAlign: 'center', marginBottom: 6 }}>
                    تم تأكيد الطلب ✨
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#86868B', textAlign: 'center' }}>
                    طلبك في الطريق إليك!
                </Text>
            </Animated.View>

            {/* ─── Order Details Card ─── */}
            <Animated.View style={{
                opacity: cardFadeAnim,
                transform: [{ translateY: cardSlideAnim }],
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.97)',
                borderRadius: 24,
                paddingVertical: 18,
                paddingHorizontal: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 8,
                borderWidth: 1,
                borderColor: '#F0F0F0',
            }}>
                {/* Restaurant Header */}
                {restaurantName && (
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 16,
                        gap: 6,
                    }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1D1D1F' }}>
                            {restaurantName}
                        </Text>
                        <Text style={{ fontSize: 18 }}>🍽️</Text>
                    </View>
                )}

                {/* ─── Item List (each item as its own row) ─── */}
                {items.map((item, idx) => (
                    <View key={idx} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderBottomWidth: idx < items.length - 1 ? 0.5 : 0,
                        borderBottomColor: '#F0F0F0',
                    }}>
                        {/* Price (left side) */}
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: '#86868B',
                            minWidth: 60,
                        }}>
                            {(item.unit_price * item.quantity).toFixed(0)} ر.س
                        </Text>

                        {/* Item Name + Notes (center, right-aligned for Arabic) */}
                        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
                            <Text style={{
                                fontSize: 15,
                                fontWeight: '600',
                                color: '#1D1D1F',
                                textAlign: 'right',
                            }}>
                                {item.name_ar}
                            </Text>
                            {item.notes && (
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '500',
                                    color: '#9CA3AF',
                                    textAlign: 'right',
                                    marginTop: 2,
                                }}>
                                    {item.notes}
                                </Text>
                            )}
                        </View>

                        {/* Red Quantity Badge */}
                        <View style={{
                            backgroundColor: '#E31837',
                            borderRadius: 14,
                            width: 28,
                            height: 28,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>
                                {item.quantity}
                            </Text>
                        </View>
                    </View>
                ))}

                {/* Divider before totals */}
                <View style={{ height: 0.5, backgroundColor: '#E5E5EA', marginTop: 8, marginBottom: 12 }} />

                {/* Price Breakdown */}
                <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B' }}>{subtotal.toFixed(2)} ر.س</Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B' }}>المجموع الفرعي</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B' }}>{vat.toFixed(2)} ر.س</Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B' }}>ضريبة القيمة المضافة (15%)</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#D71920' }}>{total.toFixed(2)} ر.س</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1D1D1F' }}>المجموع الكلي</Text>
                    </View>
                </View>

                {/* Delivery Estimate */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E5EA',
                    gap: 6,
                }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#86868B' }}>التوصيل المتوقع: 20-30 دقيقة</Text>
                    <Text style={{ fontSize: 14 }}>🕐</Text>
                </View>
            </Animated.View>

            {/* ─── Close Button ─── */}
            <Animated.View style={{ opacity: btnFadeAnim, marginTop: 24, width: '100%' }}>
                <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.85}
                    style={{
                        backgroundColor: '#E31837',
                        paddingVertical: 16,
                        borderRadius: 18,
                        alignItems: 'center',
                        shadowColor: '#E31837',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                        elevation: 6,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>تم 👍</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default OrderConfirmation;
