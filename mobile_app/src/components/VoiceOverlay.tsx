import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, Image, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as atob, encode as btoa } from 'base-64';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';

import { supabase } from '../lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Polyfill for global
if (!global.btoa) { global.btoa = btoa; }
if (!global.atob) { global.atob = atob; }

interface Restaurant {
    id: string;
    name_ar: string;
    name_en: string;
    ai_voice_context: string;
    menu_json: any[];
}

interface VoiceOverlayProps {
    userId?: string;
    visible: boolean;
    onClose: () => void;
}

const VoiceOverlay = ({ userId, visible, onClose }: VoiceOverlayProps) => {
    const [isListening, setIsListening] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [transcript, setTranscript] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [currentAiText, setCurrentAiText] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const ws = useRef<WebSocket | null>(null);
    const recording = useRef<Audio.Recording | null>(null);
    const audioBuffer = useRef<string>('');
    const currentSound = useRef<Audio.Sound | null>(null);
    const isSpeaking = useRef<boolean>(false);

    // Restaurant menu data — pre-loaded on mic open for zero latency
    const restaurantsRef = useRef<Restaurant[]>([]);
    const selectedRestaurantRef = useRef<Restaurant | null>(null);
    const menusLoadedRef = useRef<boolean>(false);

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
    const waveAnims = useRef([
        new Animated.Value(20),
        new Animated.Value(20),
        new Animated.Value(20),
        new Animated.Value(20),
        new Animated.Value(20)
    ]).current;

    const SUPABASE_PROJECT_ID = 'vnqtonsbvnaxtoldvycy';

    // Pre-load restaurant menus from Supabase
    const preloadMenus = async () => {
        if (menusLoadedRef.current) return;
        try {
            console.log('[MENUS] Pre-loading restaurant menus...');
            const { data, error } = await supabase.functions.invoke('get-restaurant-menus');
            if (error) {
                console.error('[MENUS] Error loading menus:', error);
                return;
            }
            if (data?.restaurants) {
                restaurantsRef.current = data.restaurants;
                menusLoadedRef.current = true;
                console.log(`[MENUS] Loaded ${data.restaurants.length} restaurants:`, data.restaurants.map((r: Restaurant) => r.name_en));
            }
        } catch (e) {
            console.error('[MENUS] Failed to pre-load menus:', e);
        }
    };

    useEffect(() => {
        console.log('VoiceOverlay mounted/updated, visible:', visible, 'isConnected:', isConnected, 'isListening:', isListening);
        if (visible) {
            // Reset state when opened
            setStatus('Idle');
            setTranscript('');
            startPulseAnimation();
            // Pre-load menus in parallel — they'll be ready by the time user picks a restaurant
            preloadMenus();
        } else {
            console.log('VoiceOverlay closing resources...');
            setIsListening(false);
            stopRecording();
            stopPulseAnimation();
            if (ws.current) {
                console.log('Closing WebSocket...');
                ws.current.close();
                ws.current = null;
            }
            // Reset restaurant selection for next session
            selectedRestaurantRef.current = null;
        }
    }, [visible]);

    const handleCloseOverlay = () => {
        console.log('handleCloseOverlay called (User pressed X or System Back)');
        if (onClose) onClose();
    };

    const startPulseAnimation = () => {
        if (pulseLoop.current) return;
        pulseLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseLoop.current.start();
    };

    const stopPulseAnimation = () => {
        if (pulseLoop.current) {
            pulseLoop.current.stop();
            pulseLoop.current = null;
        }
        pulseAnim.setValue(1);
    };

    const startWaveAnimation = () => {
        const animations = waveAnims.map((anim, index) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 50 + (Math.random() * 30),
                        duration: 500 + (index * 100),
                        useNativeDriver: false,
                    }),
                    Animated.timing(anim, {
                        toValue: 20,
                        duration: 500 + (index * 100),
                        useNativeDriver: false,
                    }),
                ])
            );
        });
        Animated.parallel(animations).start();
    };

    useEffect(() => {
        if (isListening) {
            startWaveAnimation();
        }
    }, [isListening]);

    // Build the initial AI instructions (no menu loaded yet)
    const getInitialInstructions = () => {
        const restaurantNames = restaurantsRef.current.map(r => r.name_ar).join('، ');
        return `أنت مساعد ذكي ودود اسمك "جاهز AI" تعمل في تطبيق جاهز لتوصيل الطعام في السعودية.
تتحدث بالعربية بلهجة سعودية نجدية ودية وطبيعية.

**شخصيتك:**
- ودود، سريع، وعملي.
- تستخدم تعابير سعودية عامية: "أبشر!"، "تمم"، "حاضر"، "على راسي"، "يابعدي"، "حياك".
- ردودك قصيرة ومباشرة جداً. جملة أو جملتين فقط. لا تطوّل أبداً.
- صوتك حماسي ومرح.

**فهم اللهجة السعودية — مهم جداً:**
المستخدم يتكلم بالعامية السعودية. يجب أن تفهم هذه الكلمات:
- "أبي" أو "أبغى" = أريد
- "وش" = ماذا
- "وش عندكم" = ماذا لديكم
- "خلاص" أو "بس كذا" = انتهيت
- "زيد" أو "ضيف" = أضف المزيد
- "شيل" أو "حذف" = احذف
- "كم السعر" أو "بكم" = ما السعر
- "عطني" أو "حطلي" = أعطني / أضف لي
- "وجبة" = meal
- "مسحب" = pulled chicken (mashab)
- "بروست" = broasted/fried chicken
- "روبيان" = shrimp
- "أكوم" = صوص الثوم من البيك (ACOM garlic sauce)

**أمثلة على طلبات المستخدم:**
- "أبي من البيك" = يريد الطلب من مطعم البيك
- "عطني اثنين بروست" = أضف وجبة بروست قطعتين
- "أبي روبيان" = أضف وجبة روبيان
- "أبي بيج ماك" = أضف بيج ماك
- "وش عندكم" = اعرض أقسام القائمة
- "بس كذا أكد" = أكد الطلب

**الحالة الحالية:**
- لم يتم اختيار مطعم بعد.
- المطاعم المتاحة: ${restaurantNames || 'البيك، الرومانسية، ماكدونالدز'}
- User ID = '${userId || 'guest-user-123'}'.

**المهام:**
1. عند أول اتصال، رحّب بالمستخدم ترحيب حار وقصير واسأله من أي مطعم يبي يطلب. اذكر أسماء المطاعم.
2. لما المستخدم يقول اسم مطعم، استخدم أداة select_restaurant فوراً.
3. بعد ما يتم تحميل القائمة، ساعد المستخدم في الطلب.
4. لا تحاول تعرض قائمة طعام قبل استخدام select_restaurant.

**تعليمات مهمة:**
- لا تذكر أي IDs أو معلومات تقنية.
- الأسعار بالريال السعودي.
- ردودك قصيرة جداً — جملة أو جملتين فقط.`;
    };

    // Build updated instructions after restaurant selection (with full menu)
    const getMenuInstructions = (restaurant: Restaurant) => {
        // Format menu for AI context
        const menuText = restaurant.menu_json.map((cat: any) => {
            const items = cat.items
                .filter((item: any) => item.available)
                .map((item: any) => `  - ${item.name_ar} (${item.name_en}): ${item.price} ريال — ${item.description_ar}`)
                .join('\n');
            return `📋 ${cat.category_ar}:\n${items}`;
        }).join('\n\n');

        return `أنت مساعد ذكي ودود اسمك "جاهز AI" تعمل في تطبيق جاهز لتوصيل الطعام في السعودية.
تتحدث بالعربية بلهجة سعودية نجدية ودية وطبيعية.

**شخصيتك:**
- ودود، سريع، وعملي.
- تستخدم تعابير سعودية عامية: "أبشر!"، "تمم"، "حاضر"، "على راسي"، "يابعدي"، "حياك".
- ردودك قصيرة جداً ومباشرة. جملة أو جملتين فقط.
- صوتك حماسي ومرح.

**فهم اللهجة السعودية — مهم جداً:**
المستخدم يتكلم بالعامية السعودية:
- "أبي" أو "أبغى" = أريد
- "وش" أو "ايش" = ماذا
- "وش عندكم" = ماذا لديكم / اعرض القائمة
- "خلاص" أو "بس كذا" = انتهيت
- "زيد" أو "ضيف" = أضف المزيد
- "شيل" أو "حذف" أو "لا خلاص بدونه" = احذف
- "بكم" أو "كم سعره" = ما السعر
- "عطني" أو "حطلي" = أعطني / أضف لي
- "أكد" أو "تمم" = أكد الطلب
- "غير المطعم" = يريد تغيير المطعم

**المطعم المختار: ${restaurant.name_ar} (${restaurant.name_en})**
${restaurant.ai_voice_context}

**القائمة الكاملة:**
${menuText}

**User ID:** '${userId || 'guest-user-123'}'

**المهام:**
1. ساعد المستخدم في اختيار أصناف من القائمة.
2. لما يطلب صنف، أكّد الاسم والسعر بجملة وحدة.
3. تتبّع الطلب (الأصناف، الكميات، المجموع) في ذاكرتك.
4. لما يقول "أكد" أو "خلاص" أو "تمم" أو "بس كذا"، استخدم confirm_order واذكر ملخص الطلب والمجموع.
5. لو يبي يغيّر المطعم، استخدم select_restaurant.
6. لو سأل "وش عندكم" أو "قولي الأقسام"، اذكر أسماء الأقسام فقط: ${restaurant.menu_json.map((c: any) => c.category_ar).join('، ')}.
7. لو سأل عن قسم معين، اذكر أصنافه وأسعاره.

**تعليمات مهمة:**
- لا تذكر أي IDs.
- ردودك قصيرة جداً — جملة أو جملتين فقط.
- لا تقرأ القائمة كاملة إلا إذا طلب ذلك.
- الأسعار بالريال السعودي.`;
    };

    const connectToOpenAIDirectly = async (authToken: string) => {
        if (ws.current) return;

        const tools = [
            {
                type: "function",
                name: "select_restaurant",
                description: "Select a restaurant to order from. Call this when the user says which restaurant they want.",
                parameters: {
                    type: "object",
                    properties: {
                        restaurant_name: {
                            type: "string",
                            description: "The name of the restaurant the user wants (e.g., 'البيك', 'الرومانسية', 'ماكدونالدز', 'Al Baik', 'McDonald\\'s')"
                        }
                    },
                    required: ["restaurant_name"]
                }
            },
            {
                type: "function",
                name: "confirm_order",
                description: "Confirm and place the user's order. Call this when the user says they want to confirm/finalize their order.",
                parameters: {
                    type: "object",
                    properties: {
                        order_summary: {
                            type: "string",
                            description: "A summary of what the user ordered, e.g., 'وجبة قطعتين بروست × 1، روبيان ٦ قطع × 2'"
                        },
                        total_price: {
                            type: "number",
                            description: "The total price in SAR"
                        }
                    },
                    required: ["order_summary", "total_price"]
                }
            }
        ];

        try {
            console.log('Fetching ephemeral token...');
            setStatus('Connecting...');

            // 1. Get Ephemeral Token
            const { data, error } = await supabase.functions.invoke('openai-realtime-proxy', {
                method: 'POST',
                headers: {
                    ...(authToken && authToken !== 'guest-demo-token' ? { Authorization: `Bearer ${authToken}` } : {})
                },
            });

            if (error) {
                console.error("Token fetch error:", error);
                throw new Error(`Failed to get ephemeral token: ${error.message}`);
            }

            const ephemeralKey = data?.client_secret?.value;

            if (!ephemeralKey) {
                console.error("No key in data:", data);
                throw new Error('No ephemeral key returned');
            }

            console.log('Got ephemeral key, connecting to OpenAI...');

            // 2. Connect to OpenAI Realtime API
            const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";
            const protocols = [
                "realtime",
                `openai-insecure-api-key.${ephemeralKey}`,
            ];

            // @ts-ignore
            const socket = new WebSocket(url, protocols, {
                headers: {
                    "OpenAI-Beta": "realtime=v1"
                }
            });

            socket.onopen = () => {
                console.log('Connected to OpenAI Direct');
                setIsConnected(true);
                setStatus('Ready');

                // Initialize Session with restaurant-selection instructions
                const sessionUpdate = {
                    type: 'session.update',
                    session: {
                        instructions: getInitialInstructions(),
                        voice: 'alloy',
                        turn_detection: { type: 'server_vad', threshold: 0.45, prefix_padding_ms: 500, silence_duration_ms: 750 },
                        modalities: ["text", "audio"],
                        input_audio_format: "pcm16",
                        output_audio_format: "pcm16",
                        input_audio_transcription: { model: 'whisper-1' },
                        tools: tools,
                        tool_choice: 'auto',
                    }
                };
                socket.send(JSON.stringify(sessionUpdate));

                // Trigger initial greeting — AI will ask which restaurant
                setTimeout(() => {
                    console.log('Requesting AI greeting...');
                    const restaurantNames = restaurantsRef.current.map(r => r.name_ar).join(' و');
                    socket.send(JSON.stringify({
                        type: 'response.create',
                        response: {
                            modalities: ['text', 'audio'],
                            instructions: `رحّب بالمستخدم ترحيب حار وقصير وعرّف عن نفسك إنك "جاهز AI" واسأله من أي مطعم يبي يطلب. اذكر المطاعم المتاحة: ${restaurantNames || 'البيك والرومانسية وماكدونالدز'}. جملتين فقط لا تطوّل.`
                        }
                    }));
                }, 500);

                // Start Recording
                setTimeout(() => startRecording(), 3000);
            };

            socket.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data as string);

                    if (msg.type === 'error') {
                        console.error("OpenAI Error:", JSON.stringify(msg, null, 2));
                    }

                    if (msg.type === 'response.created') {
                        // AI is generating — mute mic
                        isSpeaking.current = true;
                        audioBuffer.current = '';
                        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                            ws.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
                        }
                    }

                    if (msg.type === 'response.audio.delta' && msg.delta) {
                        audioBuffer.current += msg.delta;
                    }

                    if (msg.type === 'response.audio.done') {
                        console.log('Audio complete, playing buffered audio, length:', audioBuffer.current.length);
                        if (audioBuffer.current.length > 0) {
                            await playAudioChunk(audioBuffer.current);
                            audioBuffer.current = '';
                        }
                    }

                    if (msg.type === 'response.audio_transcript.delta' && msg.delta) {
                        setCurrentAiText(prev => prev + msg.delta);
                    }

                    if (msg.type === 'response.audio_transcript.done') {
                        if (msg.transcript) {
                            setMessages(prev => [...prev, { role: 'ai', text: msg.transcript }]);
                        }
                        setCurrentAiText('');
                    }

                    if (msg.type === 'conversation.item.input_audio_transcription.completed') {
                        if (msg.transcript && msg.transcript.trim()) {
                            setMessages(prev => [...prev, { role: 'user', text: msg.transcript.trim() }]);
                        }
                    }

                    // Handle tool calls
                    if (msg.type === 'response.output_item.done' && msg.item.type === 'function_call') {
                        const { name, arguments: argsStr } = msg.item;
                        const callId = msg.item.call_id;
                        const args = JSON.parse(argsStr);

                        console.log(`[TOOL] ${name} called with:`, args);

                        let result: any;

                        if (name === 'select_restaurant') {
                            result = handleSelectRestaurant(args.restaurant_name, socket);
                        } else if (name === 'confirm_order') {
                            result = handleConfirmOrder(args);
                        } else {
                            result = { error: `Unknown tool: ${name}` };
                        }

                        // Send tool result back
                        socket.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) }
                        }));
                        socket.send(JSON.stringify({ type: 'response.create' }));
                    }

                } catch (e) {
                    console.error('Error parsing msg', e);
                }
            };

            socket.onerror = (e: any) => {
                console.error('WebSocket Error', JSON.stringify(e));
                setStatus(`WS Error: ${e?.message || 'Unknown'}`);
            };

            socket.onclose = (e) => {
                console.log('WebSocket closed', e.code, e.reason);
                setIsConnected(false);
                setStatus(e.code === 1000 ? 'Disconnected' : `Closed: ${e.code} ${e.reason || ''}`);
            };

            ws.current = socket;

        } catch (e: any) {
            console.error('Connection failed', e);
            setStatus(`Failed: ${e?.message || 'Unknown error'}`);
        }
    };

    // Handle select_restaurant tool call — instant since menus are pre-loaded
    const handleSelectRestaurant = (restaurantName: string, socket: WebSocket) => {
        console.log(`[TOOL] select_restaurant: "${restaurantName}"`);

        // Fuzzy match restaurant name
        const normalizedInput = restaurantName.toLowerCase().trim();
        const restaurant = restaurantsRef.current.find(r => {
            const nameAr = r.name_ar.toLowerCase();
            const nameEn = r.name_en.toLowerCase();
            const id = r.id.toLowerCase();
            return nameAr.includes(normalizedInput) ||
                normalizedInput.includes(nameAr) ||
                nameEn.includes(normalizedInput) ||
                normalizedInput.includes(nameEn) ||
                id.includes(normalizedInput) ||
                // Common partial matches
                (normalizedInput.includes('بيك') && nameAr.includes('البيك')) ||
                (normalizedInput.includes('baik') && nameEn.toLowerCase().includes('baik')) ||
                (normalizedInput.includes('رومانسي') && nameAr.includes('الرومانسية')) ||
                (normalizedInput.includes('romansiah') && nameEn.toLowerCase().includes('romansiah')) ||
                (normalizedInput.includes('ماكدونالدز') && nameAr.includes('ماكدونالدز')) ||
                (normalizedInput.includes('ماك') && nameAr.includes('ماكدونالدز')) ||
                (normalizedInput.includes('mcdonald') && nameEn.toLowerCase().includes('mcdonald'));
        });

        if (!restaurant) {
            const available = restaurantsRef.current.map(r => r.name_ar).join('، ');
            return {
                success: false,
                error: `لم أجد مطعم بهذا الاسم. المطاعم المتاحة: ${available}`
            };
        }

        selectedRestaurantRef.current = restaurant;

        // Inject the full menu into the AI's instructions via session.update
        const updatedInstructions = getMenuInstructions(restaurant);
        socket.send(JSON.stringify({
            type: 'session.update',
            session: {
                instructions: updatedInstructions,
            }
        }));

        console.log(`[TOOL] Restaurant selected: ${restaurant.name_en}, menu injected with ${restaurant.menu_json.length} categories`);

        // Return category summary so AI can respond naturally
        const categories = restaurant.menu_json.map((cat: any) => cat.category_ar).join('، ');
        const totalItems = restaurant.menu_json.reduce((sum: number, cat: any) => sum + cat.items.length, 0);

        return {
            success: true,
            restaurant_name_ar: restaurant.name_ar,
            restaurant_name_en: restaurant.name_en,
            categories: categories,
            total_items: totalItems,
            message: `تم اختيار ${restaurant.name_ar}. الأقسام المتاحة: ${categories}`
        };
    };

    // Handle confirm_order — just a confirmation for now (no DB write)
    const handleConfirmOrder = (args: { order_summary: string; total_price: number }) => {
        console.log(`[TOOL] confirm_order:`, args);
        return {
            success: true,
            order_id: `ORD-${Date.now()}`,
            status: 'confirmed',
            estimated_delivery: '20-30 دقيقة',
            summary: args.order_summary,
            total: args.total_price,
            message: `تم تأكيد طلبك! المجموع: ${args.total_price} ريال. التوصيل المتوقع: 20-30 دقيقة. بالعافية! 🎉`
        };
    };

    const playAudioChunk = async (pcmBase64: string) => {
        if (!pcmBase64) return;
        try {
            if (currentSound.current) {
                try {
                    await currentSound.current.stopAsync();
                    await currentSound.current.unloadAsync();
                } catch (e) { /* ignore */ }
                currentSound.current = null;
            }

            const { appendWavHeader } = await import('../lib/audioUtils');
            const wavData = appendWavHeader(pcmBase64);
            const uri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + `response_${Date.now()}.wav`;
            await FileSystem.writeAsStringAsync(uri, wavData, { encoding: FileSystem.EncodingType.Base64 });
            const { sound: newSound } = await Audio.Sound.createAsync({ uri });
            currentSound.current = newSound;
            await newSound.playAsync();
            newSound.setOnPlaybackStatusUpdate(status => {
                if (status.isLoaded && status.didJustFinish) {
                    newSound.unloadAsync();
                    if (currentSound.current === newSound) currentSound.current = null;
                    console.log('Playback finished — resuming mic input');
                    isSpeaking.current = false;
                }
            });
        } catch (error) { console.error('Play error', error); }
    };

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false
            });

            const options = {
                sampleRate: 24000,
                channels: 1,
                bitsPerSample: 16,
                audioSource: 6,
                bufferSize: 4096,
                wavFile: 'voice_input.wav'
            };

            LiveAudioStream.init(options);

            LiveAudioStream.on('data', (data) => {
                if (isSpeaking.current) return;
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: data }));
                }
            });

            LiveAudioStream.start();
            setIsListening(true);
            setStatus('Listening...');
            startPulseAnimation();
        } catch (err) {
            console.error('Start Rec Error:', err);
        }
    };

    const stopRecording = async () => {
        try {
            LiveAudioStream.stop();
            setIsListening(false);
            stopPulseAnimation();
            setStatus('Processing...');

            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
                ws.current.send(JSON.stringify({ type: 'response.create', response: { modalities: ["text", "audio"] } }));
            }
        } catch (err) {
            console.error('Stop Rec Error:', err);
        }
    };

    const handleMicPress = async () => {
        if (isListening) {
            stopRecording();
        } else {
            setIsListening(true);
            setStatus('Connecting...');

            if (!isConnected) {
                try {
                    const { data } = await supabase.auth.getSession();
                    let token = data.session?.access_token;

                    if (!token) {
                        console.log('No session, attempting anonymous sign in...');
                        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
                        if (anonData?.session) {
                            token = anonData.session.access_token;
                        } else {
                            console.log('Anon auth not available, using Guest Mode.');
                            token = 'guest-demo-token';
                        }
                    }

                    if (token) {
                        connectToOpenAIDirectly(token);
                    } else {
                        setStatus('Auth Error');
                    }
                } catch (e) {
                    console.error("Auth check failed", e);
                    connectToOpenAIDirectly('guest-demo-token');
                }
            } else {
                startRecording();
            }
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleCloseOverlay}
        >
            <View className="flex-1 bg-white">
                {/* Header */}
                <SafeAreaView className="bg-white">
                    <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
                        <TouchableOpacity onPress={handleCloseOverlay} className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                        <Text className="text-[#DC2626] font-bold text-lg">{isListening ? 'البحث الصوتي' : 'الطلب الصوتي'}</Text>
                        <View className="w-10" />
                    </View>
                </SafeAreaView>

                {/* Content */}
                <View className="flex-1 justify-center items-center px-6 relative">

                    {!isListening ? (
                        <>
                            {/* Idle State */}
                            <View className="absolute top-20 right-10 opacity-10 transform rotate-12">
                                <MaterialIcons name="fastfood" size={48} color="#DC2626" />
                            </View>
                            <View className="absolute bottom-40 left-10 opacity-10 transform -rotate-12">
                                <MaterialIcons name="local-pizza" size={48} color="#DC2626" />
                            </View>
                            <View className="absolute top-1/3 left-12 opacity-5 transform rotate-45">
                                <MaterialIcons name="restaurant" size={64} color="#DC2626" />
                            </View>

                            <View className="items-center z-10 mb-12">
                                <Text className="text-3xl font-bold mb-4 text-center">كيف يمكنني مساعدتك اليوم؟</Text>
                                <Text className="text-[#DC2626] font-medium text-lg">أنا مستعد لتلقي طلبك</Text>
                            </View>

                            <View className="items-center mb-10">
                                <View className="relative justify-center items-center">
                                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }} className="absolute w-48 h-48 bg-red-100 rounded-full" />
                                    <TouchableOpacity
                                        onPress={handleMicPress}
                                        className="w-32 h-32 bg-[#DC2626] rounded-full items-center justify-center shadow-xl active:scale-95"
                                    >
                                        <Ionicons name="mic" size={50} color="white" />
                                    </TouchableOpacity>
                                </View>
                                <View className="mt-8 items-center">
                                    <Text className="text-xl font-bold text-gray-900 mb-2">اضغط للطلب بالصوت</Text>
                                    <Text className="text-gray-500 text-sm">جرب قول "أبي من البيك"</Text>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap justify-center gap-2">
                                <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2 rounded-full flex-row items-center space-x-2">
                                    <MaterialIcons name="restaurant" size={16} color="#DC2626" />
                                    <Text className="text-sm font-medium text-gray-700 ml-1">"أبي من البيك"</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2 rounded-full flex-row items-center space-x-2">
                                    <MaterialIcons name="lunch-dining" size={16} color="#DC2626" />
                                    <Text className="text-sm font-medium text-gray-700 ml-1">"أبي من ماكدونالدز"</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Background Food Icons */}
                            <View className="absolute top-10 right-8 opacity-[0.06] transform rotate-12">
                                <MaterialIcons name="fastfood" size={52} color="#DC2626" />
                            </View>
                            <View className="absolute bottom-32 left-6 opacity-[0.06] transform -rotate-12">
                                <MaterialIcons name="local-pizza" size={52} color="#DC2626" />
                            </View>
                            <View className="absolute top-1/4 left-8 opacity-[0.04] transform rotate-45">
                                <MaterialIcons name="restaurant" size={68} color="#DC2626" />
                            </View>
                            <View className="absolute top-16 left-1/3 opacity-[0.05] transform -rotate-6">
                                <MaterialIcons name="lunch-dining" size={44} color="#DC2626" />
                            </View>
                            <View className="absolute bottom-48 right-6 opacity-[0.05] transform rotate-20">
                                <MaterialIcons name="local-cafe" size={40} color="#DC2626" />
                            </View>

                            {/* Listening State */}
                            <View className="flex-row items-end justify-center h-16 mb-4 space-x-2">
                                {waveAnims.map((anim, i) => (
                                    <Animated.View
                                        key={i}
                                        style={{ height: anim }}
                                        className="w-3 bg-[#DC2626] rounded-full mx-1"
                                    />
                                ))}
                            </View>

                            <View className="mb-3 items-center">
                                <Text className="text-lg font-bold mb-1">{status === 'Listening...' ? 'جاري الاستماع...' : status}</Text>
                            </View>

                            {/* Chat Messages */}
                            <ScrollView
                                ref={scrollViewRef}
                                className="flex-1 w-full px-2 mb-4"
                                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                                showsVerticalScrollIndicator={false}
                            >
                                {messages.map((msg, idx) => (
                                    <View
                                        key={idx}
                                        style={{
                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            backgroundColor: msg.role === 'user' ? '#3B82F6' : '#FEE2E2',
                                            borderRadius: 16,
                                            borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                                            borderTopLeftRadius: msg.role === 'ai' ? 4 : 16,
                                            paddingHorizontal: 14,
                                            paddingVertical: 10,
                                            marginBottom: 8,
                                            maxWidth: '80%',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: msg.role === 'user' ? '#FFFFFF' : '#991B1B',
                                                fontSize: 17,
                                                textAlign: 'right',
                                                lineHeight: 26,
                                            }}
                                        >
                                            {msg.text}
                                        </Text>
                                        <Text
                                            style={{
                                                color: msg.role === 'user' ? '#BFDBFE' : '#DC2626',
                                                fontSize: 10,
                                                textAlign: msg.role === 'user' ? 'left' : 'right',
                                                marginTop: 4,
                                            }}
                                        >
                                            {msg.role === 'user' ? 'أنت' : 'جاهز AI'}
                                        </Text>
                                    </View>
                                ))}

                                {/* Currently streaming AI text */}
                                {currentAiText ? (
                                    <View
                                        style={{
                                            alignSelf: 'flex-start',
                                            backgroundColor: '#FEE2E2',
                                            borderRadius: 16,
                                            borderTopLeftRadius: 4,
                                            paddingHorizontal: 14,
                                            paddingVertical: 10,
                                            marginBottom: 8,
                                            maxWidth: '80%',
                                            opacity: 0.7,
                                        }}
                                    >
                                        <Text style={{ color: '#991B1B', fontSize: 15, textAlign: 'right', lineHeight: 22 }}>
                                            {currentAiText}...
                                        </Text>
                                        <Text style={{ color: '#DC2626', fontSize: 10, textAlign: 'right', marginTop: 4 }}>
                                            جاهز AI يتحدث...
                                        </Text>
                                    </View>
                                ) : null}
                            </ScrollView>

                            {/* Quick Suggestion Chips */}
                            <View className="w-full px-2 pb-2 mb-10">
                                <View className="flex-row flex-wrap justify-center gap-2">
                                    <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2.5 rounded-full flex-row items-center">
                                        <MaterialIcons name="restaurant-menu" size={16} color="#DC2626" />
                                        <Text className="text-sm font-medium text-gray-700 ml-1.5">وش عندكم؟</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2.5 rounded-full flex-row items-center">
                                        <MaterialIcons name="check-circle" size={16} color="#DC2626" />
                                        <Text className="text-sm font-medium text-gray-700 ml-1.5">أكّد الطلب</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2.5 rounded-full flex-row items-center">
                                        <MaterialIcons name="swap-horiz" size={16} color="#DC2626" />
                                        <Text className="text-sm font-medium text-gray-700 ml-1.5">غيّر المطعم</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default VoiceOverlay;
