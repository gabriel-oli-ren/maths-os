import { createClient } from "@supabase/supabase-js";

// Hardcoded per user request — anon key is safe to ship in browser bundle (RLS protects data).
const SUPABASE_URL = "https://hsmfjpetvcsgkpkwpdjr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbWZqcGV0dmNzZ2twa3dwZGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDc0MzEsImV4cCI6MjA3OTMyMzQzMX0.IBiJtUJBPyjNwGowfgnlfrbHpb46C43NmYY3O9rEFqQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

export type DbUser = {
  id: string;
  username: string;
  display_name: string | null;
  friend_code: string;
  role: string | null;
  is_admin: boolean | null;
  created_at: string | null;
};

export type DbMessage = {
  id: number;
  sender_id: string | null;
  receiver_id: string | null;
  content: string;
  status: string | null;
  created_at: string | null;
  content_type: string | null;
  sticker_url: string | null;
};

export type DbFriendship = {
  id: string;
  user_id: string | null;
  friend_id: string | null;
  status: string | null;
  identity_revealed: boolean | null;
  created_at: string | null;
};

export type DbPresence = {
  user_id: string;
  game_name: string | null;
  game_url: string | null;
  updated_at: string | null;
  last_active: string | null;
};
