"use client";

import type { CSSProperties } from "react";
import type { Song } from "@/lib/types";
import styles from "./RecordShelf.module.css";

type Props = {
  songs: Song[];
  activeIndex: number;
  onSelect: (index: number) => void;
  disabled: boolean;
};

/** Sleeve colourways for songs without cover art, cycled along the shelf. */
const SLEEVES = [
  { bg: "var(--mustard)", ink: "var(--walnut-900)" },
  { bg: "var(--burnt)", ink: "var(--cream)" },
  { bg: "var(--cream-2)", ink: "var(--walnut-800)" },
  { bg: "var(--walnut-600)", ink: "var(--cream)" },
];

export default function RecordShelf({ songs, activeIndex, onSelect, disabled }: Props) {
  return (
    <section className={styles.shelf} aria-label="Records on the shelf">
      <p className={styles.shelfLabel}>From the shelf</p>
      <ul className={styles.row}>
        {songs.map((song, i) => {
          const active = i === activeIndex;
          const colours = SLEEVES[i % SLEEVES.length];
          return (
            <li key={song.id} className={styles.item}>
              <button
                type="button"
                className={`${styles.record} ${active ? styles.active : ""}`}
                onClick={() => onSelect(i)}
                disabled={disabled}
                aria-current={active ? "true" : undefined}
                aria-label={`${song.title} by ${song.artist}${active ? " (on the platter)" : ""}`}
                title={`${song.title} — ${song.artist}`}
                style={{ "--sleeve-bg": colours.bg, "--sleeve-ink": colours.ink } as CSSProperties}
              >
                <span className={styles.disc} />
                <span className={styles.sleeve}>
                  {song.cover_url ? (
                    // Plain img: covers may live on any host once Supabase is wired in.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.cover} src={song.cover_url} alt="" loading="lazy" />
                  ) : (
                    <span className={styles.art}>
                      <span className={styles.artTitle}>{song.title}</span>
                      <span className={styles.artArtist}>{song.artist}</span>
                    </span>
                  )}
                </span>
                {active && <span className={styles.tag}>On deck</span>}
              </button>
              <span className={styles.tier} aria-hidden="true" />
            </li>
          );
        })}
      </ul>
      <div className={styles.plank} />
    </section>
  );
}
