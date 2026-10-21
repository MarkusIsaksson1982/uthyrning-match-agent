import test from "node:test";
import assert from "node:assert/strict";

import {
  INVALID_PARAMS,
  INVALID_REQUEST,
  JSONRPC_VERSION,
  METHOD_NOT_FOUND,
  PARSE_ERROR,
  PROTOCOL_VERSION,
  SERVER_NAME,
  SERVER_VERSION,
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
import { createLineHandler } from "../src/mcp/server.js";

function asSuccess(response: JsonRpcResponse): JsonRpcSuccessResponse {
  assert.ok(
    "result" in response,
    `expected success, got ${JSON.stringify(response)}`,
  );
  return response;
}

function asError(response: JsonRpcResponse): JsonRpcErrorResponse {
  assert.ok(
    "error" in response,
    `expected error, got ${JSON.stringify(response)}`,
  );
  return response;
}

test("scripted in-memory session: initialize, tools/list and tools/call through processRequest", () => {
  const initResponse = processRequest("initialize", {}, "init-1");
  assert.equal(initResponse.jsonrpc, JSONRPC_VERSION);
  assert.equal(initResponse.id, "init-1");
  const initResult = asSuccess(initResponse).result as {
    protocolVersion: string;
    serverInfo: { name: string; version: string };
  };
  assert.equal(initResult.protocolVersion, PROTOCOL_VERSION);
  assert.equal(initResult.serverInfo.name, SERVER_NAME);
  assert.equal(initResult.serverInfo.version, SERVER_VERSION);

  const listResponse = processRequest("tools/list", undefined, 2);
  assert.equal(listResponse.jsonrpc, JSONRPC_VERSION);
  assert.equal(listResponse.id, 2);
  const listResult = asSuccess(listResponse).result as {
    tools: ToolDefinition[];
  };
  assert.equal(listResult.tools.length, 4);
  assert.deepEqual(
    listResult.tools.map((tool) => tool.name).sort(),
    ["check_eligibility", "draft_reply", "match_applicant", "rank_list"],
  );
  for (const tool of listResult.tools) {
    assert.ok(
      tool.description.length > 0,
      `missing description for ${tool.name}`,
    );
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.inputSchema.required.length > 0);
    for (const property of Object.values(tool.inputSchema.properties)) {
      assert.ok(property.description.length > 0);
    }
  }

  const callResponse = processRequest(
    "tools/call",
    {
      name: "check_eligibility",
      arguments: { listingId: "L-1002", applicantId: "A-2001" },
    },
    3,
  );
  assert.equal(callResponse.jsonrpc, JSONRPC_VERSION);
  assert.equal(callResponse.id, 3);
  const callResult = asSuccess(callResponse).result as {
    eligible: boolean;
    blockersSv: string[];
    missingFieldsSv: string[];
  };
  const direct = toolCheckEligibility({
    listingId: "L-1002",
    applicantId: "A-2001",
  });
  assert.deepEqual(callResult, direct);
  assert.equal(callResult.eligible, false);
  assert.ok(callResult.blockersSv.length > 0);
});

test("tools/call dispatches to the same logic as the direct handlers", () => {
  const matchArgs = { listingId: "L-1001", applicantId: "A-2001" };
  const matchResponse = processRequest(
    "tools/call",
    { name: "match_applicant", arguments: matchArgs },
    "m",
  );
  assert.deepEqual(asSuccess(matchResponse).result, toolMatchApplicant(matchArgs));

  const eligibilityArgs = { listingId: "L-1002", applicantId: "A-2001" };
  const eligibilityResponse = processRequest(
    "tools/call",
    { name: "check_eligibility", arguments: eligibilityArgs },
    "e",
  );
  assert.deepEqual(
    asSuccess(eligibilityResponse).result,
    toolCheckEligibility(eligibilityArgs),
  );

  const draftArgs = {
    listingId: "L-1001",
    applicantId: "A-2001",
    kind: "more_info",
  };
  const draftResponse = processRequest(
    "tools/call",
    { name: "draft_reply", arguments: draftArgs },
    "d",
  );
  assert.deepEqual(asSuccess(draftResponse).result, toolDraftReply(draftArgs));

  const rankArgs = { listingId: "L-1002" };
  const rankResponse = processRequest(
    "tools/call",
    { name: "rank_list", arguments: rankArgs },
    "r",
  );
  assert.deepEqual(asSuccess(rankResponse).result, toolRankList(rankArgs));
  const rankResult = asSuccess(rankResponse).result as RankListOutput;
  assert.equal(rankResult.order, "score_desc");
  assert.equal(rankResult.ranked.length, 8);
});

test("responses echo the id and the JSON-RPC version", () => {
  const stringId = processRequest("tools/list", undefined, "abc");
  assert.equal(stringId.id, "abc");
  assert.equal(stringId.jsonrpc, "2.0");

  const numberId = processRequest("tools/list", undefined, 42);
  assert.equal(numberId.id, 42);
  assert.equal(numberId.jsonrpc, "2.0");

  const errorResponse = processRequest("no_such_method", {}, 43);
  assert.equal(errorResponse.id, 43);
  assert.equal(errorResponse.jsonrpc, "2.0");
});

