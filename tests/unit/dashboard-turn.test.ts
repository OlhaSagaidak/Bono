import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { fromClaudeResponse, toClaudeRequest, turnSchema } from "@/lib/ai/dashboard-turn";

const message = (role: "user" | "assistant" | "system", text: string) => ({ type: "message", role, content: [{ type: "text", text }] });
const call = (callId: string, name: string, args: object) => ({ type: "function_call", callId, name, arguments: JSON.stringify(args) });
const output = (callId: string, text: string) => ({ type: "function_call_output", callId, output: text, status: "completed" });
const request = (input: unknown[], extra: object = {}) => toClaudeRequest(turnSchema.parse({ input, ...extra }), "claude-haiku-5-5");

describe("dashboard assistant turns", () => {
  it("pairs each tool call with its result in the next user turn", () => {
    const { messages } = request([message("user", "Top donors?"), call("c1", "execute_query", { q: 1 }), output("c1", "3 rows")]);
    assert.deepEqual(
      messages.map((m) => m.role),
      ["user", "assistant", "user"],
    );
    assert.deepEqual(messages[1].content, [{ type: "tool_use", id: "c1", name: "execute_query", input: { q: 1 } }]);
    assert.deepEqual(messages[2].content, [{ type: "tool_result", tool_use_id: "c1", content: "3 rows" }]);
  });

  it("answers a tool call that has no result, so the request is still valid", () => {
    const { messages } = request([message("user", "Add a chart"), call("c1", "delegate_to", {}), message("assistant", "Done.")]);
    assert.deepEqual(messages[2].content, [{ type: "tool_result", tool_use_id: "c1", content: "(No result was recorded.)" }]);
  });

  it("always ends on a user turn and starts on one (Claude takes no prefill)", () => {
    const { messages } = request([message("assistant", "I'll look."), call("c1", "view_schema", {}), output("c1", "ok"), message("assistant", "Here it is.")]);
    assert.equal(messages[0].role, "user");
    assert.equal(messages.at(-1)!.role, "user");
  });

  it("moves system messages into the system prompt, after Bono's own context", () => {
    const { system, messages } = request([message("system", "Page is overview."), message("user", "Hi")], { instructions: "Be brief." });
    assert.match(String(system), /^You are the analytics assistant inside Bono/);
    assert.match(String(system), /Be brief\.\n\nPage is overview\.$/);
    assert.equal(messages.length, 1);
  });

  it("maps tool choice, and leaves it out when there are no tools", () => {
    const tools = [{ name: "view_page", description: "d", parameters: { properties: {} } }];
    assert.deepEqual(request([message("user", "x")], { tools, toolChoice: "required" }).tool_choice, { type: "any" });
    assert.deepEqual(request([message("user", "x")], { tools, toolChoice: { name: "view_page" } }).tool_choice, { type: "tool", name: "view_page" });
    assert.equal(request([message("user", "x")], { toolChoice: "required" }).tool_choice, undefined);
    assert.equal((request([message("user", "x")], { tools }).tools?.[0] as Anthropic.Tool).name, "view_page");
  });

  it("turns Claude's reply into Studio output items", () => {
    const reply = {
      id: "msg_1",
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "Checking." },
        { type: "tool_use", id: "t1", name: "execute_query", input: { fields: ["donations.donor"] } },
      ],
      usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 900 },
    } as unknown as Anthropic.Message;
    assert.deepEqual(fromClaudeResponse(reply), {
      output: [
        { type: "message", id: "msg_1-0", text: "Checking." },
        { type: "function_call", id: "msg_1-1", callId: "t1", name: "execute_query", arguments: '{"fields":["donations.donor"]}' },
      ],
      incomplete: false,
      usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: 900 },
    });
  });

  it("rejects oversized or malformed turns", () => {
    assert.equal(turnSchema.safeParse({ input: Array(301).fill(message("user", "x")) }).success, false);
    assert.equal(turnSchema.safeParse({ input: [{ type: "message", role: "hacker", content: [] }] }).success, false);
  });
});
