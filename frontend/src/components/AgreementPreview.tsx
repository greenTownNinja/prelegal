"use client";

import { Fragment } from "react";

import {
  describeConfidentialityTerm,
  describeMndaTerm,
  formatEffectiveDate,
  parseInline,
  resolveReference,
} from "@/lib/nda/render";
import type { CoverPage } from "@/lib/nda/schema";
import {
  ATTRIBUTION,
  STANDARD_TERMS,
  STANDARD_TERMS_URL,
  STANDARD_TERMS_VERSION,
} from "@/lib/nda/standard-terms";

/**
 * The document itself — everything rendered here is what ends up on paper, so
 * it avoids screen-only affordances. Its container carries `print-document`.
 */

/** Unfilled blanks read as `[Placeholder]`, matching the source template. */
function Blank({ value, placeholder }: { value: string; placeholder: string }) {
  const filled = value.trim();
  return filled ? (
    <span className="whitespace-pre-line">{filled}</span>
  ) : (
    <span className="text-slate-400 italic">[{placeholder}]</span>
  );
}

function Checkbox({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="font-mono">
        {checked ? "[x]" : "[ ]"}
      </span>
      <span className={checked ? "" : "text-slate-400"}>
        <span className="sr-only">{checked ? "Selected: " : "Not selected: "}</span>
        {children}
      </span>
    </li>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-1 text-sm font-semibold tracking-wide text-slate-900 uppercase">{children}</h3>;
}

export function AgreementPreview({ cover }: { cover: CoverPage }) {
  const { parties } = cover;

  return (
    <article className="font-serif text-[15px] leading-relaxed text-slate-900">
      <h1 className="text-center text-xl font-bold">Mutual Non-Disclosure Agreement</h1>

      <p className="mt-4 text-sm">
        This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“
        <strong>Cover Page</strong>”) and (2) the Common Paper Mutual NDA Standard Terms Version{" "}
        {STANDARD_TERMS_VERSION} (“<strong>Standard Terms</strong>”) identical to those posted at{" "}
        <a className="underline" href={STANDARD_TERMS_URL}>
          commonpaper.com/standards/mutual-nda/{STANDARD_TERMS_VERSION}
        </a>
        . Any modifications of the Standard Terms should be made on the Cover Page, which will
        control over conflicts with the Standard Terms.
      </p>

      <SectionHeading>Purpose</SectionHeading>
      <p>
        <Blank value={cover.purpose} placeholder="How Confidential Information may be used" />
      </p>

      <SectionHeading>Effective Date</SectionHeading>
      <p>{formatEffectiveDate(cover.effectiveDate)}</p>

      <SectionHeading>MNDA Term</SectionHeading>
      <ul className="space-y-1">
        <Checkbox checked={cover.mndaTerm.kind === "expires"}>
          {describeMndaTerm({
            kind: "expires",
            years: cover.mndaTerm.kind === "expires" ? cover.mndaTerm.years : Number.NaN,
          })}
        </Checkbox>
        <Checkbox checked={cover.mndaTerm.kind === "untilTerminated"}>
          {describeMndaTerm({ kind: "untilTerminated" })}
        </Checkbox>
      </ul>

      <SectionHeading>Term of Confidentiality</SectionHeading>
      <ul className="space-y-1">
        <Checkbox checked={cover.confidentialityTerm.kind === "years"}>
          {describeConfidentialityTerm({
            kind: "years",
            years:
              cover.confidentialityTerm.kind === "years"
                ? cover.confidentialityTerm.years
                : Number.NaN,
          })}
        </Checkbox>
        <Checkbox checked={cover.confidentialityTerm.kind === "perpetual"}>
          {describeConfidentialityTerm({ kind: "perpetual" })}
        </Checkbox>
      </ul>

      <SectionHeading>Governing Law &amp; Jurisdiction</SectionHeading>
      <p>
        Governing Law: <Blank value={cover.governingLaw} placeholder="Fill in state" />
      </p>
      <p>
        Jurisdiction: <Blank value={cover.jurisdiction} placeholder="Fill in city or county and state" />
      </p>

      <SectionHeading>MNDA Modifications</SectionHeading>
      <p>
        {cover.modifications.trim() ? (
          <span className="whitespace-pre-line">{cover.modifications.trim()}</span>
        ) : (
          <span className="text-slate-500">None.</span>
        )}
      </p>

      <p className="mt-6 text-sm">
        By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective
        Date.
      </p>

      <div className="print-keep-together mt-4 grid gap-4 sm:grid-cols-2">
        {parties.map((party, index) => (
          <section key={index} className="border border-slate-300 p-4 text-sm">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Party {index + 1}
            </h3>
            <dl className="space-y-2">
              {(
                [
                  ["Company", party.companyName, "Company"],
                  ["Print Name", party.signatoryName, "Name"],
                  ["Title", party.title, "Title"],
                  ["Notice Address", party.noticeAddress, "Email or postal address"],
                ] as const
              ).map(([label, value, placeholder]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd>
                    <Blank value={value} placeholder={placeholder} />
                  </dd>
                </div>
              ))}
              <div className="pt-4">
                <dt className="text-xs text-slate-500">Signature</dt>
                <dd className="mt-6 border-b border-slate-400" />
              </div>
              <div className="pt-2">
                <dt className="text-xs text-slate-500">Date</dt>
                <dd className="mt-6 border-b border-slate-400" />
              </div>
            </dl>
          </section>
        ))}
      </div>

      <h2 className="mt-10 text-center text-lg font-bold">Standard Terms</h2>

      <ol className="mt-4 space-y-4">
        {STANDARD_TERMS.map((section, index) => (
          <li key={section.heading} className="text-sm">
            <span className="font-semibold">
              {index + 1}. {section.heading}.
            </span>{" "}
            {parseInline(section.body).map((segment, segmentIndex) => {
              if (segment.type === "bold") {
                return <strong key={segmentIndex}>{segment.value}</strong>;
              }
              if (segment.type === "reference") {
                return (
                  <span
                    key={segmentIndex}
                    title={resolveReference(cover, segment.value)}
                    className="underline decoration-slate-400 decoration-dotted underline-offset-2"
                  >
                    {segment.value}
                  </span>
                );
              }
              return <Fragment key={segmentIndex}>{segment.value}</Fragment>;
            })}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-xs text-slate-500">{ATTRIBUTION}</p>
    </article>
  );
}
