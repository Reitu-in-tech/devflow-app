import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptinhcwpcbbxajuymoz.supabase.co';
const supabaseAnonKey = 'sb_publishable_uQXefh4DvA38ej-Bg1MHdg_JHaOUQp7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);