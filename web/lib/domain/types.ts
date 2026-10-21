export type DomainId = "rental" | "fault-report";

export type DomainEnv = Readonly<Record<string, string | undefined>>;

export type DecisionRecommendation =
  | "recommend"
  | "decline"
  | "request_more_info"
  | "escalate";

export type DecisionSource = "rules" | "model-assisted";

export interface CaseSummary {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
}

export interface Decision {
  readonly caseId: string;
  readonly subject: string;
  readonly recommendation: DecisionRecommendation;
  readonly summarySv: string;
  readonly reasonsSv: readonly string[];
  readonly blockersSv: readonly string[];
  readonly missingDetailsSv: readonly string[];
  readonly score: number | null;
  readonly needsHumanReview: boolean;
  readonly source: DecisionSource;
  readonly draftSv: string | null;
  readonly requiresSignOff: boolean;
  readonly disclaimerSv: string | null;
}

export interface DomainModule {
  readonly id: DomainId;
  readonly labelSv: string;
  listCases(): Promise<readonly CaseSummary[]>;
  getCase(caseId: string): Promise<CaseSummary | null>;
  decide(caseId: string): Promise<Decision | null>;
}

export type ReviewAction = "approve" | "override";

export interface ReviewInput {
  readonly caseId: string;
  readonly action: ReviewAction;
  readonly reviewer: string;
  readonly note: string;
  readonly finalRecommendation: DecisionRecommendation;
}

export interface ReviewRecord extends ReviewInput {
  readonly reviewedAt: string;
}

export interface ReviewStore {
  recordReview(input: ReviewInput): Promise<ReviewRecord>;
  getReview(caseId: string): Promise<ReviewRecord | null>;
  reset(): void;
}

export type ReviewActionState =
  | { readonly status: "idle"; readonly message: string; readonly record: null }
  | { readonly status: "ok"; readonly message: string; readonly record: ReviewRecord }
  | { readonly status: "error"; readonly message: string; readonly record: null };

export interface CaseRouteContext {
  readonly params: Promise<{ id: string }>;
}

export interface CasePageProps {
  readonly params: Promise<{ id: string }>;
}
