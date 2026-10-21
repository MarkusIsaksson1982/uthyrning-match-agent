import test from "node:test";
import assert from "node:assert/strict";

import {
  INVALID_PARAMS,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  PARSE_ERROR,
  TOOLS,
  callTool,
  handleMessage,
  processRequest,
  toolCheckEligibility,
  toolDraftReply,
  toolMatchApplicant,
  toolRankList,
} from "../src/mcp/handlers.js";
import type {
  JsonRpcErrorResponse,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  RankListOutput,
  ToolDefinition,
} from "../src/mcp/handlers.js";

function asSuccess(response: JsonRpcResponse): JsonRpcSuccessResponse {
  assert.ok(
    "result" in response,
    `expected success, got ${JSON.stringify(response)}`,
  );
  return response as JsonRpcSuccessResponse;
}

function asError(response: JsonRpcResponse): JsonRpcErrorResponse {
  assert.ok("error" in response, `expected error, got ${JSON.stringify(response)}`);
  return response as JsonRpcErrorResponse;
}

test("tools/list returns all four tools with input descriptions", () => {
  const result = asSuccess(processRequest("tools/list", undefined)).result as {
    tools: ToolDefinition[];
  };

  assert.equal(result.tools.length, 4);
  const names = result.tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "check_eligibility",
    "draft_reply",
    "match_applicant",
    "rank_list",
  ]);

  for (const tool of result.tools) {
    assert.ok(tool.description.length > 0, `missing description for ${tool.name}`);
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.inputSchema.required.length > 0);
    for (const key of tool.inputSchema.required) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, key),
        `${tool.name} requires undocumented field ${key}`,
      );
    }
    for (const property of Object.values(tool.inputSchema.properties)) {
      assert.ok(property.description.length > 0);
    }
  }

  assert.equal(TOOLS.length, 4);
});

test("the match_applicant handler returns a MatchResult directly", () => {
  const output = toolMatchApplicant({
    listingId: "L-1001",
    applicantId: "A-2001",
  });
  assert.equal(output.result.listingId, "L-1001");
  assert.equal(output.result.applicantId, "A-2001");
  assert.equal(output.result.eligible, true);
  assert.ok(output.result.score >= 0 && output.result.score <= 100);
});

test("check_eligibility reports blockers for a too-large household", () => {
  const output = toolCheckEligibility({
    listingId: "L-1001",
    applicantId: "A-2003",
  });
  assert.equal(output.eligible, false);
  assert.ok(output.blockersSv.length > 0);
  assert.ok(output.blockersSv.some((line) => line.includes("personer")));
});

test("draft_reply returns an unsent draft requiring sign-off", () => {
  const output = toolDraftReply({
    listingId: "L-1001",
    applicantId: "A-2001",
    kind: "invite",
  });
  assert.equal(output.requiresSignOff, true);
  assert.ok(output.draftSv.length > 0);
  assert.ok(output.disclaimerSv.includes("osänt"));
});

test("rank_list orders applicants by descending score", () => {
  const output = toolRankList({ listingId: "L-1001" });
  assert.equal(output.order, "score_desc");
  assert.ok(output.ranked.length > 0);
  for (let index = 1; index < output.ranked.length; index += 1) {
    const previous = output.ranked[index - 1]!;
    const current = output.ranked[index]!;
    assert.ok(previous.score >= current.score);
  }
});

test("tools/call dispatches to the same logic as the direct handlers", () => {
  const cases: Array<{ name: string; args: Record<string, unknown> }> = [
    {
      name: "match_applicant",
      args: { listingId: "L-1001", applicantId: "A-2001" },
    },
    {
      name: "check_eligibility",
      args: { listingId: "L-1002", applicantId: "A-2002" },
    },
    {
      name: "draft_reply",
      args: { listingId: "L-1001", applicantId: "A-2001", kind: "reject" },
    },
    { name: "rank_list", args: { listingId: "L-1003" } },
  ];

  for (const entry of cases) {
    const direct = callTool(entry.name, entry.args);
    const viaRequest = asSuccess(
      processRequest("tools/call", {
        name: entry.name,
        arguments: entry.args,
      }),
    ).result;
    assert.deepEqual(viaRequest, direct, `mismatch for ${entry.name}`);
  }
});

