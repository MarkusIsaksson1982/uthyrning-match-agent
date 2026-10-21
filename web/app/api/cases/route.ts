import { getDomainModule } from "../../../lib/domain/registry";
import type {
  CaseSummary,
  Decision,
  DomainId,
} from "../../../lib/domain/types";

export const dynamic = "force-dynamic";

export interface CaseWithDecision extends CaseSummary {
  readonly decision: Decision | null;
}

export interface CasesListResponse {
  readonly domain: DomainId;
  readonly cases: readonly CaseWithDecision[];
}

export async function GET(_request: Request): Promise<Response> {
  const domain = getDomainModule(process.env);
  const cases = await domain.listCases();
  const decisions = await Promise.all(
    cases.map((entry) => domain.decide(entry.id)),
  );

  const body: CasesListResponse = {
    domain: domain.id,
    cases: cases.map((entry, index) => ({
      ...entry,
      decision: decisions[index] ?? null,
    })),
  };

  return Response.json(body);
}
