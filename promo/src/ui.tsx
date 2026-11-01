// ことのかげ の画面を、映像のために描き直したもの（../src/app/globals.css と ../src/**/*.module.css）。大きさはアプリの px
// のまま。画面は CSS の拡大で大きく見せる。ひとりでには動かない：どの変化もコマで決まる（CSS のアニメーションは使わない）。
// 行は、アプリの中身（../src/content）と、アプリの語の分け方（../src/lib/text.ts の wordsOf・wordsIn）をそのまま使う。
import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { PEOPLE, type Line, type PersonId } from "../../src/content/index.ts";
import { wordsIn, wordsOf } from "../../src/lib/text.ts";
import { mixColor } from "./anim";
import COPY from "./copy.json";
import { C, FONT } from "./theme";

// ---- アイコン（../src/components/Icon.tsx） ----------------------------------------------------------------------

const PATHS = {
  speaker: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  listen: (
    <>
      <path d="M4 16v-4a8 8 0 0 1 16 0v4" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  notice: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  follow: (
    <>
      <path d="M3 9c1.8-2.6 3.6-2.6 5.4 0s3.6 2.6 5.4 0 3.6-2.6 5.4 0" />
      <path d="M5.5 15c1.8-2.6 3.6-2.6 5.4 0s3.6 2.6 5.4 0 2.6-1.9 3.7-1.2" opacity="0.55" />
    </>
  ),
  answer: (
    <>
      <path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3 2.5V12a2 2 0 0 1-2-2z" />
      <path d="M12 17h7" />
      <path d="M15 20h4" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h8" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <circle cx="15" cy="7" r="2" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, color = "currentColor", stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
      {PATHS[name]}
    </svg>
  );
}

// ---- 小さな部品 ------------------------------------------------------------------------------------------------------

export const note: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.7, color: C.muted };
export const small: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.7, color: C.muted };

export const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;

/** 上下だけ切る（右端の輪が少しはみ出せるように）。 */
export const CLIP_Y: CSSProperties = { clipPath: "inset(0 -80px)" };

/** `p` が 0 → 1 で、高さ 0 から伸びる（下のものがなめらかに動く）。 */
export function Grow({ p, children }: { p: number; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: `${Math.max(0, Math.min(1, p))}fr` }}>
      <div style={{ minHeight: 0, ...CLIP_Y }}>{children}</div>
    </div>
  );
}

/** 指で押したところ：輪が寄って、離れる。`t` は押してからのコマ（前なら負）。 */
export function Press({ t, x = "50%", y = "50%", size = 46 }: { t: number; x?: number | string; y?: number | string; size?: number }) {
  if (t < -8 || t > 16) return null;
  const inP = Math.min(1, (t + 8) / 8);
  const outP = t > 0 ? Math.min(1, t / 16) : 0;
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        background: rgba(C.ink, 0.14 * inP * (1 - outP)),
        border: `2px solid ${rgba(C.ink, 0.32 * inP * (1 - outP))}`,
        transform: `scale(${1.25 - 0.25 * inP + 0.5 * outP})`,
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

/**
 * ボタン（globals.css の .btn / .btn-quiet）。`level`：録っている間（flow.module.css の .recording）、声の大きさで
 * 輪郭が太る（影ではなく outline）。`on`：押してある（aria-pressed）。
 */
export function Btn({
  children,
  quiet = false,
  on = false,
  disabled = false,
  press = -99,
  level,
  style,
}: {
  children: ReactNode;
  quiet?: boolean;
  on?: boolean;
  disabled?: boolean;
  press?: number;
  level?: number;
  style?: CSSProperties;
}) {
  const pressed = press >= 0 && press < 6;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: quiet ? 48 : 52,
        padding: quiet ? "0 18px" : "0 24px",
        borderRadius: 12,
        border: `1px solid ${quiet ? (on ? C.accent : C.line2) : C.accent}`,
        background: quiet ? (on ? C.tint : C.paper) : C.accent,
        color: quiet ? (disabled ? C.faint : on ? C.accent : C.ink) : "#fff",
        fontSize: quiet ? 15 : 16,
        fontWeight: quiet ? 500 : 600,
        fontFamily: FONT.ui,
        opacity: !quiet && disabled ? 0.55 : 1,
        outline: level !== undefined ? `${2 + level * 10}px solid ${C.tint}` : undefined,
        transform: pressed ? "scale(0.97)" : undefined,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
      <Press t={press} />
    </span>
  );
}

