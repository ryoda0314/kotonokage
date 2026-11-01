import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

export const FPS = 30;

/** 秒 → コマ。 */
export const f = (seconds: number) => Math.round(seconds * FPS);

// アプリの行が降りてくる動き（flow.module.css の fall）。姉妹と同じ。
export const FALL = Easing.bezier(0.2, 0.8, 0.3, 1);
export const SOFT = Easing.bezier(0.33, 0, 0.2, 1);

/** `start` から `dur` コマで 0 → 1。 */
export function prog(frame: number, start: number, dur: number, easing: (t: number) => number = FALL): number {
  if (dur <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** 上から降ってくる。 */
export function fall(frame: number, start: number, dist = 18, dur = f(0.55)): CSSProperties {
  const p = prog(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * -dist}px)` };
}

/** 下からせり上がる。 */
export function rise(frame: number, start: number, dist = 14, dur = f(0.6)): CSSProperties {
  const p = prog(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
}

/** 少し上がりながら、静かに消える。 */
export function leave(frame: number, start: number, dur = f(0.4), dist = 10): CSSProperties {
  const p = prog(frame, start, dur, SOFT);
  return { opacity: 1 - p, transform: `translateY(${p * -dist}px)` };
}

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** 色から色へ（どちらも #rrggbb）。 */
export function mixColor(a: string, b: string, p: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${ca.map((x, i) => Math.round(mix(x, cb[i], p))).join(",")})`;
}

// ---- 英語に日本語を混ぜて打つ：英語は一字ずつ、日本語はかなで打ってから替わる（返す（自分で）の 打つ欄）-------------

/** 打つ一切れ：英語（空白や記号も含めてよい）か、日本語（かなで打って `ja` に替える）。 */
export type TypePart = { en: string } | { ja: string; kana: string };

export type Typing = { word: string; steps: string[]; at: number[]; duration: number };

/** 打っている途中の見え方を、一打ちずつ。`convert`：かなを替える一打ち（少し間を置く）。 */
export function mixSteps(parts: TypePart[]): { steps: string[]; convert: boolean[] } {
  const steps: string[] = [];
  const convert: boolean[] = [];
  let done = "";
  for (const p of parts) {
    if ("en" in p) {
      for (const ch of p.en) {
        done += ch;
        steps.push(done);
        convert.push(false);
      }
    } else {
      let typed = "";
      for (const ch of p.kana) {
        typed += ch;
        steps.push(done + typed);
        convert.push(false);
      }
      done += p.ja;
      steps.push(done);
      convert.push(true);
    }
  }
  return { steps, convert };
}

/** `per`：一打ちのコマ数（語の切れ目で少し長く）。かなを替える一打ちの前は少し待つ。 */
export function mixTyping(parts: TypePart[], per = 2): Typing {
  const { steps, convert } = mixSteps(parts);
  const at: number[] = [];
  let t = 0;
  steps.forEach((s, i) => {
    t += per + (s.endsWith(" ") ? 2 : 0) + (i % 5 === 3 ? 1 : 0) + (convert[i] ? 7 : 0);
    at.push(t);
  });
  return { word: steps[steps.length - 1] ?? "", steps, at, duration: t };
}

/** `frame`（打ちはじめからのコマ）での見え方。 */
export function typedAt(typing: Typing, frame: number): string {
  let text = "";
  typing.at.forEach((a, i) => {
    if (frame >= a) text = typing.steps[i];
  });
  return text;
}
