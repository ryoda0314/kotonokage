"use client";

// The learner's choices that the player and the flow read outside React (設定): kept on this device (local.ts).
import { ME_VOICES, type MeVoice } from "@/content/index.ts";
import { choiceNow, prefNow } from "./local";

export const SPEEDS = ["0.85", "1", "1.15"] as const;
export type Speed = (typeof SPEEDS)[number];
export const VOICE_CHOICES = ["f", "m"] as const;

export function speedNow(): number {
  return Number(choiceNow("speed", "1")) || 1;
}

export function meVoiceNow(): MeVoice {
  return choiceNow("voice", "f") === "m" ? "m" : "f";
}

/** わたしの声: the voice that reads the learner's corrected sentences and the samples. */
export function meVoiceName(): string {
  return ME_VOICES[meVoiceNow()].voice;
}

/** Following without a voice (a train): nothing is recorded. */
export function quietNow(): boolean {
  return prefNow("quiet", false);
}
