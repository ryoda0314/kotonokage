import assert from "node:assert/strict";
import test from "node:test";
import { allClips, answerRoles, CHUNKS, chunksOf, findChunks, spokenText, TALKS, talksWithChunk } from "../src/content/index.ts";

test("ids are unique and lines are named after their talk", () => {
  const ids = TALKS.flatMap((t) => [t.id, ...t.lines.map((l) => l.id), ...t.answer.samples.map((s) => s.id)]);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of TALKS) for (const l of t.lines) assert.ok(l.id.startsWith(`${t.id}.`), l.id);
  assert.equal(new Set(CHUNKS.map((c) => c.id)).size, CHUNKS.length);
});

test("every talk is two people, short enough to follow five times", () => {
  for (const t of TALKS) {
    assert.equal(new Set(t.lines.map((l) => l.who)).size, 2, t.id);
    assert.ok(t.lines.length >= 4 && t.lines.length <= 8, t.id);
    const words = t.lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
    assert.ok(words <= 75, `${t.id}: ${words} words`);
  }
});

test("every mark and sound is in its line, and every chunk mark names a chunk", () => {
  const ids = new Set(CHUNKS.map((c) => c.id));
  for (const t of TALKS)
    for (const l of t.lines) {
      for (const m of l.marks ?? []) {
        assert.ok(ids.has(m.chunk), `${l.id}: ${m.chunk}`);
        assert.ok(l.text.includes(m.text), `${l.id}: "${m.text}"`);
      }
      for (const s of l.sounds ?? []) assert.ok(l.text.includes(s.text), `${l.id}: "${s.text}"`);
    }
});

test("chunks in a line never overlap (LineText lights each as one run of words)", () => {
  for (const t of TALKS)
    for (const l of t.lines) {
      const runs = (l.marks ?? []).map((m) => [l.text.indexOf(m.text), l.text.indexOf(m.text) + m.text.length]).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < runs.length; i++) assert.ok(runs[i][0] >= runs[i - 1][1], `${l.id}`);
    }
});

test("each mark is also found by its chunk's pattern, so the learner's own use is seen too", () => {
  for (const t of TALKS) for (const l of t.lines) for (const m of l.marks ?? []) assert.ok(findChunks(l.text).includes(m.chunk), `${l.id}: ${m.chunk}`);
});

test("every chunk comes back: it turns up in two talks or more", () => {
  for (const c of CHUNKS) assert.ok(talksWithChunk(c.id).length >= 2, c.id);
});

test("after the first talks (where everything is new), each brings at most four chunks new to it", () => {
  const seen = new Set();
  TALKS.forEach((t, i) => {
    const fresh = chunksOf(t).filter((c) => !seen.has(c));
    assert.ok(fresh.length <= (i < 4 ? 8 : 4), `${t.id}: ${fresh.length} new`);
    for (const c of chunksOf(t)) seen.add(c);
  });
});

test("the voice says the casual spellings, the subtitle keeps the written words", () => {
  const line = TALKS.find((t) => t.id === "ramen").lines[2];
  assert.equal(spokenText(line), "Wanna check out that new ramen place by the station?");
  assert.equal(line.text, "Want to check out that new ramen place by the station?");
});

test("返す answers someone's line in the talk, as the other person", () => {
  for (const t of TALKS) {
    const { them, me } = answerRoles(t);
    assert.ok(t.lines.some((l) => l.id === t.answer.line && l.who === them), t.id);
    assert.notEqual(them, me, t.id);
    assert.ok(t.answer.samples.length >= 2, t.id);
  }
});

test("every clip has text and a voice", () => {
  const clips = allClips();
  assert.equal(new Set(clips.map((c) => c.key)).size, clips.length);
  for (const c of clips) assert.ok(c.text && c.voice, c.key);
});
