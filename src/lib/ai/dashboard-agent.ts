import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiTexts } from "@/db/schema";
import { AiUnavailableError, CLAUDE_MODEL } from "./claude";
import { fromClaudeResponse, toClaudeRequest, type Turn, type TurnResult } from "./dashboard-turn";

// One turn of the dashboard assistant (AG Studio's Agent Framework). Studio
// runs the agent loop in the browser and executes the dashboard tools there;
// each turn it needs one answer from a model, which comes through here so the
// API key stays on the server. A turn is: the conversation so far, the agent's
// instructions and its tool schemas in; text and/or tool calls out.
//
// Kept cheap, like every other Claude call in Bono:
// - Claude Haiku 5.5, no thinking, a capped max_tokens;
// - identical turns are answered from the database (ai_texts), so replaying a
//   suggested prompt over the same data costs nothing the second time;
// - prompt caching on the tool schemas + instructions, which repeat every turn;
// - a daily turn limit per account and for the whole site.

export const DAILY_TURNS_PER_ACCOUNT = 80;
const DAILY_TURNS_SITE = 1500;

/** The limit was reached; the browser shows the message as the assistant's reply. */
export class TurnLimitError extends Error {}

const globalForAgent = globalThis as unknown as { anthropic?: Anthropic; notStrict?: Set<string> };
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError("ANTHROPIC_API_KEY is not set");
  globalForAgent.anthropic ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return globalForAgent.anthropic;
}

/**
 * Sends the request with strict tool use, so Claude's arguments always match
 * Studio's schemas (without it, Haiku sometimes flattens nested arguments and
 * Studio rejects the call). A few Studio schemas use features strict mode
 * doesn't support (recursive definitions, minItems above 1): the API says which
 * tool, rejects the request unbilled, and that tool is sent non-strict from then on.
 */
async function createStrict(request: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
  const notStrict = (globalForAgent.notStrict ??= new Set());
  for (let attempt = 0; ; attempt++) {
    // toClaudeRequest only ever builds custom tools.
    const tools = (request.tools as Anthropic.Tool[] | undefined)?.map((t) => ({ ...t, strict: !notStrict.has(t.name) }));
    try {
      return await client().messages.create({ ...request, ...(tools ? { tools } : {}) });
    } catch (error) {
      const index = error instanceof Anthropic.BadRequestError ? /tools\.(\d+)\.custom/.exec(error.message)?.[1] : undefined;
      const name = index !== undefined ? tools?.[Number(index)]?.name : undefined;
      if (!name || notStrict.has(name) || attempt >= (tools?.length ?? 0)) throw error;
      notStrict.add(name);
    }
  }
}

/** Answers one turn, from the cache when this exact turn was answered before. */
export async function runTurn(turn: Turn, userId: string): Promise<TurnResult> {
  const request = toClaudeRequest(turn, CLAUDE_MODEL);
  const hash = createHash("sha256").update(JSON.stringify(["dashboard", request])).digest("hex");
  const cached = await db.query.aiTexts.findFirst({ where: eq(aiTexts.inputHash, hash), columns: { output: true } });
  if (cached) return JSON.parse(cached.output) as TurnResult;

  const since = sql`now() - interval '1 day'`;
  const [[mine], [site]] = await Promise.all([
    db.select({ n: count() }).from(aiTexts).where(and(eq(aiTexts.kind, "dashboard"), eq(aiTexts.userId, userId), gt(aiTexts.createdAt, since))),
    db.select({ n: count() }).from(aiTexts).where(and(eq(aiTexts.kind, "dashboard"), gt(aiTexts.createdAt, since))),
  ]);
  if (mine.n >= DAILY_TURNS_PER_ACCOUNT || site.n >= DAILY_TURNS_SITE) throw new TurnLimitError();

  let message: Anthropic.Message;
  try {
    message = await createStrict(request);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 402 || error.type === "billing_error") {
        console.error("Anthropic API: out of credit (billing_error). The dashboard assistant is off until it's topped up.");
      } else {
        console.error(`Anthropic API error ${error.status ?? ""} ${error.type ?? ""} request_id=${error.requestID ?? "?"}: ${error.message.slice(0, 500)}`);
      }
      throw new AiUnavailableError("Claude request failed", { cause: error });
    }
    throw error;
  }
  if (message.stop_reason === "refusal") throw new AiUnavailableError("Claude declined the request");

  const result = fromClaudeResponse(message);
  await db
    .insert(aiTexts)
    .values({
      inputHash: hash,
      kind: "dashboard",
      model: CLAUDE_MODEL,
      output: JSON.stringify(result),
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      userId,
    })
    .onConflictDoNothing();
  return result;
}
