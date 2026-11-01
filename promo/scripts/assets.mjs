// 映像に要るものを public/ に集め、src/audio.json（クリップのファイル・長さ・語ごとの時刻）を書く。映像の時はこの長さから決まる。
//   - アプリのアイコン（../public/icons/icon-512.png）と、二つの会話の場面の写真（../public/scenes、src/content/scenes.json の名前で）
//   - 英語の行は、アプリの声そのもの（../public/audio、../src/content/audio.json の名前で）。大きさだけナレーションの近くに
//     そろえて WAV に（scripts/wav.mjs）。
//   - まとまりだけの音（気づく のシートの ゆっくり・ふつう）は、アプリの partItem と同じ所を切る：語の時刻の 60ms 前から
//     120ms 後まで。ゆっくりは 0.75 倍（アプリと同じく、声の高さは変えない：atempo）。
//   - アプリの言葉（../src/lib/i18n/ja.ts）を src/copy.json に。ja.ts は process.env を読むので、映像の束ねには入れず
//     ここで書き出す（関数の言葉は、映像で使う形で呼んでおく）。
//   - アプリの字（IBM Plex Sans・IBM Plex Sans JP・しっぽり明朝）。Google Fonts の倉庫（OFL）からまるごと取り、映像の元
//     （src/）とアプリの中身（../src/content、../src/lib/i18n）に出てくる字だけに切る（Python の fontTools）。
//   node scripts/assets.mjs        (npm run assets)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lineById, talkById } from "../../src/content/index.ts";
import { ja } from "../../src/lib/i18n/ja.ts";
import { wordsIn, wordsOf } from "../../src/lib/text.ts";
import { level } from "./wav.mjs";

const APP = "..";
/** 映像で鳴らすアプリの行：聞く（ramen.1・2）、問いと返す（ramen.3）、追いかける（ramen.4）、また出会う（speakers.5・6）。 */
const LINES = ["ramen.1", "ramen.2", "ramen.3", "ramen.4", "speakers.5", "speakers.6"];
/** 気づく で押すまとまり：その行と、ゆっくり・ふつう。 */
const PART = { line: "ramen.4", chunk: "ive-been-meaning-to", rates: { slow: 0.75, normal: 1 } };
const SCENES = ["ramen", "speakers"];

const FONTS = {
  "IBMPlexSans.ttf": "ibmplexsans/IBMPlexSans%5Bwdth,wght%5D.ttf",
  "IBMPlexSansJP-Regular.ttf": "ibmplexsansjp/IBMPlexSansJP-Regular.ttf",
  "IBMPlexSansJP-Medium.ttf": "ibmplexsansjp/IBMPlexSansJP-Medium.ttf",
  "IBMPlexSansJP-SemiBold.ttf": "ibmplexsansjp/IBMPlexSansJP-SemiBold.ttf",
  "ShipporiMincho-Bold.ttf": "shipporimincho/ShipporiMincho-Bold.ttf",
};
const WHOLE = "node_modules/.cache/fonts";

for (const d of ["public/app/scenes", "public/fonts", WHOLE]) mkdirSync(d, { recursive: true });
copyFileSync(`${APP}/public/icons/icon-512.png`, "public/app/icon.png");
const scenes = JSON.parse(readFileSync(`${APP}/src/content/scenes.json`, "utf8"));
for (const id of SCENES) copyFileSync(`${APP}/public/scenes/${scenes[id].file}`, `public/app/scenes/${id}.webp`);

// ---- アプリの言葉 ----------------------------------------------------------------------------------------------------

// 関数でない言葉はそのまま（JSON に書くと関数は落ちる）。関数の言葉は、映像で使う形で。
const copy = JSON.parse(JSON.stringify(ja));
copy.flow.follow.round2 = ja.flow.follow.round(2);
copy.flow.follow.round3 = ja.flow.follow.round(3);
copy.flow.answer.asMia = ja.flow.answer.as("ミア");
copy.flow.answer.asSam = ja.flow.answer.as("サム");
copy.me.caughtRamen = ja.me.caught(talkById("ramen").title);
writeFileSync("src/copy.json", `${JSON.stringify(copy, null, 1)}\n`);

// ---- 字 ------------------------------------------------------------------------------------------------------------

// 映像の元とアプリの中身に出てくる字（と、印字できる ASCII すべて）。まるごとの日本語の字は数 MB あり、書き出しの
// 各ページで読むと時間切れになることがある。
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const chars = new Set(Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)));
for (const file of [...walk("src"), ...walk(`${APP}/src/content`), ...walk(`${APP}/src/lib/i18n`)]) for (const ch of readFileSync(file, "utf8")) if (ch > "\u007f") chars.add(ch);
writeFileSync(`${WHOLE}/chars.txt`, [...chars].join(""));
for (const [file, path] of Object.entries(FONTS)) {
  if (!existsSync(`${WHOLE}/${file}`)) {
    const res = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${path}`);
    if (!res.ok) throw new Error(`${file}: ${res.status}`);
    writeFileSync(`${WHOLE}/${file}`, Buffer.from(await res.arrayBuffer()));
    console.log(`  font ${file}`);
  }
  const cut = spawnSync(
    "python",
    ["-m", "fontTools.subset", `${WHOLE}/${file}`, `--text-file=${WHOLE}/chars.txt`, `--output-file=public/fonts/${file}`, "--layout-features=*", "--no-hinting"],
    { encoding: "utf8" },
  );
  if (cut.status !== 0) throw new Error(`cutting ${file} (pip install fonttools): ${cut.stderr}`);
}
console.log(`  fonts cut to ${chars.size} characters`);

// ---- アプリの声 ------------------------------------------------------------------------------------------------------

const manifest = JSON.parse(readFileSync(`${APP}/src/content/audio.json`, "utf8"));
const out = {};
for (const id of LINES) {
  const clip = manifest[id];
  if (!clip) throw new Error(`${id} has no clip in the app`);
  const { seconds, gain } = level(`${APP}/public/audio/${clip.file}`, `public/app/${id}.wav`);
  out[id] = { src: `app/${id}.wav`, seconds, gain, times: clip.times };
}

// まとまりだけ（ChunkHost の partItem と同じ所）。
const { line } = lineById(PART.line);
const mark = line.marks.find((m) => m.chunk === PART.chunk);
const at = line.text.indexOf(mark.text);
const ws = wordsIn(wordsOf(line.text), at, at + mark.text.length);
const times = manifest[PART.line].times;
const from = Math.max(0, times[ws[0]][0] - 0.06);
const to = times[ws[ws.length - 1]][1] + 0.12;
for (const [name, rate] of Object.entries(PART.rates)) {
  const id = `part.${name}`;
  const filter = `atrim=${from}:${to},asetpts=PTS-STARTPTS${rate === 1 ? "" : `,atempo=${rate}`}`;
  const { seconds, gain } = level(`${APP}/public/audio/${manifest[PART.line].file}`, `public/app/${id}.wav`, filter);
  out[id] = { src: `app/${id}.wav`, seconds, gain, line: PART.line, chunk: PART.chunk, words: ws, rate };
}

writeFileSync("src/audio.json", `${JSON.stringify(out, null, 1)}\n`);
console.log(Object.entries(out).map(([id, c]) => `  ${id} ${c.seconds}s（${c.gain > 0 ? "+" : ""}${c.gain} dB）`).join("\n"));
