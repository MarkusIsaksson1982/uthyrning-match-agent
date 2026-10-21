import test from "node:test";
import assert from "node:assert/strict";

import type { Applicant, Listing } from "../src/domain.js";
import {
  MAX_SCORE,
  MISSING_CONTACT_DEDUCTION,
  QUEUE_POINTS_WEIGHT,
  TIE_BREAKER_PRIMARY,
  TIE_BREAKER_SECONDARY,
  compareApplicants,
  evaluateEligibility,
  householdSize,
  matchApplicant,
  missingDetails,
  rankApplicants,
  scoreApplicant,
} from "../src/rules.js";
import { applicants } from "../src/data/applicants.js";
import { listings } from "../src/data/listings.js";

function findByListing(id: string): Listing {
  const listing = listings.find((candidate) => candidate.id === id);
  assert.ok(listing, `missing listing ${id}`);
  return listing;
}

function findById(id: string): Applicant {
  const applicant = applicants.find((candidate) => candidate.id === id);
  assert.ok(applicant, `missing applicant ${id}`);
  return applicant;
}

function makeApplicant(overrides: Partial<Applicant>): Applicant {
  return {
    id: "A-9000",
    displayName: "Test Testsson",
    householdAdults: 1,
    householdChildren: 0,
    monthlyIncomeSek: 40000,
    employmentStatus: "anstalld",
    queuePoints: 100,
    hasGuarantor: false,
    contactEmail: "test@example.se",
    contactPhone: "070-9999999",
    contactComplete: true,
    note: "",
    ...overrides,
  };
}

test("exported weights and tie-breakers have documented values", () => {
  assert.equal(MAX_SCORE, 100);
  assert.equal(typeof QUEUE_POINTS_WEIGHT, "number");
  assert.equal(typeof MISSING_CONTACT_DEDUCTION, "number");
  assert.equal(TIE_BREAKER_PRIMARY, "income_headroom");
  assert.equal(TIE_BREAKER_SECONDARY, "applicant_id");
});

test("householdSize sums adults and children", () => {
  assert.equal(householdSize(findById("A-2003")), 4);
  assert.equal(householdSize(findById("A-2004")), 1);
  assert.equal(householdSize(findById("A-2008")), 5);
});

test("missingDetails reports one label per empty required field", () => {
  assert.deepEqual(missingDetails(findById("A-2001")), []);
  assert.deepEqual(missingDetails(findById("A-2002")), ["Telefonnummer saknas"]);
  assert.deepEqual(missingDetails(findById("A-2004")), [
    "E-postadress saknas",
    "Telefonnummer saknas",
  ]);
  assert.deepEqual(missingDetails(findById("A-2008")), ["Telefonnummer saknas"]);
});

test("a compliant household is eligible with no blockers", () => {
  const result = evaluateEligibility(findByListing("L-1001"), findById("A-2001"));
  assert.equal(result.eligible, true);
  assert.deepEqual(result.blockersSv, []);
});

test("a household above householdSizeMax is blocked before scoring", () => {
  const listing = findByListing("L-1001");
  const result = evaluateEligibility(listing, findById("A-2003"));
  assert.equal(result.eligible, false);
  assert.equal(result.blockersSv.length, 1);
  assert.ok(result.blockersSv[0]!.includes("personer"));

  const match = matchApplicant(listing, findById("A-2003"), applicants);
  assert.equal(match.eligible, false);
  assert.equal(match.score, 0);
  assert.ok(match.blockersSv.length > 0);
  assert.equal(match.needsHumanReview, true);
});

test("income below the floor without a valid guarantor is blocked", () => {
  const listing = findByListing("L-1002");
  const result = evaluateEligibility(listing, findById("A-2002"));
  assert.equal(result.eligible, false);
  assert.equal(result.blockersSv.length, 2);
  assert.ok(result.blockersSv.some((line) => line.includes("inkomstkravet")));
  assert.ok(result.blockersSv.some((line) => line.includes("Borgenär")));
});

test("income below the floor passes when a guarantor is allowed", () => {
  const result = evaluateEligibility(findByListing("L-1003"), findById("A-2004"));
  assert.equal(result.eligible, true);
  assert.deepEqual(result.blockersSv, []);
});

