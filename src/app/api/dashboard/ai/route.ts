import { auth } from "@/auth";
import { AiUnavailableError } from "@/lib/ai/claude";
import { DAILY_TURNS_PER_ACCOUNT, runTurn, TurnLimitError } from "@/lib/ai/dashboard-agent";
import { turnSchema } from "@/lib/ai/dashboard-turn";

// One turn of the dashboard assistant (lib/ai/dashboard-agent.ts), for the
// AG Studio adapter in components/dashboard/claude-adapter.ts. Only nonprofits
// and sponsors have dashboards, so only they may use it.

const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });
  if (session.user.role !== "nonprofit" && session.user.role !== "sponsor") return new Response(null, { status: 403 });

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return Response.json({ error: "This conversation is too long. Start a new one." }, { status: 413 });
  const parsed = turnSchema.safeParse(safeJson(body));
  if (!parsed.success) return new Response(null, { status: 400 });

  try {
    return Response.json(await runTurn(parsed.data, session.user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TurnLimitError) {
      return Response.json(
        { error: `The assistant has answered its ${DAILY_TURNS_PER_ACCOUNT} steps for today. You can still build the dashboard by hand, and it's back tomorrow.` },
        { status: 429 },
      );
    }
    if (error instanceof AiUnavailableError) {
      return Response.json({ error: "The assistant isn't available right now. Try again in a little while." }, { status: 503 });
    }
    // Anything else is a bug: log it in full, and tell the person what kind so it can be reported.
    console.error("Dashboard assistant failed:", error);
    const reason = error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : String(error).slice(0, 200);
    return Response.json({ error: `The assistant hit an error (${reason}). Please try again.` }, { status: 500 });
  }
}

function safeJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
