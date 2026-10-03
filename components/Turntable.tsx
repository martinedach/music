"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import type { Song } from "@/lib/types";
import { DECK, armAngleForProgress, armRestPosition } from "@/lib/geometry";
import { site } from "@/lib/site";
import type { Phase, Speed, Swap } from "./Player";
import { TIMING } from "./Player";
import Tonearm from "./Tonearm";
import VolumeKnob from "./VolumeKnob";
import SeekRail from "./SeekRail";
import VuMeter from "./VuMeter";
import styles from "./Turntable.module.css";

type Props = {
  song: Song | null;
  phase: Phase;
  swap: Swap;
  speed: Speed;
  progress: number;
  time: { current: number; duration: number };
  volume: number;
  levels: (out: [number, number]) => void;
  /** Set on the platter mat; the flying record aims for it. */
  platterRef: RefObject<HTMLDivElement | null>;
  onVolume: (v: number) => void;
  onSeek: (progress: number) => void;
  onSpeed: () => void;
  onToggle: () => void;
  disabled: boolean;
};

const DEG_PER_SEC: Record<Speed, number> = { 33: 200, 45: 270 };

type SpinRefs = {
  vinyl: RefObject<HTMLDivElement | null>;
  warp: RefObject<HTMLDivElement | null>;
  glint: RefObject<HTMLDivElement | null>;
  rim: RefObject<HTMLDivElement | null>;
};

/** Drives the platter: eased ramp to speed, a faint warp wobble, drifting glint and strobe dots. */
function useSpin(refs: SpinRefs, spinning: boolean, speed: Speed) {
  const state = useRef({ angle: 0, omega: 0, raf: 0, last: 0 });

  useEffect(() => {
    const s = state.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - s.last) / 1000 || 0);
      s.last = now;

      const target = spinning ? DEG_PER_SEC[speed] : 0;
      const tau = spinning ? 0.75 : 1.2;
      s.omega += (target - s.omega) * (1 - Math.exp(-dt / tau));
      if (!spinning) s.omega = Math.max(0, s.omega - 25 * dt); // static friction
      s.angle = (s.angle + s.omega * dt) % 360;

      const rad = (s.angle * Math.PI) / 180;
      if (refs.vinyl.current) refs.vinyl.current.style.transform = `rotate(${s.angle}deg)`;
      if (refs.warp.current && !reduce) {
        refs.warp.current.style.transform = `rotate3d(${Math.cos(rad).toFixed(4)}, ${Math.sin(rad).toFixed(4)}, 0, 1.1deg)`;
      }
      if (refs.glint.current) refs.glint.current.style.transform = `rotate(${-s.angle * 0.45}deg)`;
      if (refs.rim.current) refs.rim.current.style.transform = `rotate(${s.angle * 0.012}deg)`;

      if (spinning || s.omega > 0) s.raf = requestAnimationFrame(tick);
      else s.raf = 0;
    };

    if (!s.raf) {
      s.last = performance.now();
      s.raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [spinning, speed, refs]);
}

