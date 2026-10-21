import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DraftProposal } from "../components/DraftProposal";
import type { Decision } from "../lib/domain/types";

const decision: Decision = {
  caseId: "L-1001",
  subject: "Anna Andersson",
  recommendation: "recommend",
  summarySv: "Rekommendation för L-1001: bjud in till visning.",
  reasonsSv: ["Köpoäng: 120 av högsta 120 i urvalet."],
  blockersSv: [],
  missingDetailsSv: [],
  score: 100,
  needsHumanReview: false,
  source: "rules",
  draftSv: "Hej Anna Andersson,\n\nTack för din ansökan.",
  requiresSignOff: true,
  disclaimerSv: "Detta är ett osänt utkast.",
};

describe("DraftProposal", () => {
  it("shows the disclaimer and sign-off warning and has no send button", () => {
    render(<DraftProposal decision={decision} />);

    expect(screen.getByText("Detta är ett osänt utkast.")).toBeInTheDocument();
    expect(screen.getByText(/signering/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
