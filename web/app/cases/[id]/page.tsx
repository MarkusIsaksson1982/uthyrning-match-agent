import { notFound } from "next/navigation";

import { DecisionExplanation } from "../../../components/DecisionExplanation";
import { DraftProposal } from "../../../components/DraftProposal";
import { ReviewControls } from "../../../components/ReviewControls";
import { getDomainModule } from "../../../lib/domain/registry";
import type { CasePageProps } from "../../../lib/domain/types";
import { getReview } from "../../../lib/reviewStore";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { id } = await params;
  const domain = getDomainModule(process.env);
  const [summary, decision] = await Promise.all([
    domain.getCase(id),
    domain.decide(id),
  ]);

  if (summary === null || decision === null) {
    notFound();
  }

  const review = await getReview(id);

  return (
    <main className="page">
      <header className="page__header">
        <p className="page__eyebrow">Ärende</p>
        <h1>{summary.title}</h1>
        <p className="page__lead">{summary.subtitle}</p>
      </header>

      <DecisionExplanation decision={decision} />

      <section className="decision-explanation" aria-label="Nuvarande granskning">
        <h2>Nuvarande granskning</h2>
        {review === null ? (
          <p className="decision-explanation__empty">
            Ingen granskning har registrerats.
          </p>
        ) : (
          <p className="decision-explanation__empty">
            {review.reviewer} · {review.action} · {review.finalRecommendation} ·{" "}
            {review.reviewedAt}
          </p>
        )}
      </section>

      {decision.draftSv !== null ? (
        <DraftProposal decision={decision} />
      ) : null}

      <ReviewControls
        caseId={id}
        decision={decision}
        review={review}
        currentReview={review}
      />
    </main>
  );
}
