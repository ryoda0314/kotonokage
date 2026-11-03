// Where usage is counted from (src/components/usage.ts sends it). Pure: tested in tests/usage.test.mjs.

/**
 * The three kinds every sister counts, with the same meaning, so ことのあめ's admin screen can set them side by side:
 * the app opened (a page load), one unit of its input gone through to the end (here a talk heard, noticed and
 * followed through for the first time), one thing of the learner's own taken in (here a reply of 返す（自分で） come
 * back corrected).
 */
export type UsageKind = "open" | "learn" | "say";

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
