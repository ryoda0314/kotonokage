"use client";

import { useEffect, useRef, useState } from "react";
import { answerRoles, findChunks, lineById, PEOPLE, peopleOf, sampleKey, voiceOf, type PersonId, type Talk } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { useChoice } from "@/components/local";
import { hear, Mic, toWav16k } from "@/components/mic";
import { clipOf, clipUrl, lineItem, play, playList, playPending, saidUrl, stop, unlock, usePlaying } from "@/components/player";
import { meVoiceName, meVoiceNow, SPEEDS } from "@/components/prefs";
import { Sheet } from "@/components/Sheet";
import { Speak } from "@/components/Speak";
import speakStyles from "@/components/Speak.module.css";
import { diffRanges } from "@/lib/diff";
import { ja } from "@/lib/i18n/ja";
import { addReply, addRole } from "@/lib/record";
import { commit } from "@/lib/store";
import type { TurnResult } from "@/lib/turn-core";
import { heardWords, wordsIn, wordsOf } from "@/lib/text";
import page from "../_parts/page.module.css";
import styles from "./flow.module.css";
import { LineText } from "./LineText";
import { Scene } from "./Scene";
import { hearErrorOf, loud, micErrorOf, missedOf, wait } from "./sound";
import { Who } from "./Who";

const t = ja.flow.answer;

/** 返す: first the learner's lines in a role, in answer to the friend's voice; then the same friend, in their own way. */
export function Answer({ talk, onDone }: { talk: Talk; onDone: () => void }) {
  return (
    <>
      <section className={styles.head}>
        <p className={page.note}>{t.lead}</p>
      </section>
      <Role talk={talk} />
      <Own talk={talk} />
      <section className={page.section}>
        <p className={page.note}>{t.doneNote}</p>
        <div className={page.actions}>
          <button type="button" className="btn" onClick={onDone}>
            {t.next}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </section>
    </>
  );
}

type Take = { samples: Float32Array; rate: number };

