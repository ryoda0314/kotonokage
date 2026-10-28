"use client";

import { useEffect, useState } from "react";
import { PEOPLE, peopleOf, talkById, type Talk } from "@/content/index.ts";
import { clipUrl, prefetch, stop } from "@/components/player";
import { ja } from "@/lib/i18n/ja";
import { finish, pickNext, setCurrent, setStep, type State, type StepId } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import page from "../_parts/page.module.css";
import { Answer } from "./Answer";
import { Follow } from "./Follow";
import { Listen } from "./Listen";
import { Notice } from "./Notice";
import { Steps } from "./Steps";

const t = ja.flow;

const STEPS: { step: StepId; label: string }[] = (["listen", "notice", "follow", "answer"] as const).map((step) => ({ step, label: t.steps[step] }));

/** 追いかける: the talk under way (or the next one), through 聞く → 気づく → 追いかける → 返す. */
export function Today() {
  const state = useRecord();
  const current = state?.current;

  // The first time (or when the kept one is gone, or the last one was finished), the next talk is chosen and kept.
  useEffect(() => {
    if (state && (!current || !talkById(current))) commit((s) => setCurrent(s, pickNext(s)));
  }, [state, current]);

  const talk = current ? talkById(current) : undefined;
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>
          {talk ? talk.title : ja.nav.today}
          {talk ? <span className={page.barSub}>{peopleOf(talk).map((p) => PEOPLE[p].kana).join("と")}</span> : null}
        </h1>
      </header>
      {state && talk ? <TalkFlow key={talk.id} talk={talk} state={state} /> : <p className={page.skeleton}>{ja.common.loading}</p>}
    </div>
  );
}

function TalkFlow({ talk, state }: { talk: Talk; state: State }) {
  const log = state.talks[talk.id];
  const [stage, setStage] = useState<StepId>(log?.step ?? "listen");
  // Violet for chunks met in another talk before this one began, not for those met in it now.
  const [since] = useState(() => Date.now());

  useEffect(() => {
    prefetch(talk.lines.map((l) => clipUrl(l.id)));
    return () => stop();
  }, [talk]);

  const open: StepId[] = ["listen"];
  if (log?.listened) open.push("notice", "follow");
  if (log && log.rounds.length > 0) open.push("answer");

  function go(step: StepId) {
    stop();
    setStage(step);
    commit((s) => setStep(s, talk.id, step));
    window.scrollTo({ top: 0 });
  }

  function done() {
    stop();
    commit((s) => finish(s, talk.id));
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <Steps steps={STEPS} current={stage} open={open} onPick={go} label={t.stepsLabel} />
      {stage === "listen" ? <Listen talk={talk} state={state} onNext={() => go("notice")} /> : null}
      {stage === "notice" ? <Notice talk={talk} state={state} since={since} onNext={() => go("follow")} /> : null}
      {stage === "follow" ? <Follow talk={talk} state={state} onNext={() => go("answer")} /> : null}
      {stage === "answer" ? <Answer talk={talk} onDone={done} /> : null}
    </>
  );
}
