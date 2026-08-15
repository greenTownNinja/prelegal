import type { CoverPage, Party } from "./schema";

/**
 * Starting values for a new agreement. These mirror the pre-filled suggestions
 * in `templates/mutual-nda-coverpage.md` (1-year term, evaluation purpose).
 */

const emptyParty: Party = {
  companyName: "",
  signatoryName: "",
  title: "",
  noticeAddress: "",
};

export const DEFAULT_COVER_PAGE: CoverPage = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  // Left blank on purpose: filling "today" during render would differ between
  // the server and the browser. `CoverPageForm` sets it on mount instead.
  effectiveDate: "",
  mndaTerm: { kind: "expires", years: 1 },
  confidentialityTerm: { kind: "years", years: 1 },
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  parties: [{ ...emptyParty }, { ...emptyParty }],
};

/** Today in the viewer's own timezone, as `YYYY-MM-DD`. */
export function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
