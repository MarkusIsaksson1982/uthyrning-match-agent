import { beforeEach, describe, expect, it } from "vitest";
import { InvalidReviewInputError } from "../lib/api/contracts";
import type { ReviewInput } from "../lib/domain/types";
import {
  REVIEW_STORE_SYMBOL,
  getReview,
  recordReview,
  reset,
  reviewStore,
} from "../lib/reviewStore";

const validInput: ReviewInput = {
  caseId: "L-1001",
  action: "approve",
  reviewer: "Handläggare Test",
  note: "Underlaget är komplett.",
  finalRecommendation: "recommend",
};

beforeEach(() => {
  reset();
});

describe("review store", () => {
  it("starts empty after reset", async () => {
    expect(await getReview("L-1001")).toBeNull();
  });

  it("records a review and returns a typed record", async () => {
    const record = await recordReview(validInput);

    expect(record).toMatchObject(validInput);
    expect(Number.isNaN(Date.parse(record.reviewedAt))).toBe(false);
    expect(await getReview("L-1001")).toEqual(record);
  });

  it("keeps the latest review per case", async () => {
    await recordReview(validInput);
    const override = await recordReview({
      ...validInput,
      action: "override",
      note: "Justerad rekommendation.",
      finalRecommendation: "decline",
    });

    expect(await getReview("L-1001")).toEqual(override);
  });

  it("clears state on reset", async () => {
    await recordReview(validInput);
    expect(await getReview("L-1001")).not.toBeNull();

    reset();

    expect(await getReview("L-1001")).toBeNull();
  });

  it("uses a Symbol-keyed globalThis singleton", async () => {
    await recordReview(validInput);

    const globalStore = globalThis as unknown as Record<symbol, unknown>;
    expect(typeof REVIEW_STORE_SYMBOL).toBe("symbol");
    expect(globalStore[REVIEW_STORE_SYMBOL]).toBeDefined();
  });

  it("validates input through the shared contract", async () => {
    await expect(
      recordReview({
        ...validInput,
        action: "publish",
      } as unknown as ReviewInput),
    ).rejects.toBeInstanceOf(InvalidReviewInputError);
  });

  it("exposes the ReviewStore interface", () => {
    expect(reviewStore.recordReview).toBe(recordReview);
    expect(reviewStore.getReview).toBe(getReview);
    expect(reviewStore.reset).toBe(reset);
  });
});
