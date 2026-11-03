// Where usage is counted from, and the kind of device a count comes from (src/components/usage.ts sends it). Pure:
// tested in tests/usage.test.mjs.

/**
 * The three kinds every sister counts, with the same meaning, so ことのあめ's admin screen can set them side by side:
 * the app opened (a page load), one unit of its input gone through to the end (here a talk heard, noticed and
 * followed through for the first time), one thing of the learner's own taken in (here a reply of 返す（自分で） come
 * back corrected).
 */
export type UsageKind = "open" | "learn" | "say";

/** The kind of device a count comes from, and nothing finer (no model, no browser, no version). */
export type Platform = "ios" | "android" | "pc" | "other";

/**
 * The kind of device, from the browser's user agent and its touch points. iPadOS says it is a Mac, so a "Macintosh"
 * that can be touched with more than one finger is an iPad; Android says Linux too, so it is asked first. "other" for
 * anything it cannot read.
 */
export function platformOf(userAgent: string, maxTouchPoints: number): Platform {
  if (typeof userAgent !== "string" || !userAgent) return "other";
  const touches = typeof maxTouchPoints === "number" && Number.isFinite(maxTouchPoints) ? maxTouchPoints : 0;
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Macintosh/.test(userAgent) && touches > 1) return "ios";
  if (/Android/.test(userAgent)) return "android";
  if (/Windows|Macintosh|CrOS|X11|Linux/.test(userAgent)) return "pc";
  return "other";
}

/**
 * Counted only in a production build opened at the public address itself: never on this computer while developing,
 * nor on a preview deployment. False for anything it cannot read.
 */
export function countsHere(origin: string, site: string | undefined, production: boolean): boolean {
  if (!production || !origin || !site) return false;
  try {
    return origin === new URL(site).origin;
  } catch {
    return false;
  }
}
