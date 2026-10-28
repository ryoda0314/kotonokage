"use client";

import { useRouter } from "next/navigation";
import { PEOPLE, peopleOf, TALKS } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { stop } from "@/components/player";
import { ja } from "@/lib/i18n/ja";
import { fullRounds, setCurrent } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import page from "../_parts/page.module.css";
import { SceneThumb } from "../_flow/Scene";

const t = ja.talks;

/** 会話: every talk, easy first. Any of them can be taken up; 追いかける then carries on with it. */
export function TalkList() {
  const state = useRecord();
  const router = useRouter();
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>
      <p className={page.lead}>{t.lead}</p>
      <ul className={page.rows} style={{ marginTop: 16 }}>
        {TALKS.map((talk) => {
          const log = state?.talks[talk.id];
          const rounds = fullRounds(log).length;
          const status = log?.done ? t.status.done : rounds ? t.status.rounds(rounds) : t.status.fresh;
          return (
            <li key={talk.id}>
              <button
                type="button"
                className={page.row}
                onClick={() => {
                  stop();
                  commit((s) => setCurrent(s, talk.id));
                  router.push("/app");
                }}
              >
                <SceneThumb talk={talk.id} />
                <span className={page.rowMain}>
                  <span className={page.rowTitle}>
                    {talk.title}
                    {state?.current === talk.id ? (
                      <span className={page.met} style={{ marginLeft: 8, whiteSpace: "nowrap" }}>
                        {t.now}
                      </span>
                    ) : null}
                  </span>
                  <span className={page.rowSub}>
                    {peopleOf(talk)
                      .map((p) => PEOPLE[p].kana)
                      .join("と")}
                    ・{talk.lead}
                  </span>
                </span>
                <span className={page.met}>{status}</span>
                <Icon name="arrow" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
