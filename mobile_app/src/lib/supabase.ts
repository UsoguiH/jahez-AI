import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vnqtonsbvnaxtoldvycy.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucXRvbnNidm5heHRvbGR2eWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDE5MzUsImV4cCI6MjA4NjkxNzkzNX0.4T1Fj0qT1eb8lBLIXr5cF87V6vBb626ufM_fvh3qmlE';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
