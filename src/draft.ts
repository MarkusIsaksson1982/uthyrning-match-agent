import { DraftError } from "./domain.js";
import type { Applicant, DraftKind, DraftResult, Listing } from "./domain.js";
import { missingDetails } from "./rules.js";
import { findApplicant } from "./data/applicants.js";
import { findListing } from "./data/listings.js";

// Every draft is an unsent artifact. This text and the sign-off flag below are
// fixed constants and cannot be overridden by any caller (no-override guard).
export const DRAFT_DISCLAIMER_SV =
  "Detta är ett osänt utkast. Det har inte skickats och kräver granskning och signering av en handläggare innan det får användas.";

export const DRAFT_SIGNATURE_SV = "Med vänlig hälsning\nFastighetsförvaltaren";

export const DRAFT_KINDS = ["invite", "reject", "more_info"] as const;

export function isDraftKind(value: string): value is DraftKind {
  return (DRAFT_KINDS as readonly string[]).includes(value);
}

export function assertDraftKind(value: string): DraftKind {
  if (!isDraftKind(value)) {
    throw new DraftError(`Okänd utkasttyp: ${value}`);
  }
  return value;
}

function renderInviteSv(listing: Listing, applicant: Applicant): string {
  return [
    `Hej ${applicant.displayName},`,
    "",
    `Tack för din ansökan om bostaden på ${listing.address}.`,
    `Bostaden har ${listing.rooms} rum och ${listing.areaKvm} kvm. Hyran är ${listing.monthlyRentSek} kr per månad och inflyttning är möjlig från ${listing.availableFrom}.`,
    "Vi vill gärna bjuda in dig till en visning. Svara med förslag på tider som passar dig.",
    "",
    DRAFT_SIGNATURE_SV,
  ].join("\n");
}

function renderRejectSv(listing: Listing, applicant: Applicant): string {
  return [
    `Hej ${applicant.displayName},`,
    "",
    `Tack för din ansökan om bostaden på ${listing.address}.`,
    "Efter genomgång av urvalet har vi tyvärr gått vidare med en annan sökande för denna bostad.",
    "Du är välkommen att söka andra bostäder hos oss.",
    "",
    DRAFT_SIGNATURE_SV,
  ].join("\n");
}

function renderMoreInfoSv(listing: Listing, applicant: Applicant): string {
  const missing = missingDetails(applicant);
  const lines: string[] = [
    `Hej ${applicant.displayName},`,
    "",
    `För att kunna gå vidare med din ansökan om bostaden på ${listing.address} behöver vi komplettera dina uppgifter.`,
  ];
  if (missing.length > 0) {
    lines.push("Vi saknar följande:");
    for (const label of missing) {
      lines.push(`- ${label}`);
    }
  } else {
    lines.push("Vänligen bekräfta dina kontaktuppgifter så att vi kan nå dig.");
  }
  lines.push("", DRAFT_SIGNATURE_SV);
  return lines.join("\n");
}

function renderDraftSv(
  listing: Listing,
  applicant: Applicant,
  kind: DraftKind,
): string {
  switch (kind) {
    case "invite":
      return renderInviteSv(listing, applicant);
    case "reject":
      return renderRejectSv(listing, applicant);
    case "more_info":
      return renderMoreInfoSv(listing, applicant);
  }
}

// Pure template step: uses only the provided listing and applicant records and
// always returns a frozen, unsent draft with a fixed sign-off requirement.
export function createDraft(
  listing: Listing,
  applicant: Applicant,
  kind: DraftKind,
): DraftResult {
  const safeKind = assertDraftKind(kind);
  return Object.freeze({
    draftSv: renderDraftSv(listing, applicant, safeKind),
    requiresSignOff: true,
    disclaimerSv: DRAFT_DISCLAIMER_SV,
  });
}

// Id-based entry point: unknown ids raise a typed DraftError.
export function draftReply(
  listingId: string,
  applicantId: string,
  kind: DraftKind,
): DraftResult {
  const safeKind = assertDraftKind(kind);
  const listing = findListing(listingId);
  if (!listing) {
    throw new DraftError(`Okänd bostad: ${listingId}`);
  }
  const applicant = findApplicant(applicantId);
  if (!applicant) {
    throw new DraftError(`Okänd sökande: ${applicantId}`);
  }
  return createDraft(listing, applicant, safeKind);
}
