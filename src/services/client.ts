import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Único ponto do site que conhece o Supabase. Telas e hooks falam com os arquivos de src/services/.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
