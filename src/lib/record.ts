// The learner's record (CONCEPT.md, 記録). Its centre is the talk (each time through it, and which words of each line
// the machine's ear did not hear) and the chunk (each time it was met, followed, said in a role, or used in the
// learner's own reply). Nothing here is a score: what is kept are events and dates, and what 自分 shows is worked out
// from them. Pure: tested in tests/record.test.mjs.
import { chunksOf, TALKS, talkById, type PersonId } from "../content/index.ts";

export type StepId = "listen" | "notice" | "follow" | "answer";

/** met: heard it in a talk. shadowed: followed a talk it is in. role: said it in a role and it was heard. own: used it
 * in one's own reply. ai: the correction put it into one's reply (not counted as one's own). */
export type EventKind = "met" | "shadowed" | "role" | "own" | "ai";
export type ChunkEvent = { at: number; kind: EventKind; talk: string };

/** Line id → the indexes of its words the machine's ear did not hear. A line not in it was not judged. */
export type Missed = Record<string, number[]>;

/** One time through a talk (追いかける). `quiet`: followed without a voice, so nothing was judged. `only`: one line
 * followed again on its own (この行だけ), not a time through the whole talk. */
export type Round = { at: number; speed: string; quiet?: true; only?: string; missed: Missed };
/** One time through a talk in a role (返す). */
export type RoleTry = { at: number; as: PersonId; missed: Missed };
/** 返す（自分で）: what the learner said, its correction, and the friend's reply. */
export type Reply = { at: number; talk: string; said: string; fixed: string; natural: boolean; reply: string; own: string[]; ai: string[] };

export type TalkLog = { first: number; last: number; step: StepId; listened?: number; rounds: Round[]; roles: RoleTry[]; done?: number };

export type State = {
  v: 1;
  /** The talk on 追いかける now (null: the next one is chosen). */
  current: string | null;
  talks: Record<string, TalkLog>;
  chunks: Record<string, ChunkEvent[]>;
  replies: Reply[];
};

export const emptyState = (): State => ({ v: 1, current: null, talks: {}, chunks: {}, replies: [] });

const ROUNDS_KEPT = 40;
const ROLES_KEPT = 20;
const EVENTS_KEPT = 80;
const REPLIES_KEPT = 200;

/** Keeps the record small: the newest rounds, tries, events and replies. */
export function bounded(s: State): State {
  const talks: Record<string, TalkLog> = {};
  for (const [id, log] of Object.entries(s.talks)) talks[id] = { ...log, rounds: log.rounds.slice(-ROUNDS_KEPT), roles: log.roles.slice(-ROLES_KEPT) };
  const chunks: Record<string, ChunkEvent[]> = {};
  for (const [id, events] of Object.entries(s.chunks)) chunks[id] = events.slice(-EVENTS_KEPT);
  return { ...s, talks, chunks, replies: s.replies.slice(-REPLIES_KEPT) };
}

/** A day in Japan, as "YYYY-MM-DD". */
export function dayOf(at: number): string {
  return new Date(at + 9 * 3600_000).toISOString().slice(0, 10);
}

function log(s: State, id: string, at: number): TalkLog {
  return s.talks[id] ?? { first: at, last: at, step: "listen", rounds: [], roles: [] };
}

function withLog(s: State, id: string, at: number, change: (l: TalkLog) => TalkLog): State {
  return { ...s, current: id, talks: { ...s.talks, [id]: { ...change(log(s, id, at)), last: at } } };
}

/** Adds an event for each chunk, at most one of a kind per talk per day. */
function addEvents(s: State, chunks: string[], kind: EventKind, talk: string, at: number): State {
  const next = { ...s.chunks };
  for (const c of chunks) {
    const events = next[c] ?? [];
    if (events.some((e) => e.kind === kind && e.talk === talk && dayOf(e.at) === dayOf(at))) continue;
    next[c] = [...events, { at, kind, talk }];
  }
  return { ...s, chunks: next };
}

export function setCurrent(s: State, id: string | null): State {
  return { ...s, current: id };
}

export function setStep(s: State, id: string, step: StepId, at = Date.now()): State {
  return withLog(s, id, at, (l) => ({ ...l, step }));
}

/** 聞く: the talk was heard through, so its chunks were met. */
export function listened(s: State, id: string, at = Date.now()): State {
  const talk = talkById(id);
  const next = withLog(s, id, at, (l) => ({ ...l, listened: l.listened ?? at }));
  return talk ? addEvents(next, chunksOf(talk), "met", id, at) : next;
}

export function addRound(s: State, id: string, round: Round): State {
  const talk = talkById(id);
  const next = withLog(s, id, round.at, (l) => ({ ...l, rounds: [...l.rounds, round] }));
  return talk && !round.quiet ? addEvents(next, chunksOf(talk), "shadowed", id, round.at) : next;
}

