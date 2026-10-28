import { ME_VOICES, PEOPLE, voiceOf } from "./cast.ts";
import { CHUNKS } from "./chunks.ts";
import { TALKS } from "./talks.ts";
import type { Chunk, Line, PersonId, Sample, Talk } from "./types.ts";

export type { Answer, Chunk, Line, Mark, Person, PersonId, Sample, SoundMark, Talk } from "./types.ts";
export { CHUNKS, PEOPLE, TALKS };
export { fallbackOf, ME_VOICES, VOICES, voiceOf, type MeVoice } from "./cast.ts";

export function talkById(id: string): Talk | undefined {
  return TALKS.find((t) => t.id === id);
}

export function chunkById(id: string): Chunk | undefined {
  return CHUNKS.find((c) => c.id === id);
}

export function lineById(id: string): { talk: Talk; line: Line } | undefined {
  for (const talk of TALKS) {
    const line = talk.lines.find((l) => l.id === id);
    if (line) return { talk, line };
  }
  return undefined;
}

/** The two people of a talk, in the order they first speak. */
export function peopleOf(talk: Talk): PersonId[] {
  return [...new Set(talk.lines.map((l) => l.who))];
}

/** 返す（自分で）: whose line the learner answers, and whom the learner plays. */
export function answerRoles(talk: Talk): { them: PersonId; me: PersonId } {
  const them = talk.lines.find((l) => l.id === talk.answer.line)?.who ?? talk.lines[0].who;
  const me = peopleOf(talk).find((p) => p !== them) ?? them;
  return { them, me };
}

/** What the voice says: the subtitle with each casual spelling put in (want to → wanna). */
export function spokenText(line: Line): string {
  let text = line.text;
  for (const s of line.sounds ?? []) if (s.as) text = text.replace(s.text, s.as);
  return text;
}

/** The chunks a talk brings, in the order they first come. */
export function chunksOf(talk: Talk): string[] {
  return [...new Set(talk.lines.flatMap((l) => (l.marks ?? []).map((m) => m.chunk)))];
}

/** The talks a chunk turns up in. */
export function talksWithChunk(id: string): Talk[] {
  return TALKS.filter((t) => t.lines.some((l) => l.marks?.some((m) => m.chunk === id)));
}

const cores = CHUNKS.map((c) => ({ id: c.id, re: new RegExp(c.core, "i") }));

/** The chunks in something said, found by their core patterns (sentence by sentence, so "though" at an end is seen). */
export function findChunks(text: string): string[] {
  const pieces = text.split(/(?<=[.!?])\s+/);
  return cores.filter(({ re }) => pieces.some((p) => re.test(p))).map(({ id }) => id);
}

/** A sample's clip key in わたしの声. */
export function sampleKey(sample: Sample, voice: keyof typeof ME_VOICES): string {
  return `${sample.id}@${voice}`;
}

/** A clip to make: what the voice says, and for a line what the subtitle shows (its words are timed against it). */
export type Clip = { key: string; text: string; shown: string | null; voice: string; pace: Talk["pace"] };

/** Every clip to make: each line in its speaker's voice (with word times), each sample in both of わたし's voices. */
export function allClips(): Clip[] {
  return TALKS.flatMap((talk) => [
    ...talk.lines.map((line) => ({ key: line.id, text: spokenText(line), shown: line.text, voice: voiceOf(line.who), pace: talk.pace })),
    ...talk.answer.samples.flatMap((sample) =>
      (Object.keys(ME_VOICES) as (keyof typeof ME_VOICES)[]).map((v) => ({
        key: sampleKey(sample, v),
        text: sample.text,
        shown: null,
        voice: ME_VOICES[v].voice,
        pace: "natural" as const,
      })),
    ),
  ]);
}
