import { Icon } from "@/components/Icon";
import type { StepId } from "@/lib/record";
import styles from "./steps.module.css";

const ICONS = { listen: "listen", notice: "notice", follow: "follow", answer: "answer" } as const;

/**
 * Where the learner is in this talk, as in ことのおと and ことのえだ: the steps on a track, those behind checked, this
 * one lit, those ahead faint. A step that can be gone to (`open`) is pressed to go there. A guide, not a score.
 */
export function Steps({
  steps,
  current,
  open,
  onPick,
  label,
}: {
  steps: { step: StepId; label: string }[];
  current: StepId;
  open: StepId[];
  onPick: (step: StepId) => void;
  label: string;
}) {
  const at = steps.findIndex((s) => s.step === current);
  return (
    <ol className={styles.steps} aria-label={label} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => {
        const state = i < at ? "done" : i === at ? "now" : "next";
        return (
          <li key={s.step} className={styles.step} data-state={state} aria-current={state === "now" ? "step" : undefined}>
            <button type="button" className={styles.go} disabled={state === "now" || !open.includes(s.step)} onClick={() => onPick(s.step)}>
              <span className={styles.node} aria-hidden="true">
                <Icon name={state === "done" ? "check" : ICONS[s.step]} size={20} />
              </span>
              <span className={styles.label}>
                <span className={styles.number}>{i + 1}</span>
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
