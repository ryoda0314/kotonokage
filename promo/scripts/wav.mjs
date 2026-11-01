// 声を WAV にして、大きさをそろえる（assets.mjs・follow.mjs・turn.mjs が使う。ことのおと の映像と同じ）。
// 声はどれもナレーションの近くの大きさ（声のある所の RMS でおよそ -17 dBFS、ピークは -1 dBFS まで）に。Remotion の
// ffmpeg には ebur128 が無いので、ここで測る。
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const RAW = "node_modules/.cache/raw";
const TARGET_DB = -17;
const CEILING_DB = -1;

/** Remotion の ffmpeg（アプリと同じものを別に入れなくていい）。 */
export function ffmpeg(args) {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8", shell: true });
  if (r.status !== 0) throw new Error(r.stderr);
}

/** WAV（16bit・モノ）の中身。 */
export function readWav(file) {
  const b = readFileSync(file);
  let at = 12;
  let rate = 0;
  while (at + 8 <= b.length) {
    const id = b.toString("ascii", at, at + 4);
    const size = b.readUInt32LE(at + 4);
    if (id === "fmt ") rate = b.readUInt32LE(at + 12);
    if (id === "data") return { rate, samples: new Int16Array(b.buffer.slice(b.byteOffset + at + 8, b.byteOffset + at + 8 + size)) };
    at += 8 + size + (size % 2);
  }
  throw new Error(`${file}: data が無い`);
}

export function wavBytes(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

export function writeWav(file, samples, rate) {
  writeFileSync(file, wavBytes(samples, rate));
}

/** どの音でも（MP3 でも）、モノの WAV に。`filter`：ffmpeg の音のフィルター（部分を切る・速さを変える）。 */
export function toMonoWav(from, to, { rate = 48000, filter = null } = {}) {
  ffmpeg(["-i", from, ...(filter ? ["-af", filter] : []), "-ac", "1", "-ar", String(rate), "-c:a", "pcm_s16le", to]);
}

/**
 * 声のある所（50ms ごとの RMS がフルスケールの 1% を超える所）の大きさを TARGET_DB に。ピークは CEILING_DB を超えない
 * （超えるなら上げ幅を抑える）。`filter` を通してから測る。長さ（秒）と上げた dB を返す。
 */
export function level(from, to, filter = null) {
  mkdirSync(RAW, { recursive: true });
  const tmp = `${RAW}/level.wav`;
  toMonoWav(from, tmp, { filter });
  const { rate, samples } = readWav(tmp);
  const win = Math.floor(rate / 20);
  let sum = 0;
  let n = 0;
  let peak = 0;
  for (let i = 0; i + win <= samples.length; i += win) {
    let s = 0;
    for (let k = i; k < i + win; k++) s += samples[k] * samples[k];
    const rms = Math.sqrt(s / win) / 32768;
    if (rms > 0.01) {
      sum += rms * rms;
      n++;
    }
  }
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const active = 20 * Math.log10(Math.sqrt(sum / Math.max(1, n)));
  const gain = Math.min(TARGET_DB - active, CEILING_DB - 20 * Math.log10(peak / 32768));
  const k = Math.pow(10, gain / 20);
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * k)));
  writeWav(to, out, rate);
  return { seconds: Math.round((samples.length / rate) * 1000) / 1000, gain: Math.round(gain * 10) / 10 };
}

/** 声の大きさ（コマごとの RMS、0〜1）。録っている間のボタンの輪（アプリの mic.ts：rms × 8 を 1 まで）。 */
export function levelsOf(file, fps = 30) {
  const { rate, samples } = readWav(file);
  const per = Math.floor(rate / fps);
  const out = [];
  for (let i = 0; i + per <= samples.length; i += per) {
    let s = 0;
    for (let k = i; k < i + per; k++) s += (samples[k] / 32768) ** 2;
    out.push(Math.round(Math.min(1, Math.sqrt(s / per) * 8) * 100) / 100);
  }
  return out;
}
