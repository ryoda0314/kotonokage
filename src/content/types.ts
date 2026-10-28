// What the app plays and shows, written ahead and checked (tests/content.test.mjs). Ids name clips and records: once a
// line or a chunk has one, it never changes.

export type PersonId = "mia" | "leo" | "sam" | "nora";

export type Person = {
  id: PersonId;
  name: string;
  kana: string;
  about: string;
  /** An OpenAI voice by its name ("marin"), or a Google one as "google:<Gemini voice>" (src/lib/tts.ts). */
  voice: string;
  /** The OpenAI voice a Google voice falls back on when Google refuses (AI replies only). */
  fallback?: string;
  persona: string;
};

/** まとまり: words that come out together with one meaning (What are you up to? / No rush.). */
export type Chunk = {
  id: string;
  /** How it is written as a pattern: "How was …?". */
  text: string;
  /** What it does, in a few Japanese words: 〜どうだった？ */
  label: string;
  /** One plain line on when it is used. */
  does: string;
  /** Finds it in anything the learner says (case-insensitive regular expression source). */
  core: string;
};

/** A chunk in a line: its exact words there. */
export type Mark = { chunk: string; text: string };

/**
 * 聞こえ方: words that sound different from how they are written. `as`: a casual spelling English speakers write too
 * (want to → wanna), which the voice says. `link`: words that run together into one sound (check out → check‿out).
 */
export type SoundMark = { text: string; as?: string; link?: true };

export type Line = {
  /** "<talk>.<n>": names its clip. */
  id: string;
  who: PersonId;
  /** What the subtitle shows. */
  text: string;
  ja: string;
  marks?: Mark[];
  sounds?: SoundMark[];
};

/** A way to answer, voiced in わたしの声. */
export type Sample = { id: string; text: string; note: string };

/** 返す（自分で）: someone's line from the talk, and the learner's own circumstances (never a finished answer). */
export type Answer = { line: string; mine: string; samples: Sample[] };

export type Talk = {
  id: string;
  title: string;
  lead: string;
  /** clear: a little slower and carefully said, for the first talks; natural: an everyday pace. */
  pace: "clear" | "natural";
  lines: Line[];
  answer: Answer;
};
