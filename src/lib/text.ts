// Comparing spoken English with the subtitle: what the machine's ear wrote down for the learner (/api/hear) against
// the line, word by word in order, and the voice's own word times (scripts/generate-audio.mjs) against the subtitle.
// Both sides go through the same canonical form, so "I've" and "I have", "wanna" and "want to", "2" and "two" meet.
// Pure: tested in tests/text.test.mjs, used by the device, the server and the scripts.

/** A word of a line as shown: its place in the text (UTF-16) and its canonical tokens. Punctuation stays with it. */
export type Word = { text: string; start: number; end: number; keys: string[] };

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberWords(n: number): string[] {
  if (n < 20) return [NUMBERS[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], NUMBERS[n % 10]] : [TENS[n / 10]];
  return String(n).split("");
}

// Casual spellings and contractions, the same on both sides (what was meant is what counts, not how it was spelled).
const WHOLE: Record<string, string[]> = {
  wanna: ["want", "to"],
  gonna: ["going", "to"],
  gotta: ["got", "to"],
  lemme: ["let", "me"],
  kinda: ["kind", "of"],
  sorta: ["sort", "of"],
  gimme: ["give", "me"],
  dunno: ["do", "not", "know"],
  whatcha: ["what", "are", "you"],
  gotcha: ["got", "you"],
  "y'know": ["you", "know"],
  ya: ["you"],
  "'em": ["them"],
  "'cause": ["because"],
  cuz: ["because"],
  ok: ["okay"],
  "o.k": ["okay"],
  yep: ["yeah"],
  yup: ["yeah"],
  yea: ["yeah"],
  mt: ["mount"],
  cannot: ["can", "not"],
  "can't": ["can", "not"],
  "won't": ["will", "not"],
  "ain't": ["is", "not"],
  "let's": ["let", "us"],
  "d'you": ["do", "you"],
  ooh: ["oh"],
  oooh: ["oh"],
};

// "it's" is "it is"; a name's "'s" ("Tanaka's") is only the name.
const IS_BEFORE = new Set(["it", "that", "what", "there", "here", "he", "she", "who", "where", "how", "one", "everyone", "nobody", "everything", "nothing", "this", "today", "now"]);

/** One written word as canonical tokens (lower case, no punctuation, contractions and casual spellings undone). */
export function keysOf(raw: string): string[] {
  const w = raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/^'+(?!em$|cause$)|'+$/g, "");
  if (!w) return [];
  const time = w.match(/^(\d{1,2}):(\d{2})$/);
  if (time) {
    const minutes = Number(time[2]);
    return [...numberWords(Number(time[1])), ...(minutes ? (minutes < 10 ? ["oh", ...numberWords(minutes)] : numberWords(minutes)) : [])];
  }
  if (/^\d+$/.test(w)) return numberWords(Number(w));
  if (WHOLE[w]) return WHOLE[w];
  if (w.includes("-")) return w.split("-").flatMap(keysOf);
  const c = w.match(/^([a-z]+)'(m|re|ve|ll|d|s|t)$/);
  if (c) {
    const [, base, tail] = c;
    if (tail === "t" && base.endsWith("n")) return [base.slice(0, -1) === "ca" ? "can" : base.slice(0, -1), "not"];
    if (tail === "m") return [base, "am"];
    if (tail === "re") return [base, "are"];
    if (tail === "ve") return [base, "have"];
    if (tail === "ll") return [base, "will"];
    if (tail === "d") return [base, "would"];
    if (tail === "s") return IS_BEFORE.has(base) ? [base, "is"] : [base];
  }
  return [w.replace(/'/g, "")];
}

/** The words of a text as shown, each with its canonical tokens. */
export function wordsOf(text: string): Word[] {
  return [...text.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, keys: keysOf(m[0]) }));
}

/** Every canonical token of a text, in order. */
export function tokensOf(text: string): string[] {
  return wordsOf(text).flatMap((w) => w.keys);
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/** Two tokens that stand for the same word: equal, a plural "s" apart, or (long words) one letter apart. */
export function same(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && (a === `${b}s` || b === `${a}s`)) return true;
  return a.length >= 6 && b.length >= 6 && distance(a, b) <= 1;
}

