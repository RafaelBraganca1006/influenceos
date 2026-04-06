import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zumwbzvdpwmafzrymndo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bXdienZkcHdtYWZ6cnltbmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDIxMDgsImV4cCI6MjA5MTAxODEwOH0.B7wrR5O1nym3dXJ-uB0FTkuYLd3giKMv0vQmCAnaO-0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
