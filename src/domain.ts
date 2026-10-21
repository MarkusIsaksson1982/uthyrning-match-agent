export type EmploymentStatus = "anstalld" | "student" | "pensionar" | "other";

export type MatchSource = "rules" | "model-assisted";

export type DraftKind = "invite" | "reject" | "more_info";

export interface Listing {
  id: string;
  address: string;
  areaKvm: number;
  rooms: number;
  floor: number;
  monthlyRentSek: number;
  availableFrom: string;
  householdSizeMax: number;
  incomeRequirementSek: number;
  guarantorAllowed: boolean;
}

export interface Applicant {
  id: string;
  displayName: string;
  householdAdults: number;
  householdChildren: number;
  monthlyIncomeSek: number;
  employmentStatus: EmploymentStatus;
  queuePoints: number;
  hasGuarantor: boolean;
  contactEmail: string;
  contactPhone: string;
  contactComplete: boolean;
  note: string;
}

export interface EligibilityResult {
  eligible: boolean;
  blockersSv: string[];
  missingFieldsSv: string[];
}

export interface MatchResult {
  listingId: string;
  applicantId: string;
  eligible: boolean;
  score: number;
  reasonsSv: string[];
  blockersSv: string[];
  missingFieldsSv: string[];
  source: MatchSource;
  needsHumanReview: boolean;
}

export interface DraftResult {
  draftSv: string;
  requiresSignOff: boolean;
  disclaimerSv: string;
}

export class DraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftError";
  }
}
