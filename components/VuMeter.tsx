"use client";

import { useEffect, useRef } from "react";
import styles from "./Turntable.module.css";

type Props = {
  /** Writes each channel's RMS level (0..1) into the array. */
  levels: (out: [number, number]) => void;
  active: boolean;
};

const SWEEP = 84; // degrees of needle travel

/** Two needle meters that follow the music, with VU-style ballistics. */
export default function VuMeter({ levels, active }: Props) {
  const needleL = useRef<HTMLDivElement>(null);
  const needleR = useRef<HTMLDivElement>(null);
  const state = useRef({ l: 0, r: 0, raf: 0 });

  useEffect(() => {
    const s = state.current;
    const out: [number, number] = [0, 0];
    const toNorm = (rms: number) => {
      const db = 20 * Math.log10(Math.max(rms, 1e-4));
      return Math.min(1, Math.max(0, (db + 42) / 45));
    };
    const tick = () => {
      if (active) levels(out);
      else out[0] = out[1] = 0;
      const tl = toNorm(out[0]);
      const tr = toNorm(out[1]);
      s.l += (tl - s.l) * (tl > s.l ? 0.35 : 0.07);
      s.r += (tr - s.r) * (tr > s.r ? 0.35 : 0.07);
      if (needleL.current) needleL.current.style.transform = `rotate(${-SWEEP / 2 + SWEEP * s.l}deg)`;
      if (needleR.current) needleR.current.style.transform = `rotate(${-SWEEP / 2 + SWEEP * s.r}deg)`;
      if (active || s.l > 0.002 || s.r > 0.002) s.raf = requestAnimationFrame(tick);
      else s.raf = 0;
    };
    if (!s.raf) s.raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [active, levels]);

  const meters: [string, React.RefObject<HTMLDivElement | null>][] = [
    ["L", needleL],
    ["R", needleR],
  ];

  return (
    <div className={styles.vuPair} aria-hidden="true">
      {meters.map(([channel, ref]) => (
        <div key={channel} className={styles.vu}>
          <div className={styles.vuFace}>
            <i className={styles.vuScale} />
            <i className={styles.vuRed} />
            <span className={styles.vuText}>VU</span>
            <span className={styles.vuChannel}>{channel}</span>
            <div ref={ref} className={styles.vuNeedle} />
            <i className={styles.vuPivot} />
            <i className={styles.vuGlass} />
          </div>
        </div>
      ))}
    </div>
  );
}
