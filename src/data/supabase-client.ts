// The one Supabase client the whole app shares. Only src/data/api.ts talks to it;
// screens and the store go through the api layer.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config/supabase';

import type { Database } from './database.types';

const authOptions: SupabaseClientOptions<'public'>['auth'] = {
  autoRefreshToken: true,
  persistSession: true,
  // No web-style redirect URLs on native.
  detectSessionInUrl: false,
};

if (Platform.OS !== 'web') {
  // Sessions survive app restarts; AsyncStorage is the standard React Native store
  // for them (the session JSON is too large for the ~2 KB secure-store entries).
  authOptions.storage = AsyncStorage;
} else {
  // On web, leave storage unset. The web page is server-rendered in Node, where
  // AsyncStorage's web build reads window.localStorage and crashes the dev server
  // because window does not exist there. supabase-js picks its own storage instead.
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: authOptions,
});
