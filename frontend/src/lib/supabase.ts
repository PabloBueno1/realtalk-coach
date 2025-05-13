import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Verify that we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Contacts Supabase project for the contact form
const contactsSupabaseUrl = process.env.REACT_APP_CONTACTS_SUPABASE_URL || '';
const contactsSupabaseAnonKey = process.env.REACT_APP_CONTACTS_SUPABASE_ANON_KEY || '';

if (!contactsSupabaseUrl || !contactsSupabaseAnonKey) {
  console.error('Missing Contacts Supabase environment variables. Please check your .env file.');
}

export const supabaseContacts = createClient(contactsSupabaseUrl, contactsSupabaseAnonKey); 

