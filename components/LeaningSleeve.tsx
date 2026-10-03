import type { CSSProperties } from "react";
import type { Song } from "@/lib/types";
import { sleeveColours } from "@/lib/sleeves";
import styles from "./Player.module.css";

/** The current record's sleeve, leaning against the wall beside the deck. */
export default function LeaningSleeve({ song, index }: { song: Song; index: number }) {
  const colours = sleeveColours(index);
  return (
    <div className={styles.lean} aria-hidden="true">
      <div
        key={song.id}
        className={styles.leanSleeve}
        style={{ "--sleeve-bg": colours.bg, "--sleeve-ink": colours.ink } as CSSProperties}
      >
        {song.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.leanCover} src={song.cover_url} alt="" />
        ) : (
          <div className={styles.leanArt}>
            <span className={styles.leanTitle}>{song.title}</span>
            <span className={styles.leanArtist}>{song.artist}</span>
            <i className={styles.leanRing} />
          </div>
        )}
      </div>
      <div className={styles.leanShadow} />
    </div>
  );
}
