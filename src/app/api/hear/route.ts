import OpenAI, { toFile } from "openai";
import { addressOf, allow } from "@/lib/limits";

// The machine's ear (CONCEPT.md, 原則 10): what the learner said while following a talk, saying a line in a role, or
// answering on their own, as text. It is never told the line, or it would write words the learner did not say. The
// recording is a 16 kHz WAV (src/components/mic.ts), passed on and not kept.

const MODEL = process.env.HEAR_MODEL || "gpt-4o-transcribe";
// A whole talk followed once, with its pauses: about a minute at most.
const MAX_BYTES = 44 + 16000 * 2 * 90;
let client: OpenAI | null = null;

function isWav16k(b: Uint8Array): boolean {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  return (
    b.byteLength > 44 &&
    tag(0) === "RIFF" &&
    tag(8) === "WAVE" &&
    view.getUint16(20, true) === 1 &&
    view.getUint16(22, true) === 1 &&
    view.getUint32(24, true) === 16000 &&
    view.getUint16(34, true) === 16
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "unavailable" }, { status: 503 });
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_BYTES || !isWav16k(body)) return Response.json({ error: "bad audio" }, { status: 400 });
  if (!allow("hear", addressOf(request))) return Response.json({ error: "too many" }, { status: 429 });
  try {
    client ??= new OpenAI();
    const r = await client.audio.transcriptions.create({
      file: await toFile(body, "said.wav", { type: "audio/wav" }),
      model: MODEL,
      prompt:
        "A Japanese university student speaking English with friends, sometimes repeating what they hear a moment behind. Some words may be Japanese. Write down exactly what they say, mistakes and all; do not complete or correct it.",
    });
    return Response.json({ text: r.text.trim() });
  } catch (err) {
    console.error("[hear]", err instanceof Error ? err.message : err);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
