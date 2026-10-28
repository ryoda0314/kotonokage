import "server-only";
import OpenAI from "openai";
import { sign } from "./sign.ts";
import { cleanTurn, TURN_SCHEMA, turnPrompt, type RawTurn, type TurnRequest, type TurnResult } from "./turn-core.ts";

export type { TurnRequest, TurnResult };

// The app's AI for 返す（自分で）: once per answer of the learner's (corrected, and answered by the friend), as
// ことのは's /api/turn. What it asks and how the answers are checked: turn-core.ts.

// gpt-5.5 at low effort, as ことのは: on ことのは's own examples it kept the learner's meaning where smaller models and no
// reasoning changed it. TALK_MODEL and TALK_EFFORT change it.
export const TALK_MODEL = process.env.TALK_MODEL || "gpt-5.5";
const TALK_EFFORT = (process.env.TALK_EFFORT as "low" | "medium" | "high" | undefined) || "low";

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

export async function takeTurn(req: TurnRequest): Promise<TurnResult> {
  const { system, user } = turnPrompt(req);
  const completion = await openai().chat.completions.create({
    model: TALK_MODEL,
    reasoning_effort: TALK_EFFORT,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: { name: "turn", strict: true, schema: TURN_SCHEMA as unknown as Record<string, unknown> } },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("empty turn response");
  return cleanTurn(JSON.parse(content) as RawTurn, req, sign);
}
