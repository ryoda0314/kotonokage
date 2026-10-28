import { talkById } from "@/content/index.ts";
import { takeTurn, type TurnRequest } from "@/lib/ai";
import { addressOf, allow } from "@/lib/limits";

// 返す（自分で）: one answer of the learner's, corrected and answered by the friend (src/lib/ai.ts).
//   POST { talk, history, input }  →  TurnResult

const MAX_INPUT = 400;
const MAX_TURN = 600;

function parse(body: unknown): TurnRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const talk = typeof b.talk === "string" ? b.talk : "";
  const input = typeof b.input === "string" ? b.input.trim() : "";
  if (!talkById(talk) || !input || input.length > MAX_INPUT) return null;
  const history = Array.isArray(b.history)
    ? b.history
        .filter((h): h is { who: "me" | "them"; text: string } => {
          const x = h as Record<string, unknown>;
          return (x?.who === "me" || x?.who === "them") && typeof x.text === "string" && x.text.length <= MAX_TURN;
        })
        .slice(-10)
    : [];
  return { talk, history, input };
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "unavailable" }, { status: 503 });
  const req = parse(await request.json().catch(() => null));
  if (!req) return Response.json({ error: "bad request" }, { status: 400 });
  if (!allow("turn", addressOf(request))) return Response.json({ error: "too many" }, { status: 429 });
  try {
    return Response.json(await takeTurn(req));
  } catch (err) {
    console.error("[turn]", err instanceof Error ? err.message : err);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
