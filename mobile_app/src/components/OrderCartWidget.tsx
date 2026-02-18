import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export interface CartItem {
    name_ar: string;
    name_en: string;
    quantity: number;
    unit_price: number;
    notes?: string;
}

interface OrderCartWidgetProps {
    items: CartItem[];
    restaurantName?: string;
    onConfirm: () => void;
    onEdit: () => void;
}

const VAT_RATE = 0.15;

// Food category icon mapping
const getFoodIcon = (nameEn: string): string => {
    const lower = nameEn.toLowerCase();
    if (lower.includes('burger') || lower.includes('mac') || lower.includes('crispy') || lower.includes('deluxe')) return 'lunch-dining';
    if (lower.includes('chicken') || lower.includes('broast') || lower.includes('nugget')) return 'set-meal';
    if (lower.includes('shrimp') || lower.includes('fish') || lower.includes('fillet')) return 'set-meal';
    if (lower.includes('fries') || lower.includes('potato')) return 'restaurant';
    if (lower.includes('drink') || lower.includes('cola') || lower.includes('pepsi') || lower.includes('juice')) return 'local-cafe';
    if (lower.includes('sundae') || lower.includes('mcflurry') || lower.includes('ice')) return 'icecream';
    if (lower.includes('wrap') || lower.includes('tortilla')) return 'fastfood';
    if (lower.includes('salad')) return 'eco';
    if (lower.includes('sauce') || lower.includes('acom')) return 'local-dining';
    return 'fastfood';
};

const OrderCartWidget: React.FC<OrderCartWidgetProps> = ({ items, restaurantName, onConfirm, onEdit }) => {
    const slideAnim = useRef(new Animated.Value(100)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (items.length > 0) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [items.length]);

    if (items.length === 0) return null;

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 50,
            }}
        >
            <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.97)',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 22,
                paddingTop: 20,
                paddingBottom: 28,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.12,
                shadowRadius: 24,
                elevation: 20,
                borderTopWidth: 0.5,
                borderColor: 'rgba(0,0,0,0.06)',
            }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity onPress={onEdit} style={{ padding: 4 }}>
                        <MaterialIcons name="edit" size={20} color="#86868B" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1D1D1F' }}>
                            {restaurantName || 'طلبك'}
                        </Text>
                        <View style={{
                            backgroundColor: '#E31837',
                            borderRadius: 10,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                        }}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                                {items.reduce((sum, i) => sum + i.quantity, 0)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Items */}
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                    {items.map((item, idx) => (
                        <View
                            key={`${item.name_en}-${idx}`}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 14,
                            }}
                        >
                            {/* Right side: icon + qty + name */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                {/* Food Icon */}
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    backgroundColor: '#F5F5F7',
                                    borderWidth: 0.5,
                                    borderColor: '#E5E5EA',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <MaterialIcons name={getFoodIcon(item.name_en) as any} size={22} color="#86868B" />
                                </View>

                                {/* Quantity Badge */}
                                <View style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 13,
                                    backgroundColor: '#E31837',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    shadowColor: '#E31837',
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.35,
                                    shadowRadius: 6,
                                    elevation: 4,
                                }}>
                                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
                                        {item.quantity}
                                    </Text>
                                </View>

                                {/* Name and Notes */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1D1D1F', textAlign: 'right' }} numberOfLines={1}>
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
                                </View>
                            </View>

                            {/* Price */}
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1D1D1F', marginLeft: 12 }}>
                                {(item.unit_price * item.quantity).toFixed(0)} ر.س
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Divider */}
                <View style={{ height: 0.5, backgroundColor: '#E5E5EA', marginVertical: 12 }} />

                {/* Summary */}
                <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B', textAlign: 'right' }}>المجموع الفرعي</Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B' }}>{subtotal.toFixed(2)} ر.س</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B', textAlign: 'right' }}>ضريبة القيمة المضافة (15%)</Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#86868B' }}>{vat.toFixed(2)} ر.س</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1D1D1F', textAlign: 'right' }}>المجموع الكلي</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#D71920' }}>{total.toFixed(2)} ر.س</Text>
                    </View>
                </View>

                {/* CTA Buttons */}
                <View style={{ marginTop: 16, gap: 10 }}>
                    <TouchableOpacity
                        onPress={onConfirm}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: '#FF3B30',
                            paddingVertical: 15,
                            borderRadius: 16,
                            alignItems: 'center',
                            shadowColor: '#FF3B30',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 10,
                            elevation: 6,
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>تأكيد الطلب</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onEdit}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 6,
                            paddingVertical: 8,
                        }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#86868B' }}>تعديل الطلب</Text>
                        <MaterialIcons name="edit" size={14} color="#86868B" />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

export default OrderCartWidget;
