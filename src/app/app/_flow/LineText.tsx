"use client";

import type { ReactNode } from "react";
import type { Line } from "@/content/index.ts";
import { wordsIn, wordsOf } from "@/lib/text";
import styles from "./line.module.css";

/**
 * How much of the subtitle shows. full: all of it. faint: pale (追いかける's second time). none: each word as its
 * shadow, a bar of its length, so the line keeps its shape without its letters. hint: the first word, then shadows
 * (返す, for the learner's own line).
 */
export type Show = "full" | "faint" | "none" | "hint";

type Group = { first: number; last: number; as: string };

/**
 * A line of a talk as text. Chunks are lit (violet when met in another talk before) and can be pressed; sounds show
 * what the words sound like (a casual spelling under them, ‿ where they run together); after the learner has followed
 * it, the words the machine's ear did not hear stay pale.
 */
export function LineText({
  line,
  show = "full",
  heard,
  marks = false,
  sounds = false,
  again,
  onChunk,
}: {
  line: Line;
  show?: Show;
  heard?: boolean[] | null;
  marks?: boolean;
  sounds?: boolean;
  again?: (chunk: string) => boolean;
  onChunk?: (chunk: string) => void;
}) {
  const words = wordsOf(line.text);
  const shadow = (i: number) => show === "none" || (show === "hint" && i > 0);

  // Each chunk's run of words (they never overlap within a line: tests/content.test.mjs).
  const chunkRuns: { first: number; last: number; chunk: string }[] = [];
  if (marks && show !== "none" && show !== "hint")
    for (const m of line.marks ?? []) {
      const at = line.text.indexOf(m.text);
      const ws = at < 0 ? [] : wordsIn(words, at, at + m.text.length);
      if (ws.length) chunkRuns.push({ first: ws[0], last: ws[ws.length - 1], chunk: m.chunk });
    }

  const groups: Group[] = [];
  const linkAfter = words.map(() => false);
  if (sounds && show === "full")
    for (const s of line.sounds ?? []) {
      const at = line.text.indexOf(s.text);
      const ws = at < 0 ? [] : wordsIn(words, at, at + s.text.length);
      if (!ws.length) continue;
      if (s.link) for (const i of ws.slice(0, -1)) linkAfter[i] = true;
      if (s.as) groups.push({ first: ws[0], last: ws[ws.length - 1], as: s.as });
    }

  const word = (i: number) => {
    const cls = [styles.w];
    if (shadow(i)) cls.push(styles.shadow);
    else if (heard) cls.push(heard[i] === false ? styles.missed : styles.heard);
    return (
      <span key={`w${i}`} className={cls.join(" ")}>
        {words[i].text}
      </span>
    );
  };
  // Words that run together: the space between them becomes a small arc under the line (drawn, so every font has it).
  const gap = (i: number) =>
    linkAfter[i] ? (
      <span key={`g${i}`} className={styles.link} aria-hidden="true">
        {" "}
      </span>
    ) : (
      " "
    );

  /** Words a..b with their casual spellings under them and the gaps between. */
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
        out.push(
          <ruby key={`r${i}`} className={styles.ruby}>
            {inner}
            <rt className={styles.as}>{g.as}</rt>
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
      const lit = again?.(c.chunk) ? styles.again : styles.mark;
      parts.push(
        onChunk ? (
          <button key={`c${i}`} type="button" className={`${styles.chunk} ${lit}`} onClick={() => onChunk(c.chunk)}>
            {run(c.first, c.last)}
          </button>
        ) : (
          <span key={`c${i}`} className={`${styles.chunk} ${lit}`}>
            {run(c.first, c.last)}
          </span>
        ),
      );
    } else parts.push(...run(i, i));
    if (end < words.length - 1) parts.push(gap(end));
    i = end + 1;
  }

  return (
    <p className={[styles.text, show === "faint" ? styles.faint : "", show === "none" || show === "hint" ? styles.hidden : ""].join(" ")} lang="en">
      {show === "none" || show === "hint" ? <span className="sr-only">{line.ja}</span> : null}
      <span aria-hidden={show === "none" || show === "hint" ? true : undefined}>{parts}</span>
    </p>
  );
}