/** 役で: the friend's lines play as voice only; on the learner's turn they say their line, and on it goes. */
function Role({ talk }: { talk: Talk }) {
  const people = peopleOf(talk);
  const [speed] = useChoice("speed", SPEEDS, "1");
  const [as, setAs] = useState<PersonId | null>(null);
  const [running, setRunning] = useState(false);
  const [at, setAt] = useState(-1);
  const [myTurn, setMyTurn] = useState(false);
  const [level, setLevel] = useState(0);
  const [peek, setPeek] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<(boolean[] | null)[]>([]);
  const [takes, setTakes] = useState<Record<number, Take>>({});
  const [doneAs, setDoneAs] = useState<PersonId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const mic = useRef<Mic | null>(null);

  useEffect(
    () => () => {
      abort.current?.abort();
      mic.current?.close();
      stop();
    },
    [],
  );

  async function run(who: PersonId) {
    unlock();
    stop();
    setError(null);
    let m: Mic;
    try {
      m = await Mic.open(setLevel);
    } catch (err) {
      return setError(micErrorOf(err));
    }
    mic.current = m;
    const ac = new AbortController();
    abort.current = ac;
    setAs(who);
    setResults([]);
    setTakes({});
    setPeek(new Set());
    setRunning(true);
    const rate = Number(speed);
    const res: (boolean[] | null)[] = talk.lines.map(() => null);
    const jobs: Promise<void>[] = [];
    await wait(400);
    for (let i = 0; i < talk.lines.length && !ac.signal.aborted; i++) {
      const line = talk.lines[i];
      setAt(i);
      if (line.who !== who) {
        const ok = await play(lineItem(line, rate));
        if (!ok && ac.signal.aborted) break;
        await wait(200);
        continue;
      }
      setMyTurn(true);
      const dur = clipOf(line.id)?.dur ?? 3;
      const turn = await m.turn({ from: m.length, startWithinMs: 9000, silenceMs: 900, maxMs: dur * 2500 + 5000, signal: ac.signal });
      setMyTurn(false);
      if (ac.signal.aborted && !turn.spoke) break;
      const words = wordsOf(line.text);
      const samples = m.slice(turn.from, turn.to);
      if (!turn.spoke || !loud(samples, m.rate)) {
        res[i] = words.map(() => false);
        setResults([...res]);
        continue;
      }
      setTakes((x) => ({ ...x, [i]: { samples, rate: m.rate } }));
      jobs.push(
        hear(samples, m.rate).then((h) => {
          res[i] = "error" in h ? null : heardWords(words, h.text);
          if ("error" in h) setError(hearErrorOf(h.error));
          setResults([...res]);
        }),
      );
    }
    m.close();
    mic.current = null;
    setLevel(0);
    setAt(-1);
    setRunning(false);
    await Promise.all(jobs);
    if (ac.signal.aborted) return;
    const mine = talk.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.who === who);
    const missed = Object.fromEntries(mine.flatMap(({ l, i }) => (res[i] ? [[l.id, missedOf(res[i]!)]] : [])));
    // A chunk counts as said in the role when all of its words in the line were heard.
    const said = mine.flatMap(({ l, i }) =>
      (l.marks ?? []).flatMap((mark) => {
        const words = wordsOf(l.text);
        const start = l.text.indexOf(mark.text);
        const ws = wordsIn(words, start, start + mark.text.length);
        return res[i] && ws.every((w) => res[i]![w]) ? [mark.chunk] : [];
      }),
    );
    commit((s) => addRole(s, talk.id, { at: Date.now(), as: who, missed }, said));
    setDoneAs((x) => [...new Set([...x, who])]);
  }

  function modelThenMine(i: number) {
    const take = takes[i];
    if (!take) return;
    const url = URL.createObjectURL(toWav16k(take.samples, take.rate));
    void playList([lineItem(talk.lines[i], Number(speed)), { key: `mine:${talk.lines[i].id}`, url }], { gapMs: 350 });
  }

  const other = as ? people.find((p) => p !== as) : undefined;

  return (
    <section className={page.section}>
      <h2 className={page.h2}>{t.roleTitle}</h2>
      <p className={page.note}>{t.roleLead}</p>
      <div className={styles.controls}>
        {running ? (
          <>
            <button type="button" className={`btn-quiet ${styles.recording}`} style={{ "--level": level } as React.CSSProperties} onClick={() => abort.current?.abort()}>
              <Icon name="stop" size={18} />
              {ja.flow.follow.cancel}
            </button>
            <span className={styles.status}>{myTurn ? t.listening : t.roleRunning}</span>
          </>
        ) : (
          people.map((p) => (
            <button key={p} type="button" className={!as || (doneAs.includes(as) && p === other) ? "btn" : "btn-quiet"} onClick={() => void run(p)}>
              <Icon name="mic" size={18} />
              {t.as(PEOPLE[p].kana)}
            </button>
          ))
        )}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}

      {as ? (
        <ol className={styles.lines}>
          {talk.lines.map((line, i) => {
            const mine = line.who === as;
            const result = results[i];
            const show = mine ? (result || peek.has(i) ? "full" : "hint") : peek.has(i) || (!running && results.length) ? "full" : "none";
            return (
              <li key={line.id} className={`${styles.line} ${styles.still}`} data-now={i === at || undefined} data-mine={mine || undefined}>
                <div className={styles.lineHead}>
                  <Who who={line.who} you={mine} label={t.yourTurn} />
                  {!result && show !== "full" ? (
                    <button type="button" className={styles.small2} onClick={() => setPeek((x) => new Set(x).add(i))}>
                      {t.showLine}
                    </button>
                  ) : null}
                </div>
                <LineText line={line} show={show} heard={mine ? result : null} />
                {mine && takes[i] && !running ? (
                  <div className={styles.lineActions}>
                    <button type="button" className={styles.small2} onClick={() => modelThenMine(i)}>
                      <Icon name="speaker" size={16} />
                      {ja.flow.follow.modelThenMine}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      {as && !running && doneAs.length ? <p className={styles.small}>{t.roleDone}</p> : null}
    </section>
  );
}

type OwnTurn = TurnResult & { said: string };

/** 自分で: the same friend's line, answered in the learner's own circumstances, by voice (or written). */
function Own({ talk }: { talk: Talk }) {
  const { them, me } = answerRoles(talk);
  const line = lineById(talk.answer.line)!.line;
  const [speed] = useChoice("speed", SPEEDS, "1");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<OwnTurn[]>([]);
  const [phase, setPhase] = useState<"idle" | "speaking" | "hearing" | "sending" | "following">("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [followed, setFollowed] = useState<Record<number, boolean[]>>({});
  const abort = useRef<AbortController | null>(null);
  const mic = useRef<Mic | null>(null);

  useEffect(
    () => () => {
      abort.current?.abort();
      mic.current?.close();
    },
    [],
  );

  async function speak() {
    unlock();
    stop();
    setError(null);
    let m: Mic;
    try {
      m = await Mic.open(setLevel);
    } catch (err) {
      return setError(micErrorOf(err));
    }
    mic.current = m;
    const ac = new AbortController();
    abort.current = ac;
    setPhase("speaking");
    const turn = await m.turn({ startWithinMs: 12000, silenceMs: 1600, maxMs: 30000, signal: ac.signal });
    m.close();
    mic.current = null;
    setLevel(0);
    const samples = m.slice(turn.from, turn.to);
    if (!turn.spoke || !loud(samples, m.rate)) {
      setPhase("idle");
      return setError(ja.common.silent);
    }
    setPhase("hearing");
    const h = await hear(samples, m.rate);
    setPhase("idle");
    if ("error" in h) return setError(hearErrorOf(h.error));
    setDraft((d) => (d.trim() ? `${d.trim()} ${h.text}` : h.text));
  }

  async function send() {
    const input = draft.trim();
    if (!input) return;
    unlock();
    stop();
    setError(null);
    setPhase("sending");
    const history = turns.flatMap((x) => [
      { who: "me" as const, text: x.fixed || x.said },
      { who: "them" as const, text: x.reply },
    ]);
    let result: TurnResult;
    try {
      const r = await fetch("/api/turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ talk: talk.id, history, input }) });
      if (!r.ok) {
        setPhase("idle");
        return setError(r.status === 429 ? t.tooMany : t.failed);
      }
      result = (await r.json()) as TurnResult;
    } catch {
      setPhase("idle");
      return setError(t.failed);
    }
    setTurns((x) => [...x, { ...result, said: input }]);
    setDraft("");
    setPhase("idle");
    const own = findChunks(input);
    const ai = findChunks(result.fixed).filter((c) => !own.includes(c));
    commit((s) => addReply(s, { at: Date.now(), talk: talk.id, said: input, fixed: result.fixed, natural: result.natural, reply: result.reply, own, ai }));
    const voice = voiceOf(them);
    void playPending([
      ...(result.fixed ? [{ key: `fixed:${turns.length}`, url: saidUrl(result.fixed, result.sigFixed, meVoiceName()), text: result.fixed }] : []),
      ...result.parts.map((p, i) => ({ key: `reply:${turns.length}:${i}`, url: saidUrl(p.text, p.sig, voice), text: p.text })),
    ]);
  }

  async function followFixed(i: number) {
    const turn = turns[i];
    if (!turn?.fixed) return;
    unlock();
    stop();
    setError(null);
    let m: Mic;
    try {
      m = await Mic.open(setLevel);
    } catch (err) {
      return setError(micErrorOf(err));
    }
    mic.current = m;
    setPhase("following");
    const url = await saidUrl(turn.fixed, turn.sigFixed, meVoiceName());
    await wait(300);
    let start = 0;
    const ok = await play({ key: `follow:${i}`, url, text: turn.fixed, rate: Number(speed) }, (perf) => (start = perf));
    if (ok) await wait(1100);
    const end = m.length;
    m.close();
    mic.current = null;
    setLevel(0);
    if (!ok) return setPhase("idle");
    const samples = m.slice(Math.max(0, m.indexAt(start) - Math.round(m.rate * 0.2)), end);
    if (!loud(samples, m.rate)) {
      setPhase("idle");
      return setError(ja.common.silent);
    }
    setPhase("hearing");
    const h = await hear(samples, m.rate);
    setPhase("idle");
    if ("error" in h) return setError(hearErrorOf(h.error));
    setFollowed((x) => ({ ...x, [i]: heardWords(wordsOf(turn.fixed), h.text) }));
  }

  const busy = phase !== "idle";
  const last = turns[turns.length - 1];

  return (
    <section className={page.section}>
      <h2 className={page.h2}>{t.ownTitle}</h2>
      <p className={page.note}>{t.ownLead}</p>

      <div className={styles.card}>
        <Scene talk={talk.id} small />
        <div className={styles.lineHead}>
          <Who who={them} />
          <Speak item={lineItem(line)} label={ja.common.play} size="sm" />
        </div>
        <LineText line={line} />
        <div className={styles.mine}>
          <p className={styles.mineLabel}>
            {t.mine}（{PEOPLE[me].kana}）
          </p>
          <p className={styles.mineText}>{talk.answer.mine}</p>
        </div>
      </div>

      {turns.map((x, i) => (
        <div key={i} className={styles.turn}>
          <TurnView turn={x} />
          {x.fixed ? (
            <div className={styles.lineActions}>
              <SpeakSaid id={`fixed:${i}`} text={x.fixed} sig={x.sigFixed} voice={meVoiceName()} label={t.fixed} />
              <button type="button" className={styles.small2Strong} disabled={busy} onClick={() => void followFixed(i)}>
                <Icon name="mic" size={16} />
                {t.followFixed}
              </button>
            </div>
          ) : null}
          {followed[i] ? (
            <div className={styles.followed}>
              <FixedText text={x.fixed} heard={followed[i]} />
            </div>
          ) : null}
          <div className={styles.reply}>
            <div className={styles.lineHead}>
              <Who who={them} />
              {x.parts.length ? <SpeakSaid id={`reply:${i}`} parts={x.parts} voice={voiceOf(them)} label={ja.common.play} /> : null}
            </div>
            <p className={`${styles.replyText} t-en`}>{x.reply}</p>
          </div>
        </div>
      ))}

      <div className={styles.composer}>
        <textarea
          className={styles.field}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          rows={3}
          lang="en"
          disabled={phase === "sending"}
        />
        <div className={styles.controls}>
          {phase === "speaking" ? (
            <button type="button" className={`btn ${styles.recording}`} style={{ "--level": level } as React.CSSProperties} onClick={() => abort.current?.abort()}>
              <Icon name="stop" size={18} />
              {t.speakDone}
            </button>
          ) : (
            <button type="button" className={draft.trim() ? "btn-quiet" : "btn"} disabled={busy} onClick={() => void speak()}>
              <Icon name="mic" size={18} />
              {last ? t.replyAgain : t.speak}
            </button>
          )}
          <button type="button" className={draft.trim() ? "btn" : "btn-quiet"} disabled={busy || !draft.trim()} onClick={() => void send()}>
            {phase === "sending" ? t.sending : t.send}
          </button>
          {phase === "speaking" ? <span className={styles.status}>{t.listening}</span> : null}
          {phase === "hearing" ? <span className={styles.status}>{ja.flow.follow.hearing}</span> : null}
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="button" className="link-button" onClick={() => setSamplesOpen(true)}>
          {t.samples}
        </button>
      </div>

      <Sheet open={samplesOpen} onClose={() => (stop(), setSamplesOpen(false))} title={t.samples} closeLabel={ja.common.close}>
        <p className={page.note}>{t.samplesNote}</p>
        {talk.answer.samples.map((s) => (
          <div key={s.id} className={styles.sample}>
            <div className={styles.lineHead}>
              <p className={styles.sampleNote}>{s.note}</p>
              <Speak item={{ key: sampleKey(s, meVoiceNow()), url: clipUrl(sampleKey(s, meVoiceNow())), text: s.text }} label={ja.common.play} size="sm" />
            </div>
            <p className={`${styles.sampleText} t-en`}>{s.text}</p>
          </div>
        ))}
      </Sheet>
    </section>
  );
}

/** Plays English the app's AI wrote (signed), in わたしの声 or the friend's; pressed again while it plays, stops it. */
function SpeakSaid({ id, text, sig, parts, voice, label }: { id: string; text?: string; sig?: string; parts?: { text: string; sig: string }[]; voice: string; label: string }) {
  const now = usePlaying();
  const pieces = parts ?? (text && sig ? [{ text, sig }] : []);
  const keys = pieces.map((_, i) => `${id}:${i}`);
  const playing = now !== null && keys.includes(now);
  return (
    <button
      type="button"
      className={`${speakStyles.button} ${speakStyles.sm} ${playing ? speakStyles.playing : ""}`}
      aria-label={label}
      aria-pressed={playing}
      onClick={() => (playing ? stop() : void playPending(pieces.map((p, i) => ({ key: keys[i], url: saidUrl(p.text, p.sig, voice), text: p.text }))))}
    >
      <Icon name="speaker" size={17} />
    </button>
  );
}

/** What the learner said, and the corrected sentence with what changed marked. */
function TurnView({ turn }: { turn: OwnTurn }) {
  const { removed, added } = turn.fixed ? diffRanges(turn.said, turn.fixed, "en") : { removed: [], added: [] };
  return (
    <div className={styles.fix}>
      <p className={styles.fixLabel}>{t.yours}</p>
      <p className={`${styles.said} t-en`}>
        <Ranges text={turn.said} ranges={removed} cls="hl-del" />
      </p>
      {turn.fixed ? (
        <>
          <p className={styles.fixLabel}>{turn.natural ? t.natural : t.fixed}</p>
          <p className={`${styles.fixed} t-en`}>
            <Ranges text={turn.fixed} ranges={turn.natural ? [] : added} cls="hl-ins" />
          </p>
        </>
      ) : null}
      {turn.notes.length ? (
        <details className={styles.why}>
          <summary>{t.why}</summary>
          <ul>
            {turn.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {turn.gaps.length ? (
        <div className={styles.gaps}>
          <p className={styles.fixLabel}>{t.gaps}</p>
          <ul>
            {turn.gaps.map((g) => (
              <li key={g.ja}>
                <span>{g.ja}</span>
                <span className="t-en">{g.en}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Ranges({ text, ranges, cls }: { text: string; ranges: { start: number; end: number }[]; cls: string }) {
  const out: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach((r, i) => {
    if (r.start > at) out.push(text.slice(at, r.start));
    out.push(
      <span key={i} className={cls}>
        {text.slice(r.start, r.end)}
      </span>,
    );
    at = r.end;
  });
  out.push(text.slice(at));
  return <>{out}</>;
}

/** The corrected sentence after following it: the words the machine's ear did not hear stay pale. */
function FixedText({ text, heard }: { text: string; heard: boolean[] }) {
  const words = wordsOf(text);
  return (
    <p className={`${styles.fixed} t-en`}>
      {words.map((w, i) => (
        <span key={i} className={heard[i] ? undefined : styles.missedWord}>
          {w.text}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
