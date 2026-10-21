import { afterEach, describe, expect, it } from "vitest";
import { MAX_SCORE } from "../../src/rules.js";
import {
  getDomainModule,
  UnknownDomainError,
} from "../lib/domain/registry";

const originalDomain = process.env.DEMO_DOMAIN;

afterEach(() => {
  if (originalDomain === undefined) {
    delete process.env.DEMO_DOMAIN;
  } else {
    process.env.DEMO_DOMAIN = originalDomain;
  }
});

describe("domain registry", () => {
  it("smoke imports the src rules module", () => {
    expect(MAX_SCORE).toBe(100);
  });

  it("defaults to rental", () => {
    expect(getDomainModule({}).id).toBe("rental");
    expect(getDomainModule({ DEMO_DOMAIN: "" }).id).toBe("rental");
  });

  it("switches to fault-report from the environment", () => {
    expect(getDomainModule({ DEMO_DOMAIN: "fault-report" }).id).toBe(
      "fault-report",
    );
  });

  it("accepts process.env and restores it", () => {
    process.env.DEMO_DOMAIN = "fault-report";

    expect(getDomainModule(process.env).id).toBe("fault-report");
  });

  it("throws a typed error for unknown domains", () => {
    expect(() => getDomainModule({ DEMO_DOMAIN: "unknown" })).toThrow(
      UnknownDomainError,
    );

    try {
      getDomainModule({ DEMO_DOMAIN: "unknown" });
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownDomainError);
      expect((error as UnknownDomainError).domainId).toBe("unknown");
    }
  });
});
