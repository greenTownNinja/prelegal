import type { CoverPage } from "./schema";
import type { CoverPageReference } from "./standard-terms";

/**
 * Presentation helpers shared by the form and the preview: every place that
 * needs to phrase a cover page answer in prose goes through here.
 */

/** Shows the template's own bracketed blank while a field is still empty. */
function orBlank(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : `[${label}]`;
}

function years(count: number): string {
  // The year input is empty (NaN) until the user types into it.
  if (!Number.isFinite(count)) return "[N] year(s)";
  return count === 1 ? "1 year" : `${count} years`;
}

/**
 * Formats `YYYY-MM-DD` as a long date. Parsed as UTC deliberately: a plain
 * `new Date("2026-08-15")` is midnight UTC, which reads as the previous day in
 * any negative-offset timezone.
 */
export function formatEffectiveDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "[Today’s date]";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "[Today’s date]";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function describeMndaTerm(term: CoverPage["mndaTerm"]): string {
  return term.kind === "expires"
    ? `Expires ${years(term.years)} from the Effective Date.`
    : "Continues until terminated in accordance with the terms of the MNDA.";
}

export function describeConfidentialityTerm(term: CoverPage["confidentialityTerm"]): string {
  return term.kind === "years"
    ? `${years(term.years)} from the Effective Date, but in the case of trade secrets until the ` +
        "Confidential Information is no longer considered a trade secret under applicable laws."
    : "In perpetuity.";
}

/**
 * The value a Standard Terms cross-reference points at. The reference itself
 * still reads as its label in the document body (substituting the full text
 * inline would break the sentences); this is what the reader sees on hover.
 */
export function resolveReference(cover: CoverPage, reference: CoverPageReference): string {
  switch (reference) {
    case "Purpose":
      return orBlank(cover.purpose, "Purpose");
    case "Effective Date":
      return formatEffectiveDate(cover.effectiveDate);
    case "MNDA Term":
      return describeMndaTerm(cover.mndaTerm);
    case "Term of Confidentiality":
      return describeConfidentialityTerm(cover.confidentialityTerm);
    case "Governing Law":
      return orBlank(cover.governingLaw, "Fill in state");
    case "Jurisdiction":
      return orBlank(cover.jurisdiction, "Fill in city or county and state");
  }
}

export type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "reference"; value: CoverPageReference };

const INLINE_PATTERN = /\*\*(.+?)\*\*|\{\{(.+?)\}\}/g;

/** Splits section prose into plain text, `**bold**` runs, and `{{reference}}` links. */
export function parseInline(body: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(INLINE_PATTERN)) {
    const index = match.index;
    if (index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "bold", value: match[1] });
    } else {
      segments.push({ type: "reference", value: match[2] as CoverPageReference });
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }
  return segments;
}
