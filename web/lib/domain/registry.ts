import { faultReportDomainModule } from "./faultReportStub";
import { rentalDomainModule } from "./rental";
import type { DomainEnv, DomainId, DomainModule } from "./types";

export const DEFAULT_DOMAIN: DomainId = "rental";

export class UnknownDomainError extends Error {
  readonly domainId: string;

  constructor(domainId: string) {
    super(`Okänd domän: ${domainId}`);
    this.name = "UnknownDomainError";
    this.domainId = domainId;
  }
}

function resolveDomainId(env: DomainEnv): DomainId {
  const candidate = env.DEMO_DOMAIN?.trim();
  if (!candidate) {
    return DEFAULT_DOMAIN;
  }
  if (candidate === "rental" || candidate === "fault-report") {
    return candidate;
  }
  throw new UnknownDomainError(candidate);
}

export function getDomainModule(env: DomainEnv): DomainModule {
  const domainId = resolveDomainId(env);

  switch (domainId) {
    case "rental":
      return rentalDomainModule;
    case "fault-report":
      return faultReportDomainModule;
    default: {
      const exhaustive: never = domainId;
      return exhaustive;
    }
  }
}
