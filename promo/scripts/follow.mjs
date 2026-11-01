// 追いかける の場面のために、アプリと同じ処理を一度だけ走らせる。ここに学習者はいないので、学習者の声の代わりに、アプリの
// わたしの声（女性の声 Leda：設定のはじめの声）が「授業のあと」を追いかける。Follow.tsx がするとおりに：
//   - 1周目：行は 550ms あけて流れ、録音は1行目の 250ms 前から、最後の行が終わって 1.3 秒まで。代わりの声は、各行の
//     手本が鳴りはじめて LAG 秒あとから言う（前の行を言い終えてから）。この人は ramen.3 の out と、ramen.4 の
//     been meaning to が聞こえていなかった、として、そこを言わずに読ませる（SAID）。
//   - その録音（16 kHz・16bit・モノ）を、/api/hear と同じ頼み方で機械の耳に聞かせる（gpt-4o-transcribe、行は渡さない）。
//   - 会話まるごとを一度に heardWords（../src/lib/text.ts）で並べ、行ごとの聞こえなかった語にする。
//   - 日をあけて：ramen.4 だけを この行だけ（drill）で。録音は手本の 200ms 前から、終わって 1.1 秒まで。今度は全部言う。
// 書いたもの（src/follow.json）を、映像はそのまま描く。濃い・薄いも聞こえた文も、ここで作り足していない。
//   node --env-file=../.env.local scripts/follow.mjs [--force]        (npm run follow)
// 鍵：OPENAI_API_KEY（機械の耳）と、Vertex AI の鍵（scripts/vertex.mjs）。鍵の値はどこにも出さない。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ME_VOICES, talkById } from "../../src/content/index.ts";
import { pcmToSamples, rateOf, tidy } from "../../src/lib/pcm.ts";
import { GEMINI_TTS_MODEL } from "../../src/lib/speech.ts";
import { heardWords, wordsOf } from "../../src/lib/text.ts";
import { accessToken, credentials, generate, retry, sleep } from "./vertex.mjs";
import { level, levelsOf, readWav, toMonoWav, wavBytes, writeWav } from "./wav.mjs";

const TALK = talkById("ramen");
const VOICE = ME_VOICES.f.voice;
/** 手本が鳴りはじめてから、代わりの声が言いはじめるまで（秒）。 */
const LAG = 0.45;
/** 1周目に代わりの声が言うこと。聞こえなかったところ（… の所）は言えなかった。 */
const SAID = {
  "ramen.1": "Hey, what are you up to after class?",
  "ramen.2": "Nothing much. Why?",
  "ramen.3": "Wanna check... that new ramen place by the station?",
  "ramen.4": "Ooh, I've... try it. Can we go a bit later, though? I've gotta send an email first.",
  "ramen.5": "Sure, no rush. Just text me when you're done.",
  "ramen.6": "Will do.",
};
/** 日をあけて、この行だけ。 */
const LATER = { line: "ramen.4", said: "Ooh, I've been meaning to try it. Can we go a bit later, though? I've gotta send an email first." };
const HOW = "Say this like a Japanese university student repeating English they have just heard, a beat behind: a natural pace, a little careful";
const ask = (said) => `${HOW}${said.includes("...") ? ", trailing off at the dots" : ""}:\n${said}`;
/** /api/hear の頼み方（../src/app/api/hear/route.ts）。 */
const HEAR_PROMPT =
  "A Japanese university student speaking English with friends, sometimes repeating what they hear a moment behind. Some words may be Japanese. Write down exactly what they say, mistakes and all; do not complete or correct it.";

const OUT = "public/follow";
const RAW = "node_modules/.cache/raw";
mkdirSync(OUT, { recursive: true });
mkdirSync(RAW, { recursive: true });
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が無い（node --env-file=../.env.local）");

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 8);
const manifest = JSON.parse(readFileSync("../src/content/audio.json", "utf8"));

// ---- 代わりの声 ------------------------------------------------------------------------------------------------------

let vertex = null;
/** わたしの声で一つ言わせて、アプリと同じ手当て（pcm.ts の tidy）をし、大きさをそろえた WAV に。名前は言う文から。 */
async function take(key, said) {
  const name = `${key}.${hash(`${VOICE}\n${ask(said)}`)}`;
  const file = `${OUT}/${name}.wav`;
  if (!existsSync(file)) {
    vertex ??= await (async () => {
      const cred = credentials();
      return { cred, token: await accessToken(cred.account) };
    })();
    const j = await retry(
      () =>
        generate(vertex.cred, vertex.token, GEMINI_TTS_MODEL, {
          contents: [{ role: "user", parts: [{ text: ask(said) }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { languageCode: "en-US", voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE.replace(/^google:/, "") } } },
          },
        }),
      key,
    );
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error(`${key}: 音声が返らなかった`);
    const rate = rateOf(part.inlineData.mimeType);
    const samples = tidy(pcmToSamples(new Uint8Array(Buffer.from(part.inlineData.data, "base64"))), rate);
    const raw = `${RAW}/${name}.wav`;
    writeWav(raw, Int16Array.from(samples, (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767)), rate);
    level(raw, file);
    console.log(`  voiced ${key}「${said}」`);
    await sleep(1200);
  }
  const small = `${RAW}/${name}.16k.wav`;
  toMonoWav(file, small, { rate: 16000 });
  const { samples } = readWav(small);
  return { src: `follow/${name}.wav`, said, seconds: Math.round((samples.length / 16000) * 1000) / 1000, samples };
}

