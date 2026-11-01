// C–H. 一つの会話の流れを、アプリの画面で。左に映像の言葉。会話はアプリの中身のまま。
//   聞く：「授業のあと」（サムとミア）。場面の写真と 流す。行は言われるそばから、語の長さの影で降ってくる。
//   気づく：影が字幕に戻り、まとまりが光り（週末の会話で出会った though は紫）、聞こえ方が付く。I've been meaning to を
//     押すと、そのまとまりのシート。ゆっくり（0.75 倍）で、そこだけ。
//   追いかける：2周目（字幕 うすく）。ミアの ramen.4 に、少し遅れて わたしの声。聞き取って、聞こえた語は濃く、聞こえなかった
//     語は薄く。結果はアプリと同じ処理で出したもの（follow.json）。
//   返す（自分で）：サムのひとことと、あなたの事情。バイト だけ日本語で打って送る。直した文とサムの返事は、アプリの /api/turn
//     が返したもの（turn.json）。
//   また出会う：数日後の「土曜の準備」（ノラとレオ）を 気づく で。週末と授業のあとで出会ったまとまりは紫。行を押して聞く。
//   自分：できたこと。前は聞こえなかった ramen.4 が、日をあけて全部聞こえた（follow.json の later）。
// 学ぶ人の手持ちは「週末どうだった？」「授業のあと」と、数日後の「土曜の準備」。自分 の数（会話 3・周 12・返した文 2）と
// 日付（10月30日）は、映像のために置いた例。
import type { CSSProperties, ReactNode } from "react";
import { chunkById, chunksOf, PEOPLE, peopleOf, talkById, talksWithChunk, type Talk } from "../../../src/content/index.ts";
import { diffRanges, type Range } from "../../../src/lib/diff.ts";
import { wordsOf } from "../../../src/lib/text.ts";
import { f, fall, mix, prog, SOFT, typedAt } from "../anim";
import COPY from "../copy.json";
import FOLLOW from "../follow.json";
import { Scroll, type Focus } from "../Scroll";
import { clipAt, T, TYPE_ANSWER } from "../timeline";
import { C, FONT } from "../theme";
import TURN from "../turn.json";
import {
  Bar,
  BarButton,
  BottomNav,
  Btn,
  Caret,
  Grow,
  Icon,
  LineBox,
  LineHead,
  LineText,
  NAV_H,
  note,
  playingAt,
  RoundBar,
  SceneImg,
  Seg,
  Sheet,
  small,
  Small2,
  Speak,
  Steps,
  Who,
  type Tab,
} from "../ui";
import { Captions, type Cap } from "./Caption";

const RAMEN = talkById("ramen")!;
const SPEAKERS = talkById("speakers")!;
const WEEKEND = talkById("weekend")!;
const CHUNK = "ive-been-meaning-to";
/** 前の会話で出会ったまとまり（紫）：授業のあとの前に 週末どうだった？、土曜の準備の前に その二つ。 */
const metIn = (...talks: Talk[]) => new Set(talks.flatMap(chunksOf));
const BEFORE_RAMEN = metIn(WEEKEND);
const BEFORE_SPEAKERS = metIn(WEEKEND, RAMEN);
const pair = (talk: Talk) => peopleOf(talk).map((p) => PEOPLE[p].kana).join("と");

const t = COPY.flow;
const en = (text: string, color?: string, at?: number) => ({ text, font: "en" as const, color, at });

