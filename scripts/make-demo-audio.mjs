// Generates two short placeholder tracks as 16-bit mono WAV files in public/audio.
// They exist only so the player has something to spin before real songs are added.
// Run with: node scripts/make-demo-audio.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SAMPLE_RATE = 22050;
const OUT_DIR = join(process.cwd(), "public", "audio");

function noteHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// A soft electric-piano-ish voice: a few harmonics with exponential decay.
function voice(t, hz, dur) {
  if (t < 0 || t > dur) return 0;
  const env = Math.exp(-t * 2.6) * (1 - Math.exp(-t * 400));
  const wobble = 1 + 0.0025 * Math.sin(2 * Math.PI * 5.5 * t);
  const f = hz * wobble;
  return (
    env *
    (Math.sin(2 * Math.PI * f * t) +
      0.35 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 4) +
      0.12 * Math.sin(2 * Math.PI * 3 * f * t) * Math.exp(-t * 6))
  );
}

function render({ seconds, bpm, chords, melody, root }) {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const beat = 60 / bpm;
  const bar = beat * 4;

  // Chords: one per bar, looping.
  for (let b = 0; b * bar < seconds; b++) {
    const chord = chords[b % chords.length];
    const start = b * bar;
    chord.forEach((semi, i) => {
      const hz = noteHz(root + semi);
      const offset = i * 0.035; // gentle strum
      const s0 = Math.floor((start + offset) * SAMPLE_RATE);
      const len = Math.floor(bar * 1.1 * SAMPLE_RATE);
      for (let k = 0; k < len && s0 + k < n; k++) {
        out[s0 + k] += 0.16 * voice(k / SAMPLE_RATE, hz, bar * 1.1);
      }
    });
  }

  // Melody: list of [beatIndex, semitone|null, lengthBeats], looping every 8 bars.
  const loopBeats = 32;
  for (let loop = 0; loop * loopBeats * beat < seconds; loop++) {
    for (const [at, semi, lenBeats] of melody) {
      if (semi == null) continue;
      const start = (loop * loopBeats + at) * beat;
      if (start > seconds) continue;
      const hz = noteHz(root + 12 + semi);
      const s0 = Math.floor(start * SAMPLE_RATE);
      const dur = lenBeats * beat;
      const len = Math.floor(dur * 1.2 * SAMPLE_RATE);
      for (let k = 0; k < len && s0 + k < n; k++) {
        out[s0 + k] += 0.22 * voice(k / SAMPLE_RATE, hz, dur * 1.2);
      }
    }
  }

  // A touch of room: two short feedback delays.
  const d1 = Math.floor(0.173 * SAMPLE_RATE);
  const d2 = Math.floor(0.291 * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    if (i >= d1) out[i] += 0.28 * out[i - d1];
    if (i >= d2) out[i] += 0.18 * out[i - d2];
  }

  // One-pole low-pass for warmth, then fade in/out.
  let lp = 0;
  const alpha = 0.35;
  for (let i = 0; i < n; i++) {
    lp += alpha * (out[i] - lp);
    const t = i / SAMPLE_RATE;
    const fade = Math.min(1, t / 0.8, (seconds - t) / 2.5);
    out[i] = lp * fade;
  }

  // Normalise.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= gain;
  return out;
}

function toWav(samples) {
  const bytes = samples.length * 2;
  const buf = Buffer.alloc(44 + bytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(bytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

mkdirSync(OUT_DIR, { recursive: true });

// Track 1: C major, Cmaj7 – Am7 – Fmaj7 – G7.
writeFileSync(
  join(OUT_DIR, "porch-light.wav"),
  toWav(
    render({
      seconds: 48,
      bpm: 72,
      root: 48,
      chords: [
        [0, 4, 7, 11],
        [-3, 0, 4, 7],
        [-7, -3, 0, 4],
        [-5, -1, 2, 5],
      ],
      melody: [
        [0, 7, 1.5], [1.5, 9, 0.5], [2, 12, 2],
        [4, 11, 1], [5, 9, 1], [6, 7, 2],
        [8, 4, 1.5], [9.5, 7, 0.5], [10, 9, 2],
        [12, 7, 1], [13, 4, 1], [14, 2, 2],
        [16, 0, 1.5], [17.5, 4, 0.5], [18, 7, 2],
        [20, 9, 1], [21, 7, 1], [22, 4, 2],
        [24, 2, 1.5], [25.5, 4, 0.5], [26, 7, 1], [27, 5, 1],
        [28, 4, 2], [30, 0, 2],
      ],
    }),
  ),
);

// Track 2: D minor, Dm – Bb – F – C, slower.
writeFileSync(
  join(OUT_DIR, "amber-evening.wav"),
  toWav(
    render({
      seconds: 52,
      bpm: 64,
      root: 50,
      chords: [
        [0, 3, 7, 10],
        [-4, 0, 3, 7],
        [-9, -5, -2, 3],
        [-2, 2, 5, 10],
      ],
      melody: [
        [0, 5, 2], [2, 7, 1], [3, 8, 1],
        [4, 7, 2], [6, 3, 2],
        [8, 0, 1.5], [9.5, 3, 0.5], [10, 5, 2],
        [12, 7, 1], [13, 5, 1], [14, 3, 2],
        [16, 8, 2], [18, 7, 1], [19, 5, 1],
        [20, 3, 2], [22, 0, 2],
        [24, 2, 1.5], [25.5, 3, 0.5], [26, 5, 2],
        [28, 3, 2], [30, 0, 2],
      ],
    }),
  ),
);

console.log("Wrote demo tracks to", OUT_DIR);
