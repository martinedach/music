"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/lib/types";
import { Crackle } from "@/lib/crackle";
import Turntable from "./Turntable";
import RecordShelf from "./RecordShelf";
import styles from "./Player.module.css";

/**
 * rest     – arm parked, platter still
 * cueing   – arm swinging onto the record, platter easing up to speed
 * playing  – stylus in the groove, music on
 * lifting  – arm returning to its rest, platter slowing
 */
export type Phase = "rest" | "cueing" | "playing" | "lifting";
export type Swap = "idle" | "out" | "in";

export const TIMING = {
  cue: 1500,
  lift: 1100,
  swap: 450,
  spinDown: 450,
  spinUp: 400,
} as const;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type PitchyAudio = HTMLAudioElement & { preservesPitch?: boolean };

export default function Player({ songs }: { songs: Song[] }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("rest");
  const [swap, setSwap] = useState<Swap>("idle");
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<PitchyAudio>(null);
  const crackleRef = useRef<Crackle | null>(null);
  const phaseRef = useRef<Phase>("rest");
  const volumeRef = useRef(volume);
  const seqRef = useRef(0);
  const rampRef = useRef(0);
  const seekQuietUntil = useRef(0);

  const song = songs[index] ?? null;

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const crackle = () => (crackleRef.current ??= new Crackle());

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
      crackleRef.current?.stop(withWow ? 0.7 : 0.3);
      if (withWow) {
        rampRate(audio, audio.playbackRate, 0.5, TIMING.spinDown, () => {
          audio.pause();
          audio.playbackRate = 1;
        });
      } else {
        cancelAnimationFrame(rampRef.current);
        audio.pause();
        audio.playbackRate = 1;
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
    crackle().prime();
    const startAt = audio.ended ? 0 : audio.currentTime;
    audio.volume = volumeRef.current;
    audio.playbackRate = 1;
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

    audio.currentTime = startAt;
    audio.muted = false;
    crackle().start(volumeRef.current);
    rampRate(audio, 0.9, 1, TIMING.spinUp);
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

  /** Lift the arm if needed, slide the record out, swap, slide the new one in. */
  const selectSong = useCallback(
    async (next: number, resume = false) => {
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

      setIndex(next);
      setProgress(0);
      setTime({ current: 0, duration: 0 });
      setSwap("in");
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
    if (audioRef.current) audioRef.current.volume = v;
    crackleRef.current?.setVolume(v);
  }, []);

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
    crackleRef.current?.stop(0.8);
    audio.playbackRate = 1;
    setPhaseSync("lifting");
    setProgress(1);
    await wait(TIMING.lift);
    if (seq !== seqRef.current) return;
    setPhaseSync("rest");
    if (songs.length > 1) void selectSong((index + 1) % songs.length, true);
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

  return (
    <div className={`${styles.room} ${songs.length > 1 ? styles.withShelf : ""}`}>
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
        progress={progress}
        time={time}
        volume={volume}
        onVolume={handleVolume}
        onSeek={handleSeek}
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

      {song && (
        <audio
          ref={audioRef}
          src={song.audio_url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
        />
      )}
    </div>
  );
}