/** Index pairs (i in a, j in b) of the longest run of tokens the two have in common, in order. */
export function matchTokens(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = same(a[i], b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(a[i], b[j]) && lcs[i][j] === lcs[i + 1][j + 1] + 1) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/**
 * Which words of the script came through in what was heard (in order, across the whole script, so a learner a beat
 * behind still lines up). A word of one or two tokens needs all of them; a longer one ("dunno") all but one. A word
 * with no tokens (a dash) is never counted as missed.
 */
export function heardWords(script: Word[], heard: string): boolean[] {
  const flat: { word: number; key: string }[] = script.flatMap((w, i) => w.keys.map((key) => ({ word: i, key })));
  const got = tokensOf(heard);
  const hits = new Array<number>(script.length).fill(0);
  for (const [i] of matchTokens(
    flat.map((f) => f.key),
    got,
  ))
    hits[flat[i].word]++;
  return script.map((w, i) => w.keys.length === 0 || hits[i] >= (w.keys.length >= 3 ? w.keys.length - 1 : w.keys.length));
}

/** How much of `want` the heard text has, in order (0..1): for checking a voiced clip against its line. */
export function coverage(want: string, heard: string): number {
  const a = tokensOf(want);
  const b = tokensOf(heard);
  return a.length ? matchTokens(a, b).length / Math.max(a.length, b.length) : 0;
}

/**
 * Each shown word's time in a voiced clip ([start, end] seconds), from the transcriber's timed words. A word the
 * transcriber did not give is placed between its neighbours.
 */
export function alignTimes(script: Word[], timed: { word: string; start: number; end: number }[]): [number, number][] {
  const flat: { word: number; key: string }[] = script.flatMap((w, i) => w.keys.map((key) => ({ word: i, key })));
  const tFlat: { t: number; key: string }[] = timed.flatMap((t, i) => keysOf(t.word).map((key) => ({ t: i, key })));
  const spans: ([number, number] | null)[] = script.map(() => null);
  for (const [i, j] of matchTokens(
    flat.map((f) => f.key),
    tFlat.map((t) => t.key),
  )) {
    const w = flat[i].word;
    const t = timed[tFlat[j].t];
    const s = spans[w];
    spans[w] = s ? [Math.min(s[0], t.start), Math.max(s[1], t.end)] : [t.start, t.end];
  }
  const end = timed.length ? timed[timed.length - 1].end : 0;
  const out: [number, number][] = [];
  for (let k = 0; k < spans.length; k++) {
    const s = spans[k];
    if (s) {
      out.push(s);
      continue;
    }
    const before = out.length ? out[out.length - 1][1] : 0;
    let after = end;
    for (let m = k + 1; m < spans.length; m++) {
      const next = spans[m];
      if (next) {
        after = next[0];
        break;
      }
    }
    out.push([before, Math.max(before, after)]);
  }
  return out;
}

/** The words a range of the text covers (by index). */
export function wordsIn(words: Word[], start: number, end: number): number[] {
  return words.flatMap((w, i) => (w.start < end && w.end > start ? [i] : []));
}

/** Japanese anywhere: the learner filled in what English did not come out for. */
export function hasJapanese(s: string): boolean {
  return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s);
}

/**
 * A reply as sentences, for voicing them one by one (the first is heard while the rest are made). A piece of under
 * three words joins the next. Joined with spaces they give the text back.
 */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  const t = text.trim();
  let start = 0;
  for (const m of t.matchAll(/[.!?…]+["'’”)]?\s+/g)) {
    const end = (m.index ?? 0) + m[0].trimEnd().length;
    out.push(t.slice(start, end));
    start = (m.index ?? 0) + m[0].length;
  }
  if (start < t.length) out.push(t.slice(start));
  const short = (s: string) => s.split(/\s+/).length < 3;
  const merged: string[] = [];
  for (const piece of out) {
    const last = merged[merged.length - 1];
    if (last !== undefined && short(last)) merged[merged.length - 1] = `${last} ${piece}`;
    else merged.push(piece);
  }
  if (merged.length > 1 && short(merged[merged.length - 1])) merged.splice(-2, 2, `${merged[merged.length - 2]} ${merged[merged.length - 1]}`);
  return merged.filter(Boolean);
}
