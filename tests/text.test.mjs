import assert from "node:assert/strict";
import test from "node:test";
import { alignTimes, coverage, heardWords, keysOf, sentencesOf, wordsOf } from "../src/lib/text.ts";

test("contractions and casual spellings meet their full forms", () => {
  assert.deepEqual(keysOf("I've"), ["i", "have"]);
  assert.deepEqual(keysOf("wanna"), ["want", "to"]);
  assert.deepEqual(keysOf("Gotta"), ["got", "to"]);
  assert.deepEqual(keysOf("don't"), ["do", "not"]);
  assert.deepEqual(keysOf("can't"), ["can", "not"]);
  assert.deepEqual(keysOf("It's"), ["it", "is"]);
  assert.deepEqual(keysOf("Tanaka's"), ["tanaka"]);
  assert.deepEqual(keysOf("'em"), ["them"]);
  assert.deepEqual(keysOf("weekend?"), ["weekend"]);
  assert.deepEqual(keysOf("check..."), ["check"]);
  assert.deepEqual(keysOf("…"), []);
});

test("numbers and times are words", () => {
  assert.deepEqual(keysOf("10"), ["ten"]);
  assert.deepEqual(keysOf("1:30"), ["one", "thirty"]);
  assert.deepEqual(keysOf("2"), ["two"]);
  assert.deepEqual(keysOf("Mt."), ["mount"]);
});

test("a learner a beat behind still lines up, and what they dropped stays missed", () => {
  const script = wordsOf("Ooh, I've been meaning to try it. Can we go a bit later, though?");
  const heard = heardWords(script, "I been to try it can we go a bit later though");
  const missed = script.filter((_, i) => !heard[i]).map((w) => w.text);
  assert.deepEqual(missed, ["Ooh,", "I've", "meaning"]);
});

test("casual spellings in what was heard count for the full words", () => {
  const script = wordsOf("Want to check out that new ramen place by the station?");
  assert.ok(heardWords(script, "Wanna check out that new ramen place by the station").every(Boolean));
});

test("Japanese in what was heard leaves the English words missed, not the run broken", () => {
  const script = wordsOf("I have work today. How about Saturday?");
  const heard = heardWords(script, "I have バイト today. How about Saturday?");
  assert.deepEqual(
    script.filter((_, i) => !heard[i]).map((w) => w.text),
    ["work"],
  );
});

test("coverage of a clip's transcript against its line", () => {
  assert.equal(coverage("Want to see?", "Wanna see?"), 1);
  assert.ok(coverage("I'm making a little app.", "I'm making a little cap.") < 1);
});

test("word times follow the shown words, with gaps filled from neighbours", () => {
  const script = wordsOf("Want to see?");
  const times = alignTimes(script, [
    { word: "Wanna", start: 0.1, end: 0.4 },
    { word: "see", start: 0.45, end: 0.8 },
  ]);
  assert.deepEqual(times, [
    [0.1, 0.4],
    [0.1, 0.4],
    [0.45, 0.8],
  ]);
});

test("a reply in sentences, short ones joined", () => {
  assert.deepEqual(sentencesOf("Oh nice! Saturday works for me. Lunch or dinner?"), ["Oh nice! Saturday works for me.", "Lunch or dinner?"]);
});
