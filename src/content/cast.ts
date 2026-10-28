import type { Person, PersonId } from "./types.ts";

// The same four friends as ことのは (CONCEPT.md, 人と声): university students in Tokyo from abroad, here heard talking
// with each other. Every voice is Gemini's (Google, on Vertex AI): the maker found OpenAI's voices too mechanical to
// shadow (2026-10-28). Each keeps an OpenAI voice as `fallback`, heard only when Google refuses a reply the app's AI
// wrote; prepared clips never fall back. scripts/generate-audio.mjs and /api/say use these voices.
export const PEOPLE: Record<PersonId, Person> = {
  mia: {
    id: "mia",
    name: "Mia",
    kana: "ミア",
    about: "同じ授業をとっている友だち。本屋でバイトしている。",
    voice: "google:Aoede",
    fallback: "marin",
    persona: "Mia, a university student in Tokyo who works part-time at a bookstore. Practical, warm, organized.",
  },
  leo: {
    id: "leo",
    name: "Leo",
    kana: "レオ",
    about: "デザインを学んでいる友だち。ものを作るのが好き。",
    voice: "google:Puck",
    fallback: "cedar",
    persona: "Leo, a design student who likes making things. Curious and honest, says what he really thinks.",
  },
  sam: {
    id: "sam",
    name: "Sam",
    kana: "サム",
    about: "気楽な友だち。食べることと山歩きが好き。",
    voice: "google:Umbriel",
    fallback: "ash",
    persona: "Sam, a laid-back student who loves food and hiking and is happy to go along with good ideas.",
  },
  nora: {
    id: "nora",
    name: "Nora",
    kana: "ノラ",
    about: "サークルの先輩。はっきりものを言う。",
    voice: "google:Kore",
    fallback: "nova",
    persona: "Nora, an older student in the learner's club. Friendly and direct, a bit of a planner.",
  },
};

/** わたしの声: the voice that reads the learner's corrected sentences and the samples, as chosen in 設定. */
export const ME_VOICES = {
  f: { label: "女性の声", voice: "google:Leda", fallback: "coral" },
  m: { label: "男性の声", voice: "google:Achird", fallback: "verse" },
} as const;
export type MeVoice = keyof typeof ME_VOICES;

export const VOICES: readonly string[] = [
  ...Object.values(PEOPLE).map((p) => p.voice),
  ...Object.values(ME_VOICES).map((v) => v.voice),
];

export function voiceOf(who: PersonId): string {
  return PEOPLE[who].voice;
}

/** The OpenAI voice a Google voice falls back on (null for an OpenAI voice). */
export function fallbackOf(voice: string): string | null {
  return [...Object.values(PEOPLE), ...Object.values(ME_VOICES)].find((p) => p.voice === voice)?.fallback ?? null;
}
