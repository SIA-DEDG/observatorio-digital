import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isConfigured) {
    console.warn('Supabase: defina VITE_SUPABASE_URL e VITE_SUPABASE_KEY no .env')
}

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : null
