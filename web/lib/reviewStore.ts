import { validateReviewInput } from "./api/contracts";
import type {
  ReviewInput,
  ReviewRecord,
  ReviewStore,
} from "./domain/types";

interface ReviewStoreState {
  readonly reviews: Map<string, ReviewRecord>;
}

type ReviewGlobal = typeof globalThis & {
  [key: symbol]: ReviewStoreState | undefined;
};

export const REVIEW_STORE_SYMBOL = Symbol.for("web.review.store");

function getStoreState(): ReviewStoreState {
  const globalStore = globalThis as ReviewGlobal;
  const existing = globalStore[REVIEW_STORE_SYMBOL];
  if (existing !== undefined) {
    return existing;
  }

  const created: ReviewStoreState = {
    reviews: new Map<string, ReviewRecord>(),
  };
  globalStore[REVIEW_STORE_SYMBOL] = created;
  return created;
}

export async function recordReview(input: ReviewInput): Promise<ReviewRecord> {
  const validated = validateReviewInput(input);
  const record: ReviewRecord = Object.freeze({
    ...validated,
    reviewedAt: new Date().toISOString(),
  });

  getStoreState().reviews.set(record.caseId, record);
  return record;
}

export async function getReview(caseId: string): Promise<ReviewRecord | null> {
  return getStoreState().reviews.get(caseId) ?? null;
}

export function reset(): void {
  getStoreState().reviews.clear();
}

export const reviewStore: ReviewStore = {
  recordReview,
  getReview,
  reset,
};
