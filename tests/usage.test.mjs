import assert from "node:assert/strict";
import { test } from "node:test";
import { countsHere } from "../src/lib/usage.ts";

// This app has no public address yet: a stand-in for one.
const SITE = "https://kotonokage.example.app";

test("counted at the public address in a production build", () => {
  assert.equal(countsHere("https://kotonokage.example.app", SITE, true), true);
  assert.equal(countsHere("https://kotonokage.example.app", `${SITE}/`, true), true);
  assert.equal(countsHere("https://kotonokage.example.app", `${SITE}/app`, true), true);
});

test("not counted while developing, on a preview, or anywhere else", () => {
  assert.equal(countsHere("https://kotonokage.example.app", SITE, false), false);
  assert.equal(countsHere("http://localhost:3240", SITE, true), false);
  assert.equal(countsHere("https://kotonokage-git-main-someone.vercel.app", SITE, true), false);
  assert.equal(countsHere("http://kotonokage.example.app", SITE, true), false);
});

test("nothing it cannot read is counted, and nothing without a public address", () => {
  assert.equal(countsHere("https://kotonokage.example.app", undefined, true), false);
  assert.equal(countsHere("https://kotonokage.example.app", "", true), false);
  assert.equal(countsHere("https://kotonokage.example.app", "not a url", true), false);
  assert.equal(countsHere("", SITE, true), false);
  assert.equal(countsHere("null", SITE, true), false);
});
