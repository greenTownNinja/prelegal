import { jsPDF } from "jspdf";

import {
  describeConfidentialityTerm,
  describeMndaTerm,
  formatEffectiveDate,
  parseInline,
  type Segment,
} from "./render";
import type { CoverPage } from "./schema";
import {
  ATTRIBUTION,
  STANDARD_TERMS,
  STANDARD_TERMS_URL,
  STANDARD_TERMS_VERSION,
} from "./standard-terms";

/**
 * Builds the signed-ready agreement as a real PDF, so the download button
 * produces a file directly instead of routing the user through the browser's
 * print dialog. The layout mirrors `AgreementPreview`; both read the same cover
 * page, so a change to the document has to be made in both places.
 *
 * Text is drawn as text (not a screenshot of the preview), which keeps the PDF
 * selectable, searchable, and small.
 */

const PAGE = { width: 612, height: 792 } as const; // US Letter, in points.
const MARGIN = { top: 64, bottom: 64, x: 64 } as const;
const CONTENT_WIDTH = PAGE.width - MARGIN.x * 2;

const BODY_SIZE = 10.5;
const BODY_LEADING = 14;

/** Slate-500, matching the placeholder/label grey used on screen. */
const MUTED: [number, number, number] = [100, 116, 139];
const INK: [number, number, number] = [15, 23, 42];

type Style = "normal" | "bold" | "italic";

interface RichRun {
  text: string;
  style?: Style;
  muted?: boolean;
}

/** Joins adjacent runs that share a style, so they print as a single string. */
function mergeRuns(runs: RichRun[]): RichRun[] {
  const merged: RichRun[] = [];
  for (const run of runs) {
    const previous = merged[merged.length - 1];
    if (previous && previous.style === run.style && previous.muted === run.muted) {
      previous.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

/**
 * A cursor over the document: everything below draws through it so page breaks
 * are handled in one place.
 */
class Writer {
  readonly doc: jsPDF;
  y: number = MARGIN.top;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "letter" });
    this.doc.setFont("times", "normal");
  }

  private apply(style: Style, size: number, muted: boolean) {
    this.doc.setFont("times", style);
    this.doc.setFontSize(size);
    const [r, g, b] = muted ? MUTED : INK;
    this.doc.setTextColor(r, g, b);
  }

  /** Starts a new page when `height` would not fit under the bottom margin. */
  ensure(height: number) {
    if (this.y + height > PAGE.height - MARGIN.bottom) {
      this.doc.addPage();
      this.y = MARGIN.top;
    }
  }

  gap(height: number) {
    this.y += height;
  }

  /**
   * Lays out mixed-style runs as wrapped lines. Runs are split into words so a
   * bold lead-in and the prose that follows share the same paragraph.
   */
  paragraph(
    runs: RichRun[],
    options: {
      size?: number;
      leading?: number;
      x?: number;
      width?: number;
      align?: "left" | "center";
      indent?: number;
    } = {},
  ) {
    const size = options.size ?? BODY_SIZE;
    const leading = options.leading ?? BODY_LEADING;
    const left = options.x ?? MARGIN.x;
    const width = options.width ?? CONTENT_WIDTH;
    const indent = options.indent ?? 0;

    // Tokens keep their trailing space so widths measure the way they print.
    const tokens: RichRun[] = [];
    for (const run of runs) {
      for (const word of run.text.split(/(\s+)/)) {
        if (word === "") continue;
        tokens.push({ ...run, text: word.replace(/\s+/g, " ") });
      }
    }

    let line: RichRun[] = [];
    let lineWidth = 0;
    let isFirstLine = true;

    const flush = () => {
      if (line.length === 0) return;
      // Trailing whitespace should not push a centred line off balance.
      while (line.length > 0 && line[line.length - 1].text === " ") line.pop();
      this.ensure(leading);
      const available = width - (isFirstLine ? indent : 0);
      const used = mergeRuns(line).reduce((total, chunk) => {
        this.apply(chunk.style ?? "normal", size, chunk.muted ?? false);
        return total + this.doc.getTextWidth(chunk.text);
      }, 0);
      let x = left + (isFirstLine ? indent : 0);
      if (options.align === "center") x += (available - used) / 2;

      // Neighbouring tokens that share a style are drawn as one string so the
      // PDF keeps its natural word spacing instead of word-by-word placement.
      for (const chunk of mergeRuns(line)) {
        this.apply(chunk.style ?? "normal", size, chunk.muted ?? false);
        this.doc.text(chunk.text, x, this.y + size);
        x += this.doc.getTextWidth(chunk.text);
      }
      this.y += leading;
      line = [];
      lineWidth = 0;
      isFirstLine = false;
    };

    for (const token of tokens) {
      this.apply(token.style ?? "normal", size, token.muted ?? false);
      const tokenWidth = this.doc.getTextWidth(token.text);
      const available = width - (isFirstLine ? indent : 0);
      if (lineWidth + tokenWidth > available && line.length > 0) {
        flush();
        if (token.text === " ") continue; // No leading space after a wrap.
      }
      line.push(token);
      lineWidth += tokenWidth;
    }
    flush();
  }

  /** Multi-line values (addresses, modifications) keep their own line breaks. */
  block(text: string, runStyle: Omit<RichRun, "text"> = {}, options = {}) {
    for (const paragraph of text.split("\n")) {
      this.paragraph([{ text: paragraph || " ", ...runStyle }], options);
    }
  }

  heading(text: string) {
    this.ensure(BODY_LEADING * 2);
    this.gap(10);
    this.paragraph([{ text: text.toUpperCase(), style: "bold" }], { size: 9.5, leading: 13 });
  }
}