test("guarantor does not help when the listing forbids one", () => {
  const result = evaluateEligibility(findByListing("L-1002"), findById("A-2004"));
  assert.equal(result.eligible, false);
  assert.ok(result.blockersSv.some((line) => line.includes("inkomstkravet")));
});

test("an eligible applicant is scored within 0-100 with Swedish reasons", () => {
  const match = matchApplicant(
    findByListing("L-1001"),
    findById("A-2005"),
    applicants,
  );
  assert.equal(match.eligible, true);
  assert.ok(match.score >= 0 && match.score <= 100);
  assert.ok(match.reasonsSv.some((line) => line.includes("Köpoäng")));
  assert.equal(match.source, "rules");
});

test("missing contact details trigger human review and reduce the score", () => {
  const listing = findByListing("L-1003");
  const match = matchApplicant(listing, findById("A-2002"), applicants);
  assert.equal(match.eligible, true);
  assert.deepEqual(match.missingFieldsSv, ["Telefonnummer saknas"]);
  assert.equal(match.needsHumanReview, true);

  const complete = makeApplicant({
    id: "A-9101",
    queuePoints: 45,
    contactEmail: "x@example.se",
    contactPhone: "070-1111111",
    contactComplete: true,
  });
  const missing = makeApplicant({
    id: "A-9102",
    queuePoints: 45,
    contactEmail: "x@example.se",
    contactPhone: "",
    contactComplete: false,
  });
  const pool = [complete, missing];
  assert.equal(
    scoreApplicant(complete, pool) - scoreApplicant(missing, pool),
    MISSING_CONTACT_DEDUCTION,
  );
});

test("the queue leader scores MAX_SCORE and lower queues scale down", () => {
  const leader = makeApplicant({ id: "A-9201", queuePoints: 100 });
  const second = makeApplicant({ id: "A-9202", queuePoints: 50 });
  const pool = [leader, second];
  assert.equal(scoreApplicant(leader, pool), MAX_SCORE);
  assert.equal(scoreApplicant(second, pool), 50);
});

test("scores are clamped into 0-100", () => {
  const leader = makeApplicant({ id: "A-9301", queuePoints: 100 });
  const low = makeApplicant({
    id: "A-9302",
    queuePoints: 10,
    contactEmail: "",
    contactPhone: "",
    contactComplete: false,
  });
  assert.equal(scoreApplicant(low, [leader]), 0);
  assert.equal(scoreApplicant(leader, [leader]), 100);
});

test("scoring is deterministic for identical input", () => {
  const listing = findByListing("L-1001");
  const applicant = findById("A-2005");
  const first = matchApplicant(listing, applicant, applicants);
  const second = matchApplicant(listing, applicant, applicants);
  assert.deepEqual(first, second);
});

test("tie-breakers order by income headroom then applicant id", () => {
  const listing = findByListing("L-1001");
  const lowHeadroom = makeApplicant({ id: "A-9401", monthlyIncomeSek: 50000 });
  const highHeadroom = makeApplicant({ id: "A-9402", monthlyIncomeSek: 60000 });
  assert.ok(compareApplicants(listing, highHeadroom, lowHeadroom) < 0);
  assert.ok(compareApplicants(listing, lowHeadroom, highHeadroom) > 0);

  const first = makeApplicant({ id: "A-0001", monthlyIncomeSek: 40000 });
  const second = makeApplicant({ id: "A-0002", monthlyIncomeSek: 40000 });
  assert.ok(compareApplicants(listing, first, second) < 0);
  assert.equal(compareApplicants(listing, first, first), 0);
});

test("rankApplicants sorts by score descending", () => {
  const listing = findByListing("L-1001");
  const pool = [findById("A-2001"), findById("A-2005"), findById("A-2003")];
  const ranked = rankApplicants(listing, pool);
  assert.deepEqual(
    ranked.map((entry) => entry.applicantId),
    ["A-2005", "A-2001", "A-2003"],
  );
  assert.ok(ranked[0]!.score >= ranked[1]!.score);
});
