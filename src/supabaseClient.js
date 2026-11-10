import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
supabase
  .from('spielstaende')
  .select('id')
  .limit(1)
  .then(({ data, error }) => {
    console.log('Supabase-Test:', error || data)
  })