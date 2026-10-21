import type {
  Decision,
  DecisionRecommendation,
  DecisionSource,
} from "../lib/domain/types";

export interface DecisionExplanationProps {
  readonly decision: Decision;
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

interface ExplanationGroupProps {
  readonly title: string;
  readonly items: readonly string[];
  readonly emptyText: string;
}

function ExplanationGroup({
  title,
  items,
  emptyText,
}: ExplanationGroupProps) {
  return (
    <section className="decision-explanation__group">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="decision-explanation__empty">{emptyText}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DecisionExplanation({ decision }: DecisionExplanationProps) {
  const scoreLabel = decision.score === null ? "Saknas" : String(decision.score);

  return (
    <section
      className="decision-explanation"
      aria-label="Förklaring av beslut"
    >
      <p className="decision-explanation__summary">{decision.summarySv}</p>

      <dl className="decision-explanation__meta">
        <div>
          <dt>Rekommendation</dt>
          <dd>{RECOMMENDATION_LABELS_SV[decision.recommendation]}</dd>
        </div>
        <div>
          <dt>Poäng</dt>
          <dd>{scoreLabel}</dd>
        </div>
        <div>
          <dt>Mänsklig granskning</dt>
          <dd>{decision.needsHumanReview ? "Krävs" : "Krävs inte"}</dd>
        </div>
        <div>
          <dt>Bedömningskälla</dt>
          <dd>{SOURCE_LABELS_SV[decision.source]}</dd>
        </div>
      </dl>

      <ExplanationGroup
        title="Skäl"
        items={decision.reasonsSv}
        emptyText="Inga skäl angivna."
      />
      <ExplanationGroup
        title="Hinder"
        items={decision.blockersSv}
        emptyText="Inga hinder angivna."
      />
      <ExplanationGroup
        title="Saknade uppgifter"
        items={decision.missingDetailsSv}
        emptyText="Inga saknade uppgifter."
      />
    </section>
  );
}
