import type {
  DecisionRecommendation,
  ReviewAction,
  ReviewInput,
  ReviewRecord,
} from "../domain/types";

export type {
  DecisionRecommendation,
  ReviewAction,
  ReviewActionState,
  ReviewInput,
  ReviewRecord,
} from "../domain/types";

export const REVIEW_ACTIONS = [
  "approve",
  "override",
] as const satisfies readonly ReviewAction[];

export const REVIEW_RECOMMENDATIONS = [
  "recommend",
  "decline",
  "request_more_info",
  "escalate",
] as const satisfies readonly DecisionRecommendation[];

export class InvalidReviewInputError extends Error {
  readonly fields: readonly string[];

  constructor(message: string, fields: readonly string[]) {
    super(message);
    this.name = "InvalidReviewInputError";
    this.fields = fields;
  }
}

export { InvalidReviewInputError as ReviewValidationError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReviewAction(value: unknown): value is ReviewAction {
  return (REVIEW_ACTIONS as readonly unknown[]).includes(value);
}

function isDecisionRecommendation(
  value: unknown,
): value is DecisionRecommendation {
  return (REVIEW_RECOMMENDATIONS as readonly unknown[]).includes(value);
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidReviewInputError(
      `Fältet "${field}" krävs och får inte vara tomt.`,
      [field],
    );
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new InvalidReviewInputError(
      `Fältet "${field}" måste vara en sträng.`,
      [field],
    );
  }
  return value;
}

export function validateReviewInput(input: unknown): ReviewInput {
  if (!isRecord(input)) {
    throw new InvalidReviewInputError(
      "Granskningsdata måste vara ett objekt.",
      [],
    );
  }

  const caseId = requireNonEmptyString(input.caseId, "caseId");
  const reviewer = requireNonEmptyString(input.reviewer, "reviewer");
  const note = requireString(input.note, "note");
  const action = input.action;
  const finalRecommendation = input.finalRecommendation;

  if (!isReviewAction(action)) {
    throw new InvalidReviewInputError(
      'Fältet "action" måste vara "approve" eller "override".',
      ["action"],
    );
  }

  if (!isDecisionRecommendation(finalRecommendation)) {
    throw new InvalidReviewInputError(
      'Fältet "finalRecommendation" är ogiltigt.',
      ["finalRecommendation"],
    );
  }

  return {
    caseId,
    action,
    reviewer,
    note,
    finalRecommendation,
  };
}

export interface ReviewCreatedResponse extends ReviewRecord {}

export interface ReviewBadRequestResponse {
  readonly error: string;
  readonly fields: readonly string[];
}

export type ReviewRouteResponse =
  | { readonly status: 201; readonly body: ReviewCreatedResponse }
  | { readonly status: 400; readonly body: ReviewBadRequestResponse };
