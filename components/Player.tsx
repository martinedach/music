"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Song } from "@/lib/types";
import { AudioEngine } from "@/lib/audio-engine";
import { useDominantColor } from "@/lib/use-dominant-color";
import Turntable from "./Turntable";
import RecordShelf from "./RecordShelf";
import LeaningSleeve from "./LeaningSleeve";
import FlyingRecord from "./FlyingRecord";
import Lamp from "./Lamp";
import RoomProps from "./RoomProps";
import styles from "./Player.module.css";

/**
 * rest     – arm parked, platter still
 * cueing   – arm swinging onto the record, platter easing up to speed
 * playing  – stylus in the groove, music on
 * lifting  – arm returning to its rest, platter slowing
 */
export type Phase = "rest" | "cueing" | "playing" | "lifting";
export type Swap = "idle" | "out" | "in";
export type Speed = 33 | 45;

export const TIMING = {
  cue: 1500,
  lift: 1100,
  swap: 450,
  flight: 720,
  spinDown: 450,
  spinUp: 400,
  speedChange: 900,
} as const;

/** Playback rate for each platter speed; 45 on a 33 record is the classic chipmunk. */
export const rateFor = (speed: Speed) => (speed === 45 ? 1.35 : 1);

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type PitchyAudio = HTMLAudioElement & { preservesPitch?: boolean };
type Flight = { from: DOMRect; to: DOMRect; index: number };

