import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "";
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabaseUrl = rawUrl.trim();
const supabaseAnonKey = rawKey.trim();

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_SUPABASE")) {
  console.warn("⚠️ SUPABASE KEYS MISSING: Please check your .env file.");
}

let supabaseClient = null;
try {
  if (supabaseUrl && supabaseUrl.startsWith("http")) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    throw new Error("Invalid Supabase URL");
  }
} catch (e) {
  console.error("Supabase Init Error:", e.message);
  // Fail-safe dummy client to prevent White Screen
  supabaseClient = {
    auth: { 
      getSession: () => Promise.resolve({ data: { session: null } }), 
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve()
    },
    from: () => ({ 
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null })
      }) 
    }),
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) }
  };
}

export const supabase = supabaseClient;
