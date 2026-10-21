import type {
  CaseSummary,
  Decision,
  DecisionRecommendation,
  DomainModule,
} from "./types";

interface FaultReportCase {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly subject: string;
  readonly recommendation: DecisionRecommendation;
  readonly summarySv: string;
  readonly reasonsSv: readonly string[];
  readonly blockersSv: readonly string[];
  readonly missingDetailsSv: readonly string[];
  readonly score: number | null;
  readonly urgent: boolean;
}

const FAULT_REPORT_CASES: readonly FaultReportCase[] = [
  {
    id: "FR-1001",
    title: "Akut vattenläcka",
    subtitle: "Syntetisk felanmälan · Badrum, lägenhet 1203",
    subject: "Akut vattenläcka i badrum",
    recommendation: "escalate",
    summarySv:
      "Syntetisk akut felanmälan: vattenläcka i badrum kräver omedelbar handläggning.",
    reasonsSv: [
      "Vattenläckan är akut och kan orsaka följdskador.",
      "Ärendet kräver en handläggare innan något utkast används.",
    ],
    blockersSv: [],
    missingDetailsSv: [],
    score: null,
    urgent: true,
  },
  {
    id: "FR-1002",
    title: "Trasig spis",
    subtitle: "Syntetisk felanmälan · Kök",
    subject: "Trasig spis i köket",
    recommendation: "request_more_info",
    summarySv:
      "Syntetisk felanmälan: komplettering behövs innan bedömning.",
    reasonsSv: [
      "Felanmälan gäller en trasig spis.",
      "Uppgifter för att boka service saknas.",
    ],
    blockersSv: [],
    missingDetailsSv: [
      "Lägenhetsnummer saknas",
      "Önskad tid för service saknas",
    ],
    score: null,
    urgent: false,
  },
  {
    id: "FR-1003",
    title: "Glappkontakt i hall",
    subtitle: "Syntetisk felanmälan · Hall",
    subject: "Glappkontakt i hallbelysning",
    recommendation: "recommend",
    summarySv:
      "Syntetisk felanmälan: rekommenderas för planerad åtgärd.",
    reasonsSv: [
      "Felet bedöms inte vara akut.",
      "Ärendet kan hanteras i ordinarie planering.",
    ],
    blockersSv: [],
    missingDetailsSv: [],
    score: null,
    urgent: false,
  },
];

function findFaultReportCase(caseId: string): FaultReportCase | null {
  return FAULT_REPORT_CASES.find((entry) => entry.id === caseId) ?? null;
}

function toFaultReportSummary(entry: FaultReportCase): CaseSummary {
  return {
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle,
  };
}

export async function listFaultReportCases(): Promise<readonly CaseSummary[]> {
  return FAULT_REPORT_CASES.map(toFaultReportSummary);
}

export async function getFaultReportCase(
  caseId: string,
): Promise<CaseSummary | null> {
  const entry = findFaultReportCase(caseId);
  return entry ? toFaultReportSummary(entry) : null;
}

export async function decideFaultReportCase(
  caseId: string,
): Promise<Decision | null> {
  const entry = findFaultReportCase(caseId);
  if (!entry) {
    return null;
  }

  return {
    caseId: entry.id,
    subject: entry.subject,
    recommendation: entry.recommendation,
    summarySv: entry.summarySv,
    reasonsSv: entry.reasonsSv,
    blockersSv: entry.blockersSv,
    missingDetailsSv: entry.missingDetailsSv,
    score: entry.score,
    needsHumanReview:
      entry.urgent ||
      entry.recommendation === "escalate" ||
      entry.recommendation === "request_more_info",
    source: "rules",
    draftSv: null,
    requiresSignOff: false,
    disclaimerSv: null,
  };
}

export const faultReportDomainModule: DomainModule = {
  id: "fault-report",
  labelSv: "Felanmälan (syntetisk demo)",
  listCases: listFaultReportCases,
  getCase: getFaultReportCase,
  decide: decideFaultReportCase,
};
