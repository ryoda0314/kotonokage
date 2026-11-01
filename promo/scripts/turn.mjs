// 返す（自分で）の場面のために、アプリの /api/turn と同じ頼み方を一度だけ走らせる（../src/lib/ai.ts の takeTurn と同じ：
// turn-core.ts の turnPrompt・TURN_SCHEMA・cleanTurn、gpt-5.5・low）。ai.ts は server-only なので、ここでは同じ呼び出しを
// そのまま書いている。学ぶ人（ミアの役）が打った文は INPUT：英語が出ないところ（バイト）は日本語のまま。
// 直った文はわたしの声（女性の声 Leda）で、サムの返事はサムの声で、/api/say と同じく ../src/lib/tts.ts の speak に読ませる。
// 書いたもの（src/turn.json）を、映像はそのまま描く。答えは毎回すこし変わるので、INPUT が同じなら作り直さない（--force）。
//   node --env-file=../.env.local scripts/turn.mjs [--force]        (npm run turn)
// 鍵：OPENAI_API_KEY と、Vertex AI の鍵（アプリの .env.local）。鍵の値はどこにも出さない。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { answerRoles, fallbackOf, ME_VOICES, talkById, voiceOf } from "../../src/content/index.ts";
import { speak } from "../../src/lib/tts.ts";
import { cleanTurn, TURN_SCHEMA, turnPrompt } from "../../src/lib/turn-core.ts";
import { level, readWav } from "./wav.mjs";

const TALK = "ramen";
const INPUT = "I have バイト today... How about Saturday?";
const MODEL = "gpt-5.5";
const EFFORT = "low";
const OUT = "public/turn";
const RAW = "node_modules/.cache/raw";
mkdirSync(OUT, { recursive: true });
mkdirSync(RAW, { recursive: true });
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が無い（node --env-file=../.env.local）");

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 8);

async function takeTurn(req) {
  const { system, user } = turnPrompt(req);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: EFFORT,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: "turn", strict: true, schema: TURN_SCHEMA } },
    }),
  });
  if (!res.ok) throw new Error(`turn HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const content = (await res.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("empty turn response");
  // 署名は /api/say のためのもの。ここでは読ませるのが自分なので要らない。
  return cleanTurn(JSON.parse(content), req, () => "");
}

/** /api/say と同じく、その声で読ませて、大きさをそろえた WAV に。名前は声と文から。 */
async function voiced(key, text, voice) {
  const name = `${key}.${hash(`${voice}\n${text}`)}`;
  const file = `${OUT}/${name}.wav`;
  if (!existsSync(file)) {
    const said = await speak(text, voice, { tries: 3, fallback: fallbackOf(voice) });
    if (said.voice !== voice) console.log(`  ${key}: ${voice} refused, voiced by ${said.voice}`);
    writeFileSync(`${RAW}/${name}.mp3`, said.mp3);
    level(`${RAW}/${name}.mp3`, file);
    console.log(`  voiced ${key}「${text}」`);
  }
  const { rate, samples } = readWav(file);
  return { src: `turn/${name}.wav`, text, voice, seconds: Math.round((samples.length / rate) * 1000) / 1000 };
}

async function main() {
  const before = existsSync("src/turn.json") ? JSON.parse(readFileSync("src/turn.json", "utf8")) : null;
  const req = { talk: TALK, history: [], input: INPUT };
  let result = before?.input === INPUT && !process.argv.includes("--force") ? before.result : null;
  if (!result) {
    result = await takeTurn(req);
    console.log(`  直した文「${result.fixed}」（natural: ${result.natural}）\n  返事「${result.reply}」\n  notes ${JSON.stringify(result.notes)}\n  gaps ${JSON.stringify(result.gaps)}`);
  }
  const { them } = answerRoles(talkById(TALK));
  const out = {
    note: "アプリの /api/turn と同じ頼み方で返ってきた直しと返事（scripts/turn.mjs）。声は /api/say と同じく ../src/lib/tts.ts で。",
    at: before?.input === INPUT && before?.at ? before.at : new Date().toLocaleDateString("sv-SE"),
    model: `${MODEL} (${EFFORT})`,
    input: INPUT,
    result: { fixed: result.fixed, natural: result.natural, notes: result.notes, gaps: result.gaps, reply: result.reply, parts: result.parts.map((p) => ({ text: p.text })) },
    voices: {
      fixed: result.fixed ? await voiced("fixed", result.fixed, ME_VOICES.f.voice) : null,
      reply: [],
    },
  };
  for (const [i, p] of result.parts.entries()) out.voices.reply.push(await voiced(`reply${i + 1}`, p.text, voiceOf(them)));
  writeFileSync("src/turn.json", `${JSON.stringify(out, null, 1)}\n`);
  console.log("  wrote src/turn.json");
}

main().catch((e) => {
  console.error("止まった:", String(e.message || e).slice(0, 300));
  process.exit(1);
});
