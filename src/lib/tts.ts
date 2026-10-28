// Voicing English with either provider, as in ことのは: an OpenAI voice by its name ("marin"), a Google one as
// "google:<Gemini voice>" (Gemini TTS on Vertex AI, the same project and service account as ことのあめ). Both come back
// as raw PCM and go through the same tidying (pcm.ts), so in a talk where the two kinds take turns every line starts at
// once and is as loud as the one before. Used by /api/say and scripts/generate-audio.mjs only, never in the browser: it
// reads the keys.
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { pcmToSamples, rateOf, tidy, toMp3, wordsPerSecond } from "./pcm.ts";
import { GEMINI_INSTRUCTIONS, GEMINI_TTS_MODEL, PACE_RANGE, TTS_INSTRUCTIONS, TTS_MODEL, type Pace } from "./speech.ts";

export const isGoogle = (voice: string) => voice.startsWith("google:");

let openai: OpenAI | null = null;
let gemini: GoogleGenAI | null = null;

function vertex(): GoogleGenAI {
  if (gemini) return gemini;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!raw || !project) throw new Error("no Google credentials");
  let credentials: object;
  try {
    credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    credentials = JSON.parse(raw.replace(/\\n/g, "\n"));
  }
  gemini = new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    googleAuthOptions: { credentials },
  });
  return gemini;
}

// OpenAI's "pcm" is 24 kHz, 16-bit, little-endian mono with no header.
const OPENAI_RATE = 24000;

type Take = { samples: Float32Array; rate: number; seconds: number };

async function openaiTake(text: string, voice: string, pace: Pace): Promise<Take> {
  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.audio.speech.create({ model: TTS_MODEL, voice, input: text, instructions: TTS_INSTRUCTIONS[pace], response_format: "pcm" });
  const samples = tidy(pcmToSamples(new Uint8Array(await res.arrayBuffer())), OPENAI_RATE);
  return { samples, rate: OPENAI_RATE, seconds: samples.length / OPENAI_RATE };
}

async function geminiTake(text: string, name: string, pace: Pace): Promise<Take> {
  const r = await vertex().models.generateContent({
    model: GEMINI_TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: GEMINI_INSTRUCTIONS[pace] + text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { languageCode: "en-US", voiceConfig: { prebuiltVoiceConfig: { voiceName: name } } },
    },
  });
  const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const data = part?.inlineData?.data;
  const mime = part?.inlineData?.mimeType ?? "";
  if (!data || !/pcm|l16/i.test(mime)) throw new Error(`no audio (${mime || "nothing"})`);
  const rate = rateOf(mime);
  const samples = tidy(pcmToSamples(new Uint8Array(Buffer.from(data, "base64"))), rate);
  return { samples, rate, seconds: samples.length / rate };
}

/** How far a take is from an everyday pace (0 inside it). Lines under four words are not judged. */
export function offPace(text: string, seconds: number): number {
  if (text.split(/\s+/).length < 4) return 0;
  const speed = wordsPerSecond(text, seconds);
  const [slow, fast] = PACE_RANGE;
  if (speed > fast) return speed / fast - 1;
  if (speed < slow) return slow / Math.max(speed, 0.01) - 1;
  return 0;
}

export const isQuota = (err: unknown) => /RESOURCE_EXHAUSTED|429|quota/i.test(String((err as Error)?.message ?? err));

/** One take in this voice, tidied, as MP3 with its length. */
export async function take(text: string, voice: string, pace: Pace = "natural"): Promise<{ mp3: Uint8Array; seconds: number; off: number }> {
  const t = isGoogle(voice) ? await geminiTake(text, voice.slice("google:".length), pace) : await openaiTake(text, voice, pace);
  if (t.samples.length === 0) throw new Error("empty take");
  return { mp3: toMp3(t.samples, t.rate), seconds: t.seconds, off: offPace(text, t.seconds) };
}

/**
 * Something the app's AI wrote, in this voice, as MP3: a Google voice gets up to `tries` takes and keeps the first at
 * an everyday pace. When Google cannot (its quota refuses, no credentials) and a `fallback` OpenAI voice is given, that
 * one speaks instead; the returned `voice` says which did.
 */
export async function speak(
  text: string,
  voice: string,
  { tries = 1, fallback = null }: { tries?: number; fallback?: string | null } = {},
): Promise<{ mp3: Uint8Array; voice: string }> {
  try {
    let best: { mp3: Uint8Array; off: number } | null = null;
    for (let i = 0; i < (isGoogle(voice) ? tries : 1); i++) {
      const t = await take(text, voice);
      if (!best || t.off < best.off) best = t;
      if (t.off === 0) break;
    }
    return { mp3: best!.mp3, voice };
  } catch (err) {
    if (!fallback) throw err;
    return { mp3: (await take(text, fallback)).mp3, voice: fallback };
  }
}