/** 映像の言葉。 */
const CAPS: Cap[] = [
  { from: T.listen.cap, door: "listen", main: [["字幕なしで、"], ["まるごと聞く。"]], sub: [["何の話か、つかめたところまででいい。"], ["手がかりは、声と場面の写真だけ。"]] },
  {
    from: T.notice.cap,
    door: "notice",
    main: [["読めば分かるのに、"], ["聞こえなかったところ。"]],
    sub: [["字幕を開いて、自分で気づく。"], ["聞こえ方（", en("wanna", C.accent), "）は、気づいたあとの答え合わせ。"]],
    subAt: T.notice.sounds,
  },
  { from: T.notice.cap2, door: "notice", main: [["まとまりだけを、"], ["ゆっくりでも。"]], sub: [["押すと、そこだけが流れる。"]] },
  { from: T.follow.cap, door: "follow", main: [["声のすぐあとを、"], ["自分の声で。"]], sub: [["流すと同時に録る。字幕は、周ごとに薄く。"]] },
  { from: T.follow.cap2, door: "follow", main: [["機械の耳に、"], ["何と聞こえたか。"]], sub: [["聞こえた語は濃く、聞こえなかった語は薄く。"], ["点数ではない。"]] },
  { from: T.answer.cap, door: "answer", main: [["追いかけたら、"], ["相手のひとことに返す。"]], sub: [["はじめは役のせりふで、次は自分の事情で。"]] },
  { from: T.answer.cap2, door: "answer", main: [["英語が出ないところは、"], ["日本語のままで。"]] },
  { from: T.answer.cap3, door: "answer", main: [["直った英語が、"], ["手本の声になる。"]], sub: [["それも追いかけられる。"], ["相手は、中身に返す。"]] },
  { from: T.again.cap, door: "again", main: [["数日後、"], ["別の会話・別の声で。"]], sub: [[{ text: "前に追いかけたまとまり", color: C.again }, "は、紫で戻ってくる。"]] },
  { from: T.me.cap, door: "me", main: [["前は聞こえなかった行が、"], ["日をあけて聞こえた日。"]], sub: [["「できたこと」として残る。"]] },
];

const PANEL = { left: 880, top: 30, width: 900, height: 1020 };
const K = 1.5;
const PW = PANEL.width / K;
const PH = PANEL.height / K;
const BAR = 61;

export function Story({ frame }: { frame: number }) {
  return (
    <>
      <Captions frame={frame} caps={CAPS} until={T.end.start} />
      <Panel frame={frame} />
    </>
  );
}

function Panel({ frame }: { frame: number }) {
  const cuts = [T.notice.start, T.follow.start, T.answer.start, T.again.start, T.me.start];
  const w = (i: number) => (i === 0 ? 1 : prog(frame, cuts[i - 1], 12, SOFT)) * (i === cuts.length ? 1 : 1 - prog(frame, cuts[i], 12, SOFT));
  const screens = [ListenScreen, NoticeScreen, FollowScreen, AnswerScreen, AgainScreen, MeScreen];
  return (
    <div style={{ position: "absolute", ...PANEL, borderRadius: 28, border: `1.5px solid ${C.line2}`, overflow: "hidden", background: C.paper, ...fall(frame, T.listen.start, 24, 18) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `scale(${K})`, transformOrigin: "0 0" }}>
        {screens.map((Screen, i) =>
          w(i) > 0 ? (
            <div key={i} style={{ position: "absolute", inset: 0, opacity: w(i), background: C.paper }}>
              <Screen frame={frame} />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

/** 上のバーと、その下の中身（ページは 16px の余白）、下のタブ。`overlay`：シートなど、ページの上に重ねるもの。 */
function Page({
  title,
  sub,
  right,
  tab = "today",
  focus,
  overlay,
  children,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  tab?: Tab;
  focus?: Focus[];
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "0 16px", background: C.paper, zIndex: 2 }}>
        <Bar title={title} sub={sub} right={right} />
      </div>
      <Scroll style={{ left: 0, right: 0, top: BAR, bottom: NAV_H }} focus={focus}>
        <div style={{ padding: "0 16px 24px" }}>{children}</div>
      </Scroll>
      <BottomNav active={tab} />
      {overlay}
    </>
  );
}

const head: CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: "18px 0 6px" };
const controls: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 4 };
const status: CSSProperties = { fontSize: 14, color: C.muted };
const lines: CSSProperties = { listStyle: "none", margin: 0, padding: "12px 0 8px", display: "flex", flexDirection: "column", gap: 4 };
const section: CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: "20px 0", borderTop: `1px solid ${C.line}` };
const h2: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 600 };
const lineActions: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 6 };

