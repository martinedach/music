"use client";

import type { CSSProperties } from "react";
import type { Song } from "@/lib/types";
import { sleeveColours } from "@/lib/sleeves";
import styles from "./RecordShelf.module.css";

type Props = {
  songs: Song[];
  activeIndex: number;
  /** `disc` is the record element inside the sleeve, used as the flight's start point. */
  onSelect: (index: number, disc: HTMLElement | null) => void;
  disabled: boolean;
};

/** A wooden crate of records to flick through. */
export default function RecordShelf({ songs, activeIndex, onSelect, disabled }: Props) {
  return (
    <section className={styles.shelf} aria-label="Records in the crate">
      <p className={styles.shelfLabel}>From the crate</p>
      <div className={styles.crate}>
        <div className={styles.crateBack} />
        <ul className={styles.bin} style={{ "--n": songs.length } as CSSProperties}>
          {songs.map((song, i) => {
            const active = i === activeIndex;
            const colours = sleeveColours(i);
            return (
              <li
                key={song.id}
                className={styles.slot}
                data-song-index={i}
                style={{ "--i": i, zIndex: songs.length - i } as CSSProperties}
              >
                <button
                  type="button"
                  className={`${styles.record} ${active ? styles.active : ""}`}
                  onClick={(e) => onSelect(i, e.currentTarget.querySelector<HTMLElement>("[data-disc]"))}
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  aria-label={`${song.title} by ${song.artist}${active ? " (on the platter)" : ""}`}
                  title={`${song.title} — ${song.artist}`}
                  style={{ "--sleeve-bg": colours.bg, "--sleeve-ink": colours.ink } as CSSProperties}
                >
                  <span className={styles.disc} data-disc="" />
                  <span className={styles.sleeve}>
                    {song.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.cover} src={song.cover_url} alt="" loading="lazy" />
                    ) : (
                      <span className={styles.art}>
                        <span className={styles.artTitle}>{song.title}</span>
                        <span className={styles.artArtist}>{song.artist}</span>
                        <i className={styles.artRing} />
                      </span>
                    )}
                  </span>
                  {active && <span className={styles.tag}>On deck</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className={styles.crateFront}>
          <span className={styles.stencil}>Long Play · 33⅓</span>
        </div>
      </div>
    </section>
  );
}