/** 行の下の小さなボタン（flow.module.css の .small2 / .small2Strong）。 */
export function Small2({ children, strong = false, press = -99 }: { children: ReactNode; strong?: boolean; press?: number }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 36,
        padding: "0 12px",
        border: `1px solid ${strong ? C.accent : C.line2}`,
        borderRadius: 999,
        background: C.paper,
        color: strong ? C.accent : C.ink,
        fontSize: 13,
        whiteSpace: "nowrap",
      }}
    >
      {children}
      <Press t={press} size={40} />
    </span>
  );
}

export function Caret({ height = "1.15em", color = C.ink }: { height?: string; color?: string }) {
  return <span style={{ display: "inline-block", width: 1.5, height, marginLeft: 1, marginRight: -2.5, verticalAlign: "-0.2em", background: color }} />;
}

/** アプリの声が鳴っている間の、読み上げのボタンの輪（Speak の playing）。輪は 1.4 秒ごとに広がる。 */
export function playingAt(frame: number, clip: { from: number; until: number }): number {
  return frame >= clip.from && frame < clip.until ? 1 + ((frame - clip.from) % 42) / 42 : 0;
}

/** 読み上げのボタン（Speak.module.css）。`playing`：鳴っている間は 1 以上（小数の部分が輪の広がり）。 */
export function Speak({ size = 36, playing = 0, press = -99 }: { size?: number; playing?: number; press?: number }) {
  return (
    <span
      style={{
        position: "relative",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${playing > 0 ? C.accent : C.line2}`,
        background: C.paper,
        color: playing > 0 ? C.accent : C.ink,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="speaker" size={size >= 44 ? 20 : 17} />
      {playing > 0 ? (
        <span
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: "50%",
            border: `1px solid ${C.accent}`,
            opacity: 0.7 * (1 - (playing % 1)),
            transform: `scale(${1 + 0.7 * (playing % 1)})`,
          }}
        />
      ) : null}
      <Press t={press} size={40} />
    </span>
  );
}

// ---- 画面の枠（_parts/page.module.css、BottomNav.module.css） -----------------------------------------------------

/** 上のバー：会話の題と、その二人。 */
export function Bar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 60, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
      <h1 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4 }}>
        {title}
        {sub ? <span style={{ display: "block", fontSize: 12.5, fontWeight: 400, color: C.muted, letterSpacing: 0 }}>{sub}</span> : null}
      </h1>
      {right}
    </header>
  );
}

export function BarButton({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "0 11px", border: `1px solid ${C.line2}`, borderRadius: 999, fontSize: 13, whiteSpace: "nowrap" }}>
      <Icon name={icon} size={16} />
      {children}
    </span>
  );
}

export type Tab = "today" | "talks" | "me";
export const NAV_H = 62;

/** 下のタブ（BottomNav）：追いかける・会話・自分。 */
export function BottomNav({ active }: { active: Tab }) {
  const items: [Tab, IconName, string][] = [
    ["today", "follow", COPY.nav.today],
    ["talks", "list", COPY.nav.talks],
    ["me", "user", COPY.nav.me],
  ];
  return (
    <nav style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: NAV_H, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", background: C.paper, borderTop: `1px solid ${C.line}`, padding: "4px 8px 8px", zIndex: 3 }}>
      {items.map(([id, icon, name]) => (
        <span key={id} style={{ minHeight: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: id === active ? C.accent : C.muted, fontWeight: id === active ? 600 : 400, fontSize: 11 }}>
          <Icon name={icon} size={22} />
          {name}
        </span>
      ))}
    </nav>
  );
}

// ---- この会話の流れ（_flow/Steps.tsx、steps.module.css） ----------------------------------------------------------

const STEPS: [IconName, string][] = [
  ["listen", COPY.flow.steps.listen],
  ["notice", COPY.flow.steps.notice],
  ["follow", COPY.flow.steps.follow],
  ["answer", COPY.flow.steps.answer],
];

/** 段：済んだ段はチェック、いまの段は光る、先の段は薄い。 */
export function Steps({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", margin: 0, padding: "4px 0 16px", listStyle: "none", borderBottom: `1px solid ${C.line}` }}>
      {STEPS.map(([icon, name], i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li key={name} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {i > 0 ? <span style={{ position: "absolute", top: 19, right: "50%", width: "100%", height: 2, background: state === "next" ? C.line2 : C.accent }} /> : null}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${state === "next" ? C.line2 : C.accent}`,
                background: state === "done" ? C.accent : state === "now" ? C.tint : C.paper,
                color: state === "done" ? "#fff" : state === "now" ? C.accent : C.faint,
                outline: state === "now" ? `4px solid ${C.tint}` : undefined,
                outlineOffset: 2,
              }}
            >
              <Icon name={state === "done" ? "check" : icon} size={20} />
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 4, fontSize: 12, lineHeight: 1.3, whiteSpace: "nowrap", color: state === "now" ? C.accent : state === "done" ? C.ink2 : C.faint, fontWeight: state === "now" ? 600 : 400 }}>
              <span style={{ fontFamily: FONT.en, fontSize: 11 }}>{i + 1}</span>
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---- 行（_flow/LineText.tsx、line.module.css、flow.module.css） --------------------------------------------------