export default function Player({ songs }: { songs: Song[] }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("rest");
  const [swap, setSwap] = useState<Swap>("idle");
  const [speed, setSpeed] = useState<Speed>(33);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);

  const audioRef = useRef<PitchyAudio>(null);
  const platterRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const phaseRef = useRef<Phase>("rest");
  const volumeRef = useRef(volume);
  const speedRef = useRef<Speed>(33);
  const seqRef = useRef(0);
  const rampRef = useRef(0);
  const seekQuietUntil = useRef(0);

  const song = songs[index] ?? null;
  const tint = useDominantColor(song?.cover_url ?? null);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const engine = () => {
    engineRef.current ??= new AudioEngine();
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __audioEngine?: AudioEngine }).__audioEngine = engineRef.current;
    }
    return engineRef.current;
  };
  const levels = useCallback((out: [number, number]) => engine().levels(out), []);

  /** Glide playbackRate between two values; used for the start/stop "wow". */
  const rampRate = useCallback(
    (audio: PitchyAudio, from: number, to: number, ms: number, done?: () => void) => {
      cancelAnimationFrame(rampRef.current);
      if (typeof audio.preservesPitch === "boolean") audio.preservesPitch = false;
      const t0 = performance.now();
      audio.playbackRate = from;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        const eased = to > from ? 1 - (1 - k) * (1 - k) : k * k;
        audio.playbackRate = from + (to - from) * eased;
        if (k < 1) rampRef.current = requestAnimationFrame(step);
        else done?.();
      };
      rampRef.current = requestAnimationFrame(step);
    },
    [],
  );

  const stopAudio = useCallback(
    (audio: PitchyAudio, withWow: boolean) => {
      engineRef.current?.stopCrackle(withWow ? 0.7 : 0.3);
      const base = rateFor(speedRef.current);
      if (withWow) {
        rampRate(audio, audio.playbackRate, base * 0.5, TIMING.spinDown, () => {
          audio.pause();
          audio.playbackRate = base;
        });
      } else {
        cancelAnimationFrame(rampRef.current);
        audio.pause();
        audio.playbackRate = base;
      }
      audio.muted = false;
    },
    [rampRate],
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const seq = ++seqRef.current;
    setError(null);

    // Unlock audio inside the gesture: the song starts muted while the arm
    // swings over, then is rewound and unmuted when the stylus lands.
    const eng = engine();
    eng.prime();
    eng.setVolume(volumeRef.current);
    audio.volume = eng.routed ? 1 : volumeRef.current;
    const base = rateFor(speedRef.current);
    const startAt = audio.ended ? 0 : audio.currentTime;
    audio.playbackRate = base;
    audio.muted = true;
    const started = audio.play();
    setPhaseSync("cueing");

    try {
      await Promise.all([started, wait(TIMING.cue)]);
    } catch {
      if (seq !== seqRef.current) return;
      audio.muted = false;
      setPhaseSync("lifting");
      setError("Playback was blocked. Tap play once more.");
      await wait(TIMING.lift);
      if (seq === seqRef.current) setPhaseSync("rest");
      return;
    }
    if (seq !== seqRef.current) return;

    // Only hand the song to the Web Audio graph once the context has proven
    // its clock is running; otherwise keep plain element playback.
    if (eng.healthy) {
      eng.attach(audio);
      audio.volume = eng.routed ? 1 : volumeRef.current;
      eng.startCrackle();
      eng.setCrackleRate(base);
    }
    audio.currentTime = startAt;
    audio.muted = false;
    rampRate(audio, base * 0.9, base, TIMING.spinUp);
    setPhaseSync("playing");
  }, [rampRate]);

  const pause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const seq = ++seqRef.current;
    stopAudio(audio, phaseRef.current === "playing");
    setPhaseSync("lifting");
    await wait(TIMING.lift);
    if (seq === seqRef.current) setPhaseSync("rest");
  }, [stopAudio]);

  const toggle = useCallback(() => {
    if (busy || !song) return;
    if (phaseRef.current === "playing" || phaseRef.current === "cueing") void pause();
    else void play();
  }, [busy, song, pause, play]);

  /** Lift the arm if needed, slide the record out, fly the new one in, drop it on. */
  const selectSong = useCallback(
    async (next: number, disc: HTMLElement | null, resume = false) => {
      const audio = audioRef.current;
      if (!audio || next === index || busy) return;
      const seq = ++seqRef.current;
      setBusy(true);

      const active = phaseRef.current === "playing" || phaseRef.current === "cueing";
      if (active) {
        stopAudio(audio, phaseRef.current === "playing");
        setPhaseSync("lifting");
        await wait(TIMING.lift);
        if (seq !== seqRef.current) return;
        setPhaseSync("rest");
      }

      setSwap("out");
      await wait(TIMING.swap);
      if (seq !== seqRef.current) return;

      if (disc && platterRef.current) {
        setFlight({
          from: disc.getBoundingClientRect(),
          to: platterRef.current.getBoundingClientRect(),
          index: next,
        });
        await wait(TIMING.flight);
        if (seq !== seqRef.current) return;
      }

      setIndex(next);
      setProgress(0);
      setTime({ current: 0, duration: 0 });
      setSwap("in");
      setFlight(null);
      await wait(TIMING.swap);
      if (seq !== seqRef.current) return;

      setSwap("idle");
      setBusy(false);
      if (active || resume) void play();
    },
    [index, busy, stopAudio, play],
  );

  const handleVolume = useCallback((v: number) => {
    volumeRef.current = v;
    setVolume(v);
    const eng = engineRef.current;
    if (eng) eng.setVolume(v);
    if (audioRef.current && !eng?.routed) audioRef.current.volume = v;
  }, []);

  const handleSpeed = useCallback(() => {
    const next: Speed = speedRef.current === 33 ? 45 : 33;
    speedRef.current = next;
    setSpeed(next);
    const audio = audioRef.current;
    const base = rateFor(next);
    engineRef.current?.setCrackleRate(base);
    if (audio && phaseRef.current === "playing") {
      rampRate(audio, audio.playbackRate, base, TIMING.speedChange);
    } else if (audio) {
      audio.playbackRate = base;
    }
  }, [rampRate]);

  const handleSeek = useCallback((p: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const target = Math.min(duration - 0.05, Math.max(0, p * duration));
    audio.currentTime = target;
    // Ignore stale timeupdate events for a moment so the rail doesn't jump back.
    seekQuietUntil.current = performance.now() + 350;
    setProgress(target / duration);
    setTime({ current: target, duration });
  }, []);

  const handleEnded = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const seq = ++seqRef.current;
    engineRef.current?.stopCrackle(0.8);
    audio.playbackRate = rateFor(speedRef.current);
    setPhaseSync("lifting");
    setProgress(1);
    await wait(TIMING.lift);
    if (seq !== seqRef.current) return;
    setPhaseSync("rest");
    if (songs.length > 1) {
      const next = (index + 1) % songs.length;
      const disc = document.querySelector<HTMLElement>(`[data-song-index="${next}"] [data-disc]`);
      void selectSong(next, disc, true);
    }
  }, [index, songs.length, selectSong]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || phaseRef.current !== "playing") return;
    if (performance.now() < seekQuietUntil.current) return;
    const duration = audio.duration || 0;
    setTime({ current: audio.currentTime, duration });
    setProgress(duration > 0 ? audio.currentTime / duration : 0);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setTime((t) => ({ ...t, duration: audio.duration || 0 }));
  }, []);

  const handleError = useCallback(() => {
    setError("This record couldn't be loaded.");
    if (phaseRef.current !== "rest") void pause();
  }, [pause]);

  // Keep the lock-screen / media keys in step with the record on the platter.
  useEffect(() => {
    if (!song || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      artwork: song.cover_url ? [{ src: song.cover_url }] : [],
    });
    ms.setActionHandler("play", () => void play());
    ms.setActionHandler("pause", () => void pause());
    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
    };
  }, [song, play, pause]);

  // Metadata can arrive before React attaches its listeners; read it on mount.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= 1) {
      setTime((t) => ({ ...t, duration: audio.duration || 0 }));
    }
  }, [song]);

  useEffect(() => () => cancelAnimationFrame(rampRef.current), []);

  const roomStyle = (tint ? { "--tint": tint } : {}) as CSSProperties;

  return (
    <div
      className={`${styles.room} ${songs.length > 1 ? styles.withShelf : ""}`}
      style={roomStyle}
      data-playing={phase === "playing" ? "true" : undefined}
    >
      <Lamp />
      <RoomProps />

      {song && <LeaningSleeve song={song} index={index} />}

      <div className={styles.main}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Now spinning</p>
          {song ? (
            <div key={song.id} className={styles.nowPlaying}>
              <h1 className={styles.title}>{song.title}</h1>
              <p className={styles.artist}>{song.artist}</p>
            </div>
          ) : (
            <h1 className={styles.title}>Nothing on the platter</h1>
          )}
        </header>

        <Turntable
          song={song}
          phase={phase}
          swap={swap}
          speed={speed}
          progress={progress}
          time={time}
          volume={volume}
          levels={levels}
          platterRef={platterRef}
          onVolume={handleVolume}
          onSeek={handleSeek}
          onSpeed={handleSpeed}
          onToggle={toggle}
          disabled={busy || !song}
        />

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>

      {songs.length > 1 && (
        <RecordShelf songs={songs} activeIndex={index} onSelect={selectSong} disabled={busy} />
      )}

      {flight && (
        <FlyingRecord
          from={flight.from}
          to={flight.to}
          index={flight.index}
          duration={TIMING.flight}
          onDone={() => {}}
        />
      )}

      {song && (
        <audio
          ref={audioRef}
          src={song.audio_url}
          preload="metadata"
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
        />
      )}
    </div>
  );
}
