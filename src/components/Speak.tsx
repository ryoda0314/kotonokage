"use client";

import { Icon } from "./Icon";
import { play, stop, usePlaying, type Item } from "./player";
import styles from "./Speak.module.css";

/** Plays one thing; pressed again while it plays, stops it. A ripple spreads while it sounds, as in the sisters. */
export function Speak({ item, label, size = "md", solid = false }: { item: Item; label: string; size?: "sm" | "md"; solid?: boolean }) {
  const now = usePlaying();
  const playing = now === item.key;
  return (
    <button
      type="button"
      className={[styles.button, styles[size], solid ? styles.solid : "", playing ? styles.playing : ""].join(" ")}
      onClick={() => (playing ? stop() : void play(item))}
      aria-label={label}
      aria-pressed={playing}
    >
      <Icon name="speaker" size={size === "sm" ? 17 : 20} />
    </button>
  );
}
