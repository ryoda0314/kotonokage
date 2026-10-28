"use client";

// Playback, one sound at a time across the app, through one <audio> element, as in ことのは: slowed down or sped up, a
// voice keeps its pitch. Clips are fetched once into memory (prefetch), so in a talk each line starts the moment the
// one before ends. A clip can be played in part (a chunk, by its words' times), and so can the learner's own voice.
// Every play or stop starts a new generation; a sequence still running from an older one gives up and returns false.
//
// While the microphone is open (mic.ts) the page asks iOS for recording and playback together (navigator.audioSession,
// Safari 17+), as ことのおと does; the rest of the time its sound is playback, heard with the ringer switch off.
import { useSyncExternalStore } from "react";
import manifest from "@/content/audio.json";

export type ClipInfo = { file: string; dur: number; times?: [number, number][] };
const clips = manifest as unknown as Record<string, ClipInfo>;

let el: HTMLAudioElement | null = null;
let generation = 0;
let playing: string | null = null;
const listeners = new Set<() => void>();
const objects = new Map<string, Promise<string | null>>();

// A sliver of silence, played inside the first tap so the element may play on its own afterwards (iOS).
const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==";

function setPlaying(key: string | null) {
  playing = key;
  listeners.forEach((l) => l());
}

/** The key of what is playing now (for a button to show it), null when quiet. */
export function usePlaying(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => playing,
    () => null,
  );
}

export function clipOf(key: string): ClipInfo | undefined {
  return clips[key];
}

export function clipUrl(key: string): string | null {
  const c = clips[key];
  return c ? `/audio/${c.file}` : null;
}

type SessionType = "playback" | "play-and-record";

/** Safari 17+ (navigator.audioSession): what kind of sound the page makes. Elsewhere there is nothing to set. */
export function session(type: SessionType): void {
  const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (!s || s.type === type) return;
  try {
    s.type = type;
  } catch {
    // not settable here
  }
}

function keepPitch(audio: HTMLAudioElement) {
  const a = audio as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean };
  a.preservesPitch = true;
  a.webkitPreservesPitch = true;
}

/** Call inside a tap: lets the page play sound from then on (mobile browsers ask for a tap first). */
export function unlock(): void {
  if (el) return;
  el = new Audio();
  el.preload = "auto";
  keepPitch(el);
  el.src = SILENCE;
  void el.play().catch(() => undefined);
}

function object(url: string): Promise<string | null> {
  if (url.startsWith("blob:") || url.startsWith("data:")) return Promise.resolve(url);
  let p = objects.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => URL.createObjectURL(b))
      .catch(() => {
        objects.delete(url); // asked for again next time
        return null;
      });
    objects.set(url, p);
  }
  return p;
}

/** Fetches what will be played soon, so it starts at once. */
export function prefetch(urls: (string | null)[]): void {
  for (const u of urls) if (u) void object(u);
}

export function stop(): void {
  generation++;
  el?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  setPlaying(null);
}

export type Item = {
  /** What the play button that started it shows as playing. */
  key: string;
  url: string | null;
  /** Read by the browser's own voice when there is no clip (not voiced yet). */
  text?: string;
  rate?: number;
  /** Seconds into the clip: a part of it (a chunk). */
  from?: number;
  to?: number;
};

function speakWithBrowser(text: string, rate: number, gen: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearInterval(check);
      resolve(ok && gen === generation);
    };
    u.onend = () => done(true);
    u.onerror = () => done(false);
    const check = setInterval(() => {
      if (gen !== generation) {
        window.speechSynthesis.cancel();
        done(false);
      }
    }, 100);
    window.speechSynthesis.speak(u);
    setTimeout(() => done(true), 3000 + text.length * 120);
  });
}

