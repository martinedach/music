/** Mirrors the planned Supabase `songs` table. */
export type Song = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  created_at: string; // ISO 8601
};
