import type {
  CaseSummary,
  Decision,
  DecisionRecommendation,
  DecisionSource,
} from "../lib/domain/types";

export interface DecisionRow {
  readonly summary: CaseSummary;
  readonly decision: Decision | null;
}

export interface DecisionTableProps {
  readonly rows: readonly DecisionRow[];
}

const RECOMMENDATION_LABELS_SV: Record<DecisionRecommendation, string> = {
  recommend: "Rekommenderas",
  decline: "Avslås",
  request_more_info: "Begär komplettering",
  escalate: "Eskalera",
};

const SOURCE_LABELS_SV: Record<DecisionSource, string> = {
  rules: "Regler",
  "model-assisted": "Modellstödd",
};

export function recommendationLabelSv(
  recommendation: DecisionRecommendation,
): string {
  return RECOMMENDATION_LABELS_SV[recommendation];
}

export function sourceLabelSv(source: DecisionSource): string {
  return SOURCE_LABELS_SV[source];
}

export function DecisionTable({ rows }: DecisionTableProps) {
  if (rows.length === 0) {
    return <p className="decision-table__empty">Inga ärenden att visa.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="decision-table">
        <caption>Ärenden med rekommendationer</caption>
        <thead>
          <tr>
            <th scope="col">Ärende</th>
            <th scope="col">Rekommendation</th>
            <th scope="col">Poäng</th>
            <th scope="col">Mänsklig granskning</th>
            <th scope="col">Källa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ summary, decision }) => (
            <tr key={summary.id}>
              <td>
                <a
                  className="decision-table__case-title"
                  href={`/cases/${encodeURIComponent(summary.id)}`}
                >
                  {summary.title}
                </a>
                <span className="decision-table__subtitle">
                  {summary.subtitle}
                </span>
              </td>
              <td>
                {decision ? (
                  <span className="recommendation">
                    {recommendationLabelSv(decision.recommendation)}
                  </span>
                ) : (
                  <span className="source">Ingen bedömning</span>
                )}
              </td>
              <td className="decision-table__score">
                {decision?.score ?? "Saknas"}
              </td>
              <td>
                {decision ? (
                  <span
                    className={
                      decision.needsHumanReview
                        ? "flag flag--review"
                        : "flag flag--ok"
                    }
                  >
                    {decision.needsHumanReview ? "Ja" : "Nej"}
                  </span>
                ) : (
                  <span className="source">Saknas</span>
                )}
              </td>
              <td>
                <span className="source">
                  {decision ? sourceLabelSv(decision.source) : "Saknas"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