/** Unfilled blanks read as `[Placeholder]`, matching the preview. */
function blank(value: string, placeholder: string): RichRun[] {
  const filled = value.trim();
  return filled
    ? [{ text: filled }]
    : [{ text: `[${placeholder}]`, style: "italic", muted: true }];
}

function checkbox(writer: Writer, checked: boolean, label: string) {
  writer.paragraph(
    [
      { text: checked ? "[x]" : "[ ]", style: "bold" },
      { text: ` ${label}`, muted: !checked },
    ],
    { x: MARGIN.x + 12, width: CONTENT_WIDTH - 12 },
  );
}

/** Standard Terms cross-references print as their label, as they do on screen. */
function toRuns(segments: Segment[]): RichRun[] {
  return segments.map((segment) =>
    segment.type === "bold"
      ? { text: segment.value, style: "bold" as const }
      : { text: segment.value },
  );
}

function partyBox(writer: Writer, party: CoverPage["parties"][number], index: number) {
  const fields: Array<[string, string, string]> = [
    ["Company", party.companyName, "Company"],
    ["Print Name", party.signatoryName, "Name"],
    ["Title", party.title, "Title"],
    ["Notice Address", party.noticeAddress, "Email or postal address"],
  ];

  writer.gap(12);
  // Keep a party's block whole: roughly four labelled fields plus two rules.
  writer.ensure(BODY_LEADING * 9);
  const startPage = writer.doc.getCurrentPageInfo().pageNumber;
  const top = writer.y;

  writer.gap(10);
  writer.paragraph([{ text: `PARTY ${index + 1}`, style: "bold", muted: true }], {
    size: 8.5,
    leading: 14,
    x: MARGIN.x + 12,
    width: CONTENT_WIDTH - 24,
  });

  for (const [label, value, placeholder] of fields) {
    writer.paragraph([{ text: label, muted: true }], {
      size: 8,
      leading: 11,
      x: MARGIN.x + 12,
      width: CONTENT_WIDTH - 24,
    });
    const box = { x: MARGIN.x + 12, width: CONTENT_WIDTH - 24 };
    if (value.trim()) {
      // Addresses are typed across several lines; keep those breaks.
      for (const line of value.trim().split("\n")) {
        writer.paragraph([{ text: line || " " }], box);
      }
    } else {
      writer.paragraph(blank("", placeholder), box);
    }
    writer.gap(4);
  }

  // Signature and date rules, side by side.
  writer.gap(14);
  const ruleY = writer.y + 16;
  const half = (CONTENT_WIDTH - 24) / 2;
  for (const [offset, label] of [
    [0, "Signature"],
    [half + 12, "Date"],
  ] as const) {
    writer.doc.setFontSize(8);
    writer.doc.setFont("times", "normal");
    writer.doc.setTextColor(...MUTED);
    writer.doc.text(label, MARGIN.x + 12 + offset, writer.y);
    writer.doc.setDrawColor(148, 163, 184);
    writer.doc.line(MARGIN.x + 12 + offset, ruleY, MARGIN.x + 12 + offset + half - 12, ruleY);
  }
  writer.y = ruleY + 12;

  // A long notice address can spill onto the next page; the border then frames
  // only what is left on the final page rather than running off it.
  const brokeAcrossPages = writer.doc.getCurrentPageInfo().pageNumber !== startPage;
  const borderTop = brokeAcrossPages ? MARGIN.top - 8 : top;
  writer.doc.setDrawColor(203, 213, 225);
  writer.doc.rect(MARGIN.x, borderTop, CONTENT_WIDTH, writer.y - borderTop);
  writer.doc.setTextColor(...INK);
}

