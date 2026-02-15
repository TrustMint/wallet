
import { createClient } from '@supabase/supabase-js';

// В продакшене эти ключи должны быть в .env файле
// Для теста, когда создашь проект в Supabase, вставь сюда свои данные:
// 1. Project URL (Settings -> API)
// 2. anon / public Key (Settings -> API)

const SUPABASE_URL = 'https://dyekzklveneeszorjnwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZWt6a2x2ZW5lZXN6b3JqbndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4ODk4MzYsImV4cCI6MjA4NTQ2NTgzNn0.wtnAZ9F0mQ9vITZ3KV-O-RlWdrE3GiFmBLYguU4QCU4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper for image URLs if you use Supabase Storage
export const getStorageUrl = (path: string) => {
    return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
};
