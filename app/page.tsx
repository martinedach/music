import Player from "@/components/Player";
import { getSongs } from "@/lib/songs";

// Songs will come from a database; render fresh on every request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const songs = await getSongs();
  return (
    <main>
      <Player songs={songs} />
    </main>
  );
}
