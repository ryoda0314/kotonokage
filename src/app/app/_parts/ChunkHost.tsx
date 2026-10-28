"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { chunkById, talksWithChunk, type Line } from "@/content/index.ts";
import { lineItem, partItem, play, stop, usePlaying, type Item } from "@/components/player";
import { Sheet } from "@/components/Sheet";
import { ja } from "@/lib/i18n/ja";
import { levelOf, setCurrent } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import { wordsIn, wordsOf } from "@/lib/text";
import { LineText } from "../_flow/LineText";
import styles from "./chunk.module.css";

type Opened = { chunk: string; line?: Line };

const OpenChunk = createContext<(o: Opened) => void>(() => undefined);

/** Opens a chunk's sheet from anywhere in the app: what it does, and itself on its own, slow or at its pace. */
export function useOpenChunk() {
  return useContext(OpenChunk);
}

export function ChunkHost({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<Opened | null>(null);
  const chunk = opened ? chunkById(opened.chunk) : undefined;
  return (
    <OpenChunk.Provider value={setOpened}>
      {children}
      <Sheet
        open={!!chunk}
        onClose={() => {
          stop();
          setOpened(null);
        }}
        closeLabel={ja.common.close}
        title={
          chunk ? (
            <div className={styles.head}>
              <span className={`${styles.pattern} t-en`}>{chunk.text}</span>
              <span className={styles.label}>{chunk.label}</span>
            </div>
          ) : null
        }
      >
        {opened && chunk ? <ChunkView chunkId={chunk.id} line={opened.line} onGo={() => setOpened(null)} /> : null}
      </Sheet>
    </OpenChunk.Provider>
  );
}

function ChunkView({ chunkId, line, onGo }: { chunkId: string; line?: Line; onGo: () => void }) {
  const state = useRecord();
  const router = useRouter();
  const now = usePlaying();
  const chunk = chunkById(chunkId)!;
  const t = ja.chunk;
  const mark = line?.marks?.find((m) => m.chunk === chunkId);
  const words = line ? wordsOf(line.text) : [];
  const at = line && mark ? line.text.indexOf(mark.text) : -1;
  const ws = at >= 0 && mark ? wordsIn(words, at, at + mark.text.length) : [];
  const parts: { label: string; item: Item | null }[] = line
    ? [
        { label: t.slow, item: partItem(line, ws, 0.75) },
        { label: t.normal, item: partItem(line, ws, 1) },
        { label: t.line, item: lineItem(line) },
      ]
    : [];
  const level = state ? levelOf(state, chunkId) : null;
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.h3}>{t.does}</h3>
        <p className={styles.does}>{chunk.does}</p>
        {level ? <p className={styles.level}>{t.levels[level]}</p> : null}
      </section>
      {line ? (
        <section className={styles.section}>
          <LineText line={line} marks sounds />
          <div className={styles.plays}>
            {parts.map(({ label, item }) =>
              item ? (
                <button key={label} type="button" className="btn-quiet" aria-pressed={now === item.key} onClick={() => (now === item.key ? stop() : void play(item))}>
                  {label}
                </button>
              ) : null,
            )}
          </div>
        </section>
      ) : null}
      <section className={styles.section}>
        <h3 className={styles.h3}>{t.where}</h3>
        <ul className={styles.talks}>
          {talksWithChunk(chunkId).map((talk) => {
            const met = !!state?.talks[talk.id]?.listened;
            return (
              <li key={talk.id}>
                <button
                  type="button"
                  className={styles.talk}
                  onClick={() => {
                    stop();
                    commit((s) => setCurrent(s, talk.id));
                    onGo();
                    router.push("/app");
                  }}
                >
                  <span className={styles.talkTitle}>{talk.title}</span>
                  <span className={met ? styles.met : styles.notYet}>{met ? t.levels.met : t.notYet}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
