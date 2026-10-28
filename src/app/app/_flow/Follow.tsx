"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Talk } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { useChoice, usePref } from "@/components/local";
import { hear, Mic, toWav16k } from "@/components/mic";
import { lineItem, play, playList, stop, unlock } from "@/components/player";
import { SPEEDS } from "@/components/prefs";
import { ja } from "@/lib/i18n/ja";
import { addRound, fullRounds, lastMissed, type State } from "@/lib/record";
import { commit } from "@/lib/store";
import { heardWords, wordsOf } from "@/lib/text";
import page from "../_parts/page.module.css";
import styles from "./flow.module.css";
import { LineText, type Show } from "./LineText";
import { hearErrorOf, loud, micErrorOf, missedOf, wait } from "./sound";
import { Who } from "./Who";

const t = ja.flow.follow;
const SUBS = ["full", "faint", "none"] as const;
const AIM = 5;

type Take = { samples: Float32Array; rate: number };

/**
 * 追いかける: the whole talk plays while the learner follows a beat behind; the recording goes to the machine's ear,
 * and each line comes back with the words it heard dark and the others pale. Only the lines with pale words need
 * another go (この行だけ); 手本 → 自分 plays the model and then the learner's own take of that line.
 */
export function Follow({ talk, state, onNext }: { talk: Talk; state: State; onNext: () => void }) {
  const log = state.talks[talk.id];
  const rounds = fullRounds(log).length;
  const [speed, setSpeed] = useChoice("speed", SPEEDS, "1");
  const [quiet] = usePref("quiet", false);
  const [subs, setSubs] = useState<Show | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "hearing">("idle");
  const [at, setAt] = useState(-1);
  const [drillAt, setDrillAt] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [heardText, setHeardText] = useState<string | null>(null);
  // This visit's takes, kept in memory only, for 手本 → 自分.
  const [takes, setTakes] = useState<Record<number, Take>>({});
  const mic = useRef<Mic | null>(null);
  const words = useMemo(() => talk.lines.map((l) => wordsOf(l.text)), [talk]);

  useEffect(
    () => () => {
      stop();
      mic.current?.close();
    },
    [],
  );

  const auto: Show = rounds === 0 ? "full" : rounds === 1 ? "faint" : "none";
  const show = subs ?? auto;
  const missed = lastMissed(log);
  const busy = phase !== "idle";
  const rate = Number(speed);

  async function open(): Promise<Mic | null> {
    try {
      const m = await Mic.open(setLevel);
      mic.current = m;
      return m;
    } catch (err) {
      setError(micErrorOf(err));
      return null;
    }
  }

  function close() {
    mic.current?.close();
    mic.current = null;
    setLevel(0);
  }

  async function round() {
    unlock();
    stop();
    setError(null);
    const m = quiet ? null : await open();
    if (!quiet && !m) return;
    setPhase("running");
    await wait(350);
    const starts: number[] = [];
    const ok = await playList(
      talk.lines.map((l) => lineItem(l, rate)),
      { gapMs: 550, onItem: (i, perf) => ((starts[i] = perf), setAt(i)) },
    );
    setAt(-1);
    if (ok) await wait(1300);
    const end = m?.length ?? 0;
    close();
    if (!ok) return setPhase("idle");
    const at = Date.now();
    if (!m) {
      commit((s) => addRound(s, talk.id, { at, speed, quiet: true, missed: {} }));
      setSubs(null);
      return setPhase("idle");
    }
    const from = Math.max(0, m.indexAt(starts[0]) - Math.round(m.rate * 0.25));
    const samples = m.slice(from, end);
    if (!loud(samples, m.rate)) {
      setError(ja.common.silent);
      return setPhase("idle");
    }
    setPhase("hearing");
    const h = await hear(samples, m.rate);
    setPhase("idle");
    if ("error" in h) return setError(hearErrorOf(h.error));
    // The whole talk is lined up at once, so a learner a beat behind still meets each word.
    const heardAll = heardWords(words.flat(), h.text);
    let k = 0;
    const perLine = words.map((ws) => heardAll.slice(k, (k += ws.length)));
    const lag = Math.round(m.rate * 0.6);
    const next: Record<number, Take> = {};
    talk.lines.forEach((_, i) => {
      const a = Math.max(0, m.indexAt(starts[i]) - from - Math.round(m.rate * 0.1));
      const b = Math.min(samples.length, (i + 1 < starts.length ? m.indexAt(starts[i + 1]) : end) - from + lag);
      next[i] = { samples: samples.subarray(a, b), rate: m.rate };
    });
    setTakes(next);
    setHeardText(h.text);
    setSubs(null);
    commit((s) => addRound(s, talk.id, { at, speed, missed: Object.fromEntries(talk.lines.map((l, i) => [l.id, missedOf(perLine[i])])) }));
  }

  async function drill(i: number) {
    unlock();
    stop();
    setError(null);
    const m = await open();
    if (!m) return;
    const line = talk.lines[i];
    setDrillAt(i);
    setPhase("running");
    await wait(300);
    let start = 0;
    const ok = await play(lineItem(line, rate), (perf) => (start = perf));
    if (ok) await wait(1100);
    const end = m.length;
    close();
    setDrillAt(null);
    if (!ok) return setPhase("idle");
    const samples = m.slice(Math.max(0, m.indexAt(start) - Math.round(m.rate * 0.2)), end);
    if (!loud(samples, m.rate)) {
      setError(ja.common.silent);
      return setPhase("idle");
    }
    setPhase("hearing");
    const h = await hear(samples, m.rate);
    setPhase("idle");
    if ("error" in h) return setError(hearErrorOf(h.error));
    setTakes((x) => ({ ...x, [i]: { samples, rate: m.rate } }));
    commit((s) => addRound(s, talk.id, { at: Date.now(), speed, only: line.id, missed: { [line.id]: missedOf(heardWords(words[i], h.text)) } }));
  }

  function modelThenMine(i: number) {
    const take = takes[i];
    if (!take) return;
    const url = URL.createObjectURL(toWav16k(take.samples, take.rate));
    void playList([lineItem(talk.lines[i], rate), { key: `mine:${talk.lines[i].id}`, url }], { gapMs: 350 });
  }

  // While a round runs the subtitle shows as chosen; between rounds, each line as last judged.
  const judging = phase === "idle" && drillAt === null;

  return (
    <>
      <section className={styles.head}>
        <p className={page.note}>{t.lead}</p>
        <div className={styles.roundBar}>
          <span className={styles.roundNo}>{t.round(rounds + 1)}</span>
          <span className={styles.dots} aria-label={t.rounds(rounds)}>
            {Array.from({ length: Math.max(AIM, rounds) }, (_, i) => (
              <span key={i} className={i < rounds ? styles.dotDone : styles.dot} />
            ))}
          </span>
        </div>
        <div className={styles.settingsRow}>
          <Segmented label={ja.common.speed} value={speed} options={SPEEDS.map((s) => ({ value: s, label: ja.common.speeds[s] }))} onChange={(v) => setSpeed(v)} disabled={busy} />
          <Segmented label={t.subtitles} value={show} options={SUBS.map((s) => ({ value: s, label: t.subs[s] }))} onChange={(v) => setSubs(v)} disabled={busy} />
        </div>
        <p className={styles.small}>{quiet ? t.quietNote : t.earphones}</p>
        <div className={styles.controls}>
          {phase === "running" && drillAt === null ? (
            <button type="button" className={`btn ${styles.recording}`} style={{ "--level": level } as React.CSSProperties} onClick={() => stop()}>
              <Icon name="stop" size={20} />
              {t.cancel}
            </button>
          ) : (
            <button type="button" className={rounds < AIM ? "btn" : "btn-quiet"} disabled={busy} onClick={() => void round()}>
              <Icon name={quiet ? "follow" : "mic"} size={20} />
              {quiet ? t.startQuiet : t.start}
            </button>
          )}
          {phase === "running" && drillAt === null ? <span className={styles.status}>{t.running}</span> : null}
          {phase === "hearing" ? <span className={styles.status}>{t.hearing}</span> : null}
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        {judging && Object.keys(missed).length ? <p className={styles.small}>{t.resultLead}</p> : null}
      </section>

      <ol className={styles.lines}>
        {talk.lines.map((line, i) => {
          const judged = missed[line.id];
          const heard = judging && judged ? words[i].map((_, j) => !judged.includes(j)) : null;
          const lineShow: Show = judging && judged ? "full" : drillAt === i ? "faint" : show;
          return (
            <li key={line.id} className={`${styles.line} ${styles.still}`} data-now={i === at || drillAt === i || undefined}>
              <div className={styles.lineHead}>
                <Who who={line.who} />
                {judging && judged ? (
                  <span className={judged.length ? styles.lineMissed : styles.lineHeard}>{judged.length ? null : t.allHeard}</span>
                ) : null}
              </div>
              <LineText line={line} show={lineShow} heard={heard} />
              {judging && judged ? (
                <div className={styles.lineActions}>
                  {takes[i] ? (
                    <button type="button" className={styles.small2} onClick={() => modelThenMine(i)}>
                      <Icon name="speaker" size={16} />
                      {t.modelThenMine}
                    </button>
                  ) : null}
                  {!quiet ? (
                    <button type="button" className={judged.length ? styles.small2Strong : styles.small2} disabled={busy} onClick={() => void drill(i)}>
                      <Icon name="mic" size={16} />
                      {t.lineOnly}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {heardText && judging ? (
        <details className={styles.heardAs}>
          <summary>{t.heardAs}</summary>
          <p className="t-en">{heardText}</p>
        </details>
      ) : null}

      <p className={styles.small}>{ja.flow.follow.roundsNote}</p>
      <div className={page.actions}>
        <button type="button" className={rounds >= AIM ? "btn" : "btn-quiet"} disabled={busy || rounds === 0} onClick={onNext}>
          {ja.flow.onward}
          <span className={styles.whither}>{ja.flow.steps.answer}</span>
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </>
  );
}

function Segmented<T extends string>({ label, value, options, onChange, disabled }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      <span className={styles.segLabel}>{label}</span>
      {options.map((o) => (
        <button key={o.value} type="button" className={styles.seg} aria-pressed={o.value === value} disabled={disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
