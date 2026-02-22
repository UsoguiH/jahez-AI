import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, I18nManager, Platform } from 'react-native';

// Enable RTL
I18nManager.allowRTL(true);
import './global.css'; // Important for Tailwind on Web
if (Platform.OS === 'web') {
  require('./web-build.css');
}
import HomeScreen from './src/screens/HomeScreen';
import { useEffect, useState } from 'react';
import { supabase } from './src/lib/supabase';
import { User } from '@supabase/supabase-js';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrderSummaryScreen from './src/screens/OrderSummaryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setLoading(false);
      } else {
        // SignIn Anonymously
        signInAnon();
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) setLoading(false);
    });

    if (Platform.OS === 'web') {
      // Small polyfill to ensure icons load smoothly on some web setups
      const iconFontStyles = `@font-face {
        src: url(${require('react-native-vector-icons/Fonts/Ionicons.ttf')});
        font-family: Ionicons;
      }
      @font-face {
        src: url(${require('react-native-vector-icons/Fonts/MaterialIcons.ttf')});
        font-family: MaterialIcons;
      }
      @font-face {
        src: url(${require('react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf')});
        font-family: FontAwesome5_Regular;
      }
      @font-face {
        src: url(${require('react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf')});
        font-family: FontAwesome5_Solid;
      }`;
      const style = document.createElement('style');
      style.type = 'text/css';
      if (style.styleSheet) {
        style.styleSheet.cssText = iconFontStyles;
      } else {
        style.appendChild(document.createTextNode(iconFontStyles));
      }
      document.head.appendChild(style);
    }
  }, []);

  const signInAnon = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // User listener will catch the update
    } catch (e) {
      // Ignore "Anonymous sign-ins are disabled" error to prevent red screen
      // Robustly handle auth errors
      const errMsg = e && typeof e === 'object' && 'message' in e ? e.message : JSON.stringify(e);
      if (errMsg.includes("Anonymous sign-ins are disabled")) {
        console.warn('Anon auth disabled, proceeding as Guest');
      } else {
        console.error('Auth error handled:', errMsg);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#E8610A" /></View>;
  }

  const AppContent = (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {(props) => <HomeScreen {...props} userId={user?.id} />}
        </Stack.Screen>
        <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} initialParams={{ userId: user?.id }} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.mobileWrapper}>
          {AppContent}
        </View>
      </View>
    );
  }

  return AppContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6', // gray-100
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileWrapper: {
    width: 400,
    height: 850,
    maxHeight: '100vh',
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderRadius: Platform.OS === 'web' ? 40 : 0, // Rounded corners on web only
    borderWidth: Platform.OS === 'web' ? 8 : 0,
    borderColor: '#1f2937', // Dark border like a phone bezel
  }
});

