import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tssjnvyqvzocqntvssco.supabase.co'
const supabaseKey = 'sb_publishable_eVlH-_ITZKhNNOsKB890cQ_Nacto5eW'

export const supabase = createClient(supabaseUrl, supabaseKey)
