import { createClient } from '@supabase/supabase-js'

// URL y ANON KEY de tu proyecto Supabase
const supabaseUrl ='https://eybqcrjftagfluphzuol.supabase.co'
const supabaseKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnFjcmpmdGFnZmx1cGh6dW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDQ0NDksImV4cCI6MjA4MDE4MDQ0OX0.EGa37t_tnU9fHUS8UFTfnQIWDNk7Yzv998yg4F5dQKg'

export const supabase = createClient(supabaseUrl, supabaseKey)


