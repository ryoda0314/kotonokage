// ナレーションを Gemini TTS（Vertex AI）で合成する。台本は voice/lines.json、出力は public/voice/<id>.wav、
// 各クリップの長さは src/voice.json（映像の時はこの長さから決まる：src/timeline.ts）。姉妹の映像の voice.mjs と同じ。
//   node scripts/voice.mjs --env <.env のパス>              まだ無いものだけ作る（途中で止まっても同じコマンドで続く）
//   node scripts/voice.mjs --env <path> --only V01,V02      指定の ID だけ（--force で作り直す）
//   node scripts/voice.mjs --env <path> --check             できたクリップを書き起こして、台本と並べる（耳の前の確かめ）
//   node scripts/voice.mjs --durations                      public/voice から src/voice.json だけ書き直す
// 鍵は scripts/vertex.mjs のとおり。音の手当て（頭の無音を切る・末尾のフェードと余白・ピークの天井）は姉妹と同じ。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { accessToken, audioOf, credentials, generate, retry, sleep } from "./vertex.mjs";

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const flag = (n) => args.includes(`--${n}`);
const only = opt("only")?.split(",").map((s) => s.trim());

const SPEC = JSON.parse(readFileSync("voice/lines.json", "utf8"));
const OUT = "public/voice";
// 書き起こし（--check）。
const CHECK_MODEL = "gemini-2.5-pro";
/** 書き起こしの頼み方：形だけ伝える（どの文かは伝えない。伝えると確かめにならない）。 */
const CHECK_ASK = "この音声は日本語のナレーションです。聞こえたとおりに、かな漢字で書き起こしてください。翻訳・補足・説明は書かないでください。";
const TRIM_THRESHOLD = 0.006; // 無音とみなす振幅（フルスケール比）
const TRIM_KEEP_MS = 20; // 頭に残す助走。0 にすると語頭の子音が削れる
const FADE_OUT_MS = 150;
const TAIL_SILENCE_MS = 120;
const DELAY_MS = 1500;

// ---- 音の手当て ---------------------------------------------------------------------------------------------------

/** 頭の無音を、10ms 窓の RMS で見て落とす（単発のクリックで止まらないように）。 */
function trimLeadingSilence(s, rate) {
  const limit = TRIM_THRESHOLD * 32768;
  const win = Math.max(1, Math.floor((rate * 10) / 1000));
  let i = 0;
  for (; i + win <= s.length; i += win) {
    let sum = 0;
    for (let k = i; k < i + win; k++) sum += s[k] * s[k];
    if (Math.sqrt(sum / win) >= limit) break;
  }
  if (i + win > s.length) return s;
  return s.subarray(Math.max(0, i - Math.floor((rate * TRIM_KEEP_MS) / 1000)));
}

/**
 * 末尾の長い無音は落とし（映像の時がクリップの長さで決まるので）、声の終わりから 250ms は残す。
 * そこにフェードアウトと短い余白を足す。語尾は切らない（フェードは声が消えてから掛かる）。
 */
function fadeAndPad(s, rate) {
  const limit = TRIM_THRESHOLD * 32768;
  const win = Math.max(1, Math.floor((rate * 10) / 1000));
  let end = s.length;
  for (; end - win >= 0; end -= win) {
    let sum = 0;
    for (let k = end - win; k < end; k++) sum += s[k] * s[k];
    if (Math.sqrt(sum / win) >= limit) break;
  }
  const body = s.subarray(0, Math.min(s.length, end + Math.floor((rate * 250) / 1000)));
  const fade = Math.min(body.length, Math.floor((rate * FADE_OUT_MS) / 1000));
  const out = new Int16Array(body.length + Math.floor((rate * TAIL_SILENCE_MS) / 1000));
  out.set(body, 0);
  for (let i = body.length - fade; i < body.length; i++) out[i] = Math.round(out[i] * (1 - (i - (body.length - fade)) / fade));
  return out;
}

/** ピークが天井に触れていたら下げる（音量をそろえるためではない）。 */
function normalizePeak(s, ceiling = 0.92) {
  let peak = 0;
  for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
  const limit = ceiling * 32768;
  if (peak <= limit || peak === 0) return s;
  for (let i = 0; i < s.length; i++) s[i] = Math.round((s[i] * limit) / peak);
  return s;
}

function toWav(samples, rate) {
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

const seconds = (file) => {
  const b = readFileSync(file);
  return b.readUInt32LE(40) / 2 / b.readUInt32LE(24);
};

/** public/voice にあるクリップの長さを src/voice.json に（映像の時を決める）。 */
function writeDurations() {
  const out = {};
  for (const line of SPEC.lines) {
    const f = `${OUT}/${line.id}.wav`;
    if (existsSync(f)) out[line.id] = Math.round(seconds(f) * 1000) / 1000;
  }
  writeFileSync("src/voice.json", `${JSON.stringify(out, null, 1)}\n`);
  const missing = SPEC.lines.filter((l) => !(l.id in out)).map((l) => l.id);
  console.log(`  src/voice.json：${Object.keys(out).length}本${missing.length ? `（まだ無い：${missing.join(",")}）` : ""}`);
}

// ---- 合成・確かめ ------------------------------------------------------------------------------------------------

async function synth(cred, token, line) {
  const j = await generate(cred, token, SPEC.model, {
    contents: [{ role: "user", parts: [{ text: SPEC.style[line.style ?? line.lang] + line.text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: SPEC.voice } } } },
  });
  const { rate, pcm } = audioOf(j);
  return toWav(normalizePeak(fadeAndPad(trimLeadingSilence(pcm, rate), rate)), rate);
}

async function transcribe(cred, token, wav) {
  const j = await generate(cred, token, CHECK_MODEL, {
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/wav", data: wav.toString("base64") } }, { text: CHECK_ASK }] }],
    generationConfig: { temperature: 0 },
  });
  return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
}

async function main() {
  if (flag("durations")) return writeDurations();
  const cred = credentials(opt("env"));
  const token = await accessToken(cred.account);
  const lines = SPEC.lines.filter((l) => !only || only.includes(l.id));

  if (flag("check")) {
    for (const line of lines) {
      const f = `${OUT}/${line.id}.wav`;
      if (!existsSync(f)) continue;
      const heard = await retry(() => transcribe(cred, token, readFileSync(f)), line.id);
      console.log(`  ${line.id}  ${seconds(f).toFixed(2)}秒  台本「${line.text}」\n        聞こえた「${heard}」`);
      await sleep(400);
    }
    return;
  }

  mkdirSync(OUT, { recursive: true });
  console.log(`  ${SPEC.model} 声=${SPEC.voice}（Vertex AI ${cred.location}）`);
  let made = 0;
  for (const line of lines) {
    const f = `${OUT}/${line.id}.wav`;
    if (existsSync(f) && !flag("force")) continue;
    try {
      const wav = await retry(() => synth(cred, token, line), line.id, DELAY_MS);
      writeFileSync(f, wav);
      made++;
      console.log(`  OK  ${line.id}  ${seconds(f).toFixed(2)}秒  ${line.text}`);
      await sleep(DELAY_MS);
    } catch (e) {
      console.error(`  失敗 ${line.id}: ${String(e.message || e).slice(0, 200)}`);
      process.exitCode = 1;
    }
  }
  console.log(`  作った ${made}本`);
  writeDurations();
}

main().catch((e) => {
  console.error("止まった:", String(e.message || e).slice(0, 300));
  process.exit(1);
});
