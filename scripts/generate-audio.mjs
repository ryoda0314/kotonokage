// Voices every prepared line (src/content) in its speaker's voice and every sample in both of わたし's voices, and keeps
// the clips in public/audio, named by key and a hash of voicing, voice, pace and text: a line whose text or voice
// changes gets a new clip, and the old one is removed once nothing points to it.
//
// Each take is heard again by a transcriber (whisper-1) before it is kept: what it heard must be the line (a take
// that said something else, or ran too fast or slow, is made again, up to three times), and its word times are kept
// against the subtitle's words, so a chunk can be played on its own. src/content/audio.json maps each key to its clip.
//   node --env-file=.env.local scripts/generate-audio.mjs [--dry-run] [--only <key>]
// When Google's quota keeps refusing it stops politely; the same command later carries on where it stopped.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import OpenAI, { toFile } from "openai";
import { allClips } from "../src/content/index.ts";
import { TIMING_MODEL, VOICING } from "../src/lib/speech.ts";
import { alignTimes, coverage, wordsOf } from "../src/lib/text.ts";
import { isQuota, take } from "../src/lib/tts.ts";

const DIR = "public/audio";
const MANIFEST = "src/content/audio.json";
const AT_ONCE = 3;
const TRIES = 3;
// What the transcriber heard must cover this much of the line, in order.
const ENOUGH = 0.9;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const fileName = (clip) =>
  `${clip.key.replace("@", "-")}.${createHash("sha256").update(`${VOICING}\n${clip.voice}\n${clip.pace}\n${clip.text}`).digest("hex").slice(0, 8)}.mp3`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function retrying(job) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await job();
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (isQuota(err) && attempt < 12) {
        await wait(10_000);
        continue;
      }
      if (/fetch failed|ECONNRESET|ETIMEDOUT|503|UNAVAILABLE|5\d\d/i.test(msg) && attempt < 4) {
        await wait(3000 * attempt);
        continue;
      }
      throw err;
    }
  }
}

async function heard(mp3) {
  const r = await openai.audio.transcriptions.create({
    file: await toFile(mp3, "clip.mp3", { type: "audio/mpeg" }),
    model: TIMING_MODEL,
    language: "en",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });
  return { text: r.text ?? "", words: (r.words ?? []).map((w) => ({ word: w.word, start: w.start, end: w.end })) };
}

/** The best of up to three takes: one the transcriber hears as the line, at an everyday pace. */
async function voiced(clip) {
  let best = null;
  for (let i = 0; i < TRIES; i++) {
    const t = await retrying(() => take(clip.text, clip.voice, clip.pace));
    const h = await retrying(() => heard(t.mp3));
    const cover = coverage(clip.text, h.text);
    const score = cover - t.off;
    if (!best || score > best.score) best = { ...t, heard: h, cover, score };
    if (cover >= ENOUGH && t.off === 0) break;
  }
  return best;
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
mkdirSync(DIR, { recursive: true });
const clips = allClips().filter((c) => !only || c.key === only);
const todo = clips.filter((c) => manifest[c.key]?.file !== fileName(c) || !existsSync(`${DIR}/${fileName(c)}`));
console.log(`${clips.length} clips, ${todo.length} to voice (${todo.filter((c) => c.voice.startsWith("google:")).length} in Google voices)`);
if (dryRun) process.exit(0);

let done = 0;
let failed = 0;
let refused = 0;
const doubtful = [];
const queue = [...todo];
async function worker() {
  for (let clip = queue.shift(); clip && refused < 3; clip = queue.shift()) {
    const name = fileName(clip);
    try {
      const v = await voiced(clip);
      writeFileSync(`${DIR}/${name}`, v.mp3);
      manifest[clip.key] = {
        file: name,
        dur: Math.round(v.seconds * 1000) / 1000,
        ...(clip.shown ? { times: alignTimes(wordsOf(clip.shown), v.heard.words).map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]) } : {}),
      };
      if (v.cover < ENOUGH || v.off > 0) doubtful.push(`${clip.key}: heard "${v.heard.text}" (${Math.round(v.cover * 100)}%, pace off ${v.off.toFixed(2)})`);
      done++;
      refused = 0;
      if (done % 20 === 0) console.log(`  ${done} / ${todo.length}`);
    } catch (err) {
      failed++;
      if (isQuota(err)) refused++;
      console.error(`  ${clip.key}: ${String(err?.message ?? err).slice(0, 160)}`);
    }
  }
}
await Promise.all(Array.from({ length: AT_ONCE }, worker));
if (refused >= 3) console.log("stopped: the quota keeps refusing. Run the same command later to carry on.");

if (!only) {
  // Forget clips that no longer exist, and remove files nothing points to.
  const keys = new Set(clips.map((c) => c.key));
  for (const key of Object.keys(manifest)) if (!keys.has(key)) delete manifest[key];
  const kept = new Set(Object.values(manifest).map((m) => m.file));
  for (const file of readdirSync(DIR)) if (file.endsWith(".mp3") && !kept.has(file)) unlinkSync(`${DIR}/${file}`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, `${JSON.stringify(sorted)}\n`);
console.log(`voiced ${done}, failed ${failed}, left ${todo.length - done}`);
if (doubtful.length) console.log(`to listen to (the transcriber was not sure):\n  ${doubtful.join("\n  ")}`);
if (done < todo.length) process.exitCode = 1;
