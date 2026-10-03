import type { Song } from "@/lib/types";

/**
 * Local song list used until Supabase is wired up.
 *
 * To add a song today: drop the audio file in `public/audio/` (and optional
 * cover art in `public/covers/`), then add an entry here. Newest `created_at`
 * is shown on the platter first. With a single entry the record shelf is hidden.
 */
export const localSongs: Song[] = [
  {
    id: "porch-light",
    title: "Porch Light",
    artist: "The Listening Room",
    audio_url: "/audio/porch-light.wav",
    cover_url: null,
    created_at: "2026-10-04T10:00:00Z",
  },
  {
    id: "amber-evening",
    title: "Amber Evening",
    artist: "The Listening Room",
    audio_url: "/audio/amber-evening.wav",
    cover_url: null,
    created_at: "2026-10-03T10:00:00Z",
  },
];
