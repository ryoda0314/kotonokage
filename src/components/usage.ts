"use client";

// How many use the app, counted as ことのね counts it (../hanjaatume/src/util/usage.ts) and with the same three kinds
// as every sister: this device's number (a random one made on this device, tied to no one), one count each time the
// app is opened, a talk is followed through for the first time, or a reply of the learner's own comes back
// corrected, and whether it was opened from the home screen. Nothing else: no account, name, email, voice, recording
// or sentence. It goes to ことのあめ's Supabase (pl_app_ping, ../polylinga/supabase/migrations/20261103000000_app_usage.sql)
// by a plain fetch with the anon key, never through sync.ts's client, so a signed-in learner's session never rides
// along. Only at the public address (NEXT_PUBLIC_SITE_URL; none yet, so nothing is counted until it is set) in a
// production build, and only while 設定's 使われ方の数を送る is on. A count that cannot be sent is simply lost.
import { countsHere, type UsageKind } from "@/lib/usage";
import { prefNow } from "./local";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";
/** This app's name at ことのあめ. */
const APP = "kotonokage";
const DEVICE = "kage:device";
/** 設定's 使われ方の数を送る, a usePref key (kept as kage:sendUsage, "0" once the learner switched it off). */
export const SEND_USAGE = "sendUsage";

function deviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE, id);
    }
    return id;
  } catch {
    // No storage (a private window): not counted, rather than counted as a new device each time.
    return null;
  }
}

function standalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** One count, not waited for. */
export function countUsage(kind: UsageKind): void {
  if (typeof window === "undefined" || !URL_ || !KEY) return;
  if (!countsHere(location.origin, SITE, process.env.NODE_ENV === "production") || !prefNow(SEND_USAGE, true)) return;
  const device = deviceId();
  if (!device) return;
  fetch(`${URL_}/rest/v1/rpc/pl_app_ping`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_app: APP, p_device: device, p_kind: kind, p_standalone: standalone() }),
    keepalive: true,
  }).catch(() => {
    // Not counted this time.
  });
}
