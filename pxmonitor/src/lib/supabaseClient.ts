import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cgjyifkqyvyhxymvcwcv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanlpZmtxeXZ5aHh5bXZjd2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTAyNzAsImV4cCI6MjA3MzQ4NjI3MH0.2cu4fhrv3XvRvOExR6hE0JTeYY5dnm_XOIa7TYrhV5M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
