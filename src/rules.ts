import type {
  Applicant,
  EligibilityResult,
  Listing,
  MatchResult,
} from "./domain.js";

export const MAX_SCORE = 100;

export const QUEUE_POINTS_WEIGHT = 1.0;

export const MISSING_CONTACT_DEDUCTION = 10;

export const REQUIRED_CONTACT_FIELDS = ["contactEmail", "contactPhone"] as const;

export const MISSING_CONTACT_LABELS_SV: Record<string, string> = {
  contactEmail: "E-postadress saknas",
  contactPhone: "Telefonnummer saknas",
};

export const TIE_BREAKER_PRIMARY = "income_headroom";
export const TIE_BREAKER_SECONDARY = "applicant_id";

// Advanced multi-listing tie-breaker scenarios are explicitly out of scope for
// this scaffold; only the listing-local comparator below is supported.

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > MAX_SCORE) {
    return MAX_SCORE;
  }
  return Math.round(value);
}

export function householdSize(applicant: Applicant): number {
  return applicant.householdAdults + applicant.householdChildren;
}

export function missingDetails(applicant: Applicant): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_CONTACT_FIELDS) {
    const value = applicant[field];
    if (typeof value !== "string" || value.trim() === "") {
      missing.push(MISSING_CONTACT_LABELS_SV[field]);
    }
  }
  return missing;
}

export function evaluateEligibility(
  listing: Listing,
  applicant: Applicant,
): EligibilityResult {
  const blockersSv: string[] = [];
  const size = householdSize(applicant);
  if (size > listing.householdSizeMax) {
    blockersSv.push(
      `Hushållet har ${size} personer men bostaden tillåter högst ${listing.householdSizeMax}.`,
    );
  }

  if (applicant.monthlyIncomeSek < listing.incomeRequirementSek) {
    const guarantorAccepted = applicant.hasGuarantor && listing.guarantorAllowed;
    if (!guarantorAccepted) {
      blockersSv.push(
        `Hushållets inkomst ${applicant.monthlyIncomeSek} kr är under inkomstkravet ${listing.incomeRequirementSek} kr.`,
      );
      if (applicant.hasGuarantor && !listing.guarantorAllowed) {
        blockersSv.push("Borgenär tillåts inte för denna bostad.");
      }
    }
  }

  return {
    eligible: blockersSv.length === 0,
    blockersSv,
    missingFieldsSv: missingDetails(applicant),
  };
}

export function maxQueuePoints(pool: Applicant[]): number {
  let max = 0;
  for (const applicant of pool) {
    if (applicant.queuePoints > max) {
      max = applicant.queuePoints;
    }
  }
  return max;
}

export function scoreApplicant(applicant: Applicant, pool: Applicant[]): number {
  const maxQueue = maxQueuePoints(pool);
  const share = maxQueue > 0 ? applicant.queuePoints / maxQueue : 0;
  const base = share * MAX_SCORE * QUEUE_POINTS_WEIGHT;
  const missing = missingDetails(applicant);
  return clampScore(base - missing.length * MISSING_CONTACT_DEDUCTION);
}

export function scoreReasonsSv(applicant: Applicant, pool: Applicant[]): string[] {
  const maxQueue = maxQueuePoints(pool);
  const missing = missingDetails(applicant);
  const reasons: string[] = [
    `Köpoäng: ${applicant.queuePoints} av högsta ${maxQueue} i urvalet.`,
  ];
  if (missing.length > 0) {
    reasons.push(
      `Avdrag för ofullständiga kontaktuppgifter: ${missing.length * MISSING_CONTACT_DEDUCTION} poäng.`,
    );
  }
  reasons.push(
    `Sammanlagd poäng: ${scoreApplicant(applicant, pool)} av ${MAX_SCORE}.`,
  );
  return reasons;
}

export function incomeHeadroomSek(listing: Listing, applicant: Applicant): number {
  return applicant.monthlyIncomeSek - listing.incomeRequirementSek;
}

export function compareApplicants(
  listing: Listing,
  a: Applicant,
  b: Applicant,
): number {
  const headroomDiff =
    incomeHeadroomSek(listing, b) - incomeHeadroomSek(listing, a);
  if (headroomDiff !== 0) {
    return headroomDiff;
  }
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
}

export function matchApplicant(
  listing: Listing,
  applicant: Applicant,
  pool: Applicant[],
): MatchResult {
  const eligibility = evaluateEligibility(listing, applicant);
  const missing = eligibility.missingFieldsSv;

  if (!eligibility.eligible) {
    return {
      listingId: listing.id,
      applicantId: applicant.id,
      eligible: false,
      score: 0,
      reasonsSv: ["Hårda krav uppfyllda: nej, ingen poängsättning gjord."],
      blockersSv: eligibility.blockersSv,
      missingFieldsSv: missing,
      source: "rules",
      needsHumanReview: true,
    };
  }

  return {
    listingId: listing.id,
    applicantId: applicant.id,
    eligible: true,
    score: scoreApplicant(applicant, pool),
    reasonsSv: scoreReasonsSv(applicant, pool),
    blockersSv: [],
    missingFieldsSv: missing,
    source: "rules",
    needsHumanReview: missing.length > 0,
  };
}

export function rankApplicants(
  listing: Listing,
  pool: Applicant[],
): MatchResult[] {
  const byId = new Map<string, Applicant>();
  for (const applicant of pool) {
    byId.set(applicant.id, applicant);
  }
  return pool
    .map((applicant) => matchApplicant(listing, applicant, pool))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      const leftApplicant = byId.get(left.applicantId);
      const rightApplicant = byId.get(right.applicantId);
      if (leftApplicant && rightApplicant) {
        return compareApplicants(listing, leftApplicant, rightApplicant);
      }
      return left.applicantId < right.applicantId ? -1 : 1;
    });
}
