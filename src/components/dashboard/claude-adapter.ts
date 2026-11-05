import type { AgAiEvent, AgAiOutputItem, AgLlmAdapter, AgLlmRequest, AgLlmResponse } from "ag-studio";
import type { TurnResult } from "@/lib/ai/dashboard-turn";

// AG Studio's adapter contract (AgLlmAdapter): one turn in, a stream of content
// events and a final response out. The turn goes to Bono's own server
// (/api/dashboard/ai), which calls Claude, so no API key is ever in the page.
// Claude answers each turn whole, so the "stream" replays the finished answer.

export const claudeAdapter: AgLlmAdapter = {
  executeTurn(request: AgLlmRequest, options) {
    const complete = fetchTurn(request, options?.signal);
    return {
      complete,
      stream: {
        async *[Symbol.asyncIterator]() {
          const response = await complete;
          for (const item of response.output) {
            if (item.type === "message") {
              const text = item.content.map((c) => (c.type === "text" ? c.text : c.refusal)).join("");
              yield { type: "TEXT_MESSAGE_START", messageId: item.id, role: "assistant" } satisfies AgAiEvent;
              yield { type: "TEXT_MESSAGE_CONTENT", messageId: item.id, delta: text } satisfies AgAiEvent;
              yield { type: "TEXT_MESSAGE_END", messageId: item.id } satisfies AgAiEvent;
            } else if (item.type === "function_call") {
              yield { type: "TOOL_CALL_START", toolCallId: item.callId, toolCallName: item.name } satisfies AgAiEvent;
              yield { type: "TOOL_CALL_ARGS", toolCallId: item.callId, delta: item.arguments } satisfies AgAiEvent;
              yield { type: "TOOL_CALL_END", toolCallId: item.callId } satisfies AgAiEvent;
            }
          }
        },
      },
    };
  },
};

async function fetchTurn(request: AgLlmRequest, signal?: AbortSignal): Promise<AgLlmResponse> {
  const createdAt = Date.now();
  let res: Response;
  try {
    res = await fetch("/api/dashboard/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The model choice stays on the server: everything runs on Claude Haiku.
      body: JSON.stringify({ ...request, model: undefined }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) return { id: `cancelled-${createdAt}`, createdAt, output: [], status: "cancelled" };
    return failed(createdAt, "The assistant couldn't be reached. Check your connection and try again.", error);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    // A friendly reason (daily limit, assistant unavailable) is shown as the reply itself.
    if (body?.error) return reply(createdAt, body.error);
    return failed(createdAt, "The assistant ran into a problem. Try again.", res.status);
  }

  const result = (await res.json()) as TurnResult;
  const output: AgAiOutputItem[] = result.output.map((o) =>
    o.type === "message"
      ? { id: o.id, kind: "output", type: "message", role: "assistant", status: "completed", content: [{ type: "text", text: o.text, annotations: [] }] }
      : { id: o.id, kind: "output", type: "function_call", callId: o.callId, name: o.name, arguments: o.arguments, status: "completed" },
  );
  return {
    id: output[0]?.id ?? `turn-${createdAt}`,
    createdAt,
    output,
    status: result.incomplete ? "incomplete" : "completed",
    ...(result.incomplete ? { incompleteDetails: { reason: "max_output_tokens" as const } } : {}),
    usage: { ...result.usage, totalTokens: result.usage.inputTokens + result.usage.outputTokens },
    model: "claude-haiku-5-5",
  };
}

function reply(createdAt: number, text: string): AgLlmResponse {
  const id = `notice-${createdAt}`;
  return {
    id,
    createdAt,
    status: "completed",
    output: [{ id, kind: "output", type: "message", role: "assistant", status: "completed", content: [{ type: "text", text, annotations: [] }] }],
  };
}

function failed(createdAt: number, message: string, cause: unknown): AgLlmResponse {
  console.error("Dashboard assistant turn failed:", cause);
  return { id: `failed-${createdAt}`, createdAt, output: [], status: "failed", error: { code: "turn_failed", message } };
}
