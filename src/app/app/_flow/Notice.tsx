"use client";

import { useState } from "react";
import { chunkById, chunksOf, type Talk } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { prefNow } from "@/components/local";
import { lineItem, playList, stop, unlock } from "@/components/player";
import { Speak } from "@/components/Speak";
import { ja } from "@/lib/i18n/ja";
import { metBefore, type State } from "@/lib/record";
import { useOpenChunk } from "../_parts/ChunkHost";
import page from "../_parts/page.module.css";
import styles from "./flow.module.css";
import { LineText } from "./LineText";
import { Who } from "./Who";

const t = ja.flow;

/**
 * 気づく: the subtitle opens. Reading it, the learner finds where they knew the words but did not hear them; a line
 * or a chunk plays on its own; what the words sound like (wanna, ‿) is shown as the answer, after.
 */
export function Notice({ talk, state, since, onNext }: { talk: Talk; state: State; since: number; onNext: () => void }) {
  const openChunk = useOpenChunk();
  const [showJa, setShowJa] = useState(() => prefNow("showJa", false));
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(-1);
  const again = (chunk: string) => metBefore(state, chunk, talk.id, since);

  async function run() {
    unlock();
    setPlaying(true);
    await playList(
      talk.lines.map((l) => lineItem(l)),
      { gapMs: 450, onItem: (i) => setAt(i) },
    );
    setAt(-1);
    setPlaying(false);
  }

  return (
    <>
      <section className={styles.head}>
        <p className={page.note}>{t.notice.lead}</p>
        <div className={styles.controls}>
          <button type="button" className="btn-quiet" onClick={() => (playing ? stop() : void run())}>
            <Icon name={playing ? "stop" : "speaker"} size={20} />
            {playing ? ja.common.stop : t.notice.play}
          </button>
          <button type="button" className="btn-quiet" aria-pressed={showJa} onClick={() => setShowJa(!showJa)}>
            {showJa ? ja.common.hideJa : ja.common.showJa}
          </button>
        </div>
      </section>

      <ol className={styles.lines}>
        {talk.lines.map((line, i) => (
          <li key={line.id} className={`${styles.line} ${styles.still}`} data-now={i === at || undefined}>
            <div className={styles.lineHead}>
              <Who who={line.who} />
              <Speak item={lineItem(line)} label={ja.common.play} size="sm" />
            </div>
            <LineText line={line} marks sounds again={again} onChunk={(chunk) => openChunk({ chunk, line })} />
            {showJa ? <p className={styles.ja}>{line.ja}</p> : null}
          </li>
        ))}
      </ol>
      <p className={styles.small}>{t.notice.soundsNote}</p>

      <section className={page.section}>
        <h2 className={page.h2}>{t.notice.chunks}</h2>
        <p className={page.note}>{t.notice.chunksNote}</p>
        <div className={styles.chips}>
          {chunksOf(talk).map((id) => {
            const c = chunkById(id);
            const line = talk.lines.find((l) => l.marks?.some((m) => m.chunk === id));
            return c ? (
              <button key={id} type="button" className={`${styles.chip} ${again(id) ? styles.chipAgain : ""}`} onClick={() => openChunk({ chunk: id, line })}>
                <span className="t-en">{c.text}</span>
                <span className={styles.chipLabel}>{c.label}</span>
              </button>
            ) : null;
          })}
        </div>
      </section>

      <div className={page.actions}>
        <button type="button" className="btn" onClick={onNext}>
          {t.onward}
          <span className={styles.whither}>{t.steps.follow}</span>
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </>
  );
}
