import test from "node:test";
import assert from "node:assert/strict";

import { DraftError } from "../src/domain.js";
import type { DraftKind } from "../src/domain.js";
import {
  DRAFT_DISCLAIMER_SV,
  assertDraftKind,
  createDraft,
  draftReply,
  isDraftKind,
} from "../src/draft.js";
import type { Applicant, Listing } from "../src/domain.js";
import { applicants, findApplicant } from "../src/data/applicants.js";
import { listings, findListing } from "../src/data/listings.js";

const KINDS: DraftKind[] = ["invite", "reject", "more_info"];

function listingById(id: string): Listing {
  const listing = findListing(id);
  assert.ok(listing, `missing listing ${id}`);
  return listing;
}

function applicantById(id: string): Applicant {
  const applicant = findApplicant(id);
  assert.ok(applicant, `missing applicant ${id}`);
  return applicant;
}

test("every draft is an unsent, non-overridable artifact with sign-off", () => {
  for (const listing of listings) {
    for (const applicant of applicants) {
      for (const kind of KINDS) {
        const draft = createDraft(listing, applicant, kind);
        assert.equal(draft.requiresSignOff, true);
        assert.equal(draft.disclaimerSv, DRAFT_DISCLAIMER_SV);
        assert.ok(draft.disclaimerSv.includes("osänt"));
        assert.ok(draft.disclaimerSv.includes("utkast"));
        assert.ok(draft.draftSv.length > 0);
        assert.ok(Object.isFrozen(draft));
      }
    }
  }
});

test("a draft references only its own listing and applicant records", () => {
  const listing = listingById("L-1001");
  const applicant = applicantById("A-2001");
  const draft = createDraft(listing, applicant, "invite");

  assert.ok(draft.draftSv.includes(listing.address));
  assert.ok(draft.draftSv.includes(applicant.displayName));

  const otherListing = listingById("L-1002");
  const otherApplicant = applicantById("A-2002");
  assert.ok(!draft.draftSv.includes(otherListing.address));
  assert.ok(!draft.draftSv.includes(otherApplicant.displayName));
});

test("draft generation is deterministic for identical records", () => {
  const listing = listingById("L-1002");
  const applicant = applicantById("A-2005");
  assert.deepEqual(
    createDraft(listing, applicant, "reject"),
    createDraft(listing, applicant, "reject"),
  );
});

test("invite names the listing details and never claims to be sent", () => {
  const listing = listingById("L-1001");
  const applicant = applicantById("A-2001");
  const draft = createDraft(listing, applicant, "invite");
  assert.ok(draft.draftSv.includes(String(listing.monthlyRentSek)));
  assert.ok(draft.draftSv.includes(listing.availableFrom));
  assert.ok(draft.draftSv.includes("visning"));
});

test("more_info lists each missing contact field", () => {
  const draft = createDraft(
    listingById("L-1003"),
    applicantById("A-2004"),
    "more_info",
  );
  assert.ok(draft.draftSv.includes("E-postadress saknas"));
  assert.ok(draft.draftSv.includes("Telefonnummer saknas"));
});

test("more_info falls back to a confirmation request when nothing is missing", () => {
  const draft = createDraft(
    listingById("L-1001"),
    applicantById("A-2001"),
    "more_info",
  );
  assert.ok(draft.draftSv.includes("bekräfta"));
});

test("draftReply returns the same result as createDraft for known ids", () => {
  assert.deepEqual(
    draftReply("L-1001", "A-2001", "invite"),
    createDraft(listingById("L-1001"), applicantById("A-2001"), "invite"),
  );
});

test("an unknown listing id raises a typed DraftError", () => {
  assert.throws(
    () => draftReply("L-9999", "A-2001", "invite"),
    (error: unknown) => error instanceof DraftError,
  );
});

test("an unknown applicant id raises a typed DraftError", () => {
  assert.throws(
    () => draftReply("L-1001", "A-9999", "reject"),
    (error: unknown) => error instanceof DraftError,
  );
});

test("an unknown draft kind raises a typed DraftError", () => {
  assert.throws(
    () => draftReply("L-1001", "A-2001", "spam" as DraftKind),
    (error: unknown) => error instanceof DraftError,
  );
});

test("the draft kind guard classifies known and unknown kinds", () => {
  assert.equal(isDraftKind("invite"), true);
  assert.equal(isDraftKind("reject"), true);
  assert.equal(isDraftKind("more_info"), true);
  assert.equal(isDraftKind("spam"), false);
  assert.equal(assertDraftKind("invite"), "invite");
  assert.throws(
    () => assertDraftKind("spam"),
    (error: unknown) => error instanceof DraftError,
  );
});
