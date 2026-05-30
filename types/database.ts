export type UserRole = "Julie" | "Shawn" | "Parents";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  streak_count: number;
  longest_streak: number;
  last_entry_date: string | null;
  reminder_time: string;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  char_count: number;
  has_emotion_word: boolean;
  emotion_words_found: string[];
  ai_response: string | null;
  entry_date: string;
  created_at: string;
}

// Matches the GenericSchema shape required by @supabase/supabase-js
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          role: string;
          display_name: string;
          streak_count?: number | undefined;
          longest_streak?: number | undefined;
          last_entry_date?: string | null | undefined;
          reminder_time?: string | undefined;
          created_at?: string | undefined;
        };
        Update: {
          role?: string | undefined;
          display_name?: string | undefined;
          streak_count?: number | undefined;
          longest_streak?: number | undefined;
          last_entry_date?: string | null | undefined;
          reminder_time?: string | undefined;
          created_at?: string | undefined;
        };
        Relationships: never[];
      };
      entries: {
        Row: Entry;
        Insert: {
          id?: string | undefined;
          user_id: string;
          content: string;
          char_count: number;
          has_emotion_word: boolean;
          emotion_words_found: string[];
          ai_response?: string | null | undefined;
          entry_date: string;
          created_at?: string | undefined;
        };
        Update: {
          content?: string | undefined;
          char_count?: number | undefined;
          has_emotion_word?: boolean | undefined;
          emotion_words_found?: string[] | undefined;
          ai_response?: string | null | undefined;
          entry_date?: string | undefined;
          created_at?: string | undefined;
        };
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
