import { applicants } from "./data/applicants.js";
import { listings } from "./data/listings.js";
import type { Listing } from "./domain.js";
import { evalCases } from "./evalSet.js";
import {
  DeterministicApplicantModel,
  matchWithModel,
} from "./model.js";
import { rankApplicants } from "./rules.js";

// Named thresholds: the small deterministic synthetic set is expected to be
// perfect. Full-order agreement is an optional extra and is reported but not
// required to reach its own threshold.
export const ELIGIBILITY_ACCURACY_THRESHOLD = 1.0;
export const TOP1_ACCURACY_THRESHOLD = 1.0;
export const FULL_ORDER_ACCURACY_THRESHOLD = 1.0;

export interface EligibilityOutcome {
  listingId: string;
  applicantId: string;
  expected: boolean;
  predicted: boolean;
  correct: boolean;
}

export interface RankingOutcome {
  listingId: string;
  expectedTop1: string;
  predictedTop1: string;
  correct: boolean;
  fullOrderCorrect: boolean;
}

export interface EvalReport {
  eligibilityAccuracy: number;
  top1Accuracy: number;
  fullOrderAccuracy: number;
  eligibilityCorrect: number;
  eligibilityTotal: number;
  top1Correct: number;
  top1Total: number;
  fullOrderCorrect: number;
  fullOrderTotal: number;
  modelAssistedCount: number;
  eligibilityOutcomes: EligibilityOutcome[];
  rankingOutcomes: RankingOutcome[];
}

function findListing(listingId: string): Listing | undefined {
  return listings.find((listing) => listing.id === listingId);
}

function sameOrder(actual: readonly string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) {
      return false;
    }
  }
  return true;
}

function ratio(correct: number, total: number): number {
  return total === 0 ? 0 : correct / total;
}

// Runs the real rules-plus-stub pipeline (matchWithModel with the deterministic
// offline stub) for eligibility, and the real ranking for top-1 order.
export function runEval(): EvalReport {
  const model = new DeterministicApplicantModel();

  const eligibilityOutcomes: EligibilityOutcome[] = [];
  const rankingOutcomes: RankingOutcome[] = [];
  let eligibilityCorrect = 0;
  let eligibilityTotal = 0;
  let top1Correct = 0;
  let top1Total = 0;
  let fullOrderCorrect = 0;
  let fullOrderTotal = 0;
  let modelAssistedCount = 0;

  for (const evalCase of evalCases) {
    const listing = findListing(evalCase.listingId);
    if (!listing) {
      continue;
    }

    for (const applicant of applicants) {
      const expected = evalCase.expectedEligibility[applicant.id];
      if (expected === undefined) {
        continue;
      }
      const result = matchWithModel(listing, applicant, applicants, model);
      const correct = result.eligible === expected;
      eligibilityTotal += 1;
      if (correct) {
        eligibilityCorrect += 1;
      }
      if (result.source === "model-assisted") {
        modelAssistedCount += 1;
      }
      eligibilityOutcomes.push({
        listingId: listing.id,
        applicantId: applicant.id,
        expected,
        predicted: result.eligible,
        correct,
      });
    }

    const ranked = rankApplicants(listing, applicants);
    const predictedOrder = ranked.map((entry) => entry.applicantId);
    const predictedTop1 = predictedOrder.length > 0 ? predictedOrder[0]! : "";
    const top1 = predictedTop1 === evalCase.expectedTop1;
    top1Total += 1;
    if (top1) {
      top1Correct += 1;
    }

    const fullOrder = sameOrder(predictedOrder, evalCase.expectedOrder);
    fullOrderTotal += 1;
    if (fullOrder) {
      fullOrderCorrect += 1;
    }

    rankingOutcomes.push({
      listingId: listing.id,
      expectedTop1: evalCase.expectedTop1,
      predictedTop1,
      correct: top1,
      fullOrderCorrect: fullOrder,
    });
  }

  return {
    eligibilityAccuracy: ratio(eligibilityCorrect, eligibilityTotal),
    top1Accuracy: ratio(top1Correct, top1Total),
    fullOrderAccuracy: ratio(fullOrderCorrect, fullOrderTotal),
    eligibilityCorrect,
    eligibilityTotal,
    top1Correct,
    top1Total,
    fullOrderCorrect,
    fullOrderTotal,
    modelAssistedCount,
    eligibilityOutcomes,
    rankingOutcomes,
  };
}