test("parse error returns -32700", () => {
  const response = handleMessage("{not json at all");
  const error = asError(response);
  assert.equal(error.error.code, PARSE_ERROR);
  assert.equal(error.id, null);
  assert.equal(error.jsonrpc, "2.0");
});

test("invalid request returns -32600", () => {
  const missingVersion = handleMessage(
    JSON.stringify({ id: 1, method: "tools/list" }),
  );
  assert.equal(asError(missingVersion).error.code, INVALID_REQUEST);

  const missingMethod = handleMessage(
    JSON.stringify({ jsonrpc: "2.0", id: 2 }),
  );
  assert.equal(asError(missingMethod).error.code, INVALID_REQUEST);

  const wrongVersion = handleMessage(
    JSON.stringify({ jsonrpc: "1.0", id: 3, method: "tools/list" }),
  );
  assert.equal(asError(wrongVersion).error.code, INVALID_REQUEST);

  const notAnObject = handleMessage(JSON.stringify(["tools/list"]));
  assert.equal(asError(notAnObject).error.code, INVALID_REQUEST);
});

test("unknown method returns -32601", () => {
  const response = processRequest("no_such_method", {}, 9);
  assert.equal(asError(response).error.code, METHOD_NOT_FOUND);
  assert.equal(response.id, 9);

  const unknownTool = processRequest(
    "tools/call",
    { name: "no_such_tool", arguments: {} },
    10,
  );
  assert.equal(asError(unknownTool).error.code, METHOD_NOT_FOUND);
});

test("invalid params return -32602", () => {
  const missingApplicant = processRequest(
    "tools/call",
    { name: "check_eligibility", arguments: { listingId: "L-1001" } },
    11,
  );
  assert.equal(asError(missingApplicant).error.code, INVALID_PARAMS);

  const unknownListing = processRequest(
    "tools/call",
    {
      name: "match_applicant",
      arguments: { listingId: "L-9999", applicantId: "A-2001" },
    },
    12,
  );
  assert.equal(asError(unknownListing).error.code, INVALID_PARAMS);

  const nonObjectParams = processRequest("tools/call", ["nope"], 13);
  assert.equal(asError(nonObjectParams).error.code, INVALID_PARAMS);
});

test("unknown ids in draft_reply surface the typed DraftError as a param error", () => {
  const unknownListing = processRequest(
    "tools/call",
    {
      name: "draft_reply",
      arguments: { listingId: "L-9999", applicantId: "A-2001", kind: "invite" },
    },
    21,
  );
  const listingError = asError(unknownListing);
  assert.equal(listingError.error.code, INVALID_PARAMS);
  assert.match(listingError.error.message, /Okänd bostad/);

  const unknownApplicant = processRequest(
    "tools/call",
    {
      name: "draft_reply",
      arguments: { listingId: "L-1001", applicantId: "A-9999", kind: "invite" },
    },
    22,
  );
  const applicantError = asError(unknownApplicant);
  assert.equal(applicantError.error.code, INVALID_PARAMS);
  assert.match(applicantError.error.message, /Okänd sökande/);

  const unknownKind = processRequest(
    "tools/call",
    {
      name: "draft_reply",
      arguments: { listingId: "L-1001", applicantId: "A-2001", kind: "spam" },
    },
    23,
  );
  assert.equal(asError(unknownKind).error.code, INVALID_PARAMS);
});

test("createLineHandler serves a scripted stdio session in memory without spawning a process", () => {
  const written: string[] = [];
  const output = {
    write(chunk: string): unknown {
      written.push(chunk);
      return true;
    },
  };
  const onLine = createLineHandler(output);

  onLine(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "i1",
      method: "initialize",
      params: {},
    }),
  );
  onLine(JSON.stringify({ jsonrpc: "2.0", id: "i2", method: "tools/list" }));
  onLine(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "i3",
      method: "tools/call",
      params: {
        name: "check_eligibility",
        arguments: { listingId: "L-1002", applicantId: "A-2001" },
      },
    }),
  );
  onLine("   ");
  onLine("oops");

  assert.equal(written.length, 4);
  const responses = written.map((line) => JSON.parse(line) as JsonRpcResponse);

  const initResult = asSuccess(responses[0]!).result as {
    serverInfo: { name: string };
  };
  assert.equal(responses[0]!.id, "i1");
  assert.equal(initResult.serverInfo.name, SERVER_NAME);

  const listResult = asSuccess(responses[1]!).result as {
    tools: ToolDefinition[];
  };
  assert.equal(responses[1]!.id, "i2");
  assert.equal(listResult.tools.length, 4);

  assert.deepEqual(
    asSuccess(responses[2]!).result,
    toolCheckEligibility({ listingId: "L-1002", applicantId: "A-2001" }),
  );

  assert.equal(asError(responses[3]!).error.code, PARSE_ERROR);
});