test("the envelope echoes the id and the JSON-RPC version", () => {
  const response = asSuccess(
    handleMessage(
      JSON.stringify({ jsonrpc: "2.0", id: 42, method: "tools/list" }),
    ),
  );
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 42);
  const listResult = response.result as RankListOutput | { tools: unknown[] };
  assert.ok(Array.isArray((listResult as { tools: unknown[] }).tools));
});

test("string and null ids are echoed unchanged", () => {
  const stringId = asSuccess(
    handleMessage(
      JSON.stringify({ jsonrpc: "2.0", id: "abc", method: "tools/list" }),
    ),
  );
  assert.equal(stringId.id, "abc");

  const nullId = asSuccess(
    handleMessage(
      JSON.stringify({ jsonrpc: "2.0", id: null, method: "tools/list" }),
    ),
  );
  assert.equal(nullId.id, null);
});

test("a malformed payload returns a parse error", () => {
  const response = asError(handleMessage("{ not json"));
  assert.equal(response.error.code, PARSE_ERROR);
  assert.equal(response.error.code, -32700);
  assert.equal(response.id, null);
});

test("a non-request payload returns an invalid request error", () => {
  const missingMethod = asError(
    handleMessage(JSON.stringify({ jsonrpc: "2.0", id: 7 })),
  );
  assert.equal(missingMethod.error.code, INVALID_REQUEST);
  assert.equal(missingMethod.error.code, -32600);
  assert.equal(missingMethod.id, 7);

  const notAnObject = asError(handleMessage("42"));
  assert.equal(notAnObject.error.code, INVALID_REQUEST);
  assert.equal(notAnObject.id, null);

  const arrayPayload = asError(handleMessage("[]"));
  assert.equal(arrayPayload.error.code, INVALID_REQUEST);
});

test("an unknown method returns method not found", () => {
  const response = asError(
    handleMessage(
      JSON.stringify({ jsonrpc: "2.0", id: 8, method: "tools/nope" }),
    ),
  );
  assert.equal(response.error.code, METHOD_NOT_FOUND);
  assert.equal(response.error.code, -32601);
  assert.equal(response.id, 8);
});

test("an unknown tool returns method not found", () => {
  const response = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: { name: "nope", arguments: {} },
      }),
    ),
  );
  assert.equal(response.error.code, METHOD_NOT_FOUND);
});

test("an unknown listing id returns an invalid params error", () => {
  const response = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: {
          name: "match_applicant",
          arguments: { listingId: "L-9999", applicantId: "A-2001" },
        },
      }),
    ),
  );
  assert.equal(response.error.code, INVALID_PARAMS);
  assert.equal(response.error.code, -32602);
  assert.equal(response.id, 9);
});

test("an unknown applicant id returns an invalid params error", () => {
  const response = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "check_eligibility",
          arguments: { listingId: "L-1001", applicantId: "A-9999" },
        },
      }),
    ),
  );
  assert.equal(response.error.code, INVALID_PARAMS);
});

test("unknown ids in draft_reply surface the typed DraftError as a param error", () => {
  const unknownApplicant = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 11,
        method: "tools/call",
        params: {
          name: "draft_reply",
          arguments: { listingId: "L-1001", applicantId: "A-9999", kind: "invite" },
        },
      }),
    ),
  );
  assert.equal(unknownApplicant.error.code, INVALID_PARAMS);
  assert.ok(unknownApplicant.error.message.includes("Okänd"));

  const unknownListing = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
          name: "draft_reply",
          arguments: { listingId: "L-9999", applicantId: "A-2001", kind: "reject" },
        },
      }),
    ),
  );
  assert.equal(unknownListing.error.code, INVALID_PARAMS);
});

test("an unknown draft kind returns an invalid params error", () => {
  const response = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 13,
        method: "tools/call",
        params: {
          name: "draft_reply",
          arguments: { listingId: "L-1001", applicantId: "A-2001", kind: "spam" },
        },
      }),
    ),
  );
  assert.equal(response.error.code, INVALID_PARAMS);
});

test("missing required parameters return an invalid params error", () => {
  const response = asError(
    handleMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 14,
        method: "tools/call",
        params: {
          name: "match_applicant",
          arguments: { listingId: "L-1001" },
        },
      }),
    ),
  );
  assert.equal(response.error.code, INVALID_PARAMS);
});
