import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Patent = {
  id: string;
  user_id: string;
  patent_number: string;
  title: string;
  abstract: string;
  applicant: string;
  filing_date: string;
  status: string;
  classification: string;
  citations_count: number;
  similarity_score: number;
  related_patents: string[];
  created_at: string;
};

export type ChatConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  display_name: string;
  role: 'analyst' | 'admin';
  created_at: string;
};
