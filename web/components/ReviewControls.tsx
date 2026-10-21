"use client";

import { useActionState } from "react";

import { reviewCaseAction } from "../app/cases/[id]/actions";
import type {
  Decision,
  DecisionRecommendation,
  ReviewActionState,
  ReviewRecord,
} from "../lib/domain/types";

export const initialReviewActionState: ReviewActionState = {
  status: "idle",
  message: "Ingen granskning har registrerats.",
  record: null,
};

export const initialState = initialReviewActionState;
export const initialReviewState = initialReviewActionState;

export interface ReviewControlsProps {
  readonly caseId?: string;
  readonly id?: string;
  readonly decision?: Decision | null;
  readonly review?: ReviewRecord | null;
  readonly currentReview?: ReviewRecord | null;
  readonly initialReview?: ReviewRecord | null;
  readonly reviewRecord?: ReviewRecord | null;
}

function resolveCaseId(props: ReviewControlsProps): string {
  return (
    props.caseId ??
    props.id ??
    props.decision?.caseId ??
    ""
  );
}

function resolveReview(props: ReviewControlsProps): ReviewRecord | null {
  return (
    props.review ??
    props.currentReview ??
    props.initialReview ??
    props.reviewRecord ??
    null
  );
}

const RECOMMENDATIONS: readonly DecisionRecommendation[] = [
  "recommend",
  "decline",
  "request_more_info",
  "escalate",
];

export function ReviewControls(props: ReviewControlsProps) {
  const caseId = resolveCaseId(props);
  const currentReview = resolveReview(props);
  const decision = props.decision ?? null;
  const [state, formAction] = useActionState(
    reviewCaseAction,
    initialReviewActionState,
  );

  const displayedReview =
    state !== null && state.status === "ok" ? state.record : currentReview;

  return (
    <section className="decision-explanation" aria-label="Granskning">
      <h2>Granskning</h2>
      {displayedReview === null ? (
        <p className="decision-explanation__empty">
          Ingen granskning har registrerats.
        </p>
      ) : (
        <p className="decision-explanation__empty">
          {displayedReview.reviewer} · {displayedReview.action} ·{" "}
          {displayedReview.finalRecommendation} · {displayedReview.reviewedAt}
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="caseId" value={caseId} />
        <label>
          Åtgärd
          <select name="action" defaultValue="approve">
            <option value="approve">Godkänn</option>
            <option value="override">Åsidosätt</option>
          </select>
        </label>
        <label>
          Granskare
          <input name="reviewer" type="text" required />
        </label>
        <label>
          Anteckning
          <textarea name="note" />
        </label>
        <label>
          Slutlig rekommendation
          <select
            name="finalRecommendation"
            defaultValue={decision?.recommendation ?? "recommend"}
          >
            {RECOMMENDATIONS.map((recommendation) => (
              <option key={recommendation} value={recommendation}>
                {recommendation}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Registrera granskning</button>
      </form>

      {state !== null && state.status !== "idle" ? (
        <p role="status">{state.message}</p>
      ) : null}
    </section>
  );
}

export default ReviewControls;
