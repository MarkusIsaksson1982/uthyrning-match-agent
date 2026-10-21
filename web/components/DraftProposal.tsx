import type { Decision } from "../lib/domain/types";

interface DraftLike {
  readonly draftSv?: string | null;
  readonly requiresSignOff?: boolean;
  readonly disclaimerSv?: string | null;
}

export interface DraftProposalProps {
  readonly decision?: Decision | null;
  readonly draft?: string | DraftLike | null;
  readonly draftSv?: string | null;
  readonly requiresSignOff?: boolean;
  readonly disclaimer?: string | null;
  readonly disclaimerSv?: string | null;
  readonly signOffWarning?: string;
}

function resolveDraft(props: DraftProposalProps): {
  draftSv: string | null;
  requiresSignOff: boolean;
  disclaimerSv: string | null;
} {
  const source = props.decision ?? null;
  const draftObject =
    typeof props.draft === "string" || props.draft === null
      ? null
      : props.draft;

  return {
    draftSv:
      props.draftSv ??
      (typeof props.draft === "string" ? props.draft : null) ??
      draftObject?.draftSv ??
      source?.draftSv ??
      null,
    requiresSignOff:
      props.requiresSignOff ??
      draftObject?.requiresSignOff ??
      source?.requiresSignOff ??
      true,
    disclaimerSv:
      props.disclaimerSv ??
      props.disclaimer ??
      draftObject?.disclaimerSv ??
      source?.disclaimerSv ??
      null,
  };
}

export function DraftProposal(props: DraftProposalProps) {
  const { draftSv, requiresSignOff, disclaimerSv } = resolveDraft(props);
  const signOffWarning =
    props.signOffWarning ??
    "Kräver signering av handläggare innan utkastet används.";

  return (
    <section className="decision-explanation" aria-label="Osänt utkast">
      <h2>Osänt utkast</h2>
      <p className="decision-explanation__summary">
        {draftSv === null ? "Inget utkast genererat." : draftSv}
      </p>
      {requiresSignOff ? (
        <p className="decision-explanation__empty">{signOffWarning}</p>
      ) : null}
      {disclaimerSv === null ? null : (
        <p className="decision-explanation__empty">{disclaimerSv}</p>
      )}
    </section>
  );
}

export default DraftProposal;