/** 字幕の見え方。full：全部。faint：薄く（2周目）。none：語ごとに、その長さの影（棒）。hint：最初の語だけ。 */
export type Show = "full" | "faint" | "none" | "hint";

/** 誰が言うか（Who.tsx）：名前を小さく、行の上に。 */
export function Who({ who, you }: { who: PersonId; you?: string }) {
  return (
    <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, fontWeight: 600, color: C.muted }}>
      <span style={{ letterSpacing: "0.02em" }}>{PEOPLE[who].kana}</span>
      {you ? <span style={{ fontSize: 12, fontWeight: 600, color: C.accent, padding: "1px 8px", borderRadius: 999, background: C.tint }}>{you}</span> : null}
    </p>
  );
}

/**
 * 会話の一行。アプリの LineText と同じ組み立て：まとまりは光り（前の会話で出会ったものは紫）、聞こえ方は語の下に
 * くだけた綴り（Wanna）と、つながる所の弧。追いかけたあとは、機械の耳に聞こえなかった語が薄く、点線の下線。
 * 映像のための動き：`open`（0 → 1）で影が字幕に戻る。`lit`・`soundsIn`（0 → 1）でまとまりと聞こえ方が付く。
 * `saying`：いま声が言っている語（影のまま少し濃く）。`pressChunk`：押すまとまりと、押してからのコマ。
 */
