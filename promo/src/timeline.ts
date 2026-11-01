// いつ何が起きるか（秒で決めて、コマにする）。ナレーションの長さは src/voice.json（scripts/voice.mjs が書く）から、アプリの
// 声の長さは src/audio.json（scripts/assets.mjs）・src/follow.json（追いかける代わりの声：scripts/follow.mjs）・src/turn.json
// （直した文と返事：scripts/turn.mjs）から、打つ長さは打ち方（anim.ts の mixTyping）から。声が言い終わってから、次の
// できごとへ進む。英語の声の上に、ナレーションは重ねない。
//
// 見る人：中学・高校で英語を学び、読めば分かる英文は多いのに、ふつうの速さの会話は聞き取れず、言いたいことがあっても
// その場で出てこない人。ことのかげ の 聞く → 気づく → 追いかける → 返す → また出会う を、アプリの画面で見せる。
// 会話はアプリの中身のまま（「授業のあと」と、数日後の「土曜の準備」）。
import { f, mixTyping } from "./anim";
import AUDIO from "./audio.json";
import FOLLOW from "./follow.json";
import TURN from "./turn.json";
import VOICE from "./voice.json";

/** 問い：返したいのに、I まで打って止まる。 */
export const TYPE_STUCK = mixTyping([{ en: "I " }], 5);
/** 返す（自分で）：英語が出ないところ（バイト）は日本語のままで（turn.json の input）。 */
export const TYPE_ANSWER = mixTyping([{ en: "I have " }, { kana: "ばいと", ja: "バイト" }, { en: " today... How about Saturday?" }]);
if (TYPE_ANSWER.word !== TURN.input) throw new Error(`打つ文が turn.json の input と違う：${TYPE_ANSWER.word}`);

const sec = (frames: number) => frames / 30;

/** 鳴らす声：アプリの行とまとまり（audio.json）、追いかける代わりの声（follow.json）、直した文と返事（turn.json）。 */
const CLIPS = {
  ...(AUDIO as Record<keyof typeof AUDIO, { src: string; seconds: number }>),
  shadow: FOLLOW.round.takes["ramen.4"],
  fixed: TURN.voices.fixed,
  reply1: TURN.voices.reply[0],
  reply2: TURN.voices.reply[1],
};

type VoiceId = keyof typeof VOICE;
type ClipId = keyof typeof CLIPS;
/** ナレーションの末尾の余白（声が消えてから残した 250ms と、足した 120ms）。次の声やできごとは、ここに重ねてよい。 */
const TAIL = 0.37;
/** アプリの声の末尾の余白（../src/lib/pcm.ts の tidy：声のあと 120ms と無音 80ms）。まとまりだけの音は語の 120ms 後で切ってある。 */
const tailOf = (id: ClipId) => (id.startsWith("part.") ? 0.1 : 0.2);
/** 声が鳴っている長さ（秒）。 */
const said = (id: VoiceId) => VOICE[id] - TAIL;
const heard = (id: ClipId) => CLIPS[id].seconds - tailOf(id);
/** ナレーションとアプリの声を置いた時（秒）。make() が積む。 */
const cues: { id: VoiceId; at: number }[] = [];
const clips: { id: ClipId; at: number }[] = [];
/** `at` 秒にナレーションを置いて、言い終わる時（秒）を返す。 */
const say = (id: VoiceId, at: number) => {
  cues.push({ id, at });
  return at + said(id);
};
/** `at` 秒にアプリの声を置いて、言い終わる時（秒）を返す。 */
const play = (id: ClipId, at: number) => {
  clips.push({ id, at });
  return at + heard(id);
};