/** 行が鳴っている間（読み上げのボタンの輪、行の左の印）。 */
const sounding = (frame: number, clip: { from: number; until: number }) => (frame >= clip.from && frame < clip.until ? 1 : 0);

// ---- 聞く ------------------------------------------------------------------------------------------------------------

function ListenScreen({ frame }: { frame: number }) {
  const l = T.listen;
  const playing = frame >= l.play && frame < l.end;
  // 流すと、写真は顔の帯に下がる（scene.module.css の max-height 0.5s）。
  const photo = mix(379, 104, prog(frame, l.play, 15, SOFT));
  const shown = l.lines.filter((at) => frame >= at).length;
  const clipOf = (i: number) => clipAt(i === 0 ? "ramen.1" : "ramen.2");
  return (
    <Page
      title={RAMEN.title}
      sub={pair(RAMEN)}
      focus={[
        // 流す が押す前に見えるよう、写真を上に送る。流れはじめたら、降ってくる行へ。
        { anchor: "photo", w: prog(frame, l.start + 45, 30, SOFT), margin: 44 },
        { anchor: "lines", w: prog(frame, l.lines[0], 20, SOFT), margin: 250 },
      ]}
    >
      <Steps current={0} />
      <section style={head}>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: C.ink2 }}>{RAMEN.lead}</p>
        <div data-anchor="photo">
          <SceneImg talk="ramen" height={photo} />
        </div>
        <p style={note}>{t.listen.lead}</p>
        <div style={controls}>
          <Btn press={frame - l.play}>
            <Icon name={playing ? "stop" : "speaker"} size={20} />
            {playing ? COPY.common.stop : t.listen.play}
          </Btn>
        </div>
      </section>
      <ol data-anchor="lines" style={lines}>
        {RAMEN.lines.slice(0, shown).map((line, i) => (
          <LineBox key={line.id} now={sounding(frame, clipOf(i))} style={fall(frame, l.lines[i], 18, f(0.55))}>
            <Who who={line.who} />
            <LineText line={line} show="none" />
          </LineBox>
        ))}
      </ol>
    </Page>
  );
}

// ---- 気づく ----------------------------------------------------------------------------------------------------------

function NoticeScreen({ frame }: { frame: number }) {
  const n = T.notice;
  const lit = prog(frame, n.lit, 15);
  const soundsIn = prog(frame, n.sounds, 15);
  return (
    <Page title={RAMEN.title} sub={pair(RAMEN)} focus={[{ anchor: "line1", w: prog(frame, n.lit, 30, SOFT), margin: 6 }]} overlay={<ChunkSheet frame={frame} />}>
      <Steps current={1} />
      <section style={head}>
        <p style={note}>{t.notice.lead}</p>
        <div style={controls}>
          <Btn quiet>
            <Icon name="speaker" size={20} />
            {t.notice.play}
          </Btn>
          <Btn quiet>{COPY.common.showJa}</Btn>
        </div>
      </section>
      <ol style={lines}>
        {RAMEN.lines.map((line, i) => (
          <LineBox key={line.id} anchor={`line${i}`} last={i === RAMEN.lines.length - 1}>
            <LineHead>
              <Who who={line.who} />
              <Speak />
            </LineHead>
            <LineText
              line={line}
              marks
              sounds
              again={(c) => BEFORE_RAMEN.has(c)}
              open={prog(frame, n.open + i * 3, 14)}
              lit={lit}
              soundsIn={soundsIn}
              pressChunk={line.marks?.some((m) => m.chunk === CHUNK) ? { chunk: CHUNK, t: frame - n.press } : undefined}
            />
          </LineBox>
        ))}
      </ol>
      <p style={small}>{t.notice.soundsNote}</p>
    </Page>
  );
}

