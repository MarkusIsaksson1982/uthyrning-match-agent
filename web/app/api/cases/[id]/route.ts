import { getDomainModule } from "../../../../lib/domain/registry";
import type {
  CaseRouteContext,
  CaseSummary,
  Decision,
  DomainId,
} from "../../../../lib/domain/types";

export const dynamic = "force-dynamic";

export interface CaseDetailResponse {
  readonly domain: DomainId;
  readonly case: CaseSummary;
  readonly decision: Decision;
}

export interface CaseNotFoundResponse {
  readonly error: string;
  readonly caseId: string;
}

export async function GET(
  _request: Request,
  context: CaseRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const domain = getDomainModule(process.env);
  const [summary, decision] = await Promise.all([
    domain.getCase(id),
    domain.decide(id),
  ]);

  if (summary === null || decision === null) {
    const body: CaseNotFoundResponse = {
      error: `Ärendet ${id} hittades inte.`,
      caseId: id,
    };
    return Response.json(body, { status: 404 });
  }

  const body: CaseDetailResponse = {
    domain: domain.id,
    case: summary,
    decision,
  };
  return Response.json(body);
}
