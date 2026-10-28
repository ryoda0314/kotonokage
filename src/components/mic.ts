"use client";

// The microphone, kept open while the learner follows a talk or says their lines (CONCEPT.md, 追いかける・返す).
// Unlike the sisters' one-sentence recorder it does not stop playback: the model plays while the learner's voice is
// taken, and both are placed on one clock (indexAt), so each line's stretch of the recording can be found again. It
// also tells when the learner has started and finished saying something (turn), for 返す. Only a 16 kHz WAV is sent
// to be heard (/api/hear); the samples stay on the device for 手本 → 自分 and are not kept.
import { session } from "./player";

export type MicError = "denied" | "missing" | "failed";

const FRAME_MS = 20;

export type Turn = { from: number; to: number; spoke: boolean };

export class Mic {
  readonly rate: number;
  private chunks: Float32Array[] = [];
  private total = 0;
  private levels: number[] = [];
  private pending = 0;
  private sum = 0;
  private anchor: number | null = null;
  private closed = false;
  private readonly frameLength: number;
  private readonly release: () => void;

  private constructor(rate: number, release: () => void) {
    this.rate = rate;
    this.frameLength = Math.round((rate * FRAME_MS) / 1000);
    this.release = release;
  }

  /** Opens the microphone (asking the first time). Echo cancellation keeps the model's voice out when it plays aloud. */
  static async open(onLevel?: (level: number) => void): Promise<Mic> {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") throw "missing" satisfies MicError;
    session("play-and-record");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (err) {
      session("playback");
      throw (err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "missing") satisfies MicError;
    }
    const ctx = new AudioContext();
    const close = () => {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => undefined);
      session("playback");
    };
    try {
      await ctx.audioWorklet.addModule("/worklets/recorder.js");
    } catch {
      close();
      throw "failed" satisfies MicError;
    }
    const mic = new Mic(ctx.sampleRate, close);
    const node = new AudioWorkletNode(ctx, "kage-recorder");
    node.port.onmessage = (e: MessageEvent<Float32Array>) => mic.take(e.data, onLevel);
    ctx.createMediaStreamSource(stream).connect(node);
    if (ctx.state !== "running") await ctx.resume().catch(() => undefined);
    return mic;
  }

  private take(block: Float32Array, onLevel?: (level: number) => void) {
    if (this.closed) return;
    if (this.anchor === null) this.anchor = performance.now() - (block.length / this.rate) * 1000;
    this.chunks.push(block);
    this.total += block.length;
    for (const v of block) {
      this.sum += v * v;
      if (++this.pending === this.frameLength) {
        const rms = Math.sqrt(this.sum / this.frameLength);
        this.levels.push(rms);
        onLevel?.(Math.min(1, rms * 8));
        this.pending = 0;
        this.sum = 0;
      }
    }
  }

  /** Samples taken so far. */
  get length(): number {
    return this.total;
  }

  /** The sample index for a moment on the page's clock (performance.now()). */
  indexAt(perf: number): number {
    if (this.anchor === null) return 0;
    return Math.max(0, Math.round(((perf - this.anchor) * this.rate) / 1000));
  }

  /** The level above which the learner is speaking: well over the room's quiet (the first 300 ms). */
  private threshold(): number {
    const first = this.levels.slice(0, 15).sort((a, b) => a - b);
    const quiet = first.length ? first[Math.floor(first.length / 2)] : 0;
    return Math.max(0.012, quiet * 3);
  }

  /**
   * Waits for the learner to say something after sample `from` and finish: resolves once they have been quiet for
   * `silenceMs` after speaking, or nobody spoke within `startWithinMs`, or `maxMs` has passed, or `signal` aborts.
   */
  turn({ from = this.total, startWithinMs = 8000, silenceMs = 900, maxMs = 20000, signal }: { from?: number; startWithinMs?: number; silenceMs?: number; maxMs?: number; signal?: AbortSignal } = {}): Promise<Turn> {
    const fromFrame = Math.floor(from / this.frameLength);
    const started = performance.now();
    const need = Math.ceil(silenceMs / FRAME_MS);
    return new Promise((resolve) => {
      const done = (t: Turn) => {
        clearInterval(timer);
        resolve(t);
      };
      const timer = setInterval(() => {
        const limit = this.threshold();
        let first = -1;
        let last = -1;
        let run = 0;
        for (let f = fromFrame; f < this.levels.length; f++) {
          if (this.levels[f] > limit) {
            run++;
            if (run >= 3 && first < 0) first = f - 2;
            if (first >= 0) last = f;
          } else run = 0;
        }
        const now = performance.now();
        const pad = Math.round(this.rate * 0.15);
        if (signal?.aborted || this.closed) return done({ from, to: this.total, spoke: first >= 0 });
        if (first < 0) {
          if (now - started > startWithinMs) done({ from, to: this.total, spoke: false });
          return;
        }
        if (this.levels.length - 1 - last >= need || now - started > maxMs) {
          done({ from: Math.max(from, first * this.frameLength - pad), to: Math.min(this.total, (last + 1) * this.frameLength + pad), spoke: true });
        }
      }, 60);
    });
  }

  /** The samples from `from` up to `to`. */
  slice(from: number, to: number = this.total): Float32Array {
    const a = Math.max(0, Math.floor(from));
    const b = Math.min(this.total, Math.floor(to));
    const out = new Float32Array(Math.max(0, b - a));
    let at = 0;
    let offset = 0;
    for (const c of this.chunks) {
      const end = at + c.length;
      if (end > a && at < b) {
        const s = Math.max(a, at) - at;
        const e = Math.min(b, end) - at;
        out.set(c.subarray(s, e), offset);
        offset += e - s;
      }
      at = end;
      if (at >= b) break;
    }
    return out;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.release();
  }
}

/** A 16 kHz, 16-bit mono WAV of some samples: small enough to send, plenty for hearing speech, fine to play back. */
export function toWav16k(samples: Float32Array, rate: number): Blob {
  const out = Math.floor((samples.length * 16000) / rate);
  const pcm = new Int16Array(out);
  const step = rate / 16000;
  for (let i = 0; i < out; i++) {
    // The average of the samples this one stands for: a crude but adequate low-pass.
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    let sum = 0;
    for (let k = from; k < to && k < samples.length; k++) sum += samples[k];
    pcm[i] = Math.round(Math.max(-1, Math.min(1, sum / (to - from))) * 32767);
  }
  const header = new DataView(new ArrayBuffer(44));
  const text = (o: number, s: string) => [...s].forEach((c, i) => header.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  header.setUint32(4, 36 + pcm.byteLength, true);
  text(8, "WAVE");
  text(12, "fmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, 16000, true);
  header.setUint32(28, 32000, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  text(36, "data");
  header.setUint32(40, pcm.byteLength, true);
  return new Blob([header.buffer, pcm.buffer], { type: "audio/wav" });
}

export type Heard = { text: string } | { error: "failed" | "tooMany" | "unavailable" | "quiet" };

/** What the machine's ear heard in some samples (/api/hear). Nothing is kept on the server. */
export async function hear(samples: Float32Array, rate: number): Promise<Heard> {
  if (samples.length < rate * 0.3) return { error: "quiet" };
  try {
    const r = await fetch("/api/hear", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: toWav16k(samples, rate) });
    if (r.status === 429) return { error: "tooMany" };
    if (r.status === 503) return { error: "unavailable" };
    if (!r.ok) return { error: "failed" };
    const body = (await r.json()) as { text?: string };
    return { text: body.text ?? "" };
  } catch {
    return { error: "failed" };
  }
}
