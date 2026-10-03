import { localSongs } from "@/data/songs";
import type { Song } from "./types";

/**
 * Single source of songs for the public page.
 *
 * Today this reads the local list in `data/songs.ts`. When Supabase is added,
 * replace the body with a query on the `songs` table ordered by
 * `created_at desc`; nothing else in the app needs to change.
 */
export async function getSongs(): Promise<Song[]> {
  return [...localSongs].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}