/** 押したまとまりのシート（ChunkHost）：はたらき、行と ゆっくり・ふつう・行ごと、このまとまりが出る会話。 */
function ChunkSheet({ frame }: { frame: number }) {
  const n = T.notice;
  const chunk = chunkById(CHUNK)!;
  const line = RAMEN.lines.find((l) => l.marks?.some((m) => m.chunk === CHUNK))!;
  const slow = clipAt("part.slow");
  const h3: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 600, color: C.muted };
  const pill: CSSProperties = { fontSize: 12, padding: "2px 8px", borderRadius: 999 };
  return (
    <Sheet
      p={prog(frame, n.sheet, 8, SOFT)}
      head={
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: FONT.en, fontSize: 20, fontWeight: 600, lineHeight: 1.4 }}>{chunk.text}</span>
          <span style={{ fontSize: 14, color: C.muted }}>{chunk.label}</span>
        </div>
      }
    >
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={h3}>{COPY.chunk.does}</h3>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: C.ink2 }}>{chunk.does}</p>
        <p style={{ margin: 0, alignSelf: "flex-start", fontSize: 12.5, color: C.ink2, padding: "2px 10px", borderRadius: 999, background: C.surface }}>{COPY.chunk.levels.met}</p>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <LineText line={line} marks sounds again={(c) => BEFORE_RAMEN.has(c)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Btn quiet on={sounding(frame, slow) > 0} press={frame - n.slow}>
            {COPY.chunk.slow}
          </Btn>
          <Btn quiet>{COPY.chunk.normal}</Btn>
          <Btn quiet>{COPY.chunk.line}</Btn>
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={h3}>{COPY.chunk.where}</h3>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {talksWithChunk(CHUNK).map((talk, i, all) => (
            <li key={talk.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "8px 2px", borderTop: `1px solid ${C.line}`, borderBottom: i === all.length - 1 ? `1px solid ${C.line}` : undefined }}>
              <span style={{ flex: 1, fontSize: 15 }}>{talk.title}</span>
              {talk.id === RAMEN.id ? (
                <span style={{ ...pill, color: C.muted, background: C.surface }}>{COPY.chunk.levels.met}</span>
              ) : (
                <span style={{ fontSize: 12, color: C.faint }}>{COPY.chunk.notYet}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Sheet>
  );
}

// ---- 追いかける ------------------------------------------------------------------------------------------------------

const FOLLOW_LINE = RAMEN.lines.findIndex((l) => l.id === "ramen.4");

function FollowScreen({ frame }: { frame: number }) {
  const fo = T.follow;
  const running = frame >= fo.press && frame < fo.hearing;
  const hearing = frame >= fo.hearing && frame < fo.result;
  const judged = frame >= fo.result;
  // 録っている間のボタンの輪は、代わりの声の大きさで（follow.json の levels：代わりの声が鳴りはじめてから）。
  const level = running ? (FOLLOW.levels[frame - fo.shadow] ?? 0) : undefined;
  const rounds = judged ? 2 : 1;
  const model = clipAt("ramen.4");
  return (
    <Page
      title={RAMEN.title}
      sub={pair(RAMEN)}
      focus={[
        { anchor: "controls", w: prog(frame, fo.start + 20, 24, SOFT), margin: 10 },
        { anchor: `line${FOLLOW_LINE - 1}`, w: prog(frame, fo.result + 4, 24, SOFT), margin: 6 },
      ]}
    >
      <Steps current={2} />
      <section style={head}>
        <p style={note}>{t.follow.lead}</p>
        <RoundBar round={rounds + 1} done={rounds} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
          <Seg label={COPY.common.speed} options={["0.85", "1", "1.15"].map((s) => COPY.common.speeds[s as "1"])} value={COPY.common.speeds["1"]} disabled={running || hearing} />
          <Seg label={t.follow.subtitles} options={[t.follow.subs.full, t.follow.subs.faint, t.follow.subs.none]} value={judged ? t.follow.subs.none : t.follow.subs.faint} disabled={running || hearing} />
        </div>
        <p style={small}>{t.follow.earphones}</p>
        <div data-anchor="controls" style={controls}>
          {running ? (
            <Btn level={level}>
              <Icon name="stop" size={20} />
              {t.follow.cancel}
            </Btn>
          ) : (
            <Btn disabled={hearing} press={frame - fo.press}>
              <Icon name="mic" size={20} />
              {t.follow.start}
            </Btn>
          )}
          {running ? <span style={status}>{t.follow.running}</span> : null}
          {hearing ? <span style={status}>{t.follow.hearing}</span> : null}
        </div>
        <Grow p={prog(frame, fo.result, 10, SOFT)}>
          <p style={small}>{t.follow.resultLead}</p>
        </Grow>
      </section>
      <ol style={lines}>
        {RAMEN.lines.map((line, i) => {
          const missed: number[] = FOLLOW.round.missed[line.id as keyof typeof FOLLOW.round.missed];
          const heard = judged ? wordsOf(line.text).map((_, j) => !missed.includes(j)) : null;
          return (
            <LineBox key={line.id} anchor={`line${i}`} now={i === FOLLOW_LINE ? sounding(frame, model) : 0} last={i === RAMEN.lines.length - 1}>
              <LineHead>
                <Who who={line.who} />
                {judged && !missed.length ? <span style={{ fontSize: 12, color: C.muted }}>{t.follow.allHeard}</span> : null}
              </LineHead>
              <LineText line={line} show={judged ? "full" : "faint"} heard={heard} />
              <Grow p={prog(frame, fo.result, 10, SOFT)}>
                <div style={lineActions}>
                  <Small2>
                    <Icon name="speaker" size={16} />
                    {t.follow.modelThenMine}
                  </Small2>
                  <Small2 strong={missed.length > 0}>
                    <Icon name="mic" size={16} />
                    {t.follow.lineOnly}
                  </Small2>
                </div>
              </Grow>
            </LineBox>
          );
        })}
      </ol>
    </Page>
  );
}

// ---- 返す（自分で） --------------------------------------------------------------------------------------------------

const SAM_LINE = RAMEN.lines.find((l) => l.id === RAMEN.answer.line)!;

/** 直したところの印（Answer.tsx の Ranges：消した字に線、足した字に下線）。 */
function Ranges({ text, ranges, kind }: { text: string; ranges: Range[]; kind: "del" | "ins" }) {
  const look: CSSProperties =
    kind === "del"
      ? { color: C.faint, textDecorationLine: "line-through", textDecorationThickness: 1.5 }
      : { color: C.accent, fontWeight: 600, textDecorationLine: "underline", textDecorationThickness: 2, textUnderlineOffset: "0.3em" };
  const out: ReactNode[] = [];
  let at = 0;
  ranges.forEach((r, i) => {
    if (r.start > at) out.push(text.slice(at, r.start));
    out.push(
      <span key={i} style={look}>
        {text.slice(r.start, r.end)}
      </span>,
    );
    at = r.end;
  });
  out.push(text.slice(at));
  return <>{out}</>;
}

function AnswerScreen({ frame }: { frame: number }) {
  const a = T.answer;
  const typing = frame >= a.type && frame < a.type + TYPE_ANSWER.duration;
  const sending = frame >= a.send && frame < a.result;
  const done = frame >= a.result;
  const draft = done ? "" : typedAt(TYPE_ANSWER, frame - a.type);
  const focused = frame >= a.type - 6 && !done;
  const caret = typing || (focused && !sending && Math.floor(frame / 16) % 2 === 0);
  const { removed, added } = diffRanges(TURN.input, TURN.result.fixed, "en");
  const fixed = clipAt("fixed");
  const reply = { from: clipAt("reply1").from, until: clipAt("reply2").until };
  const lbl: CSSProperties = { margin: "6px 0 0", fontSize: 12.5, fontWeight: 600, color: C.muted };
  return (
    <Page
      title={RAMEN.title}
      sub={pair(RAMEN)}
      focus={[
        { anchor: "own", w: prog(frame, a.start + 14, 30, SOFT), margin: 8 },
        { anchor: "turn", w: prog(frame, a.result + 2, 26, SOFT), margin: 4 },
      ]}
    >
      <Steps current={3} />
      <section style={{ ...head, paddingBottom: 14 }}>
        <p style={note}>{t.answer.lead}</p>
      </section>
      <section style={section}>
        <h2 style={h2}>{t.answer.roleTitle}</h2>
        <p style={note}>{t.answer.roleLead}</p>
        {/* まだ役で返していないとき、どちらの役も押せる（Answer.tsx の Role：二人とも .btn）。 */}
        <div style={controls}>
          <Btn>
            <Icon name="mic" size={18} />
            {t.answer.asSam}
          </Btn>
          <Btn>
            <Icon name="mic" size={18} />
            {t.answer.asMia}
          </Btn>
        </div>
      </section>
      <section data-anchor="own" style={section}>
        <h2 style={h2}>{t.answer.ownTitle}</h2>
        <p style={note}>{t.answer.ownLead}</p>
        <div data-anchor="card" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 16px 14px", border: `1px solid ${C.line2}`, borderRadius: 12 }}>
          <SceneImg talk="ramen" height={104} />
          <LineHead>
            <Who who={SAM_LINE.who} />
            <Speak />
          </LineHead>
          <LineText line={SAM_LINE} />
          <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.muted }}>
              {t.answer.mine}（{PEOPLE.mia.kana}）
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 15, lineHeight: 1.75 }}>{RAMEN.answer.mine}</p>
          </div>
        </div>
        <Grow p={prog(frame, a.result, 14, SOFT)}>
          <div data-anchor="turn" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={lbl}>{t.answer.yours}</p>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: C.ink2, fontFamily: FONT.ui }}>
                <Ranges text={TURN.input} ranges={removed} kind="del" />
              </p>
              <p style={lbl}>{t.answer.fixed}</p>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7, color: C.ink, fontFamily: FONT.en }}>
                <Ranges text={TURN.result.fixed} ranges={added} kind="ins" />
              </p>
              {/* 直したところ（notes）は、アプリでも閉じた details。 */}
              {TURN.result.notes.length ? (
                <p style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: C.muted }}>
                  {/* 閉じた details の三角（ブラウザが描くもの。字には無い）。 */}
                  <svg width={8} height={9} viewBox="0 0 8 9" style={{ display: "block" }}>
                    <path d="M0 0 8 4.5 0 9z" fill="currentColor" />
                  </svg>
                  {t.answer.why}
                </p>
              ) : null}
              <p style={lbl}>{t.answer.gaps}</p>
              <ul style={{ margin: "6px 0 0", paddingLeft: "1.2em", lineHeight: 1.8, color: C.ink2, fontSize: 15 }}>
                {TURN.result.gaps.map((g) => (
                  <li key={g.ja}>
                    <span style={{ display: "inline-flex", gap: 12 }}>
                      <span>{g.ja}</span>
                      <span style={{ fontFamily: FONT.en }}>{g.en}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={lineActions}>
              <Speak playing={playingAt(frame, fixed)} />
              <Small2 strong>
                <Icon name="mic" size={16} />
                {t.answer.followFixed}
              </Small2>
            </div>
            <div style={{ padding: "4px 0 0 14px", borderLeft: `3px solid ${C.line}` }}>
              <LineHead>
                <Who who={SAM_LINE.who} />
                <Speak playing={playingAt(frame, reply)} />
              </LineHead>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, fontFamily: FONT.en }}>{TURN.result.reply}</p>
            </div>
          </div>
        </Grow>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
          <div
            style={{
              width: "100%",
              minHeight: 84,
              padding: "12px 14px",
              border: `1px solid ${focused ? C.accent : C.line2}`,
              borderRadius: 12,
              background: C.paper,
              fontFamily: FONT.ui,
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            {draft ? (
              <span>
                {draft}
                {caret ? <Caret /> : null}
              </span>
            ) : (
              <span>
                {caret ? <Caret /> : null}
                <span style={{ color: C.faint }}>{t.answer.placeholder}</span>
              </span>
            )}
          </div>
          <div style={controls}>
            <Btn quiet={!!draft || sending}>
              <Icon name="mic" size={18} />
              {done ? t.answer.replyAgain : t.answer.speak}
            </Btn>
            <Btn quiet={!draft && !sending} disabled={sending || (!draft && !done)} press={frame - a.send}>
              {sending ? t.answer.sending : t.answer.send}
            </Btn>
          </div>
        </div>
      </section>
    </Page>
  );
}

// ---- また出会う：数日後の「土曜の準備」 ------------------------------------------------------------------------------

function AgainScreen({ frame }: { frame: number }) {
  const g = T.again;
  const playing = [clipAt("speakers.5"), clipAt("speakers.6")];
  return (
    <Page
      title={SPEAKERS.title}
      sub={pair(SPEAKERS)}
      focus={[
        { anchor: "line0", w: prog(frame, g.start + 10, 30, SOFT), margin: 6 },
        { anchor: "line1", w: prog(frame, g.p5 - 20, 26, SOFT), margin: 6 },
      ]}
    >
      <Steps current={1} />
      <section style={head}>
        <p style={note}>{t.notice.lead}</p>
        <div style={controls}>
          <Btn quiet>
            <Icon name="speaker" size={20} />
            {t.notice.play}
          </Btn>
          <Btn quiet>{COPY.common.showJa}</Btn>
        </div>
      </section>
      <ol style={lines}>
        {SPEAKERS.lines.map((line, i) => {
          const k = i === 4 ? 0 : i === 5 ? 1 : -1;
          return (
            <LineBox key={line.id} anchor={`line${i}`} now={k >= 0 ? sounding(frame, playing[k]) : 0} last={i === SPEAKERS.lines.length - 1}>
              <LineHead>
                <Who who={line.who} />
                <Speak playing={k >= 0 ? playingAt(frame, playing[k]) : 0} press={k === 0 ? frame - g.p5 : k === 1 ? frame - g.p6 : -99} />
              </LineHead>
              <LineText line={line} marks sounds again={(c) => BEFORE_SPEAKERS.has(c)} />
            </LineBox>
          );
        })}
      </ol>
    </Page>
  );
}

// ---- 自分 ------------------------------------------------------------------------------------------------------------

/** 映像のための例：これまでの数と、ramen.4 が全部聞こえた日。 */
const EXAMPLE = { talks: 3, rounds: 12, replies: 2, caught: "10月30日" };

function MeScreen({ frame }: { frame: number }) {
  const m = T.me;
  const caught = RAMEN.lines.find((l) => l.id === FOLLOW.later.line)!;
  const me = COPY.me;
  const stat = (n: number, label: string) => (
    <div style={{ display: "flex", flexDirection: "column-reverse", gap: 2 }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontFamily: FONT.en, fontSize: 22, fontWeight: 500 }}>{n}</span>
    </div>
  );
  return (
    <Page title={me.title} tab="me" right={<BarButton icon="settings">{me.settings}</BarButton>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, margin: "18px 0 8px" }}>
        {stat(EXAMPLE.talks, me.stats.talks)}
        {stat(EXAMPLE.rounds, me.stats.rounds)}
        {stat(EXAMPLE.replies, me.stats.replies)}
      </div>
      <p style={note}>{me.note}</p>
      <div style={{ display: "flex", gap: 6, margin: "18px 0 4px", borderBottom: `1px solid ${C.line}` }}>
        {(["grown", "chunks", "days"] as const).map((v) => (
          <span
            key={v}
            style={{
              minHeight: 42,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              marginBottom: -1,
              borderBottom: `2px solid ${v === "grown" ? C.accent : "transparent"}`,
              color: v === "grown" ? C.accent : C.muted,
              fontWeight: v === "grown" ? 600 : 400,
              fontSize: 14.5,
            }}
          >
            {me.views[v]}
          </span>
        ))}
      </div>
      <p style={note}>{me.viewNotes.grown}</p>
      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
        <li style={{ padding: "12px 0", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 2, ...fall(frame, m.item, 16, f(0.55)) }}>
          <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>{EXAMPLE.caught}</p>
          <p style={{ margin: 0, fontSize: 14.5 }}>{me.caughtRamen}</p>
          <p style={{ margin: "2px 0 0", fontSize: 16.5, lineHeight: 1.6, fontFamily: FONT.en }}>{caught.text}</p>
        </li>
      </ul>
    </Page>
  );
}
