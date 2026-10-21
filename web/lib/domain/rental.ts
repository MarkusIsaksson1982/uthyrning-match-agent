import {
  DraftError,
  type Applicant,
  type DraftKind,
  type Listing,
  type MatchResult,
} from "../../../src/domain.js";
import { applicants } from "../../../src/data/applicants.js";
import { listings } from "../../../src/data/listings.js";
import { createDraft } from "../../../src/draft.js";
import {
  DeterministicApplicantModel,
  matchWithModel,
} from "../../../src/model.js";
import { rankApplicants } from "../../../src/rules.js";
import type {
  CaseSummary,
  Decision,
  DecisionRecommendation,
  DomainModule,
} from "./types";

export const DRAFT_KIND_BY_RECOMMENDATION = {
  recommend: "invite",
  decline: "reject",
  request_more_info: "more_info",
  escalate: null,
} as const satisfies Record<DecisionRecommendation, DraftKind | null>;

export function draftKindForRecommendation(
  recommendation: DecisionRecommendation,
): DraftKind | null {
  return DRAFT_KIND_BY_RECOMMENDATION[recommendation];
}

export function recommendationForMatch(
  match: MatchResult,
): DecisionRecommendation {
  if (!match.eligible) {
    return "decline";
  }
  if (match.missingFieldsSv.length > 0) {
    return "request_more_info";
  }
  if (match.needsHumanReview) {
    return "escalate";
  }
  return "recommend";
}

function recommendationSummarySv(
  recommendation: DecisionRecommendation,
  listing: Listing,
): string {
  switch (recommendation) {
    case "recommend":
      return `Rekommendation för ${listing.address}: bjud in till visning.`;
    case "decline":
      return `Rekommendation för ${listing.address}: avslå ansökan.`;
    case "request_more_info":
      return `Rekommendation för ${listing.address}: begär komplettering.`;
    case "escalate":
      return `Rekommendation för ${listing.address}: eskalera till handläggare.`;
    default: {
      const exhaustive: never = recommendation;
      return exhaustive;
    }
  }
}

export function toRentalSummary(listing: Listing): CaseSummary {
  return {
    id: listing.id,
    title: listing.address,
    subtitle: `${listing.rooms} rum · ${listing.areaKvm} kvm · ${listing.monthlyRentSek} kr/mån · ledig ${listing.availableFrom}`,
  };
}

function findListingById(listingId: string): Listing | null {
  return listings.find((entry) => entry.id === listingId) ?? null;
}

function selectTopApplicant(listing: Listing): Applicant | null {
  const [topMatch] = rankApplicants(listing, applicants);
  if (!topMatch) {
    return null;
  }
  return applicants.find((entry) => entry.id === topMatch.applicantId) ?? null;
}

interface DraftOutcome {
  readonly draftSv: string | null;
  readonly requiresSignOff: boolean;
  readonly disclaimerSv: string | null;
  readonly failed: boolean;
}

function buildDraftOutcome(
  listing: Listing,
  applicant: Applicant,
  recommendation: DecisionRecommendation,
): DraftOutcome {
  const kind = draftKindForRecommendation(recommendation);
  if (kind === null) {
    return {
      draftSv: null,
      requiresSignOff: false,
      disclaimerSv: null,
      failed: false,
    };
  }

  try {
    const draft = createDraft(listing, applicant, kind);
    return {
      draftSv: draft.draftSv,
      requiresSignOff: draft.requiresSignOff,
      disclaimerSv: draft.disclaimerSv,
      failed: false,
    };
  } catch (error) {
    if (error instanceof DraftError) {
      return {
        draftSv: null,
        requiresSignOff: true,
        disclaimerSv: null,
        failed: true,
      };
    }
    throw error;
  }
}

export function buildRentalDecision(
  listing: Listing,
  applicant: Applicant,
  match: MatchResult,
): Decision {
  const recommendation = recommendationForMatch(match);
  const draft = buildDraftOutcome(listing, applicant, recommendation);

  return {
    caseId: listing.id,
    subject: applicant.displayName,
    recommendation,
    summarySv: recommendationSummarySv(recommendation, listing),
    reasonsSv: match.reasonsSv,
    blockersSv: match.blockersSv,
    missingDetailsSv: match.missingFieldsSv,
    score: match.score,
    needsHumanReview:
      match.needsHumanReview ||
      draft.failed ||
      recommendation === "escalate" ||
      !match.eligible,
    source: match.source,
    draftSv: draft.draftSv,
    requiresSignOff: draft.requiresSignOff,
    disclaimerSv: draft.disclaimerSv,
  };
}

export async function listRentalCases(): Promise<readonly CaseSummary[]> {
  return listings.map(toRentalSummary);
}

export async function getRentalCase(
  caseId: string,
): Promise<CaseSummary | null> {
  const listing = findListingById(caseId);
  return listing ? toRentalSummary(listing) : null;
}

export async function decideRentalCase(
  caseId: string,
): Promise<Decision | null> {
  const listing = findListingById(caseId);
  if (!listing) {
    return null;
  }

  const applicant = selectTopApplicant(listing);
  if (!applicant) {
    return null;
  }

  const match = matchWithModel(
    listing,
    applicant,
    applicants,
    new DeterministicApplicantModel(),
  );

  return buildRentalDecision(listing, applicant, match);
}

export const rentalDomainModule: DomainModule = {
  id: "rental",
  labelSv: "Uthyrning",
  listCases: listRentalCases,
  getCase: getRentalCase,
  decide: decideRentalCase,
};
