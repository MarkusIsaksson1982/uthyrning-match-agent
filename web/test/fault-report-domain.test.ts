import { describe, expect, it } from "vitest";
import { faultReportDomainModule } from "../lib/domain/faultReportStub";

describe("fault-report domain stub", () => {
  it("lists synthetic fault cases", async () => {
    const cases = await faultReportDomainModule.listCases();

    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every((entry) => entry.id.startsWith("FR-"))).toBe(true);
    expect(await faultReportDomainModule.getCase("missing")).toBeNull();
  });

  it("returns generic rule decisions for known cases", async () => {
    const cases = await faultReportDomainModule.listCases();
    const decisions = await Promise.all(
      cases.map((entry) => faultReportDomainModule.decide(entry.id)),
    );

    expect(decisions.every((decision) => decision !== null)).toBe(true);
    expect(decisions.every((decision) => decision?.source === "rules")).toBe(
      true,
    );
  });

  it("flags urgent faults for human review", async () => {
    const decision = await faultReportDomainModule.decide("FR-1001");

    expect(decision?.needsHumanReview).toBe(true);
  });

  it("lists missing details for incomplete reports", async () => {
    const decision = await faultReportDomainModule.decide("FR-1002");

    expect(decision?.missingDetailsSv.length).toBeGreaterThan(0);
  });
});
