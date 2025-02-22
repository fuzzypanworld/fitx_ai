
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://olcnfmrixglengxpiexf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sY25mbXJpeGdsZW5neHBpZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1MjE2MTMsImV4cCI6MjA1NTA5NzYxM30.s7xLCt5VR5vZLzgWBM9oVab-K2Wiw1skDWfSt-hLq40";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
