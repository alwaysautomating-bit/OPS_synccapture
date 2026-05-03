const readEnv = (key: string) => {
  const viteValue = typeof import.meta !== 'undefined' ? import.meta.env?.[key] : undefined;
  const processValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  return viteValue ?? processValue ?? '';
};

export const firebaseApiKey = readEnv('VITE_FIREBASE_API_KEY');
export const firebaseAuthDomain = readEnv('VITE_FIREBASE_AUTH_DOMAIN');
export const firebaseProjectId = readEnv('VITE_FIREBASE_PROJECT_ID');
export const firebaseStorageBucket = readEnv('VITE_FIREBASE_STORAGE_BUCKET');
export const firebaseMessagingSenderId = readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
export const firebaseAppId = readEnv('VITE_FIREBASE_APP_ID');

export const isFirebaseConfigured = Boolean(
  firebaseApiKey &&
  firebaseAuthDomain &&
  firebaseProjectId &&
  firebaseStorageBucket &&
  firebaseMessagingSenderId &&
  firebaseAppId
);

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