export function LineText({
  line,
  show = "full",
  heard = null,
  marks = false,
  sounds = false,
  again,
  size = 18,
  open = 1,
  lit = 1,
  soundsIn = 1,
  saying = -1,
  pressChunk,
  style,
}: {
  line: Line;
  show?: Show;
  heard?: boolean[] | null;
  marks?: boolean;
  sounds?: boolean;
  again?: (chunk: string) => boolean;
  size?: number;
  open?: number;
  lit?: number;
  soundsIn?: number;
  saying?: number;
  pressChunk?: { chunk: string; t: number };
  style?: CSSProperties;
}) {
  const words = wordsOf(line.text);
  const hidden = show === "none" || show === "hint";
  // 影から字幕へ：open が 1 に近づくほど、棒が消えて字が出る。
  const shadowOf = (i: number) => (show === "none" || (show === "hint" && i > 0) ? 1 : 1 - open);

  const chunkRuns: { first: number; last: number; chunk: string }[] = [];
  if (marks && !hidden)
    for (const m of line.marks ?? []) {
      const at = line.text.indexOf(m.text);
      const ws = at < 0 ? [] : wordsIn(words, at, at + m.text.length);
      if (ws.length) chunkRuns.push({ first: ws[0], last: ws[ws.length - 1], chunk: m.chunk });
    }

  const groups: { first: number; last: number; as: string }[] = [];
  const linkAfter = words.map(() => false);
  if (sounds && show === "full")
    for (const s of line.sounds ?? []) {
      const at = line.text.indexOf(s.text);
      const ws = at < 0 ? [] : wordsIn(words, at, at + s.text.length);
      if (!ws.length) continue;
      if (s.link) for (const i of ws.slice(0, -1)) linkAfter[i] = true;
      if (s.as) groups.push({ first: ws[0], last: ws[ws.length - 1], as: s.as });
    }

  const inChunk = (i: number) => chunkRuns.find((c) => i >= c.first && i <= c.last);
  const word = (i: number) => {
    const sh = shadowOf(i);
    const c = inChunk(i);
    const missed = heard ? heard[i] === false : false;
    let color: string = C.ink;
    let opacity = 1;
    let deco: CSSProperties = {};
    if (show === "faint") {
      color = C.faint;
      opacity = 0.6;
    } else if (missed) {
      color = C.faint;
      deco = { textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: C.line2, textDecorationThickness: 2, textUnderlineOffset: "0.32em" };
    } else if (c) color = mixColor(C.ink, again?.(c.chunk) ? C.again : C.accent, lit);
    const bar = sh > 0 ? (i === saying ? C.line2 : C.line) : null;
    return (
      <span
        key={`w${i}`}
        style={{
          borderRadius: 3,
          color: sh >= 1 ? "transparent" : sh > 0 ? rgba(color.startsWith("#") ? color : C.ink, 1 - sh) : color,
          background: bar ? rgba(bar, sh) : undefined,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
          opacity,
          ...deco,
        }}
      >
        {words[i].text}
      </span>
    );
  };
  // つながる所：語と語のあいだの空白が、行の下の小さな弧になる（描くので、どの字でも出る）。
  const gap = (i: number) =>
    linkAfter[i] ? (
      <span key={`g${i}`} style={{ position: "relative", whiteSpace: "pre" }}>
        {" "}
        <span
          style={{
            position: "absolute",
            left: "-0.2em",
            right: "-0.2em",
            bottom: "-0.08em",
            height: "0.3em",
            border: `${(1.6 * size) / 18}px solid ${C.accent}`,
            borderTop: 0,
            borderRadius: "0 0 0.5em 0.5em",
            opacity: soundsIn,
          }}
        />
      </span>
    ) : (
      " "
    );

  const run = (a: number, b: number): ReactNode[] => {
    const out: ReactNode[] = [];
    let i = a;
    while (i <= b) {
      const g = groups.find((x) => x.first === i && x.last <= b);
      if (g) {
        const inner: ReactNode[] = [];
        for (let k = g.first; k <= g.last; k++) {
          inner.push(word(k));
          if (k < g.last) inner.push(gap(k));
        }
        // 聞こえ方の塊は折り返さない（行の終わりに来ると、語の途中で割れて gotta が g と otta に分かれる）。
        out.push(
          <ruby key={`r${i}`} style={{ rubyPosition: "under", rubyAlign: "center", whiteSpace: "nowrap" } as CSSProperties}>
            {inner}
            <rt style={{ fontFamily: FONT.en, fontSize: "0.64em", fontWeight: 500, color: C.accent, letterSpacing: "0.02em", lineHeight: 1, opacity: soundsIn }}>{g.as}</rt>
          </ruby>,
        );
        i = g.last;
      } else out.push(word(i));
      if (i < b) out.push(gap(i));
      i++;
    }
    return out;
  };

  const parts: ReactNode[] = [];
  let i = 0;
  while (i < words.length) {
    const c = chunkRuns.find((x) => x.first === i);
    const end = c ? c.last : i;
    if (c) {
      const tint = again?.(c.chunk) ? C.againTint : C.tint;
      const press = pressChunk?.chunk === c.chunk ? pressChunk.t : undefined;
      parts.push(
        <span
          key={`c${i}`}
          style={{ position: press !== undefined ? "relative" : undefined, padding: "0 0.12em", margin: "0 -0.12em", borderRadius: "0.22em", background: rgba(tint, lit), boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
        >
          {run(c.first, c.last)}
          {press !== undefined ? <Press t={press} size={44} /> : null}
        </span>,
      );
    } else parts.push(...run(i, i));
    if (end < words.length - 1) parts.push(gap(end));
    i = end + 1;
  }

  return <p style={{ margin: 0, fontFamily: FONT.en, fontSize: size, lineHeight: 2, color: C.ink, wordBreak: "normal", overflowWrap: "break-word", ...style }}>{parts}</p>;
}

/** 行の箱（flow.module.css の .line）：鳴っている行は左に印。 */
export function LineBox({ now = 0, last = false, children, anchor, style }: { now?: number; last?: boolean; children: ReactNode; anchor?: string; style?: CSSProperties }) {
  return (
    <li data-anchor={anchor} style={{ position: "relative", padding: "8px 0 12px 14px", borderBottom: last ? undefined : `1px solid ${C.line}`, ...style }}>
      <span style={{ position: "absolute", left: 0, top: 12, bottom: 14, width: 3, borderRadius: 2, background: rgba(C.accent, now) }} />
      {children}
    </li>
  );
}

export function LineHead({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 36 }}>{children}</div>;
}

// ---- 追いかける の周と設定（flow.module.css の .roundBar・.segmented） ---------------------------------------------

export function RoundBar({ round, done, aim = 5 }: { round: number; done: number; aim?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{round}周目</span>
      <span style={{ display: "inline-flex", gap: 6 }}>
        {Array.from({ length: Math.max(aim, done) }, (_, i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", border: `1.5px solid ${i < done ? C.accent : C.line2}`, background: i < done ? C.accent : undefined }} />
        ))}
      </span>
    </div>
  );
}

export function Seg({ label, options, value, disabled = false }: { label: string; options: string[]; value: string; disabled?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 12.5, color: C.muted, marginRight: 4 }}>{label}</span>
      {options.map((o) => (
        <span
          key={o}
          style={{
            minHeight: 34,
            padding: "0 11px",
            display: "inline-flex",
            alignItems: "center",
            border: `1px solid ${o === value ? C.accent : C.line2}`,
            borderRadius: 999,
            background: o === value ? C.tint : C.paper,
            color: o === value ? C.accent : C.ink2,
            fontWeight: o === value ? 600 : 400,
            fontSize: 13,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {o}
        </span>
      ))}
    </div>
  );
}

// ---- シート（Sheet.module.css）：下から。罫線と、暗くしたページ ----------------------------------------------------

export function Sheet({ p, head, children, height }: { p: number; head: ReactNode; children: ReactNode; height?: number }) {
  if (p <= 0) return null;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: rgba(C.ink, 0.36 * p), zIndex: 6 }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height,
          border: `1px solid ${C.line}`,
          borderBottom: 0,
          borderRadius: "16px 16px 0 0",
          background: C.paper,
          overflow: "hidden",
          opacity: p,
          transform: `translateY(${(1 - p) * 24}px)`,
          zIndex: 7,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 12px 12px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>{head}</div>
          <span style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <Icon name="close" size={20} />
          </span>
        </div>
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>{children}</div>
      </div>
    </>
  );
}

// ---- 場面の写真（_flow/Scene.tsx、scene.module.css） ---------------------------------------------------------------

/** 場面の写真。`height`：小さくすると、顔のある 3 分の 1 の所が帯で残る。 */
export function SceneImg({ talk, height }: { talk: string; height: number }) {
  return (
    <figure style={{ display: "block", width: "100%", height, margin: "2px 0 0", overflow: "hidden", border: `1px solid ${C.line}`, borderRadius: 12, background: C.surface }}>
      <Img src={staticFile(`app/scenes/${talk}.webp`)} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
    </figure>
  );
}
