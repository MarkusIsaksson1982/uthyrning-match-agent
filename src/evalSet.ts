import type { Applicant, Listing } from "./domain.js";

export interface ListingEvalCase {
  listingId: string;
  expectedEligibility: Readonly<Record<string, boolean>>;
  expectedOrder: readonly string[];
  expectedTop1: string;
}

// Hand-checked snapshot, derived once from the documented rules in src/rules.ts
// (hard gates first, then queue-point score with missing-contact deductions and
// the income-headroom / applicant-id tie-breakers). test/eval.test.ts re-derives
// every label and the full order through the real pipeline so this snapshot can
// never silently drift away from the documented rules.
//
// Listings:  L-1001 (max 3, income 34500, guarantor ok)
//            L-1002 (max 5, income 42600, no guarantor)
//            L-1003 (max 2, income 24600, guarantor ok)
// Applicants (size / income / queuePoints / missing contacts):
//   A-2001 3 / 38000 / 120 / none      A-2005 2 / 52000 / 260 / none
//   A-2002 1 / 22000 /  45 / phone     A-2006 4 / 47000 / 150 / none
//   A-2003 4 / 41000 / 200 / none      A-2007 2 / 28000 /  80 / none
//   A-2004 1 / 19500 /  30 / email+ph  A-2008 5 / 61000 / 300 / phone
export const evalCases: readonly ListingEvalCase[] = [
  {
    listingId: "L-1001",
    expectedEligibility: {
      "A-2001": true,
      "A-2002": true,
      "A-2003": false,
      "A-2004": true,
      "A-2005": true,
      "A-2006": false,
      "A-2007": false,
      "A-2008": false,
    },
    expectedOrder: [
      "A-2005",
      "A-2001",
      "A-2002",
      "A-2008",
      "A-2006",
      "A-2003",
      "A-2007",
      "A-2004",
    ],
    expectedTop1: "A-2005",
  },
  {
    listingId: "L-1002",
    expectedEligibility: {
      "A-2001": false,
      "A-2002": false,
      "A-2003": false,
      "A-2004": false,
      "A-2005": true,
      "A-2006": true,
      "A-2007": false,
      "A-2008": true,
    },
    expectedOrder: [
      "A-2008",
      "A-2005",
      "A-2006",
      "A-2003",
      "A-2001",
      "A-2007",
      "A-2002",
      "A-2004",
    ],
    expectedTop1: "A-2008",
  },
  {
    listingId: "L-1003",
    expectedEligibility: {
      "A-2001": false,
      "A-2002": true,
      "A-2003": false,
      "A-2004": true,
      "A-2005": true,
      "A-2006": false,
      "A-2007": true,
      "A-2008": false,
    },
    expectedOrder: [
      "A-2005",
      "A-2007",
      "A-2002",
      "A-2008",
      "A-2006",
      "A-2003",
      "A-2001",
      "A-2004",
    ],
    expectedTop1: "A-2005",
  },
];

export function expectedCaseFor(listingId: string): ListingEvalCase | undefined {
  return evalCases.find((entry) => entry.listingId === listingId);
}

export function coversWholePool(
  applicantPool: readonly Applicant[],
  listingsPool: readonly Listing[],
): boolean {
  const listingIds = listingPoolSet(listingsPool);
  const applicantIds = new Set(applicantPool.map((applicant) => applicant.id));
  for (const entry of evalCases) {
    if (!listingIds.has(entry.listingId)) {
      return false;
    }
    if (entry.expectedOrder.length !== applicantIds.size) {
      return false;
    }
    for (const applicantId of applicantIds) {
      if (entry.expectedEligibility[applicantId] === undefined) {
        return false;
      }
      if (!entry.expectedOrder.includes(applicantId)) {
        return false;
      }
    }
  }
  return true;
}

function listingPoolSet(listingsPool: readonly Listing[]): Set<string> {
  const ids = new Set<string>();
  for (const listing of listingsPool) {
    ids.add(listing.id);
  }
  return ids;
}
