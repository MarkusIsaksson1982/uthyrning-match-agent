import type { Applicant, Listing, MatchResult } from "./domain.js";
import { MAX_SCORE, matchApplicant } from "./rules.js";

// The model step (the pluggable LLM seam) may only run when the deterministic
// rules are unsure. This exported threshold is the single source of truth.
export const MODEL_CONFIDENCE_THRESHOLD = 0.6;

// Confidence is derived only from rule output: a hard ineligibility is certain,
// a clean high score is confident, and missing contact details lower confidence.
export const MODEL_BASE_CONFIDENCE = 0.6;
export const MODEL_SCORE_CONFIDENCE_WEIGHT = 0.4;
export const MODEL_MISSING_CONTACT_PENALTY = 0.3;

export interface ModelInput {
  listing: Listing;
  applicant: Applicant;
  baseResult: MatchResult;
}

export interface ModelSuggestion {
  confidence: number;
  reasonsSv: string[];
}

// ApplicantModel is a plain TypeScript interface: any object with a name and a
// synchronous suggest() satisfies it. A real LLM lives behind the same seam.
export interface ApplicantModel {
  readonly name: string;
  suggest(input: ModelInput): ModelSuggestion;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function rulesConfidence(result: MatchResult): number {
  if (!result.eligible) {
    return 1;
  }
  const scoreComponent = clamp01(result.score / MAX_SCORE);
  const missingPenalty = result.missingFieldsSv.length * MODEL_MISSING_CONTACT_PENALTY;
  return clamp01(
    MODEL_BASE_CONFIDENCE +
      scoreComponent * MODEL_SCORE_CONFIDENCE_WEIGHT -
      missingPenalty,
  );
}

export function shouldInvokeModel(result: MatchResult): boolean {
  return result.eligible && rulesConfidence(result) < MODEL_CONFIDENCE_THRESHOLD;
}

// No-override guard: a model suggestion is merged into reasons and the source
// flag only. It can never change eligible, score, blockersSv or missingFieldsSv,
// and it is never consulted for a hard-ineligible pair.
export function applyModelAssist(
  result: MatchResult,
  listing: Listing,
  applicant: Applicant,
  model: ApplicantModel,
): MatchResult {
  if (!shouldInvokeModel(result)) {
    return result;
  }

  const suggestion = model.suggest({ listing, applicant, baseResult: result });
  if (suggestion.confidence < MODEL_CONFIDENCE_THRESHOLD) {
    return result;
  }

  return {
    ...result,
    reasonsSv: [...result.reasonsSv, ...suggestion.reasonsSv],
    source: "model-assisted",
  };
}

export function matchWithModel(
  listing: Listing,
  applicant: Applicant,
  pool: Applicant[],
  model: ApplicantModel,
): MatchResult {
  const base = matchApplicant(listing, applicant, pool);
  return applyModelAssist(base, listing, applicant, model);
}

// Deterministic offline stub: no randomness, no timers, no network. The same
// input always yields the same output regardless of call order.
export class DeterministicApplicantModel implements ApplicantModel {
  readonly name = "offline-deterministic-stub";

  suggest(input: ModelInput): ModelSuggestion {
    const { listing, applicant } = input;
    const reasonsSv = [
      `Offline-bedömning: ${applicant.displayName} (${applicant.id}) mot ${listing.address} (${listing.rooms} rum, ${listing.areaKvm} kvm), köpoäng ${applicant.queuePoints}.`,
    ];
    return {
      confidence: 0.95,
      reasonsSv,
    };
  }
}
