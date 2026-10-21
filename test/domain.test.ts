import test from "node:test";
import assert from "node:assert/strict";

import { DraftError } from "../src/domain.js";
import type { Applicant, Listing, MatchResult } from "../src/domain.js";
import { listings } from "../src/data/listings.js";
import { applicants } from "../src/data/applicants.js";

const redactedMarker = ["E", "M", "P", "L", "O", "Y", "E", "R"].join("");

test("at least three synthetic listings are exported", () => {
  assert.ok(listings.length >= 3, `expected >= 3 listings, got ${listings.length}`);
});

test("at least eight synthetic applicants are exported", () => {
  assert.ok(
    applicants.length >= 8,
    `expected >= 8 applicants, got ${applicants.length}`,
  );
});

test("listing ids are unique and well formed", () => {
  const ids = new Set<string>();
  for (const listing of listings) {
    assert.equal(typeof listing.id, "string");
    assert.ok(listing.id.length > 0);
    assert.ok(!ids.has(listing.id), `duplicate listing id ${listing.id}`);
    ids.add(listing.id);
    assert.equal(typeof listing.address, "string");
    assert.ok(listing.address.length > 0);
    assert.ok(listing.householdSizeMax > 0);
    assert.ok(listing.incomeRequirementSek > 0);
    assert.equal(typeof listing.guarantorAllowed, "boolean");
  }
});

test("applicant ids are unique and well formed", () => {
  const ids = new Set<string>();
  for (const applicant of applicants) {
    assert.equal(typeof applicant.id, "string");
    assert.ok(applicant.id.length > 0);
    assert.ok(!ids.has(applicant.id), `duplicate applicant id ${applicant.id}`);
    ids.add(applicant.id);
    assert.equal(typeof applicant.displayName, "string");
    assert.ok(applicant.displayName.length > 0);
    assert.equal(typeof applicant.contactEmail, "string");
    assert.equal(typeof applicant.contactPhone, "string");
  }
});

test("contactComplete reflects non-empty contact fields", () => {
  for (const applicant of applicants) {
    const derived = applicant.contactEmail !== "" && applicant.contactPhone !== "";
    assert.equal(
      applicant.contactComplete,
      derived,
      `contactComplete mismatch for ${applicant.id}`,
    );
  }
});

test("synthetic data never names a real organization", () => {
  const blob = JSON.stringify({ listings, applicants }).toUpperCase();
  assert.ok(!blob.includes(redactedMarker));
});

test("DraftError is a typed error subclass", () => {
  const error = new DraftError("okänd");
  assert.ok(error instanceof DraftError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "DraftError");
  assert.equal(error.message, "okänd");
});

test("domain records satisfy the strict interfaces", () => {
  const listing: Listing = listings[0]!;
  const applicant: Applicant = applicants[0]!;
  const result: MatchResult = {
    listingId: listing.id,
    applicantId: applicant.id,
    eligible: true,
    score: 50,
    reasonsSv: [],
    blockersSv: [],
    missingFieldsSv: [],
    source: "rules",
    needsHumanReview: false,
  };
  assert.equal(result.source, "rules");
  assert.equal(result.score, 50);
});
