import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://esrsppmzbpvlycxazoro.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzcnNwcG16YnB2bHljeGF6b3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMTU1NjQsImV4cCI6MjA1NzY5MTU2NH0.rO_qZxTKzhcS05HNUBKAZVDF3ouf5T0IzA2R0Nde1vY'

export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey
)

export type SupabaseClient = typeof supabase 