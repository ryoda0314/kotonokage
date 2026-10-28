"use client";

// The learner's record on their device, as in the sisters. Storage can be missing or refuse (a private window,
// cleared site data), so every read and write is guarded and the app works without it, starting fresh. One copy lives
// in memory for every screen (useRecord); commit() changes it and keeps it. Signing in with ことのあめ's account (and
// keeping a copy there) is for later: savers are where that copy would follow.
import { useSyncExternalStore } from "react";
import { bounded, emptyState, type State } from "./record.ts";

// Named for what it trains (shadowing), not the app, so a new name for the app keeps the records already on devices.
const KEY = "shadowing:v1";

let state: State | null = null;
const listeners = new Set<() => void>();
const savers = new Set<(state: State) => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as State;
    return parsed?.v === 1 ? { ...emptyState(), ...parsed } : emptyState();
  } catch {
    return emptyState();
  }
}

function keep(next: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not kept this time; the learner carries on.
  }
}

export function getState(): State {
  if (!state) state = load();
  return state;
}

export function replaceState(next: State): void {
  state = next;
  keep(next);
  listeners.forEach((l) => l());
}

/** Changes the record and keeps it on the device. */
export function commit(change: (s: State) => State): State {
  const next = bounded(change(getState()));
  replaceState(next);
  savers.forEach((s) => s(next));
  return next;
}

export function onSave(saver: (state: State) => void): () => void {
  savers.add(saver);
  return () => savers.delete(saver);
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  state = emptyState();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The record, or null on the server and before the page has hydrated. */
export function useRecord(): State | null {
  return useSyncExternalStore(subscribe, getState, () => null);
}
