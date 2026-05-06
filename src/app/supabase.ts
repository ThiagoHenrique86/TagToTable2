import { createClient } from '@supabase/supabase-js';

// These are replaced at build time by the --define flag
declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;

const getEnvVar = (name: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string => {
  try {
    if (name === 'SUPABASE_URL') {
      return typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    }
    if (name === 'SUPABASE_ANON_KEY') {
      return typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    }
  } catch {
    // Fallback if the variable is not defined at all
  }
  return '';
};

const url = getEnvVar('SUPABASE_URL');
const key = getEnvVar('SUPABASE_ANON_KEY');

// Detect environment
const isBrowser = typeof window !== 'undefined';

if (!url || url === 'https://placeholder.supabase.co' || url === 'undefined') {
  console.warn('SUPABASE_URL is missing or invalid. Check Environment Variables.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder',
  {
    auth: {
      persistSession: isBrowser,
    }
  }
);
