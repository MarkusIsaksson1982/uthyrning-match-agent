import {
  InvalidReviewInputError,
  validateReviewInput,
  type ReviewBadRequestResponse,
  type ReviewCreatedResponse,
} from "../../../../../lib/api/contracts";
import type { CaseRouteContext } from "../../../../../lib/domain/types";
import { recordReview } from "../../../../../lib/reviewStore";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(error: string, fields: readonly string[] = []): Response {
  const body: ReviewBadRequestResponse = { error, fields };
  return Response.json(body, { status: 400 });
}

export async function POST(
  request: Request,
  context: CaseRouteContext,
): Promise<Response> {
  const { id } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Ogiltig JSON-body.");
  }

  if (!isRecord(payload)) {
    return badRequest("Granskningsdata måste vara ett objekt.");
  }

  try {
    const input = validateReviewInput({ ...payload, caseId: id });
    const record = await recordReview(input);
    const body: ReviewCreatedResponse = record;
    return Response.json(body, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidReviewInputError) {
      return badRequest(error.message, error.fields);
    }
    throw error;
  }
}