export default function Turntable({
  song,
  phase,
  swap,
  speed,
  progress,
  time,
  volume,
  levels,
  platterRef,
  onVolume,
  onSeek,
  onSpeed,
  onToggle,
  disabled,
}: Props) {
  const vinylRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const spinRefs = useRef<SpinRefs>({ vinyl: vinylRef, warp: warpRef, glint: glintRef, rim: rimRef });

  const spinning = phase === "cueing" || phase === "playing";
  const playing = phase === "playing";
  useSpin(spinRefs.current, spinning, speed);

  const parked = phase === "rest" || phase === "lifting";
  const armAngle = parked ? DECK.restAngle : armAngleForProgress(progress);
  const armTransition =
    phase === "cueing"
      ? `${TIMING.cue}ms cubic-bezier(.45,0,.2,1)`
      : phase === "lifting"
        ? `${TIMING.lift}ms cubic-bezier(.45,0,.2,1)`
        : playing
          ? "500ms linear"
          : "0ms";

  const rest = armRestPosition();
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const vars = {
    "--p-cx": `${DECK.platter.cx}cqw`,
    "--p-cy": `${DECK.platter.cy}cqw`,
    "--p-r": `${DECK.platter.r}cqw`,
    "--vinyl-inset": `${DECK.platter.r - DECK.vinylR}cqw`,
    "--label-d": `${DECK.labelR * 2}cqw`,
    "--pivot-x": `${DECK.pivot.x}cqw`,
    "--pivot-y": `${DECK.pivot.y}cqw`,
    "--rest-x": `${r3(rest.x)}cqw`,
    "--rest-y": `${r3(rest.y)}cqw`,
    "--rest-angle": `${r3(rest.angle)}deg`,
  } as CSSProperties;

  // The arm's reflection is clipped to the vinyl, so it's positioned relative to it.
  const vinylLeft = DECK.platter.cx - DECK.vinylR;
  const vinylTop = DECK.platter.cy - DECK.vinylR;
  const reflectionStyle = {
    left: `${DECK.pivot.x - 7 - vinylLeft}cqw`,
    top: `${DECK.pivot.y - 10 - vinylTop}cqw`,
  } as CSSProperties;

  const swapClass = swap === "out" ? styles.out : swap === "in" ? styles.in : "";
  const playIcon = spinning ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" />
    </svg>
  );

  return (
    <div className={styles.deck} style={vars} data-playing={playing ? "true" : undefined}>
      <div className={styles.stage}>
        <div className={styles.plinth}>
          {/* dust cover, propped open behind the deck */}
          <div className={styles.lid} />
          <i className={styles.hinge} style={{ left: "11cqw" }} />
          <i className={styles.hinge} style={{ left: "63cqw" }} />

          <i className={styles.screw} style={{ left: "2.4cqw", top: "2.4cqw" }} />
          <i className={styles.screw} style={{ right: "2.4cqw", top: "2.4cqw", "--s": "-30deg" } as CSSProperties} />
          <i className={styles.screw} style={{ left: "2.4cqw", top: "95cqw", "--s": "60deg" } as CSSProperties} />
          <i className={styles.screw} style={{ right: "2.4cqw", top: "95cqw", "--s": "10deg" } as CSSProperties} />

          {/* 33 / 45 speed switch */}
          <button
            type="button"
            className={styles.speed}
            onClick={onSpeed}
            aria-label={`Platter speed, currently ${speed} rpm`}
            aria-pressed={speed === 45}
          >
            <span className={styles.speedLabel}>33</span>
            <span className={styles.speedSlot}>
              <span className={styles.speedKnob} />
            </span>
            <span className={styles.speedLabel}>45</span>
          </button>

          <VuMeter levels={levels} active={playing} />

          <div className={styles.platter}>
            <div ref={rimRef} className={styles.rim} />
            <div ref={platterRef} className={styles.mat} />
            <div className={`${styles.vinylWrap} ${swapClass}`}>
              {song && (
                <div ref={warpRef} className={styles.warp}>
                  <div ref={vinylRef} className={styles.vinyl}>
                    <div className={styles.label} data-cover={song.cover_url ? "true" : "false"}>
                      {song.cover_url && (
                        <div
                          className={styles.labelCover}
                          style={{ backgroundImage: `url("${song.cover_url}")` }}
                        />
                      )}
                      <span className={styles.labelTop}>{speed} RPM · SIDE A</span>
                      <span className={styles.labelTitle}>{song.title}</span>
                      <span className={styles.labelArtist}>{song.artist}</span>
                      <span className={styles.labelBottom}>Stereo · Long Play</span>
                      <span className={styles.hole} />
                    </div>
                  </div>
                  <div ref={glintRef} className={styles.glint} />
                  <div className={styles.sheen} />
                  <div className={styles.reflectionClip}>
                    <Tonearm
                      variant="reflection"
                      angle={armAngle}
                      down={playing}
                      transition={armTransition}
                      style={reflectionStyle}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className={styles.spindle} />
          </div>

          <div className={styles.armRest} />
          <div className={styles.armBase} />
          <Tonearm variant="shadow" angle={armAngle} down={playing} transition={armTransition} />
          <Tonearm angle={armAngle} down={playing} transition={armTransition} />

          {/* cue lever: up while the arm is lifted, down while it plays */}
          <button
            type="button"
            className={`${styles.cue} ${playing ? styles.cueDown : ""}`}
            onClick={onToggle}
            disabled={disabled}
            aria-label={playing ? "Lift the tonearm" : "Lower the tonearm"}
          >
            <span className={styles.cueBase} />
            <span className={styles.cueLever} />
          </button>

          <SeekRail
            progress={progress}
            current={time.current}
            duration={time.duration}
            disabled={!song || time.duration <= 0}
            onSeek={onSeek}
          />

          <div className={styles.knobSlot}>
            <VolumeKnob value={volume} onChange={onVolume} />
          </div>
          <span className={`${styles.caption} ${styles.knobCaption}`}>Volume</span>

          <button
            type="button"
            className={styles.playButton}
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={spinning}
            aria-label={spinning ? "Pause" : "Play"}
          >
            {playIcon}
          </button>
          <span className={`${styles.caption} ${styles.playCaption}`}>{spinning ? "Pause" : "Play"}</span>

          {/* sloped front fascia */}
          <div className={styles.fascia}>
            <span className={styles.plateText}>{site.plate}</span>
            <i className={styles.led} />
          </div>
        </div>
      </div>
    </div>
  );
}
