import { PEOPLE, type PersonId } from "@/content/index.ts";
import styles from "./flow.module.css";

/** Who says the line: their name, small, above it. */
export function Who({ who, you = false, label }: { who: PersonId; you?: boolean; label?: string }) {
  return (
    <p className={styles.who} data-person={who}>
      <span className={styles.whoName}>{PEOPLE[who].kana}</span>
      {you && label ? <span className={styles.you}>{label}</span> : null}
    </p>
  );
}