/** Renders the whole agreement and hands back the document. */
export function buildAgreementPdf(cover: CoverPage): jsPDF {
  const writer = new Writer();

  writer.paragraph([{ text: "Mutual Non-Disclosure Agreement", style: "bold" }], {
    size: 16,
    leading: 22,
    align: "center",
  });
  writer.gap(6);

  writer.paragraph([
    { text: "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“" },
    { text: "Cover Page", style: "bold" },
    { text: `”) and (2) the Common Paper Mutual NDA Standard Terms Version ${STANDARD_TERMS_VERSION} (“` },
    { text: "Standard Terms", style: "bold" },
    {
      text: `”) identical to those posted at ${STANDARD_TERMS_URL} . Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.`,
    },
  ]);

  writer.heading("Purpose");
  if (cover.purpose.trim()) {
    writer.block(cover.purpose.trim());
  } else {
    writer.paragraph(blank("", "How Confidential Information may be used"));
  }

  writer.heading("Effective Date");
  writer.paragraph([{ text: formatEffectiveDate(cover.effectiveDate) }]);

  writer.heading("MNDA Term");
  checkbox(
    writer,
    cover.mndaTerm.kind === "expires",
    describeMndaTerm({
      kind: "expires",
      years: cover.mndaTerm.kind === "expires" ? cover.mndaTerm.years : Number.NaN,
    }),
  );
  checkbox(
    writer,
    cover.mndaTerm.kind === "untilTerminated",
    describeMndaTerm({ kind: "untilTerminated" }),
  );

  writer.heading("Term of Confidentiality");
  checkbox(
    writer,
    cover.confidentialityTerm.kind === "years",
    describeConfidentialityTerm({
      kind: "years",
      years:
        cover.confidentialityTerm.kind === "years" ? cover.confidentialityTerm.years : Number.NaN,
    }),
  );
  checkbox(
    writer,
    cover.confidentialityTerm.kind === "perpetual",
    describeConfidentialityTerm({ kind: "perpetual" }),
  );

  writer.heading("Governing Law & Jurisdiction");
  writer.paragraph([{ text: "Governing Law: " }, ...blank(cover.governingLaw, "Fill in state")]);
  writer.paragraph([
    { text: "Jurisdiction: " },
    ...blank(cover.jurisdiction, "Fill in city or county and state"),
  ]);

  writer.heading("MNDA Modifications");
  if (cover.modifications.trim()) {
    writer.block(cover.modifications.trim());
  } else {
    writer.paragraph([{ text: "None.", muted: true }]);
  }

  writer.gap(10);
  writer.paragraph([
    {
      text: "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.",
    },
  ]);

  cover.parties.forEach((party, index) => partyBox(writer, party, index));

  writer.doc.addPage();
  writer.y = MARGIN.top;
  writer.paragraph([{ text: "Standard Terms", style: "bold" }], {
    size: 14,
    leading: 20,
    align: "center",
  });
  writer.gap(6);

  STANDARD_TERMS.forEach((section, index) => {
    writer.gap(8);
    writer.paragraph(
      [
        { text: `${index + 1}. ${section.heading}. `, style: "bold" },
        ...toRuns(parseInline(section.body)),
      ],
      { size: 9.5, leading: 13 },
    );
  });

  writer.gap(16);
  writer.paragraph([{ text: ATTRIBUTION, muted: true }], {
    size: 8,
    leading: 11,
    align: "center",
  });

  return writer.doc;
}

function slug(value: string): string {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** `Mutual-NDA-Acme-Globex-2026-08-15.pdf`, falling back when names are blank. */
export function agreementFileName(cover: CoverPage): string {
  const names = cover.parties.map((party) => slug(party.companyName)).filter(Boolean);
  return ["Mutual-NDA", ...names, cover.effectiveDate].join("-") + ".pdf";
}

/** Generates the PDF and saves it through the browser's download flow. */
export function downloadAgreementPdf(cover: CoverPage) {
  buildAgreementPdf(cover).save(agreementFileName(cover));
}
