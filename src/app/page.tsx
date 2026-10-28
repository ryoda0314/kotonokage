import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ja } from "@/lib/i18n/ja";
import styles from "./page.module.css";

const t = ja.intro;

// What the app does, drawn the way it shows it: the model's line, and the learner's a little behind it, the words the
// machine's ear did not hear left pale.
const MODEL = "Want to check out that new ramen place?";
const MINE: [string, boolean][] = [
  ["Want", true],
  ["to", true],
  ["check", false],
  ["out", false],
  ["that", true],
  ["new", true],
  ["ramen", true],
  ["place?", true],
];

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size="lg" href={null} />
      </header>
      <section className={styles.hero}>
        <h1 className={styles.lead}>{t.lead}</h1>
        <figure className={styles.figure} aria-hidden="true">
          <p className={styles.tag}>手本</p>
          <p className={`${styles.model} t-en`}>{MODEL}</p>
          <p className={`${styles.tag} ${styles.mineTag}`}>自分</p>
          <p className={`${styles.mine} t-en`}>
            {MINE.map(([w, heard], i) => (
              <span key={i} className={heard ? undefined : styles.missed}>
                {w}
                {i < MINE.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </figure>
        {t.body.map((p) => (
          <p key={p} className={styles.body}>
            {p}
          </p>
        ))}
        <ol className={styles.steps}>
          {t.steps.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <span className={styles.stepTitle}>{s.title}</span>
              <span className={styles.stepBody}>{s.body}</span>
            </li>
          ))}
        </ol>
        <Link href="/app" className={`btn ${styles.start}`}>
          {t.start}
        </Link>
        <p className={styles.note}>{t.note}</p>
      </section>
    </div>
  );
}
