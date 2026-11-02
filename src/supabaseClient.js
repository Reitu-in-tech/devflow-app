import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptinhcwhpcbbxajuymoz.supabase.co';
const supabaseAnonKey = 'sb_publishable_uQXefh4DvA38ej-BglMHdg_JHaOUQp7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);