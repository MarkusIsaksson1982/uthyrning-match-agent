import test from "node:test";
import assert from "node:assert/strict";

import { applicants } from "../src/data/applicants.js";
import { listings } from "../src/data/listings.js";
import {
  ELIGIBILITY_ACCURACY_THRESHOLD,
  FULL_ORDER_ACCURACY_THRESHOLD,
  runEval,
  TOP1_ACCURACY_THRESHOLD,
} from "../src/eval.js";
import { coversWholePool, evalCases } from "../src/evalSet.js";
import {
  applyModelAssist,
  DeterministicApplicantModel,
  matchWithModel,
  MODEL_CONFIDENCE_THRESHOLD,
  rulesConfidence,
  shouldInvokeModel,
} from "../src/model.js";
import { evaluateEligibility, matchApplicant, rankApplicants } from "../src/rules.js";

function findListing(id: string) {
  const listing = listings.find((entry) => entry.id === id);
  assert.ok(listing, `expected listing ${id}`);
  return listing;
}

function findApplicant(id: string) {
  const applicant = applicants.find((entry) => entry.id === id);
  assert.ok(applicant, `expected applicant ${id}`);
  return applicant;
}

test("eval set covers every synthetic listing once", () => {
  const covered = evalCases.map((entry) => entry.listingId).sort();
  const expected = listings.map((entry) => entry.id).sort();
  assert.deepEqual(covered, expected);
});

test("eval set has a label and an order slot for every applicant per listing", () => {
  assert.ok(coversWholePool(applicants, listings));
  for (const entry of evalCases) {
    assert.equal(
      entry.expectedOrder.length,
      applicants.length,
      `order length for ${entry.listingId}`,
    );
    assert.equal(entry.expectedTop1, entry.expectedOrder[0]);
    const uniqueOrder = new Set(entry.expectedOrder);
    assert.equal(uniqueOrder.size, entry.expectedOrder.length);
    for (const applicant of applicants) {
      assert.notEqual(
        entry.expectedEligibility[applicant.id],
        undefined,
        `missing eligibility label for ${applicant.id} on ${entry.listingId}`,
      );
    }
  }
});

test("drift guard: snapshot eligibility matches the real rules pipeline", () => {
  for (const entry of evalCases) {
    const listing = findListing(entry.listingId);
    for (const applicant of applicants) {
      const expected = entry.expectedEligibility[applicant.id];
      assert.notEqual(expected, undefined);
      const actual = evaluateEligibility(listing, applicant).eligible;
      assert.equal(
        actual,
        expected,
        `eligibility drift for ${entry.listingId}/${applicant.id}`,
      );
    }
  }
});

test("drift guard: snapshot ranking order matches the real rules pipeline", () => {
  for (const entry of evalCases) {
    const listing = findListing(entry.listingId);
    const actualOrder = rankApplicants(listing, applicants).map(
      (result) => result.applicantId,
    );
    assert.deepEqual(
      actualOrder,
      [...entry.expectedOrder],
      `ranking drift for ${entry.listingId}`,
    );
  }
});

test("eligibility accuracy meets the named threshold", () => {
  const report = runEval();
  assert.equal(report.eligibilityAccuracy, ELIGIBILITY_ACCURACY_THRESHOLD);
  assert.equal(report.eligibilityCorrect, report.eligibilityTotal);
  assert.ok(report.eligibilityTotal > 0);
});

test("top-1 ranking accuracy meets the named threshold", () => {
  const report = runEval();
  assert.equal(report.top1Accuracy, TOP1_ACCURACY_THRESHOLD);
  assert.equal(report.top1Correct, report.top1Total);
  assert.ok(report.top1Total > 0);
});

test("full-order agreement is tracked and holds on the small synthetic set", () => {
  const report = runEval();
  assert.equal(report.fullOrderAccuracy, FULL_ORDER_ACCURACY_THRESHOLD);
  for (const outcome of report.rankingOutcomes) {
    assert.equal(
      outcome.predictedTop1,
      outcome.expectedTop1,
      `top-1 mismatch for ${outcome.listingId}`,
    );
  }
});

test("the model step only activates below the exported confidence threshold", () => {
  const listing = findListing("L-1001");

  const confident = matchApplicant(listing, findApplicant("A-2005"), applicants);
  assert.ok(rulesConfidence(confident) >= MODEL_CONFIDENCE_THRESHOLD);
  assert.equal(shouldInvokeModel(confident), false);

  const unsure = matchApplicant(listing, findApplicant("A-2004"), applicants);
  assert.ok(rulesConfidence(unsure) < MODEL_CONFIDENCE_THRESHOLD);
  assert.equal(shouldInvokeModel(unsure), true);

  const report = runEval();
  assert.ok(
    report.modelAssistedCount > 0,
    "expected the deterministic stub to be consulted at least once",
  );
});

test("the model step never flips a hard ineligibility", () => {
  const listing = findListing("L-1001");
  const blocked = findApplicant("A-2003");

  const base = matchApplicant(listing, blocked, applicants);
  assert.equal(base.eligible, false);

  const assisted = applyModelAssist(
    base,
    listing,
    blocked,
    new DeterministicApplicantModel(),
  );
  assert.equal(assisted.eligible, false);
  assert.equal(assisted.score, base.score);
  assert.deepEqual(assisted.blockersSv, base.blockersSv);
  assert.deepEqual(assisted.missingFieldsSv, base.missingFieldsSv);
  assert.equal(assisted.source, "rules");
  assert.equal(assisted.needsHumanReview, true);
});

test("the model-assisted pipeline adds reasons without changing verdicts or score", () => {
  const listing = findListing("L-1001");
  const unsure = findApplicant("A-2004");

  const base = matchApplicant(listing, unsure, applicants);
  const assisted = matchWithModel(
    listing,
    unsure,
    applicants,
    new DeterministicApplicantModel(),
  );

  assert.equal(base.source, "rules");
  assert.equal(assisted.source, "model-assisted");
  assert.equal(assisted.eligible, base.eligible);
  assert.equal(assisted.score, base.score);
  assert.deepEqual(assisted.blockersSv, base.blockersSv);
  assert.deepEqual(assisted.missingFieldsSv, base.missingFieldsSv);
  assert.ok(assisted.reasonsSv.length > base.reasonsSv.length);
});
