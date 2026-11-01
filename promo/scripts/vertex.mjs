// Vertex AI（Gemini）の入口。ナレーション（voice.mjs）と、追いかける学習者の代わりの声（follow.mjs）が使う。
// 鍵：GOOGLE_SERVICE_ACCOUNT_KEY（base64 の JSON）・GOOGLE_CLOUD_PROJECT・GOOGLE_CLOUD_LOCATION（アプリの .env.local、
// ことのあめ と同じサービスアカウント）。鍵はこのリポジトリに置かない。鍵の値はどこにも出さない。
import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

/** .env の中身（値は引用符付きのことがある。付けたまま使うと弾かれる）。 */
export function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/** `path` の .env か、無ければ process.env（node --env-file で読んだもの）から。 */
export function credentials(path) {
  if (path && !existsSync(path)) throw new Error(`${path} が無い`);
  const env = path ? readEnv(path) : process.env;
  const raw = env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw || !env.GOOGLE_CLOUD_PROJECT) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY か GOOGLE_CLOUD_PROJECT が無い");
  let account;
  try {
    account = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    account = JSON.parse(raw.replace(/\\n/g, "\n"));
  }
  return { account, project: env.GOOGLE_CLOUD_PROJECT, location: env.GOOGLE_CLOUD_LOCATION || "us-central1" };
}

const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** サービスアカウントの鍵で署名した JWT を、アクセストークンに替える。 */
export async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: account.token_uri, iat: now, exp: now + 3600 }),
  );
  const sign = createSign("RSA-SHA256");
  sign.update(`${head}.${claim}`);
  const jwt = `${head}.${claim}.${b64url(sign.sign(account.private_key))}`;
  const res = await fetch(account.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`token HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()).access_token;
}

export async function generate(cred, token, model, body) {
  const host = cred.location === "global" ? "aiplatform.googleapis.com" : `${cred.location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1beta1/projects/${cred.project}/locations/${cred.location}/publishers/google/models/${model}:generateContent`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** 声の生の PCM（16bit・モノ）とそのレート。レートは mimeType から読む（audio/L16;codec=pcm;rate=24000）。 */
export function audioOf(j) {
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("audio"));
  if (!part) throw new Error(`音声が返らなかった: ${JSON.stringify(j).slice(0, 160)}`);
  const rate = Number(part.inlineData.mimeType.match(/rate=(\d+)/i)?.[1]) || 24000;
  const bytes = Buffer.from(part.inlineData.data, "base64");
  return { rate, pcm: new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + (bytes.byteLength & ~1))) };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 混んでいる・落ちた・声が返らなかった、は待って試し直す（4回まで、待ちは倍に）。 */
export async function retry(fn, label, delay = 1500) {
  for (let a = 0; ; a++) {
    try {
      return await fn();
    } catch (e) {
      const m = String(e.message || e);
      if (a < 4 && /HTTP (429|500|502|503|504)|RESOURCE_EXHAUSTED|fetch failed|ECONNRESET|ETIMEDOUT|音声が返らなかった/.test(m)) {
        const back = delay * 2 ** a;
        console.log(`    再試行 ${a + 1}/4（${back / 1000}秒待つ）${label}: ${m.slice(0, 90)}`);
        await sleep(back);
        continue;
      }
      throw e;
    }
  }
}
