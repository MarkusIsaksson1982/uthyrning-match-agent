import { DraftError } from "../domain.js";
import type {
  Applicant,
  DraftKind,
  DraftResult,
  EligibilityResult,
  Listing,
  MatchResult,
} from "../domain.js";
import { evaluateEligibility, matchApplicant, rankApplicants } from "../rules.js";
import { draftReply, isDraftKind } from "../draft.js";
import { applicants, findApplicant } from "../data/applicants.js";
import { findListing } from "../data/listings.js";

export const JSONRPC_VERSION = "2.0" as const;

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export const PROTOCOL_VERSION = "2024-11-05";
export const SERVER_NAME = "uthyrning-match-agent";
export const SERVER_VERSION = "0.1.0";

export type JsonRpcId = string | number | null;

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: JsonRpcErrorObject;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export class JsonRpcError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }
}

export interface ToolPropertySchema {
  type: "string" | "number" | "boolean";
  description: string;
  enum?: readonly string[];
}

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolPropertySchema>;
  required: readonly string[];
  additionalProperties: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface MatchApplicantOutput {
  result: MatchResult;
}

export interface RankedEntry {
  applicantId: string;
  score: number;
  eligible: boolean;
  needsHumanReview: boolean;
}

export interface RankListOutput {
  ranked: RankedEntry[];
  order: "score_desc";
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: "match_applicant",
    description:
      "Matchar en sökande mot en bostad hos en fastighetsförvaltare och returnerar ett MatchResult med poäng, skäl och eventuella hinder.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: {
          type: "string",
          description: "Bostadens id, till exempel L-1001.",
        },
        applicantId: {
          type: "string",
          description: "Sökandens id, till exempel A-2001.",
        },
      },
      required: ["listingId", "applicantId"],
      additionalProperties: false,
    },
  },
  {
    name: "check_eligibility",
    description:
      "Kontrollerar om ett hushåll uppfyller de hårda kraven för en bostad och returnerar hinder på svenska samt eventuella saknade kontaktuppgifter.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: {
          type: "string",
          description: "Bostadens id, till exempel L-1001.",
        },
        applicantId: {
          type: "string",
          description: "Sökandens id, till exempel A-2001.",
        },
      },
      required: ["listingId", "applicantId"],
      additionalProperties: false,
    },
  },
  {
    name: "draft_reply",
    description:
      "Skapar ett osänt svenskt svarsutkast (invite, reject eller more_info). Utkastet kräver alltid mänsklig signering och skickas aldrig av verktyget.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: {
          type: "string",
          description: "Bostadens id, till exempel L-1001.",
        },
        applicantId: {
          type: "string",
          description: "Sökandens id, till exempel A-2001.",
        },
        kind: {
          type: "string",
          description: "Typ av utkast: invite, reject eller more_info.",
          enum: ["invite", "reject", "more_info"],
        },
      },
      required: ["listingId", "applicantId", "kind"],
      additionalProperties: false,
    },
  },
  {
    name: "rank_list",
    description:
      "Rangordnar alla sökande mot en bostad efter poäng i fallande ordning och anger om varje ärende behöver granskas av en människa.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: {
          type: "string",
          description: "Bostadens id, till exempel L-1001.",
        },
      },
      required: ["listingId"],
      additionalProperties: false,
    },
  },
];

function asArgs(params: unknown): Record<string, unknown> {
  if (params === undefined || params === null) {
    return {};
  }
  if (typeof params !== "object" || Array.isArray(params)) {
    throw new JsonRpcError(INVALID_PARAMS, "Ogiltiga parametrar: förväntade ett objekt.");
  }
  return params as Record<string, unknown>;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new JsonRpcError(INVALID_PARAMS, `Ogiltig eller saknad parameter: ${key}.`);
  }
  return value;
}

function requireListing(id: string): Listing {
  const listing = findListing(id);
  if (!listing) {
    throw new JsonRpcError(INVALID_PARAMS, `Okänd bostad: ${id}.`);
  }
  return listing;
}

function requireApplicant(id: string): Applicant {
  const applicant = findApplicant(id);
  if (!applicant) {
    throw new JsonRpcError(INVALID_PARAMS, `Okänd sökande: ${id}.`);
  }
  return applicant;
}

