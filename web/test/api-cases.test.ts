import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  GET as getCases,
  dynamic as listDynamic,
  type CasesListResponse,
} from "../app/api/cases/route";
import {
  GET as getCase,
  dynamic as detailDynamic,
  type CaseDetailResponse,
  type CaseNotFoundResponse,
} from "../app/api/cases/[id]/route";
import { reviewCaseAction } from "../app/cases/[id]/actions";
import type { ReviewActionState } from "../lib/domain/types";
import { getReview, reset } from "../lib/reviewStore";
import { revalidatePath } from "next/cache";

const originalDomain = process.env.DEMO_DOMAIN;

const idleState: ReviewActionState = {
  status: "idle",
  message: "Ingen granskning har registrerats.",
  record: null,
};

function request(path: string): Request {
  return new Request(`http://localhost${path}`);
}

function caseContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function reviewForm(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  delete process.env.DEMO_DOMAIN;
  reset();
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalDomain === undefined) {
    delete process.env.DEMO_DOMAIN;
  } else {
    process.env.DEMO_DOMAIN = originalDomain;
  }
});

describe("GET /api/cases", () => {
  it("exports force-dynamic", () => {
    expect(listDynamic).toBe("force-dynamic");
  });

  it("returns typed cases with decisions", async () => {
    const response = await getCases(request("/api/cases"));

    expect(response.status).toBe(200);

    const body = (await response.json()) as CasesListResponse;
    expect(body.domain).toBe("rental");
    expect(body.cases.length).toBeGreaterThan(0);
    expect(body.cases.map((entry) => entry.id)).toContain("L-1001");
    expect(body.cases.every((entry) => entry.decision !== null)).toBe(true);

    for (const entry of body.cases) {
      expect(entry.decision?.caseId).toBe(entry.id);
    }
  });
});

describe("GET /api/cases/[id]", () => {
  it("exports force-dynamic", () => {
    expect(detailDynamic).toBe("force-dynamic");
  });

  it("returns the case and its decision", async () => {
    const response = await getCase(
      request("/api/cases/L-1001"),
      caseContext("L-1001"),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as CaseDetailResponse;
    expect(body.domain).toBe("rental");
    expect(body.case.id).toBe("L-1001");
    expect(body.decision.caseId).toBe("L-1001");
    expect(body.decision.reasonsSv.length).toBeGreaterThan(0);
  });

  it("returns a typed 404 for an unknown case", async () => {
    const response = await getCase(
      request("/api/cases/L-9999"),
      caseContext("L-9999"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as CaseNotFoundResponse;
    expect(body.caseId).toBe("L-9999");
    expect(body.error).toContain("L-9999");
  });
});

describe("reviewCaseAction", () => {
  it("records an approve review, revalidates pages and returns ok", async () => {
    const result = await reviewCaseAction(
      idleState,
      reviewForm({
        caseId: "L-1001",
        action: "approve",
        reviewer: "Handläggare Test",
        note: "Underlaget är komplett.",
        finalRecommendation: "recommend",
      }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") {
      return;
    }

    expect(result.record).toMatchObject({
      caseId: "L-1001",
      action: "approve",
      reviewer: "Handläggare Test",
      note: "Underlaget är komplett.",
      finalRecommendation: "recommend",
    });
    expect(Number.isNaN(Date.parse(result.record.reviewedAt))).toBe(false);
    expect(await getReview("L-1001")).toEqual(result.record);
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/cases/L-1001");
  });

  it("records an override review", async () => {
    const result = await reviewCaseAction(
      idleState,
      reviewForm({
        caseId: "L-1002",
        action: "override",
        reviewer: "Handläggare Test",
        note: "Avslag enligt policy.",
        finalRecommendation: "decline",
      }),
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") {
      return;
    }

    expect(result.record.action).toBe("override");
    expect(result.record.finalRecommendation).toBe("decline");
    expect(await getReview("L-1002")).toEqual(result.record);
    expect(revalidatePath).toHaveBeenCalledWith("/cases/L-1002");
  });

  it("returns an error state for invalid input and stores nothing", async () => {
    const result = await reviewCaseAction(
      idleState,
      reviewForm({
        caseId: "L-1001",
        action: "send",
        reviewer: "Handläggare Test",
        note: "Ogiltig åtgärd.",
        finalRecommendation: "recommend",
      }),
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("action");
    }
    expect(await getReview("L-1001")).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