// ---- 録音と機械の耳 --------------------------------------------------------------------------------------------------

/** 代わりの声を、それぞれの時（秒）に置いた 16 kHz の録音。 */
function recording(parts, length) {
  const mix = new Float32Array(Math.ceil(length * 16000));
  for (const { at, samples } of parts) {
    const i0 = Math.round(at * 16000);
    for (let k = 0; k < samples.length && i0 + k < mix.length; k++) mix[i0 + k] += samples[k] / 32768;
  }
  return wavBytes(Int16Array.from(mix, (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767)), 16000);
}

/** /api/hear と同じ頼み方で。 */
async function hear(wav) {
  const form = new FormData();
  form.append("file", new Blob([wav], { type: "audio/wav" }), "said.wav");
  form.append("model", "gpt-4o-transcribe");
  form.append("prompt", HEAR_PROMPT);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  if (!res.ok) throw new Error(`機械の耳 HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()).text.trim();
}

const missedOf = (heard) => heard.flatMap((ok, i) => (ok ? [] : [i]));

async function main() {
  const before = existsSync("src/follow.json") ? JSON.parse(readFileSync("src/follow.json", "utf8")) : null;
  // 結果は、その声を聞いたもの。声のファイルが欠けていたら（public/ は git に入れない）、機械の耳まで一から。
  const kept = before && [...Object.values(before.round?.takes ?? {}), before.later?.take].every((t) => t && existsSync(`public/${t.src}`));
  const same = kept && JSON.stringify(before.round?.said) === JSON.stringify(SAID) && before.later?.said === LATER.said && before.voice === VOICE && before.lag === LAG;
  if (same && !process.argv.includes("--force")) return console.log("  src/follow.json はそのまま（作り直すなら --force）");

  // 1周目：Follow.tsx の round()。
  const words = TALK.lines.map((l) => wordsOf(l.text));
  const takes = {};
  for (const line of TALK.lines) takes[line.id] = await take(`round.${line.id}`, SAID[line.id]);
  const parts = [];
  let t = 0.25;
  let free = 0;
  for (const line of TALK.lines) {
    const at = Math.max(t + LAG, free + 0.12);
    parts.push({ at, samples: takes[line.id].samples });
    free = at + takes[line.id].seconds;
    t += manifest[line.id].dur + 0.55;
  }
  const length = Math.max(t - 0.55 + 1.3, free + 0.3);
  const roundWav = recording(parts, length);
  writeFileSync(`${RAW}/round.wav`, roundWav);
  const heard = await hear(roundWav);
  const all = heardWords(words.flat(), heard);
  let k = 0;
  const missed = Object.fromEntries(TALK.lines.map((l, i) => [l.id, missedOf(all.slice(k, (k += words[i].length)))]));
  console.log(`  1周目：機械の耳「${heard}」`);
  for (const l of TALK.lines) console.log(`    ${l.id} ${missed[l.id].length ? `聞こえなかった：${missed[l.id].map((i) => words[TALK.lines.indexOf(l)][i].text).join(" ")}` : "全部聞こえた"}`);

  // 日をあけて：Follow.tsx の drill()。
  const i4 = TALK.lines.findIndex((l) => l.id === LATER.line);
  const later = await take(`later.${LATER.line}`, LATER.said);
  const drillWav = recording([{ at: 0.2 + LAG, samples: later.samples }], Math.max(0.2 + manifest[LATER.line].dur + 1.1, 0.2 + LAG + later.seconds + 0.3));
  const laterHeard = await hear(drillWav);
  const laterMissed = missedOf(heardWords(words[i4], laterHeard));
  console.log(`  日をあけて ${LATER.line}：機械の耳「${laterHeard}」 ${laterMissed.length ? `聞こえなかった：${laterMissed.map((i) => words[i4][i].text).join(" ")}` : "全部聞こえた"}`);

  const strip = ({ samples, ...rest }) => rest;
  const out = {
    note: "学習者の声の代わりに、アプリのわたしの声（voice）。録音の組み方・機械の耳への頼み方・濃い薄いの出し方は、アプリの 追いかける と同じ（scripts/follow.mjs）。",
    voice: VOICE,
    lag: LAG,
    round: { said: SAID, takes: Object.fromEntries(Object.entries(takes).map(([id, x]) => [id, strip(x)])), heard, missed },
    later: { line: LATER.line, said: LATER.said, take: strip(later), heard: laterHeard, missed: laterMissed },
    // 録っている間のボタンの輪（Follow.tsx の --level）：1周目の ramen.4 の代わりの声の、コマごとの大きさ。
    levels: levelsOf(`public/${takes["ramen.4"].src}`).map((x) => Math.round(Math.min(1, x * 0.4) * 100) / 100),
  };
  writeFileSync("src/follow.json", `${JSON.stringify(out, null, 1)}\n`);
  console.log("  wrote src/follow.json");
}

main().catch((e) => {
  console.error("止まった:", String(e.message || e).slice(0, 300));
  process.exit(1);
});
