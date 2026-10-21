import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecisionExplanation } from "../components/DecisionExplanation";
import type { Decision } from "../lib/domain/types";

const decision: Decision = {
  caseId: "L-1001",
  subject: "Anna Andersson",
  recommendation: "request_more_info",
  summarySv:
    "Rekommendation för Storgatan 12: begär komplettering av kontaktuppgifter.",
  reasonsSv: [
    "Köpoäng: 120 av högsta 120 i urvalet.",
    "Avdrag för ofullständiga kontaktuppgifter: 10 poäng.",
  ],
  blockersSv: [
    "Hushållet har 4 personer men bostaden tillåter högst 3.",
  ],
  missingDetailsSv: ["E-postadress saknas", "Telefonnummer saknas"],
  score: 74,
  needsHumanReview: true,
  source: "rules",
  draftSv: "Hej Anna Andersson, vi behöver komplettera dina uppgifter.",
  requiresSignOff: true,
  disclaimerSv: "Detta är ett osänt utkast.",
};

describe("DecisionExplanation", () => {
  it("asserts reasons, blockers, missing details, review flag and source", () => {
    render(<DecisionExplanation decision={decision} />);

    expect(screen.getByRole("heading", { name: "Skäl" })).toBeInTheDocument();
    for (const reason of decision.reasonsSv) {
      expect(screen.getByText(reason)).toBeInTheDocument();
    }

    expect(screen.getByRole("heading", { name: "Hinder" })).toBeInTheDocument();
    for (const blocker of decision.blockersSv) {
      expect(screen.getByText(blocker)).toBeInTheDocument();
    }

    expect(
      screen.getByRole("heading", { name: "Saknade uppgifter" }),
    ).toBeInTheDocument();
    for (const missing of decision.missingDetailsSv) {
      expect(screen.getByText(missing)).toBeInTheDocument();
    }

    expect(screen.getByText("Mänsklig granskning")).toBeInTheDocument();
    expect(screen.getByText("Krävs")).toBeInTheDocument();
    expect(screen.getByText("Bedömningskälla")).toBeInTheDocument();
    expect(screen.getByText("Regler")).toBeInTheDocument();
  });

  it("renders empty markers when explanation lists are empty", () => {
    render(
      <DecisionExplanation
        decision={{
          ...decision,
          reasonsSv: [],
          blockersSv: [],
          missingDetailsSv: [],
        }}
      />,
    );

    expect(screen.getByText("Inga skäl angivna.")).toBeInTheDocument();
    expect(screen.getByText("Inga hinder angivna.")).toBeInTheDocument();
    expect(screen.getByText("Inga saknade uppgifter.")).toBeInTheDocument();
  });
});
