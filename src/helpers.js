import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl) {
  throw new Error("supabaseUrl is required. Проверь файл .env")
}
if (!supabaseKey) {
  throw new Error("supabaseKey is required. Проверь файл .env")
}

export const supabase = createClient(supabaseUrl, supabaseKey)