export function toolMatchApplicant(params: unknown): MatchApplicantOutput {
  const args = asArgs(params);
  const listing = requireListing(requireString(args, "listingId"));
  const applicant = requireApplicant(requireString(args, "applicantId"));
  return { result: matchApplicant(listing, applicant, applicants) };
}

export function toolCheckEligibility(params: unknown): EligibilityResult {
  const args = asArgs(params);
  const listing = requireListing(requireString(args, "listingId"));
  const applicant = requireApplicant(requireString(args, "applicantId"));
  return evaluateEligibility(listing, applicant);
}

export function toolDraftReply(params: unknown): DraftResult {
  const args = asArgs(params);
  const listingId = requireString(args, "listingId");
  const applicantId = requireString(args, "applicantId");
  const kindValue = requireString(args, "kind");
  if (!isDraftKind(kindValue)) {
    throw new JsonRpcError(INVALID_PARAMS, `Ogiltig utkasttyp: ${kindValue}.`);
  }
  const kind: DraftKind = kindValue;
  try {
    return draftReply(listingId, applicantId, kind);
  } catch (error) {
    if (error instanceof DraftError) {
      throw new JsonRpcError(INVALID_PARAMS, error.message);
    }
    throw error;
  }
}

export function toolRankList(params: unknown): RankListOutput {
  const args = asArgs(params);
  const listing = requireListing(requireString(args, "listingId"));
  const results = rankApplicants(listing, applicants);
  const ranked: RankedEntry[] = results.map((result) => ({
    applicantId: result.applicantId,
    score: result.score,
    eligible: result.eligible,
    needsHumanReview: result.needsHumanReview,
  }));
  return { ranked, order: "score_desc" };
}

export function callTool(name: string, params: unknown): unknown {
  switch (name) {
    case "match_applicant":
      return toolMatchApplicant(params);
    case "check_eligibility":
      return toolCheckEligibility(params);
    case "draft_reply":
      return toolDraftReply(params);
    case "rank_list":
      return toolRankList(params);
    default:
      throw new JsonRpcError(METHOD_NOT_FOUND, `Okänt verktyg: ${name}.`);
  }
}

export function initializeResult(params: unknown): unknown {
  asArgs(params);
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  };
}

// Method dispatch without any envelope: pure, throws JsonRpcError on failure.
export function dispatchMethod(method: string, params: unknown): unknown {
  switch (method) {
    case "initialize":
      return initializeResult(params);
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const args = asArgs(params);
      const name = requireString(args, "name");
      return callTool(name, args.arguments);
    }
    default:
      throw new JsonRpcError(METHOD_NOT_FOUND, `Okänd metod: ${method}.`);
  }
}

function normalizeId(value: unknown): JsonRpcId {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function errorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  const error: JsonRpcErrorObject = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return { jsonrpc: JSONRPC_VERSION, id, error };
}

function successResponse(id: JsonRpcId, result: unknown): JsonRpcSuccessResponse {
  return { jsonrpc: JSONRPC_VERSION, id, result };
}

// Pure request processor: no readline/process access, no IO. Returns a complete
// JSON-RPC 2.0 response envelope, so callers (and tests) can script an entire
// session in memory and compare against the direct tool handlers.
export function processRequest(
  method: string,
  params: unknown,
  id: JsonRpcId = null,
): JsonRpcResponse {
  try {
    return successResponse(id, dispatchMethod(method, params));
  } catch (error) {
    if (error instanceof JsonRpcError) {
      return errorResponse(id, error.code, error.message, error.data);
    }
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(id, INTERNAL_ERROR, message);
  }
}

export function handleParsedMessage(parsed: unknown): JsonRpcResponse {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return errorResponse(null, INVALID_REQUEST, "Invalid Request");
  }
  const request = parsed as Record<string, unknown>;
  const id = normalizeId(request.id);
  const method = request.method;
  if (request.jsonrpc !== JSONRPC_VERSION || typeof method !== "string") {
    return errorResponse(id, INVALID_REQUEST, "Invalid Request");
  }
  return processRequest(method, request.params, id);
}

export function handleMessage(raw: string): JsonRpcResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return errorResponse(null, PARSE_ERROR, "Parse error");
  }
  return handleParsedMessage(parsed);
}
