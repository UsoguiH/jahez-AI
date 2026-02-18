import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, I18nManager } from 'react-native';

// Enable RTL
I18nManager.allowRTL(true);
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

  return (
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

