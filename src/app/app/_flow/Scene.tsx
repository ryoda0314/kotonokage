"use client";

import Image from "next/image";
import scenes from "@/content/scenes.json";
import styles from "./scene.module.css";

// The talks that have a scene photo, each by its file (named by its content, so a new photo is a new name) and size
// (design/make-scenes.py writes the list).
const SCENES = scenes as unknown as Record<string, { file: string; w: number; h: number }>;

export function hasScene(talk: string): boolean {
  return !!SCENES[talk];
}

/**
 * A talk's scene: where it happens and who is there, never the words (CONCEPT.md, デザイン). The maker made it
 * (design/scenes/prompts.md). `small` keeps a strip of it, so the lines below have the room; pressing it asks for
 * the whole picture again (`onToggle`).
 */
export function Scene({ talk, small = false, onToggle, label, priority = false }: { talk: string; small?: boolean; onToggle?: () => void; label?: string; priority?: boolean }) {
  const s = SCENES[talk];
  if (!s) return null;
  const img = <Image src={`/scenes/${s.file}`} alt="" width={s.w} height={s.h} sizes="(max-width: 720px) 100vw, 720px" priority={priority} className={styles.img} />;
  return onToggle ? (
    <button type="button" className={`${styles.scene} ${small ? styles.small : ""}`} onClick={onToggle} aria-label={label} aria-expanded={!small}>
      {img}
    </button>
  ) : (
    <figure className={`${styles.scene} ${small ? styles.small : ""}`}>{img}</figure>
  );
}

/** A small one for a list of talks. */
export function SceneThumb({ talk }: { talk: string }) {
  const s = SCENES[talk];
  if (!s) return null;
  return <Image src={`/scenes/${s.file}`} alt="" width={96} height={64} sizes="64px" className={styles.thumb} />;
}
