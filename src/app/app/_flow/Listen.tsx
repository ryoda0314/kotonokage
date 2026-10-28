"use client";

import { useState } from "react";
import type { Talk } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { lineItem, playList, stop, unlock } from "@/components/player";
import { ja } from "@/lib/i18n/ja";
import { listened, type State } from "@/lib/record";
import { commit } from "@/lib/store";
import page from "../_parts/page.module.css";
import styles from "./flow.module.css";
import { LineText } from "./LineText";
import { Scene } from "./Scene";
import { Who } from "./Who";

const t = ja.flow;

/**
 * 聞く: the talk plays through with no subtitle; each line falls in as its shadow while it is said. The scene (where it
 * happens, who is there) is all there is to go on besides the voices; once the talk plays it steps back to a strip.
 */
export function Listen({ talk, state, onNext }: { talk: Talk; state: State; onNext: () => void }) {
  const before = !!state.talks[talk.id]?.listened;
  const [shown, setShown] = useState(before ? talk.lines.length : 0);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(-1);
  const [big, setBig] = useState(!before);
  const done = shown >= talk.lines.length;

  async function run() {
    unlock();
    setBig(false);
    setPlaying(true);
    const ok = await playList(
      talk.lines.map((l) => lineItem(l)),
      {
        gapMs: 450,
        onItem: (i) => {
          setAt(i);
          setShown((n) => Math.max(n, i + 1));
        },
      },
    );
    setAt(-1);
    setPlaying(false);
    if (ok) {
      setShown(talk.lines.length);
      commit((s) => listened(s, talk.id));
    }
  }

  return (
    <>
      <section className={styles.head}>
        <p className={styles.situation}>{talk.lead}</p>
        <Scene talk={talk.id} small={!big} onToggle={() => setBig(!big)} label={t.listen.scene} priority />
        <p className={page.note}>{t.listen.lead}</p>
        <div className={styles.controls}>
          <button type="button" className={done && !playing ? "btn-quiet" : "btn"} onClick={() => (playing ? stop() : void run())}>
            <Icon name={playing ? "stop" : done ? "replay" : "speaker"} size={20} />
            {playing ? ja.common.stop : done ? t.listen.again : t.listen.play}
          </button>
        </div>
      </section>

      <ol className={styles.lines}>
        {talk.lines.slice(0, shown).map((line, i) => (
          <li key={line.id} className={styles.line} data-now={i === at || undefined}>
            <Who who={line.who} />
            <LineText line={line} show="none" />
          </li>
        ))}
      </ol>

      {done && !playing ? (
        <>
          <p className={styles.after}>{t.listen.after}</p>
          <div className={page.actions}>
            <button type="button" className="btn" onClick={onNext}>
              {t.onward}
              <span className={styles.whither}>{t.steps.notice}</span>
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
