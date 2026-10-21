import { DecisionTable, type DecisionRow } from "../components/DecisionTable";
import { getDomainModule } from "../lib/domain/registry";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const domain = getDomainModule(process.env);
  const cases = await domain.listCases();
  const decisions = await Promise.all(
    cases.map((entry) => domain.decide(entry.id)),
  );

  const rows: readonly DecisionRow[] = cases.map((summary, index) => ({
    summary,
    decision: decisions[index] ?? null,
  }));

  return (
    <main className="page">
      <header className="page__header">
        <p className="page__eyebrow">Internt beslutsstöd</p>
        <h1>Beslutsdashboard</h1>
        <p className="page__lead">
          Domän: {domain.labelSv}. Rekommendationerna är beslutsstöd och kräver
          mänsklig granskning innan något används eller skickas.
        </p>
      </header>
      <DecisionTable rows={rows} />
    </main>
  );
}