/** The chunks of the learner's lines whose words were all heard count as said in the role. */
export function addRole(s: State, id: string, role: RoleTry, saidChunks: string[]): State {
  const next = withLog(s, id, role.at, (l) => ({ ...l, roles: [...l.roles, role] }));
  return addEvents(next, saidChunks, "role", id, role.at);
}

export function addReply(s: State, reply: Reply): State {
  let next = withLog(s, reply.talk, reply.at, (l) => l);
  next = { ...next, replies: [...next.replies, reply] };
  next = addEvents(next, reply.own, "own", reply.talk, reply.at);
  return addEvents(next, reply.ai, "ai", reply.talk, reply.at);
}

/** 返す is over: the talk is done, and 追いかける brings the next one. */
export function finish(s: State, id: string, at = Date.now()): State {
  const next = withLog(s, id, at, (l) => ({ ...l, done: l.done ?? at }));
  return { ...next, current: null };
}

/** The talk for 追いかける: the one under way, else the first not done yet (they come easy first), else the one left
 * longest ago. */
export function pickNext(s: State): string {
  if (s.current && talkById(s.current)) return s.current;
  const open = TALKS.find((t) => !s.talks[t.id]?.done);
  if (open) return open.id;
  return [...TALKS].sort((a, b) => (s.talks[a.id]?.last ?? 0) - (s.talks[b.id]?.last ?? 0))[0].id;
}

/** Violet: the chunk was met in another talk before this moment. */
export function metBefore(s: State, chunk: string, talk: string, since: number): boolean {
  return (s.chunks[chunk] ?? []).some((e) => e.talk !== talk && e.at < since);
}

export type Level = "own" | "role" | "shadowed" | "met";
const ORDER: Level[] = ["own", "role", "shadowed", "met"];

/** How far a chunk has come: used in one's own reply, said in a role, followed, or only met. */
export function levelOf(s: State, chunk: string): Level | null {
  const kinds = new Set((s.chunks[chunk] ?? []).map((e) => e.kind));
  return ORDER.find((k) => kinds.has(k)) ?? null;
}

/** The judged rounds of a talk (not the ones followed without a voice). */
export function judged(l: TalkLog | undefined): Round[] {
  return (l?.rounds ?? []).filter((r) => !r.quiet);
}

/** The times through the whole talk (with a voice or without), not single lines followed again. */
export function fullRounds(l: TalkLog | undefined): Round[] {
  return (l?.rounds ?? []).filter((r) => !r.only);
}

/** For each line, the words not heard the last time it was judged (undefined: never judged). */
export function lastMissed(l: TalkLog | undefined): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const r of judged(l)) for (const [line, missed] of Object.entries(r.missed)) out[line] = missed;
  return out;
}

/** できたこと: a line with words not heard on one day, all heard on a later day. The first such day per line. */
export function caughtLines(s: State): { talk: string; line: string; at: number }[] {
  const out: { talk: string; line: string; at: number }[] = [];
  for (const [talk, l] of Object.entries(s.talks)) {
    const rounds = judged(l);
    const lines = new Set(rounds.flatMap((r) => Object.keys(r.missed)));
    for (const line of lines) {
      const firstMiss = rounds.find((r) => (r.missed[line]?.length ?? 0) > 0);
      if (!firstMiss) continue;
      const caught = rounds.find((r) => r.at > firstMiss.at && dayOf(r.at) !== dayOf(firstMiss.at) && r.missed[line]?.length === 0);
      if (caught) out.push({ talk, line, at: caught.at });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** できたこと: a chunk used in one's own reply after it had only come with help (the correction put it in). */
export function grownChunks(s: State): { chunk: string; at: number }[] {
  const out: { chunk: string; at: number }[] = [];
  for (const [chunk, events] of Object.entries(s.chunks)) {
    const helped = events.find((e) => e.kind === "ai");
    const own = helped && events.find((e) => e.kind === "own" && e.at > helped.at);
    if (own) out.push({ chunk, at: own.at });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** The days with anything in the record, newest first, with what happened. */
export function daysOf(s: State): { day: string; talks: string[]; rounds: number; replies: number }[] {
  const days = new Map<string, { talks: Set<string>; rounds: number; replies: number }>();
  const get = (day: string) => days.get(day) ?? days.set(day, { talks: new Set(), rounds: 0, replies: 0 }).get(day)!;
  for (const [talk, l] of Object.entries(s.talks)) {
    for (const r of l.rounds) {
      const d = get(dayOf(r.at));
      d.talks.add(talk);
      d.rounds++;
    }
    if (l.listened) get(dayOf(l.listened)).talks.add(talk);
  }
  for (const r of s.replies) get(dayOf(r.at)).replies++;
  return [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([day, d]) => ({ day, talks: [...d.talks], rounds: d.rounds, replies: d.replies }));
}