function make() {
  // A. 読めば分かる一行（ramen.3）。ふつうの速さだと聞こえない：一行が影（語の長さの棒）になって、サムの声で。知らない
  //    からではなく、音の形が変わるから：字幕に戻って Wanna と check‿out。言いたいことがあっても、出てこない：I で止まる。
  const hook = { start: 0, shadow: 0, clip: 0, sounds: 0, stuck: 0, type: 0, end: 0 };
  hook.shadow = say("V01", 0.3) + 0.2;
  hook.clip = say("V02", hook.shadow + 0.25) + 0.3;
  hook.sounds = play("ramen.3", hook.clip) + 0.35;
  hook.stuck = say("V03", hook.sounds + 0.3) + 0.35;
  hook.type = hook.stuck + 0.55;
  hook.end = say("V04", hook.stuck + 0.3) + 0.6;

  // B. ことのかげ：波が描かれ、少し遅れてその影が描かれる（アイコン）。
  const title = { start: hook.end, icon: hook.end + 0.3, word: hook.end + 1.0, lead: hook.end + 1.8, end: 0 };
  title.end = say("V05", title.word - 0.05) + 0.45;

  // C. 聞く：場面の写真と 流す。行は言われるそばから影で降ってくる（ramen.1・ramen.2）。
  const listen = { start: title.end - 0.2, cap: 0, play: 0, lines: [] as number[], end: 0 };
  listen.cap = listen.start + 0.4;
  listen.play = say("V06", listen.start + 0.5) + 0.25;
  const l1 = listen.play + 0.35;
  const l2 = play("ramen.1", l1) + 0.45;
  listen.lines = [l1, l2];
  listen.end = play("ramen.2", l2) + 0.6;

  // D. 気づく：影が字幕に戻り、まとまりが光り、聞こえ方が付く。I've been meaning to を押すと、そのまとまりのシート。
  //    ゆっくり（0.75 倍）で、そこだけ。
  const notice = { start: listen.end, cap: 0, open: 0, lit: 0, sounds: 0, press: 0, sheet: 0, cap2: 0, slow: 0, end: 0 };
  notice.cap = notice.start + 0.2;
  notice.open = notice.start + 0.35;
  notice.lit = notice.open + 0.75;
  notice.sounds = notice.lit + 0.35;
  notice.press = say("V07", notice.start + 0.4) + 0.25;
  notice.sheet = notice.press + 0.2;
  notice.cap2 = notice.sheet;
  notice.slow = say("V08", notice.sheet + 0.35) + 0.25;
  notice.end = play("part.slow", notice.slow + 0.1) + 0.6;

  // E. 追いかける（2周目、字幕 うすく）：録って追いかける。ミアの ramen.4 に、少し遅れてわたしの声。聞き取って、行ごとに
  //    聞こえた語は濃く、聞こえなかった語は薄く（follow.json：アプリと同じ処理の結果）。
  const follow = { start: notice.end, cap: 0, press: 0, model: 0, shadow: 0, hearing: 0, result: 0, cap2: 0, end: 0 };
  follow.cap = follow.start + 0.2;
  follow.press = say("V09", follow.start + 0.4) + 0.25;
  follow.model = follow.press + 0.6;
  follow.shadow = follow.model + FOLLOW.lag;
  follow.hearing = Math.max(play("ramen.4", follow.model) + 0.4, play("shadow", follow.shadow) + 0.2);
  follow.result = follow.hearing + 1.0;
  follow.cap2 = follow.result;
  follow.end = say("V10", follow.result + 0.3) + 0.6;

  // F. 返す（自分で）：サムのひとことと、あなたの事情。バイト だけ日本語で打って、送る。直った文（わたしの声）とサムの返事
  //    （turn.json：アプリの /api/turn が返したもの）。
  const answer = { start: follow.end, cap: 0, type: 0, cap2: 0, send: 0, result: 0, cap3: 0, fixed: 0, reply: 0, reply2: 0, end: 0 };
  answer.cap = answer.start + 0.2;
  answer.type = say("V12", answer.start + 0.4) + 0.3;
  answer.cap2 = answer.type;
  answer.send = Math.max(answer.type + sec(TYPE_ANSWER.duration), say("V13", answer.type + 0.2)) + 0.3;
  answer.result = answer.send + 1.2;
  answer.cap3 = answer.result;
  answer.fixed = say("V14", answer.send + 0.35) + 0.25;
  answer.reply = play("fixed", answer.fixed) + 0.18;
  answer.reply2 = play("reply1", answer.reply) + 0.18;
  answer.end = play("reply2", answer.reply2) + 0.6;

  // G. また出会う：数日後の「土曜の準備」（ノラとレオ）を 気づく で。前に追いかけたまとまりは紫。行を押して、ノラとレオの声で。
  const again = { start: answer.end, cap: 0, p5: 0, p6: 0, end: 0 };
  again.cap = again.start + 0.2;
  again.p5 = say("V15", again.start + 0.4) + 0.25;
  again.p6 = play("speakers.5", again.p5 + 0.1) + 0.35;
  again.end = play("speakers.6", again.p6 + 0.1) + 0.6;

  // H. 自分：できたこと（前は聞こえなかった ramen.4 が、日をあけて全部聞こえた：follow.json の later）。
  const me = { start: again.end, cap: 0, item: 0, end: 0 };
  me.cap = me.start + 0.2;
  me.item = me.start + 0.8;
  me.end = say("V16", me.start + 0.4) + 0.6;

  // I. 終わり
  const end = { start: me.end, icon: me.end + 0.3, word: me.end + 0.9, lead: me.end + 1.6, rest: me.end + 2.3, end: 0 };
  end.end = Math.max(end.start + 5.8, say("V17", end.word + 0.05) + 1.5);

  return { hook, title, listen, notice, follow, answer, again, me, end };
}

const S = make();
const frames = <T extends Record<string, number | number[]>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.map(f) : f(v)])) as { [K in keyof T]: T[K] extends number[] ? number[] : number };

export const T = {
  hook: frames(S.hook),
  title: frames(S.title),
  listen: frames(S.listen),
  notice: frames(S.notice),
  follow: frames(S.follow),
  answer: frames(S.answer),
  again: frames(S.again),
  me: frames(S.me),
  end: frames(S.end),
};

export const TOTAL = f(S.end.end);

/** ナレーション：クリップと、鳴らしはじめるコマ・声が消えるコマ（音楽はこの間だけ下がる）。 */
export const VOICE_AT = cues.map((c) => ({ id: c.id, from: f(c.at), until: f(c.at + said(c.id)) }));
/** アプリの声：ファイルと、鳴らしはじめるコマ・声が消えるコマ（ナレーションと同じく、音楽はこの間だけ下がる）。 */
export const CLIP_AT = clips.map((c) => ({ id: c.id, src: CLIPS[c.id].src, from: f(c.at), until: f(c.at + heard(c.id)) }));
/** アプリの声が鳴っている間（読み上げのボタンが光る）。 */
export const clipAt = (id: ClipId) => CLIP_AT.find((c) => c.id === id) ?? { from: -1, until: -1 };

/** 音楽の区切り（秒）。scripts/music.py に渡す。 */
export const MUSIC_MARKS = { title: S.title.start, story: S.listen.start, later: S.again.start, end: S.end.start, total: S.end.end };
