import assert from "node:assert/strict";
import test from "node:test";
import { TALKS } from "../src/content/index.ts";
import { addReply, addRound, caughtLines, emptyState, finish, grownChunks, levelOf, listened, metBefore, pickNext } from "../src/lib/record.ts";

const DAY = 24 * 3600_000;
const T0 = Date.UTC(2026, 9, 28, 3);

test("the first talk comes first, the next once it is done, and a talk under way stays", () => {
  let s = emptyState();
  assert.equal(pickNext(s), TALKS[0].id);
  s = listened(s, TALKS[0].id, T0);
  assert.equal(pickNext(s), TALKS[0].id);
  s = finish(s, TALKS[0].id, T0 + 1000);
  assert.equal(s.current, null);
  assert.equal(pickNext(s), TALKS[1].id);
});

test("violet only for a chunk met in another talk, before now", () => {
  let s = listened(emptyState(), "weekend", T0);
  assert.equal(metBefore(s, "kind-of", "kyoto", T0 + 1), true);
  assert.equal(metBefore(s, "kind-of", "weekend", T0 + 1), false);
  assert.equal(metBefore(s, "kind-of", "kyoto", T0 - 1), false);
});

test("a line not caught one day and caught on a later day is できたこと; the same day is not", () => {
  let s = emptyState();
  s = addRound(s, "ramen", { at: T0, speed: "1", missed: { "ramen.4": [1, 2] } });
  s = addRound(s, "ramen", { at: T0 + 60_000, speed: "1", missed: { "ramen.4": [] } });
  assert.deepEqual(caughtLines(s), []);
  s = addRound(s, "ramen", { at: T0 + 2 * DAY, speed: "1", missed: { "ramen.4": [] } });
  assert.deepEqual(caughtLines(s), [{ talk: "ramen", line: "ramen.4", at: T0 + 2 * DAY }]);
});

test("rounds followed without a voice judge nothing", () => {
  let s = addRound(emptyState(), "ramen", { at: T0, speed: "1", quiet: true, missed: {} });
  assert.equal(levelOf(s, "no-rush"), null);
  s = addRound(s, "ramen", { at: T0 + 1, speed: "1", missed: {} });
  assert.equal(levelOf(s, "no-rush"), "shadowed");
});

test("a chunk the correction put in, used later on one's own, has grown", () => {
  let s = emptyState();
  s = addReply(s, { at: T0, talk: "ramen", said: "I have バイト", fixed: "I've got to work.", natural: false, reply: "", own: [], ai: ["ive-got-to"] });
  // Put in by the correction only: not the learner's yet.
  assert.equal(levelOf(s, "ive-got-to"), null);
  assert.deepEqual(grownChunks(s), []);
  s = addReply(s, { at: T0 + DAY, talk: "cold", said: "I've got to go", fixed: "I've got to go.", natural: true, reply: "", own: ["ive-got-to"], ai: [] });
  assert.deepEqual(grownChunks(s), [{ chunk: "ive-got-to", at: T0 + DAY }]);
  assert.equal(levelOf(s, "ive-got-to"), "own");
});
