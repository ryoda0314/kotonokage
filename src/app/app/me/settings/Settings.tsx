"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useChoice, usePref } from "@/components/local";
import { SPEEDS, VOICE_CHOICES } from "@/components/prefs";
import { ja } from "@/lib/i18n/ja";
import { account, resetRecord, signOut, type Account } from "@/lib/sync";
import page from "../../_parts/page.module.css";
import styles from "./settings.module.css";

const t = ja.settings;

/** 設定: how the learner likes to follow, kept on this device; the ことのあめ account; and the record. */
export function Settings() {
  const [speed, setSpeed] = useChoice("speed", SPEEDS, "1");
  const [voice, setVoice] = useChoice("voice", VOICE_CHOICES, "f");
  const [quiet, setQuiet] = usePref("quiet", false);
  const [showJa, setShowJa] = usePref("showJa", false);
  const [me, setMe] = useState<Account | null | undefined>(undefined);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    void account().then(setMe);
  }, []);

  return (
    <div className={page.page}>
      <header className={page.bar}>
        <Link href="/app/me" className={page.iconLink} aria-label={ja.common.back}>
          <Icon name="back" size={22} />
        </Link>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>

      <section className={page.section}>
        <h2 className={page.h2}>{t.speed}</h2>
        <div className={styles.choices}>
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="btn-quiet" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              {ja.common.speeds[s]}
            </button>
          ))}
        </div>
        <p className={page.note}>{t.speedNote}</p>
      </section>

      <section className={page.section}>
        <h2 className={page.h2}>{t.voice}</h2>
        <div className={styles.choices}>
          {VOICE_CHOICES.map((v) => (
            <button key={v} type="button" className="btn-quiet" aria-pressed={voice === v} onClick={() => setVoice(v)}>
              {t.voices[v]}
            </button>
          ))}
        </div>
        <p className={page.note}>{t.voiceNote}</p>
      </section>

      <section className={page.section}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} />
          <span>{t.quiet}</span>
        </label>
        <p className={page.note}>{t.quietNote}</p>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showJa} onChange={(e) => setShowJa(e.target.checked)} />
          <span>{t.showJa}</span>
        </label>
      </section>

      <section className={page.section}>
        <h2 className={page.h2}>{t.account}</h2>
        {me === undefined ? null : me ? (
          <>
            <p className={styles.linked}>{t.linked(me.email ?? "")}</p>
            <p className={page.note}>{t.linkedLead}</p>
            <div>
              <button
                type="button"
                className="btn-quiet"
                onClick={async () => {
                  await signOut();
                  setMe(null);
                }}
              >
                {t.unlink}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={page.note}>{t.linkLead}</p>
            <div>
              <Link href="/login?next=/app/me/settings" className="btn">
                {t.link}
              </Link>
            </div>
          </>
        )}
      </section>

      <section className={page.section}>
        <h2 className={page.h2}>{t.record}</h2>
        <div>
          <button
            type="button"
            className={styles.danger}
            onClick={async () => {
              if (!window.confirm(me ? t.clearLinkedConfirm : t.clearConfirm)) return;
              await resetRecord();
              setCleared(true);
            }}
          >
            {me ? t.clearLinked : t.clear}
          </button>
        </div>
        {cleared ? <p className={page.note}>{t.cleared}</p> : null}
      </section>
    </div>
  );
}
