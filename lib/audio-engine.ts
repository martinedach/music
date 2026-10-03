import { Crackle } from "./crackle";

type AudioContextCtor = typeof AudioContext;

function getContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * One Web Audio graph for the whole deck: the song is routed through a gain
 * (so volume works everywhere, including iOS), split into two analysers for
 * the VU meters, and the vinyl crackle is mixed alongside it.
 *
 *   <audio> ─► source ─► master gain ─► destination
 *                   └──► splitter ─► analyser L / analyser R
 *   crackle ──────────────────────► destination
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private master: GainNode | null = null;
  private analysers: [AnalyserNode, AnalyserNode] | null = null;
  private crackle: Crackle | null = null;
  private attached: HTMLMediaElement | null = null;
  private samples = new Uint8Array(512);
  private volume = 0.8;

  /** Create or resume the context. Call from a user gesture. */
  prime(): boolean {
    if (!this.ctx) {
      const Ctor = getContextCtor();
      if (!Ctor) return false;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return true;
  }

  /** Route a media element through the graph. Safe to call repeatedly. */
  attach(el: HTMLMediaElement) {
    if (this.attached === el || !this.prime()) return;
    const ctx = this.ctx!;
    try {
      const source = ctx.createMediaElementSource(el);
      const master = ctx.createGain();
      master.gain.value = this.volume;
      const splitter = ctx.createChannelSplitter(2);
      const analysers: [AnalyserNode, AnalyserNode] = [ctx.createAnalyser(), ctx.createAnalyser()];
      for (const a of analysers) {
        a.fftSize = 512;
        a.smoothingTimeConstant = 0.5;
      }
      source.connect(master).connect(ctx.destination);
      source.connect(splitter);
      splitter.connect(analysers[0], 0);
      splitter.connect(analysers[1], 1);
      this.source = source;
      this.master = master;
      this.analysers = analysers;
      this.attached = el;
    } catch {
      // The element is already owned by another graph; leave its output alone.
    }
  }

  /** The underlying context, for diagnostics. */
  get context() {
    return this.ctx;
  }

  /**
   * True when the context is really rendering audio. A context can report
   * "running" while its clock stays at zero (no output device, some embedded
   * browsers); routing the song through it then would stall playback.
   */
  get healthy() {
    return !!this.ctx && this.ctx.state === "running" && this.ctx.currentTime > 0.05;
  }

  /** True once the song's volume is controlled by the graph rather than the element. */
  get routed() {
    return this.source !== null;
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.03);
    }
    this.crackle?.setVolume(volume);
  }

  startCrackle() {
    if (!this.prime()) return;
    this.crackle ??= new Crackle(this.ctx!, this.ctx!.destination);
    this.crackle.start(this.volume);
  }

  stopCrackle(fadeSeconds = 0.6) {
    this.crackle?.stop(fadeSeconds);
  }

  setCrackleRate(rate: number) {
    this.crackle?.setRate(rate);
  }

  /** Writes the RMS level (0..1) of each channel into `out`. */
  levels(out: [number, number]) {
    if (!this.analysers) {
      out[0] = 0;
      out[1] = 0;
      return;
    }
    for (let ch = 0; ch < 2; ch++) {
      const a = this.analysers[ch];
      a.getByteTimeDomainData(this.samples);
      let sum = 0;
      for (let i = 0; i < this.samples.length; i++) {
        const v = (this.samples[i] - 128) / 128;
        sum += v * v;
      }
      out[ch] = Math.sqrt(sum / this.samples.length);
    }
  }
}
