import assert from "node:assert/strict";
import { test } from "node:test";
import { countsHere, platformOf } from "../src/lib/usage.ts";

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

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  ipod: "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  chromebook: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
  ubuntu: "Mozilla/5.0 (Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

test("an iPhone, an iPad or an iPod is ios", () => {
  assert.equal(platformOf(UA.iphone, 5), "ios");
  assert.equal(platformOf(UA.ipad, 5), "ios");
  assert.equal(platformOf(UA.ipod, 5), "ios");
});

test("an iPad that says it is a Mac is ios; a Mac without touch is a pc", () => {
  assert.equal(platformOf(UA.mac, 5), "ios");
  assert.equal(platformOf(UA.mac, 0), "pc");
  assert.equal(platformOf(UA.mac, 1), "pc");
});

test("Android is android, though it says Linux too", () => {
  assert.equal(platformOf(UA.android, 5), "android");
  assert.equal(platformOf(UA.android, 0), "android");
});

test("Windows, a Chromebook and Linux are a pc", () => {
  assert.equal(platformOf(UA.windows, 0), "pc");
  assert.equal(platformOf(UA.windows, 10), "pc");
  assert.equal(platformOf(UA.chromebook, 0), "pc");
  assert.equal(platformOf(UA.linux, 0), "pc");
  assert.equal(platformOf(UA.ubuntu, 0), "pc");
});

test("anything else, or anything it cannot read, is other", () => {
  assert.equal(platformOf("Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko)", 0), "other");
  assert.equal(platformOf("curl/8.4.0", 0), "other");
  assert.equal(platformOf("", 0), "other");
  assert.equal(platformOf(undefined, 0), "other");
  assert.equal(platformOf(null, 5), "other");
  assert.equal(platformOf(42, 5), "other");
  assert.equal(platformOf(UA.mac, undefined), "pc");
  assert.equal(platformOf(UA.mac, Number.NaN), "pc");
});
