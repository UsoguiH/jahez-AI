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
    const ws = useRef<WebSocket | null>(null);
    const recording = useRef<Audio.Recording | null>(null);
    const audioBuffer = useRef<string>('');
    const currentSound = useRef<Audio.Sound | null>(null);
    const isSpeaking = useRef<boolean>(false);

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

    useEffect(() => {
        console.log('VoiceOverlay mounted/updated, visible:', visible, 'isConnected:', isConnected, 'isListening:', isListening);
        if (visible) {
            // Reset state when opened
            setStatus('Idle');
            setTranscript('');
            startPulseAnimation();
        } else {
            console.log('VoiceOverlay closing resources...');
            setIsListening(false);
            stopRecording();
            stopPulseAnimation(); // Clean up animation
            if (ws.current) {
                console.log('Closing WebSocket...');
                ws.current.close();
                ws.current = null;
            }
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
                        useNativeDriver: false, // height doesn't support native driver
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


    const connectToOpenAIDirectly = async (authToken: string) => {
        if (ws.current) return;

        // Define Instructions locally
        const instructions = `أنت مساعد ذكي ودود اسمك "جاهز AI" تعمل في تطبيق جاهز لتوصيل الطعام في السعودية.
تتحدث بالعربية بلهجة سعودية ودية وطبيعية.

**شخصيتك:**
- ودود، سريع، وعملي. تستخدم تعابير سعودية مثل "أبشر!"، "تمم"، "حاضر"، "على راسي".
- ردودك قصيرة ومباشرة. لا تطوّل في الكلام.
- صوتك حماسي ومرح.

**قدراتك:**
1. البحث في القائمة: إذا طلب المستخدم أكل معين، استخدم search_menu_items للبحث.
2. إضافة للسلة: أكّد الصنف والكمية قبل الإضافة باستخدام add_to_cart.
3. عرض السلة: استخدم get_cart_summary لعرض محتوى السلة.
4. تأكيد الطلب: اسأل المستخدم قبل تنفيذ confirm_order.

**تعليمات مهمة:**
- إذا أرجع البحث نتائج، اذكر اسم الصنف وسعره فقط. لا تقرأ أي IDs.
- إذا قال المستخدم شي عام مثل "جوعان"، اقترح أصناف مشهورة أو اسأله عن تفضيله.
- Restaurant ID = '1' (ثابت للديمو).
- User ID = '${userId || 'guest-user-123'}'.
- عند أول اتصال، رحّب بالمستخدم ترحيب حار وقصير وعرّف عن نفسك.
`;

        const tools = [
            {
                type: "function",
                name: "search_menu_items",
                description: "Search for items in the menu based on a query.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query (e.g., 'burger', 'pepsi', 'kabsa')" },
                        restaurant_id: { type: "string", description: "The restaurant ID (default to '1')" }
                    },
                    required: ["query", "restaurant_id"]
                }
            },
            {
                type: "function",
                name: "add_to_cart",
                description: "Add a specific menu item to the user's cart.",
                parameters: {
                    type: "object",
                    properties: {
                        menu_item_id: { type: "string", description: "The UUID of the menu item to add" },
                        quantity: { type: "integer", description: "Quantity of the item (default 1)" }
                    },
                    required: ["menu_item_id"]
                }
            },
            {
                type: "function",
                name: "get_cart_summary",
                description: "Get the current items in the user's cart and the total.",
                parameters: {
                    type: "object",
                    properties: {},
                }
            },
            {
                type: "function",
                name: "confirm_order",
                description: "Place the order with the current cart contents.",
                parameters: {
                    type: "object",
                    properties: {
                        delivery_address_id: { type: "string", description: "Address ID (default to 'home')" }
                    },
                    required: ["delivery_address_id"]
                }
            }
        ];

        try {
            console.log('Fetching ephemeral token...');
            setStatus('Connecting...');

            // 1. Get Ephemeral Token from our Backend using Supabase Client
            const { data, error } = await supabase.functions.invoke('openai-realtime-proxy', {
                method: 'POST',
                headers: {
                    // Authorization is allowed to be missing for guest mode as per our Edge Function update
                    // But if we have a token, sending it is good practice
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

            // 2. Connect to OpenAI Realtime API directly
            const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

            // RN WebSocket fix: Pass token in subprotocols to avoid header stripping issues
            // standard protocols + special auth protocol
            const protocols = [
                "realtime",
                `openai-insecure-api-key.${ephemeralKey}`,
            ];

            console.log('Connecting WS with protocols:', protocols);

            // @ts-ignore - React Native WebSocket supports headers in 3rd arg (options)
            const socket = new WebSocket(url, protocols, {
                headers: {
                    // "Authorization": `Bearer ${ephemeralKey}`, // Removed to avoid conflict with protocol
                    "OpenAI-Beta": "realtime=v1"
                }
            });

            socket.onopen = () => {
                console.log('Connected to OpenAI Direct');
                setIsConnected(true);
                setStatus('Ready');

                // Initialize Session
                const sessionUpdate = {
                    type: 'session.update',
                    session: {
                        instructions: instructions,
                        voice: 'alloy',
                        turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 },
                        modalities: ["text", "audio"],
                        input_audio_format: "pcm16",
                        output_audio_format: "pcm16",
                        tools: tools,
                        tool_choice: 'auto',
                    }
                };
                socket.send(JSON.stringify(sessionUpdate));

                // Trigger initial greeting from the AI
                setTimeout(() => {
                    console.log('Requesting AI greeting...');
                    socket.send(JSON.stringify({
                        type: 'response.create',
                        response: {
                            modalities: ['text', 'audio'],
                            instructions: 'قول: أهلاً! أنا جاهز AI، وش تبي تطلب اليوم؟ - جملة وحدة فقط، لا تطوّل'
                        }
                    }));
                }, 500);

                // Start Recording after greeting has time to begin
                setTimeout(() => startRecording(), 3000);
            };

            socket.onmessage = async (event) => {
                try {
                    console.log('WS RAW MSG:', event.data.toString().substring(0, 100)); // Log first 100 chars
                    const msg = JSON.parse(event.data as string);

                    if (msg.type === 'error') {
                        console.error("OpenAI Error Message:", JSON.stringify(msg, null, 2));
                    }

                    if (msg.type === 'response.created') {
                        // AI is generating a response — mute mic to prevent feedback
                        console.log('AI responding — muting mic input');
                        isSpeaking.current = true;
                        audioBuffer.current = '';
                        // Clear the input buffer so OpenAI doesn't process speaker echo
                        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                            ws.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
                        }
                    }

                    if (msg.type === 'response.audio.delta' && msg.delta) {
                        // Buffer the audio chunk — don't play yet
                        audioBuffer.current += msg.delta;
                    }

                    if (msg.type === 'response.audio.done') {
                        // All chunks received — play the combined audio as one sound
                        console.log('Audio complete, playing buffered audio, length:', audioBuffer.current.length);
                        if (audioBuffer.current.length > 0) {
                            await playAudioChunk(audioBuffer.current);
                            audioBuffer.current = '';
                        }
                    }

                    if (msg.type === 'response.audio_transcript.delta' && msg.delta) {
                        setTranscript(prev => prev + msg.delta);
                    }

                    if (msg.type === 'response.function_call_arguments.done') {
                        // Tool call handling
                        console.log("Tool call request:", msg);
                        // Note: OpenAI Realtime 'response.function_call_arguments.done' might be deprecated or different?
                        // It uses 'response.output_item.done' with item.type='function_call' usually.
                        // But let's check the logs if it fails.
                        // For now, let's add basic logging.
                    }

                    if (msg.type === 'response.done') {
                        console.log('Full Response Done:', JSON.stringify(msg, null, 2));
                    }

                    if (msg.type === 'response.output_item.done' && msg.item.type === 'function_call') {
                        const { name, arguments: args } = msg.item;
                        const callId = msg.item.call_id;
                        setStatus(`Executing ${name}...`);
                        const result = await executeTool(name, JSON.parse(args));

                        socket.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) }
                        }));
                        socket.send(JSON.stringify({ type: 'response.create' }));
                        setStatus('Listening...');
                    }

                    if (msg.type === 'error') {
                        console.error("OpenAI Error Message:", msg);
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

    const executeTool = async (name: string, args: any) => {
        try {
            const payload = { function_name: name, arguments: { ...args, user_id: userId }, session_id: 'mobile-session' };
            const { data, error } = await supabase.functions.invoke('process-voice-intent', { body: payload });
            return error ? { error: error.message } : data;
        } catch (e: any) { return { error: e.message }; }
    };

    const playAudioChunk = async (pcmBase64: string) => {
        if (!pcmBase64) return;
        try {
            // Stop any currently playing sound first
            if (currentSound.current) {
                try {
                    await currentSound.current.stopAsync();
                    await currentSound.current.unloadAsync();
                } catch (e) { /* ignore if already unloaded */ }
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
                    // Playback done — unmute mic
                    console.log('Playback finished — resuming mic input');
                    isSpeaking.current = false;
                }
            });
        } catch (error) { console.error('Play error', error); }
    };

    const startRecording = async () => {
        try {
            // Request permissions still needed? Yes.
            // Request permissions still needed? Yes.
            await Audio.requestPermissionsAsync();
            // We still use Expo Audio for playback, so keep setAudioModeAsync?
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false // Force Speaker
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
                if (isSpeaking.current) return; // Don't send mic data while AI is speaking
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
            // IMMEDIATE: Switch to Listening View (Second Picture)
            setIsListening(true);
            setStatus('Connecting...');

            // Connect and Start
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
                            // If Anon auth fails (e.g. disabled), fallback to guest mode immediately
                            console.log('Anon auth not available, using Guest Mode.');
                            token = 'guest-demo-token';
                            // We don't need a real auth token for the Edge Function if we relaxed the check there.
                        }
                    }

                    if (token) {
                        connectToOpenAIDirectly(token);
                    } else {
                        // Should technically not happen with fallback
                        setStatus('Auth Error');
                    }
                } catch (e) {
                    console.error("Auth check failed", e);
                    // Fallback even on crash
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
                    <View className="flex-row justify-between items-center px-6 py-4">
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
                            {/* Background Elements */}
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
                                    <Text className="text-gray-500 text-sm">جرب قول "اطلب بيتزا بيبروني من جو"</Text>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap justify-center gap-2">
                                <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2 rounded-full flex-row items-center space-x-2">
                                    <MaterialIcons name="history" size={16} color="#DC2626" />
                                    <Text className="text-sm font-medium text-gray-700 ml-1">"كرر طلبي الأخير"</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="bg-gray-50 border border-red-100 px-4 py-2 rounded-full flex-row items-center space-x-2">
                                    <MaterialIcons name="local-fire-department" size={16} color="#DC2626" />
                                    <Text className="text-sm font-medium text-gray-700 ml-1">"ابحث عن برجر قريب مني"</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Listening State */}
                            <View className="flex-row items-end justify-center h-24 mb-10 space-x-2">
                                {waveAnims.map((anim, i) => (
                                    <Animated.View
                                        key={i}
                                        style={{ height: anim }}
                                        className="w-3 bg-[#DC2626] rounded-full mx-1"
                                    />
                                ))}
                            </View>

                            <View className="mb-6 items-center">
                                <Text className="text-2xl font-bold mb-2">{status === 'Listening...' ? 'جاري الاستماع...' : status}</Text>
                                {['Listening...', 'Connecting...'].includes(status) && (
                                    <View className="flex-row space-x-1">
                                        <View className="w-2 h-2 bg-[#DC2626] rounded-full opacity-100" />
                                        <View className="w-2 h-2 bg-[#DC2626] rounded-full opacity-60" />
                                        <View className="w-2 h-2 bg-[#DC2626] rounded-full opacity-30" />
                                    </View>
                                )}
                            </View>

                            <View className="max-w-xs mx-auto mb-12">
                                <Text className="text-xl text-gray-500 italic font-medium text-center">
                                    {transcript || '"أريد برجر كنج..."'}
                                </Text>
                            </View>

                            <View className="bg-gray-50 rounded-2xl p-5 border border-red-100 w-full max-w-sm">
                                <Text className="text-xs font-bold text-[#DC2626] mb-3 uppercase tracking-wider text-right">جرّب قول:</Text>
                                <View className="flex-row flex-wrap gap-2 justify-end">
                                    <Text className="bg-white px-4 py-2 rounded-full text-sm shadow-sm border border-gray-100">"مطاعم بيتزا قريبة"</Text>
                                    <Text className="bg-white px-4 py-2 rounded-full text-sm shadow-sm border border-gray-100">"أعد طلب وجبتي الأخيرة"</Text>
                                    <Text className="bg-white px-4 py-2 rounded-full text-sm shadow-sm border border-gray-100">"خيارات صحية"</Text>
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
