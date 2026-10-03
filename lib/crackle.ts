/**
 * Procedural vinyl surface noise: soft hiss, random pops and a faint tick once
 * per revolution, generated with the Web Audio API so no audio asset is needed.
 * Everything is kept quiet; it sits under the music rather than on top of it.
 */

const BASE_GAIN = 0.11;
const SECONDS_PER_REV = 1.8; // 33⅓ rpm
const LOOP_SECONDS = SECONDS_PER_REV * 4;

export function buildCrackleBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(LOOP_SECONDS * rate);
  const buffer = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);

    // Hiss: white noise softened with a one-pole low-pass.
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      lp += 0.12 * (w - lp);
      data[i] = lp * 0.5 + w * 0.04;
    }

    // Pops: short decaying impulses scattered across the loop.
    const pops = Math.floor(LOOP_SECONDS * 11);
    for (let p = 0; p < pops; p++) {
      const at = Math.floor(Math.random() * length);
      const amp = (0.12 + Math.random() ** 2 * 0.55) * (Math.random() < 0.5 ? 1 : -1);
      const len = 4 + Math.floor(Math.random() * 70);
      for (let k = 0; k < len && at + k < length; k++) {
        const env = Math.exp((-k / len) * 4);
        data[at + k] += amp * env * Math.cos(k * 0.9);
      }
    }

    // Dust: clusters of tiny ticks.
    const clusters = Math.floor(LOOP_SECONDS * 3);
    for (let c = 0; c < clusters; c++) {
      const at = Math.floor(Math.random() * length);
      const count = 4 + Math.floor(Math.random() * 10);
      for (let j = 0; j < count; j++) {
        const pos = at + Math.floor(Math.random() * rate * 0.04);
        const amp = 0.05 + Math.random() * 0.12;
        for (let k = 0; k < 6 && pos + k < length; k++) {
          data[pos + k] += amp * (1 - k / 6) * (k % 2 ? -1 : 1);
        }
      }
    }

    // One soft thump per revolution, as if the record had a tiny warp.
    for (let r = 0; r < 4; r++) {
      const at = Math.floor(r * SECONDS_PER_REV * rate);
      const len = Math.floor(rate * 0.03);
      for (let k = 0; k < len && at + k < length; k++) {
        const t = k / rate;
        data[at + k] += 0.22 * Math.exp(-t * 90) * Math.sin(2 * Math.PI * 95 * t);
      }
    }
  }

  return buffer;
}

/** A looping crackle voice with its own filters and gain, feeding `out`. */
export class Crackle {
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private rate = 1;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  start(volume: number) {
    const { ctx } = this;
    this.stop(0.05);
    this.buffer ??= buildCrackleBuffer(ctx);

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.playbackRate.value = this.rate;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 140;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3400;
    lowpass.Q.value = 0.4;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(highpass).connect(lowpass).connect(gain).connect(this.out);
    source.start();
    gain.gain.linearRampToValueAtTime(BASE_GAIN * volume, ctx.currentTime + 0.9);

    this.source = source;
    this.gain = gain;
  }

  setVolume(volume: number) {
    this.gain?.gain.setTargetAtTime(BASE_GAIN * volume, this.ctx.currentTime, 0.05);
  }

  /** Speed the surface noise up or down with the platter. */
  setRate(rate: number) {
    this.rate = rate;
    this.source?.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.25);
  }

  stop(fadeSeconds = 0.6) {
    const { ctx, source, gain } = this;
    if (!source || !gain) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    source.stop(now + fadeSeconds + 0.05);
    this.source = null;
    this.gain = null;
  }
}
