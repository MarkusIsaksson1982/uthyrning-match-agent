import { describe, expect, it } from "vitest";
import { applicants } from "../../src/data/applicants.js";
import { listings } from "../../src/data/listings.js";
import {
  DeterministicApplicantModel,
  matchWithModel,
} from "../../src/model.js";
import { MAX_SCORE, rankApplicants } from "../../src/rules.js";
import {
  DRAFT_KIND_BY_RECOMMENDATION,
  rentalDomainModule,
} from "../lib/domain/rental";

describe("rental domain adapter", () => {
  it("smoke imports the src rules module", () => {
    expect(MAX_SCORE).toBe(100);
  });

  it("publishes the recommendation to draft mapping", () => {
    expect(DRAFT_KIND_BY_RECOMMENDATION.recommend).toBe("invite");
    expect(DRAFT_KIND_BY_RECOMMENDATION.decline).toBe("reject");
    expect(DRAFT_KIND_BY_RECOMMENDATION.request_more_info).toBe("more_info");
    expect(DRAFT_KIND_BY_RECOMMENDATION.escalate).toBeNull();
  });

  it("returns one case summary per listing", async () => {
    const cases = await rentalDomainModule.listCases();

    expect(cases).toHaveLength(listings.length);
    expect(new Set(cases.map((entry) => entry.id)).size).toBe(listings.length);
  });

  it("builds L-1001 with reasons, sign-off and the match source", async () => {
    const decision = await rentalDomainModule.decide("L-1001");

    expect(decision).not.toBeNull();
    expect(decision?.caseId).toBe("L-1001");
    expect(decision?.reasonsSv.length).toBeGreaterThan(0);
    expect(decision?.requiresSignOff).toBe(true);

    const listing = listings.find((entry) => entry.id === "L-1001");
    expect(listing).toBeDefined();
    if (!listing) {
      return;
    }

    const topMatch = rankApplicants(listing, applicants)[0];
    expect(topMatch).toBeDefined();
    if (!topMatch) {
      return;
    }

    const applicant = applicants.find(
      (entry) => entry.id === topMatch.applicantId,
    );
    expect(applicant).toBeDefined();
    if (!applicant) {
      return;
    }

    const expected = matchWithModel(
      listing,
      applicant,
      applicants,
      new DeterministicApplicantModel(),
    );

    expect(decision?.source).toBe(expected.source);
    expect(decision?.score).toBe(expected.score);
  });

  it("returns null for unknown ids", async () => {
    expect(await rentalDomainModule.getCase("L-9999")).toBeNull();
    expect(await rentalDomainModule.decide("L-9999")).toBeNull();
  });
});
