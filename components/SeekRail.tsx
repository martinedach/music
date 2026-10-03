"use client";

import type { CSSProperties } from "react";
import { formatTime } from "@/lib/format";
import styles from "./Turntable.module.css";

type Props = {
  progress: number; // 0..1
  current: number;
  duration: number;
  disabled: boolean;
  onSeek: (progress: number) => void;
};

const STEPS = 1000;

/** A brass slide rail for scrubbing through the side. */
export default function SeekRail({ progress, current, duration, disabled, onSeek }: Props) {
  const value = Math.round(Math.min(1, Math.max(0, progress)) * STEPS);
  return (
    <div className={styles.seek} style={{ "--fill": `${(value / STEPS) * 100}%` } as CSSProperties}>
      <input
        type="range"
        className={styles.seekInput}
        min={0}
        max={STEPS}
        step={1}
        value={value}
        disabled={disabled}
        aria-label="Seek"
        aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
        onChange={(e) => onSeek(Number(e.currentTarget.value) / STEPS)}
      />
      <div className={styles.seekTimes} aria-hidden="true">
        <span>{formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
