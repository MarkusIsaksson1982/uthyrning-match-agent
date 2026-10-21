import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "../app/api/cases/[id]/review/route";
import type {
  ReviewBadRequestResponse,
  ReviewCreatedResponse,
} from "../lib/api/contracts";
import { getReview, reset } from "../lib/reviewStore";

const validBody = {
  action: "approve",
  reviewer: "Handläggare Test",
  note: "Underlaget är komplett.",
  finalRecommendation: "recommend",
} as const;

function reviewRequest(id: string, body: unknown): Promise<Response> {
  return POST(
    new Request(`http://localhost/api/cases/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  reset();
});

describe("POST /api/cases/[id]/review", () => {
  it("returns 201 with a typed record and stores it", async () => {
    const response = await reviewRequest("L-1001", {
      ...validBody,
      caseId: "IGNORED",
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as ReviewCreatedResponse;
    expect(body.caseId).toBe("L-1001");
    expect(body.action).toBe("approve");
    expect(body.reviewer).toBe(validBody.reviewer);
    expect(body.note).toBe(validBody.note);
    expect(body.finalRecommendation).toBe("recommend");
    expect(Number.isNaN(Date.parse(body.reviewedAt))).toBe(false);
    expect(await getReview("L-1001")).toEqual(body);
  });

  it("records an override", async () => {
    const response = await reviewRequest("L-1002", {
      ...validBody,
      action: "override",
      note: "Avslå enligt policy.",
      finalRecommendation: "decline",
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as ReviewCreatedResponse;
    expect(body.action).toBe("override");
    expect(body.finalRecommendation).toBe("decline");
    expect(await getReview("L-1002")).toEqual(body);
  });

  it("returns a typed 400 for invalid input and stores nothing", async () => {
    const response = await reviewRequest("L-1001", {
      ...validBody,
      action: "send",
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as ReviewBadRequestResponse;
    expect(body.error).toContain("action");
    expect(body.fields).toContain("action");
    expect(await getReview("L-1001")).toBeNull();
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await reviewRequest("L-1001", {
      action: "approve",
      note: "Ingen handläggare.",
      finalRecommendation: "recommend",
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as ReviewBadRequestResponse;
    expect(body.fields).toContain("reviewer");
    expect(await getReview("L-1001")).toBeNull();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/cases/L-1001/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ id: "L-1001" }) },
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as ReviewBadRequestResponse;
    expect(body.fields).toEqual([]);
  });
});
