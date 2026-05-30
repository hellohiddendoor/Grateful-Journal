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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
      };
      entries: {
        Row: Entry;
        Insert: Omit<Entry, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Entry, "id" | "user_id">>;
      };
    };
  };
}
