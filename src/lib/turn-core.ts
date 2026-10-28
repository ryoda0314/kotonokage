// 返す（自分で）: one answer of the learner's, said aloud (or written) in reply to a friend's line in a talk. One call
// to the model both corrects it (keeping what the learner meant, as little changed as possible) and answers as the
// friend, as ことのは and ことのえだ do. What is asked, and the checks on what comes back. Pure: tested in
// tests/turn.test.mjs; the server signs the English (sign.ts) so /api/say can voice it.
import { answerRoles, lineById, PEOPLE, talkById, type Talk } from "../content/index.ts";
import { hasJapanese, sentencesOf } from "./text.ts";

export type TurnRequest = {
  talk: string;
  /** The side conversation so far: the learner's corrected answers and the friend's replies. */
  history: { who: "me" | "them"; text: string }[];
  input: string;
};

export type RawTurn = { fixed: string; natural: boolean; notes: string[]; gaps: { ja: string; en: string }[]; reply: string };

export type TurnResult = {
  fixed: string;
  natural: boolean;
  notes: string[];
  gaps: { ja: string; en: string }[];
  reply: string;
  sigFixed: string;
  /** The reply in sentences, each signed, voiced one after another (the first is heard while the rest are made). */
  parts: { text: string; sig: string }[];
};

export const TURN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fixed: { type: "string" },
    natural: { type: "boolean" },
    notes: { type: "array", items: { type: "string" } },
    gaps: {
      type: "array",
      items: { type: "object", additionalProperties: false, properties: { ja: { type: "string" }, en: { type: "string" } }, required: ["ja", "en"] },
    },
    reply: { type: "string" },
  },
  required: ["fixed", "natural", "notes", "gaps", "reply"],
} as const;

function talkLines(talk: Talk): string {
  return talk.lines.map((l) => `${PEOPLE[l.who].name}: ${l.text}`).join("\n");
}

export function turnPrompt(req: TurnRequest): { system: string; user: string } {
  const talk = talkById(req.talk)!;
  const { them, me } = answerRoles(talk);
  const friend = PEOPLE[them];
  const line = lineById(talk.answer.line)!.line;
  const system = [
    `You help a Japanese university student practise answering in spoken English. In a short conversation between friends they are playing ${PEOPLE[me].name}; you are ${friend.name}: ${friend.persona}`,
    "The learner said their answer aloud and speech recognition wrote it down (or they typed it). Ignore missing punctuation and capitals and filler words, and read obvious mis-hearings generously. Parts may be in Japanese where English did not come out.",
    "Do two things in one answer.",
    "fixed: the learner's answer as natural spoken English, changed as little as possible. Keep their meaning and every idea they expressed; keep their own words wherever they are natural; put each Japanese part into the English a friend would say here. Never add anything they did not say, even when it is in their situation (if they said Sunday, it stays Sunday, not Sunday night). Do not make it longer, more formal or fancier. If it is already natural, give it back as it is (with normal punctuation and capitals) and set natural to true.",
    `reply: what ${friend.name} says back, in character: one or two short sentences (under 25 words), casual spoken English, answering what the learner said and keeping the conversation going (a short question is fine). Never comment on the learner's English.`,
    "notes: at most two very short notes in plain Japanese on what was changed and why; none when natural is true.",
    "gaps: each Japanese part the learner used, exactly as they wrote it, with the English used for it in fixed.",
  ].join("\n\n");
  const history = req.history.map((h) => `${h.who === "me" ? PEOPLE[me].name : friend.name}: ${h.text}`).join("\n");
  const user = [
    `The conversation they practised (background):\n${talkLines(talk)}`,
    `Now ${friend.name} says to ${PEOPLE[me].name}: "${line.text}"`,
    `${PEOPLE[me].name}'s situation this time, as the learner was told it (Japanese): ${talk.answer.mine}`,
    history ? `What has been said since:\n${history}` : "",
    `The learner, as ${PEOPLE[me].name}, says: "${req.input}"`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, user };
}

const clip = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** The model's answer made safe to show and voice: trimmed, Japanese never left in the English, every gap really in
 * what the learner said, and the English signed. */
export function cleanTurn(raw: RawTurn, req: TurnRequest, sign: (text: string) => string): TurnResult {
  let fixed = clip(raw.fixed, 400);
  if (!fixed || hasJapanese(fixed)) fixed = hasJapanese(req.input) ? "" : req.input.trim();
  const reply = clip(raw.reply, 300);
  const natural = !!raw.natural && !hasJapanese(req.input);
  const gaps = (Array.isArray(raw.gaps) ? raw.gaps : [])
    .map((g) => ({ ja: clip(g?.ja, 80), en: clip(g?.en, 120) }))
    .filter((g) => g.ja && g.en && req.input.includes(g.ja))
    .slice(0, 6);
  const notes = natural ? [] : (Array.isArray(raw.notes) ? raw.notes : []).map((n) => clip(n, 120)).filter(Boolean).slice(0, 2);
  return {
    fixed,
    natural,
    notes,
    gaps,
    reply,
    sigFixed: fixed ? sign(fixed) : "",
    parts: sentencesOf(reply).map((text) => ({ text, sig: sign(text) })),
  };
}