function run(audio: HTMLAudioElement, src: string, gen: number, item: Item, onStart?: (perf: number) => void): Promise<boolean> {
  const rate = item.rate ?? 1;
  const from = item.from ?? 0;
  return new Promise((resolve) => {
    let settled = false;
    let raf = 0;
    let guard = 0;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("playing", onPlaying);
      if (!ok || item.to !== undefined) audio.pause();
      resolve(ok && gen === generation);
    };
    const onEnded = () => finish(true);
    const onError = () => finish(false);
    const onPlaying = () => {
      audio.removeEventListener("playing", onPlaying);
      onStart?.(performance.now());
      clearTimeout(guard);
      const length = (item.to ?? (Number.isFinite(audio.duration) ? audio.duration : 30)) - from;
      // A held element never ends the clip: give up rather than wait.
      guard = window.setTimeout(() => finish(true), (length / rate) * 1000 + 2500);
    };
    const tick = () => {
      if (gen !== generation) return finish(false);
      if (item.to !== undefined && audio.currentTime >= item.to) return finish(true);
      raf = requestAnimationFrame(tick);
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("playing", onPlaying);
    const start = () => {
      if (gen !== generation) return finish(false);
      if (from > 0) audio.currentTime = from;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      keepPitch(audio);
      audio
        .play()
        .then(() => {
          raf = requestAnimationFrame(tick);
        })
        .catch(() => finish(false));
      guard = window.setTimeout(() => finish(false), 8000);
    };
    audio.src = src;
    if (from > 0) {
      audio.addEventListener("loadedmetadata", start, { once: true });
      audio.load();
    } else start();
  });
}

async function playIn(gen: number, item: Item, onStart?: (perf: number) => void): Promise<boolean> {
  setPlaying(item.key);
  const src = item.url ? await object(item.url) : null;
  if (gen !== generation) return false;
  if (!src) return item.text ? speakWithBrowser(item.text, item.rate ?? 1, gen) : false;
  el!.pause();
  return run(el!, src, gen, item, onStart);
}

const pause = (gen: number, ms: number) => new Promise<boolean>((r) => setTimeout(() => r(gen === generation), ms));

/** Plays one sound to its end. False if it was stopped, replaced, or nothing could play it. */
export async function play(item: Item, onStart?: (perf: number) => void): Promise<boolean> {
  unlock();
  const gen = ++generation;
  const ok = await playIn(gen, item, onStart);
  if (gen === generation) setPlaying(null);
  return ok;
}

/** Sounds one after another, `gapMs` apart; `onItem(i, perf)` as each begins to sound. False when interrupted. */
export async function playList(items: Item[], { gapMs = 400, onItem }: { gapMs?: number; onItem?: (i: number, perf: number) => void } = {}): Promise<boolean> {
  unlock();
  const gen = ++generation;
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && !(await pause(gen, gapMs))) return false;
    const ok = await playIn(gen, items[i], (perf) => onItem?.(i, perf));
    if (gen !== generation) return false;
    if (!ok && !items[i].text) continue;
  }
  setPlaying(null);
  return true;
}

/**
 * Sounds whose addresses are still being made (the app's AI text through /api/say), one after another: each plays as
 * soon as it is ready, while the rest are still being voiced. False when interrupted.
 */
export async function playPending(items: { key: string; url: Promise<string | null>; text?: string; rate?: number }[], gapMs = 180): Promise<boolean> {
  unlock();
  const gen = ++generation;
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && !(await pause(gen, gapMs))) return false;
    setPlaying(items[i].key);
    const url = await items[i].url;
    if (gen !== generation) return false;
    await playIn(gen, { key: items[i].key, url, text: items[i].text, rate: items[i].rate });
    if (gen !== generation) return false;
  }
  setPlaying(null);
  return true;
}

/** A line of a talk as something to play. */
export function lineItem(line: { id: string; text: string }, rate = 1): Item {
  return { key: line.id, url: clipUrl(line.id), text: line.text, rate };
}

/** Part of a line (a chunk): from its first word's start to its last word's end. */
export function partItem(line: { id: string; text: string }, words: number[], rate = 1): Item | null {
  const times = clips[line.id]?.times;
  if (!times || !words.length) return null;
  const from = Math.max(0, times[words[0]][0] - 0.06);
  const to = times[words[words.length - 1]][1] + 0.12;
  return { key: `${line.id}:${words[0]}-${words[words.length - 1]}:${rate}`, url: clipUrl(line.id), rate, from, to };
}

const said = new Map<string, Promise<string | null>>();

/** English the app's AI wrote, voiced by /api/say with the signature it came with (fetched once). */
export function saidUrl(text: string, sig: string, voice: string): Promise<string | null> {
  const key = `${voice}\n${text}`;
  let job = said.get(key);
  if (!job) {
    job = fetch("/api/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, sig, voice }) })
      .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
      .catch(() => null)
      .then((url) => {
        if (!url) said.delete(key);
        return url;
      });
    said.set(key, job);
  }
  return job;
}
