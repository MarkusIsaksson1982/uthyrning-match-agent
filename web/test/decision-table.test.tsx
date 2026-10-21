import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DecisionTable, type DecisionRow } from "../components/DecisionTable";
import type { Decision } from "../lib/domain/types";

const decision: Decision = {
  caseId: "L-1001",
  subject: "Anna Andersson",
  recommendation: "recommend",
  summarySv: "Rekommendation för Storgatan 12: bjud in till visning.",
  reasonsSv: [
    "Köpoäng: 120 av högsta 120 i urvalet.",
    "Sammanlagd poäng: 87 av 100.",
  ],
  blockersSv: [],
  missingDetailsSv: [],
  score: 87,
  needsHumanReview: true,
  source: "model-assisted",
  draftSv: "Hej Anna Andersson, tack för din ansökan.",
  requiresSignOff: true,
  disclaimerSv: "Detta är ett osänt utkast.",
};

const rows: readonly DecisionRow[] = [
  {
    summary: {
      id: "L-1001",
      title: "Storgatan 12",
      subtitle: "2 rum · 62 kvm · 11 500 kr/mån",
    },
    decision,
  },
];

describe("DecisionTable", () => {
  it("renders a plain anchor, score, recommendation, review flag and source", () => {
    render(<DecisionTable rows={rows} />);

    const link = screen.getByRole("link", { name: "Storgatan 12" });
    expect(link).toHaveAttribute("href", "/cases/L-1001");
    expect(link).toHaveTextContent("Storgatan 12");

    const row = link.closest("tr");
    expect(row).not.toBeNull();
    if (row === null) {
      return;
    }

    expect(
      within(row).getByText("2 rum · 62 kvm · 11 500 kr/mån"),
    ).toBeInTheDocument();
    expect(within(row).getByText("Rekommenderas")).toBeInTheDocument();
    expect(within(row).getByText("87")).toBeInTheDocument();
    expect(within(row).getByText("Ja")).toBeInTheDocument();
    expect(within(row).getByText("Modellstödd")).toBeInTheDocument();
  });

  it("renders an empty state when there are no rows", () => {
    render(<DecisionTable rows={[]} />);

    expect(screen.getByText("Inga ärenden att visa.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
