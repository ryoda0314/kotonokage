"use client";

import type { Heard, MicError } from "@/components/mic";
import { ja } from "@/lib/i18n/ja";

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Whether anyone spoke in some samples: a 20 ms stretch clearly above a quiet room. */
export function loud(samples: Float32Array, rate: number): boolean {
  const win = Math.max(1, Math.round(rate * 0.02));
  for (let i = 0; i + win <= samples.length; i += win) {
    let sum = 0;
    for (let k = i; k < i + win; k++) sum += samples[k] * samples[k];
    if (Math.sqrt(sum / win) > 0.02) return true;
  }
  return false;
}

/** The indexes of the words not heard. */
export function missedOf(heard: boolean[]): number[] {
  return heard.flatMap((ok, i) => (ok ? [] : [i]));
}

/** What to tell the learner when the microphone could not open. */
export function micErrorOf(err: unknown): string {
  const c = ja.common;
  if ((err as MicError) === "denied") return c.micDenied;
  if ((err as MicError) === "missing") return c.micMissing;
  return c.micFailed;
}

/** What to tell the learner when the machine's ear could not help. */
export function hearErrorOf(code: Extract<Heard, { error: string }>["error"]): string {
  const c = ja.common;
  if (code === "tooMany") return c.hearTooMany;
  if (code === "unavailable") return c.hearUnavailable;
  if (code === "quiet") return c.silent;
  return c.hearFailed;
}
