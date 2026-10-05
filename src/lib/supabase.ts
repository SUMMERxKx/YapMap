// The one Supabase client the whole app shares. Only src/data/api.ts talks to it;
// screens and the store go through the api layer.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config/supabase';
import type { Database } from '@/data/database.types';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Sessions survive app restarts; AsyncStorage is the standard React Native store
    // for them (the session JSON is too large for the ~2 KB secure-store entries).
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No web-style redirect URLs on native.
    detectSessionInUrl: false,
  },
});
