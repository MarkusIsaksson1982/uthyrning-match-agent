import test from "node:test";
import assert from "node:assert/strict";

import type { Applicant, Listing, MatchResult } from "../src/domain.js";
import {
  MODEL_CONFIDENCE_THRESHOLD,
  DeterministicApplicantModel,
  applyModelAssist,
  matchWithModel,
  rulesConfidence,
  shouldInvokeModel,
} from "../src/model.js";
import type {
  ApplicantModel,
  ModelInput,
  ModelSuggestion,
} from "../src/model.js";
import { applicants } from "../src/data/applicants.js";
import { listings } from "../src/data/listings.js";

function listingById(id: string): Listing {
  const listing = listings.find((candidate) => candidate.id === id);
  assert.ok(listing, `missing listing ${id}`);
  return listing;
}

function applicantById(id: string): Applicant {
  const applicant = applicants.find((candidate) => candidate.id === id);
  assert.ok(applicant, `missing applicant ${id}`);
  return applicant;
}

function makeResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    listingId: "L-1001",
    applicantId: "A-2001",
    eligible: true,
    score: 90,
    reasonsSv: ["bas"],
    blockersSv: [],
    missingFieldsSv: [],
    source: "rules",
    needsHumanReview: false,
    ...overrides,
  };
}

class CountingModel implements ApplicantModel {
  readonly name = "counting";
  calls = 0;

  suggest(input: ModelInput): ModelSuggestion {
    this.calls += 1;
    return {
      confidence: 1,
      reasonsSv: [`modell för ${input.applicant.id}`],
    };
  }
}

test("the exported confidence threshold is a fraction in (0, 1)", () => {
  assert.equal(typeof MODEL_CONFIDENCE_THRESHOLD, "number");
  assert.ok(MODEL_CONFIDENCE_THRESHOLD > 0);
  assert.ok(MODEL_CONFIDENCE_THRESHOLD < 1);
});

test("ApplicantModel is satisfied by the offline stub", () => {
  const model: ApplicantModel = new DeterministicApplicantModel();
  assert.equal(typeof model.name, "string");
  assert.ok(model.name.length > 0);
});

test("rules confidence is certain for hard ineligibility and rises with score", () => {
  assert.equal(rulesConfidence(makeResult({ eligible: false, score: 0 })), 1);

  const clean = rulesConfidence(makeResult({ score: 100 }));
  const missing = rulesConfidence(
    makeResult({ score: 100, missingFieldsSv: ["Telefonnummer saknas"] }),
  );
  assert.ok(clean > missing);
});

test("the model step only runs when rules confidence is below the threshold", () => {
  const confident = makeResult({ score: 100 });
  assert.ok(rulesConfidence(confident) >= MODEL_CONFIDENCE_THRESHOLD);
  assert.equal(shouldInvokeModel(confident), false);

  const unsure = makeResult({
    eligible: true,
    score: 0,
    missingFieldsSv: ["Telefonnummer saknas"],
  });
  assert.ok(rulesConfidence(unsure) < MODEL_CONFIDENCE_THRESHOLD);
  assert.equal(shouldInvokeModel(unsure), true);

  const hardFail = makeResult({ eligible: false, score: 0, blockersSv: ["block"] });
  assert.equal(shouldInvokeModel(hardFail), false);
});

test("the offline stub is deterministic across repeated and reordered calls", () => {
  const model = new DeterministicApplicantModel();
  const inputA: ModelInput = {
    listing: listingById("L-1001"),
    applicant: applicantById("A-2001"),
    baseResult: makeResult(),
  };
  const inputB: ModelInput = {
    listing: listingById("L-1002"),
    applicant: applicantById("A-2005"),
    baseResult: makeResult({ listingId: "L-1002", applicantId: "A-2005" }),
  };

  const firstA = model.suggest(inputA);
  model.suggest(inputB);
  const secondA = model.suggest(inputA);
  assert.deepEqual(firstA, secondA);

  const firstB = model.suggest(inputB);
  const secondB = model.suggest(inputB);
  assert.deepEqual(firstB, secondB);

  assert.notDeepEqual(firstA, firstB);
  assert.ok(firstA.reasonsSv[0]!.includes("A-2001"));
  assert.equal(firstA.confidence, secondA.confidence);
});

test("a confident rules result is returned unchanged and the model is not called", () => {
  const model = new CountingModel();
  const confident = makeResult({ score: 100 });
  const output = applyModelAssist(
    confident,
    listingById("L-1001"),
    applicantById("A-2001"),
    model,
  );

  assert.equal(model.calls, 0);
  assert.deepEqual(output, confident);
  assert.equal(output.source, "rules");
});

test("an unsure eligible result is assisted and marked model-assisted", () => {
  const model = new CountingModel();
  const unsure = makeResult({
    score: 0,
    missingFieldsSv: ["Telefonnummer saknas"],
  });
  const output = applyModelAssist(
    unsure,
    listingById("L-1001"),
    applicantById("A-2001"),
    model,
  );

  assert.equal(model.calls, 1);
  assert.equal(output.source, "model-assisted");
  assert.ok(output.reasonsSv.length > unsure.reasonsSv.length);
  assert.ok(output.reasonsSv.some((line) => line.includes("modell")));
});

test("no model output can flip a hard-ineligible pair or alter hard blockers", () => {
  const model = new CountingModel();
  const hard = makeResult({
    eligible: false,
    score: 0,
    blockersSv: ["block1", "block2"],
    needsHumanReview: true,
  });

  const output = applyModelAssist(
    hard,
    listingById("L-1001"),
    applicantById("A-2001"),
    model,
  );

  assert.equal(model.calls, 0);
  assert.equal(output.eligible, false);
  assert.deepEqual(output.blockersSv, ["block1", "block2"]);
  assert.equal(output.source, "rules");
});

test("assisted output never changes eligible, score, blockers or missing fields", () => {
  const model = new CountingModel();
  const unsure = makeResult({
    score: 10,
    blockersSv: [],
    missingFieldsSv: ["E-postadress saknas"],
  });
  const output = applyModelAssist(
    unsure,
    listingById("L-1001"),
    applicantById("A-2001"),
    model,
  );

  assert.equal(output.eligible, unsure.eligible);
  assert.equal(output.score, unsure.score);
  assert.deepEqual(output.blockersSv, unsure.blockersSv);
  assert.deepEqual(output.missingFieldsSv, unsure.missingFieldsSv);
});

test("matchWithModel stays rules-only for a confident pair", () => {
  const model = new CountingModel();
  const output = matchWithModel(
    listingById("L-1001"),
    applicantById("A-2005"),
    applicants,
    model,
  );
  assert.equal(model.calls, 0);
  assert.equal(output.source, "rules");
});

test("matchWithModel assists an unsure eligible pair", () => {
  const model = new CountingModel();
  const output = matchWithModel(
    listingById("L-1003"),
    applicantById("A-2002"),
    applicants,
    model,
  );
  assert.equal(output.eligible, true);
  assert.equal(model.calls, 1);
  assert.equal(output.source, "model-assisted");
});

test("matchWithModel never consults the model for a hard-ineligible pair", () => {
  const model = new CountingModel();
  const output = matchWithModel(
    listingById("L-1001"),
    applicantById("A-2003"),
    applicants,
    model,
  );
  assert.equal(model.calls, 0);
  assert.equal(output.eligible, false);
  assert.equal(output.source, "rules");
  assert.ok(output.blockersSv.length > 0);
});
