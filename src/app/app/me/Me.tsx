"use client";

import Link from "next/link";
import { useState } from "react";
import { CHUNKS, chunkById, lineById, talkById } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { ja } from "@/lib/i18n/ja";
import { caughtLines, daysOf, fullRounds, grownChunks, levelOf, type Level, type State } from "@/lib/record";
import { useRecord } from "@/lib/store";
import { useOpenChunk } from "../_parts/ChunkHost";
import page from "../_parts/page.module.css";
import styles from "./me.module.css";

const t = ja.me;
type View = "grown" | "chunks" | "days";
const VIEWS: View[] = ["grown", "chunks", "days"];
const LEVELS: Level[] = ["own", "role", "shadowed", "met"];

const dateOf = (at: number) => {
  const d = new Date(at);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

/** 自分: looking back only. The learner's own counts in one quiet row, then one view at a time. */
export function Me() {
  const state = useRecord();
  const [view, setView] = useState<View>("grown");
  if (!state) return <p className={page.skeleton}>{ja.common.loading}</p>;
  const talks = Object.values(state.talks).filter((l) => l.listened).length;
  const rounds = Object.values(state.talks).reduce((n, l) => n + fullRounds(l).length, 0);
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>{t.title}</h1>
        <Link href="/app/me/settings" className={page.barButton}>
          <Icon name="settings" size={16} />
          {t.settings}
        </Link>
      </header>
      <dl className={styles.stats}>
        <div>
          <dt>{t.stats.talks}</dt>
          <dd>{talks}</dd>
        </div>
        <div>
          <dt>{t.stats.rounds}</dt>
          <dd>{rounds}</dd>
        </div>
        <div>
          <dt>{t.stats.replies}</dt>
          <dd>{state.replies.length}</dd>
        </div>
      </dl>
      <p className={page.note}>{t.note}</p>
      <div className={styles.tabs} role="tablist" aria-label={t.viewsLabel}>
        {VIEWS.map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={styles.tab} onClick={() => setView(v)}>
            {t.views[v]}
          </button>
        ))}
      </div>
      <p className={page.note}>{t.viewNotes[view]}</p>
      {view === "grown" ? <Grown state={state} /> : null}
      {view === "chunks" ? <Chunks state={state} /> : null}
      {view === "days" ? <Days state={state} /> : null}
    </div>
  );
}

function Grown({ state }: { state: State }) {
  const caught = caughtLines(state);
  const grown = grownChunks(state);
  if (!caught.length && !grown.length) return <p className={page.empty}>{t.grownEmpty}</p>;
  return (
    <ul className={styles.list}>
      {caught.map((c) => {
        const found = lineById(c.line);
        return found ? (
          <li key={`${c.talk}:${c.line}`} className={styles.item}>
            <p className={styles.when}>{dateOf(c.at)}</p>
            <p className={styles.what}>{t.caught(found.talk.title)}</p>
            <p className={`${styles.en} t-en`}>{found.line.text}</p>
          </li>
        ) : null;
      })}
      {grown.map((g) => {
        const c = chunkById(g.chunk);
        return c ? (
          <li key={g.chunk} className={styles.item}>
            <p className={styles.when}>{dateOf(g.at)}</p>
            <p className={styles.what}>{t.grownChunk}</p>
            <p className={`${styles.en} t-en`}>{c.text}</p>
          </li>
        ) : null;
      })}
    </ul>
  );
}

function Chunks({ state }: { state: State }) {
  const open = useOpenChunk();
  const leveled = CHUNKS.map((c) => ({ c, level: levelOf(state, c.id) })).filter((x) => x.level);
  if (!leveled.length) return <p className={page.empty}>{t.chunksEmpty}</p>;
  return (
    <>
      {LEVELS.map((level) => {
        const these = leveled.filter((x) => x.level === level);
        return these.length ? (
          <section key={level} className={page.section}>
            <h2 className={page.h2}>
              {ja.chunk.levels[level]}
              <span className={styles.count}>{these.length}</span>
            </h2>
            <div className={styles.chips}>
              {these.map(({ c }) => (
                <button key={c.id} type="button" className={styles.chip} onClick={() => open({ chunk: c.id })}>
                  <span className="t-en">{c.text}</span>
                  <span className={styles.chipLabel}>{c.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null;
      })}
    </>
  );
}

function Days({ state }: { state: State }) {
  const days = daysOf(state);
  if (!days.length) return <p className={page.empty}>{t.daysEmpty}</p>;
  return (
    <ul className={styles.list}>
      {days.map((d) => (
        <li key={d.day} className={styles.item}>
          <p className={styles.when}>{d.day.replace(/^\d+-0?(\d+)-0?(\d+)$/, "$1月$2日")}</p>
          <p className={styles.what}>{t.dayLine(d.talks.length, d.rounds, d.replies)}</p>
          <p className={styles.sub}>{d.talks.map((id) => talkById(id)?.title ?? id).join("、")}</p>
        </li>
      ))}
    </ul>
  );
}
