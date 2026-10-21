import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/cases/[id]/actions", () => ({
  reviewCaseAction: vi.fn(async () => ({
    status: "ok",
    message: "Granskningen har registrerats lokalt.",
    record: {
      caseId: "L-1001",
      action: "approve",
      reviewer: "Handläggare Test",
      note: "Underlaget är komplett.",
      finalRecommendation: "recommend",
      reviewedAt: "2026-01-01T00:00:00.000Z",
    },
  })),
}));

import { reviewCaseAction } from "../app/cases/[id]/actions";
import { ReviewControls } from "../components/ReviewControls";
import type { Decision } from "../lib/domain/types";

const decision: Decision = {
  caseId: "L-1001",
  subject: "Anna Andersson",
  recommendation: "recommend",
  summarySv: "Rekommendation för L-1001: bjud in till visning.",
  reasonsSv: [],
  blockersSv: [],
  missingDetailsSv: [],
  score: 100,
  needsHumanReview: false,
  source: "rules",
  draftSv: null,
  requiresSignOff: false,
  disclaimerSv: null,
};

describe("ReviewControls", () => {
  it("submits through the mocked action and shows the current review", async () => {
    const user = userEvent.setup();

    render(
      <ReviewControls caseId="L-1001" decision={decision} review={null} />,
    );

    await user.type(screen.getByLabelText(/granskare/i), "Handläggare Test");
    await user.click(
      screen.getByRole("button", { name: /registrera granskning/i }),
    );

    await waitFor(() => {
      expect(reviewCaseAction).toHaveBeenCalled();
    });

    const formData = (reviewCaseAction as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as FormData;
    expect(formData.get("caseId")).toBe("L-1001");
    expect(formData.get("reviewer")).toBe("Handläggare Test");

    expect(
      await screen.findByText(/Handläggare Test/i),
    ).toBeInTheDocument();
  });
});
