// A. 読めば分かる一行（サムの ramen.3）。ふつうの速さの会話だと聞こえない：一行がアプリの 聞く と同じ影（語の長さの棒）に
// なり、サムの声が言うそばから、その語の棒が少し濃くなる。知らないからではなく、音の形が変わるから：字幕に戻って、アプリの
// 聞こえ方（Want to の下に Wanna、check と out をつなぐ弧）。言いたいことがあっても出てこない：わたし は I で止まる。
import type { CSSProperties, ReactNode } from "react";
import { lineById } from "../../../src/content/index.ts";
import AUDIO from "../audio.json";
import { fall, leave, prog, typedAt } from "../anim";
import { clipAt, T, TYPE_STUCK } from "../timeline";
import { C, FONT } from "../theme";
import { Caret, LineText, playingAt, Speak, Who } from "../ui";

const LINE = lineById("ramen.3")!.line;
const big: CSSProperties = { margin: 0, fontSize: 60, fontWeight: 600, lineHeight: 1.45, letterSpacing: "0.01em", fontFamily: FONT.ja, textAlign: "center" };

/** 声がいま言っている語（アプリの語ごとの時刻：audio.json の times）。 */
function sayingAt(frame: number): number {
  const clip = clipAt("ramen.3");
  if (frame < clip.from || frame >= clip.until) return -1;
  const s = (frame - clip.from) / 30;
  return AUDIO["ramen.3"].times.findIndex(([a, b]) => s >= a && s < b + 0.04);
}

export function Hook({ frame }: { frame: number }) {
  const t = T.hook;
  // 影になる・字幕に戻る・聞こえ方が付く・まとまりが光る。
  const open = frame < t.sounds ? 1 - prog(frame, t.shadow, 12) : prog(frame, t.sounds, 14);
  const soundsIn = prog(frame, t.sounds + 16, 14);
  const lit = prog(frame, t.sounds + 16, 14);
  const words = (from: number, until: number, children: ReactNode, top = 150) => {
    if (frame < from - 1 || frame > until + 12) return null;
    const style = frame >= until ? leave(frame, until, 10, 12) : from === 0 ? {} : fall(frame, from + 4, 16, 16);
    return <div style={{ position: "absolute", top, left: 0, right: 0, ...style }}>{children}</div>;
  };
  return (
    <>
      {words(0, t.shadow, <p style={big}>読めば、分かる。</p>, 200)}
      {words(
        t.shadow,
        t.sounds,
        <>
          <p style={big}>でも、ふつうの速さの会話だと、</p>
          <p style={big}>聞こえない。</p>
        </>,
      )}
      {words(
        t.sounds,
        t.stuck,
        <>
          <p style={big}>知らないからではなく、</p>
          <p style={big}>
            <span style={{ color: C.accent }}>音の形</span>が変わるから。
          </p>
        </>,
      )}
      {words(
        t.stuck,
        t.end + 20,
        <>
          <p style={big}>言いたいことがあっても、</p>
          <p style={big}>その場で、出てこない。</p>
        </>,
      )}

      <Card top={430}>
        <div style={{ zoom: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Who who={LINE.who} />
            <Speak playing={playingAt(frame, clipAt("ramen.3"))} />
          </div>
          <LineText line={LINE} marks sounds size={25} open={open} soundsIn={soundsIn} lit={lit} saying={sayingAt(frame)} style={{ width: 620 }} />
        </div>
      </Card>
      <Stuck frame={frame} />
    </>
  );
}

function Card({ top, children, style }: { top: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", ...style }}>
      <div style={{ padding: "26px 48px 22px", border: `1.5px solid ${C.line2}`, borderRadius: 26, background: C.paper }}>{children}</div>
    </div>
  );
}

/** 返したいのに、I まで打って止まる（打つ欄はアプリの 返す の欄）。 */
function Stuck({ frame }: { frame: number }) {
  const t = T.hook;
  if (frame < t.stuck) return null;
  const text = typedAt(TYPE_STUCK, frame - t.type);
  const typing = frame >= t.type && frame < t.type + TYPE_STUCK.duration;
  // 打ち終わってからは、点滅したまま止まる。
  const caret = typing || Math.floor((frame - t.stuck) / 16) % 2 === 0;
  return (
    <div style={{ position: "absolute", top: 812, left: 0, right: 0, display: "flex", justifyContent: "center", ...fall(frame, t.stuck + 4, 18, 16) }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 1336 }}>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 600, color: C.muted, fontFamily: FONT.ja }}>わたし</p>
        <div style={{ minHeight: 110, padding: "22px 34px", border: `2.5px solid ${C.accent}`, borderRadius: 22, background: C.paper, fontFamily: FONT.en, fontSize: 50, lineHeight: 1.3, color: C.ink }}>
          {text}
          {caret ? <Caret /> : null}
        </div>
      </div>
    </div>
  );
}
