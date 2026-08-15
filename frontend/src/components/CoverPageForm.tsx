"use client";

import type { UseFormReturn } from "react-hook-form";

import { Field, FieldSet, inputClass } from "@/components/Field";
import type { CoverPage } from "@/lib/nda/schema";

/**
 * The editing pane: one control per blank on the Common Paper cover page.
 * State lives in the parent so the preview can watch the same form.
 */

/** Pulls a message off a react-hook-form error node without fighting its generics. */
function errorMessage(node: unknown): string | undefined {
  if (node && typeof node === "object" && "message" in node) {
    const message = (node as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

const PARTY_INDEXES = [0, 1] as const;

interface CoverPageFormProps {
  form: UseFormReturn<CoverPage>;
}

export function CoverPageForm({ form }: CoverPageFormProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const mndaTermKind = watch("mndaTerm.kind");
  const confidentialityKind = watch("confidentialityTerm.kind");

  // A term error can sit on the branch itself or on its year count.
  const branchError = (node: unknown) =>
    errorMessage((node as Record<string, unknown> | undefined)?.years) ?? errorMessage(node);
  const mndaTermError = branchError(errors.mndaTerm);
  const confidentialityError = branchError(errors.confidentialityTerm);

  const describedBy = (id: string, hasError: boolean) => (hasError ? `${id}-error` : undefined);

  return (
    <div className="space-y-5">
      <FieldSet title="The agreement">
        <Field
          label="Purpose"
          htmlFor="purpose"
          hint="How Confidential Information may be used."
          error={errorMessage(errors.purpose)}
        >
          <textarea
            id="purpose"
            rows={3}
            className={inputClass}
            aria-invalid={Boolean(errors.purpose)}
            aria-describedby={describedBy("purpose", Boolean(errors.purpose))}
            {...register("purpose")}
          />
        </Field>

        <Field label="Effective date" htmlFor="effectiveDate" error={errorMessage(errors.effectiveDate)}>
          <input
            id="effectiveDate"
            type="date"
            className={inputClass}
            aria-invalid={Boolean(errors.effectiveDate)}
            aria-describedby={describedBy("effectiveDate", Boolean(errors.effectiveDate))}
            {...register("effectiveDate")}
          />
        </Field>
      </FieldSet>

      <FieldSet title="Duration">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800">MNDA term</legend>
          <p className="text-xs text-slate-500">The length of this MNDA.</p>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" value="expires" {...register("mndaTerm.kind")} />
            <span className="flex items-center gap-2">
              Expires
              <input
                type="number"
                min={1}
                max={99}
                aria-label="Years until the MNDA expires"
                disabled={mndaTermKind !== "expires"}
                className={`${inputClass} w-20 disabled:bg-slate-100 disabled:text-slate-400`}
                {...register("mndaTerm.years", { valueAsNumber: true })}
              />
              year(s) from the effective date.
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" value="untilTerminated" {...register("mndaTerm.kind")} />
            Continues until terminated in accordance with the terms of the MNDA.
          </label>

          {mndaTermError ? (
            <p role="alert" className="text-xs text-red-600">
              {mndaTermError}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800">Term of confidentiality</legend>
          <p className="text-xs text-slate-500">How long Confidential Information is protected.</p>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" value="years" {...register("confidentialityTerm.kind")} />
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                aria-label="Years of confidentiality"
                disabled={confidentialityKind !== "years"}
                className={`${inputClass} w-20 disabled:bg-slate-100 disabled:text-slate-400`}
                {...register("confidentialityTerm.years", { valueAsNumber: true })}
              />
              year(s) from the effective date (trade secrets stay protected for as long as they
              remain trade secrets).
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" value="perpetual" {...register("confidentialityTerm.kind")} />
            In perpetuity.
          </label>

          {confidentialityError ? (
            <p role="alert" className="text-xs text-red-600">
              {confidentialityError}
            </p>
          ) : null}
        </fieldset>
      </FieldSet>

      <FieldSet title="Governing law & jurisdiction">
        <Field
          label="Governing law"
          htmlFor="governingLaw"
          hint="The state whose law governs the MNDA."
          error={errorMessage(errors.governingLaw)}
        >
          <input
            id="governingLaw"
            className={inputClass}
            placeholder="Delaware"
            aria-invalid={Boolean(errors.governingLaw)}
            aria-describedby={describedBy("governingLaw", Boolean(errors.governingLaw))}
            {...register("governingLaw")}
          />
        </Field>

        <Field
          label="Jurisdiction"
          htmlFor="jurisdiction"
          hint="City or county and state, e.g. “New Castle, DE”."
          error={errorMessage(errors.jurisdiction)}
        >
          <input
            id="jurisdiction"
            className={inputClass}
            placeholder="New Castle, DE"
            aria-invalid={Boolean(errors.jurisdiction)}
            aria-describedby={describedBy("jurisdiction", Boolean(errors.jurisdiction))}
            {...register("jurisdiction")}
          />
        </Field>
      </FieldSet>

      {PARTY_INDEXES.map((index) => {
        const partyErrors = errors.parties?.[index];
        return (
          <FieldSet key={index} title={`Party ${index + 1}`}>
            <Field
              label="Company"
              htmlFor={`party-${index}-company`}
              error={errorMessage(partyErrors?.companyName)}
            >
              <input
                id={`party-${index}-company`}
                className={inputClass}
                aria-invalid={Boolean(partyErrors?.companyName)}
                aria-describedby={describedBy(`party-${index}-company`, Boolean(partyErrors?.companyName))}
                {...register(`parties.${index}.companyName`)}
              />
            </Field>

            <Field
              label="Print name"
              htmlFor={`party-${index}-name`}
              error={errorMessage(partyErrors?.signatoryName)}
            >
              <input
                id={`party-${index}-name`}
                className={inputClass}
                aria-invalid={Boolean(partyErrors?.signatoryName)}
                aria-describedby={describedBy(`party-${index}-name`, Boolean(partyErrors?.signatoryName))}
                {...register(`parties.${index}.signatoryName`)}
              />
            </Field>

            <Field label="Title" htmlFor={`party-${index}-title`} error={errorMessage(partyErrors?.title)}>
              <input
                id={`party-${index}-title`}
                className={inputClass}
                aria-invalid={Boolean(partyErrors?.title)}
                aria-describedby={describedBy(`party-${index}-title`, Boolean(partyErrors?.title))}
                {...register(`parties.${index}.title`)}
              />
            </Field>

            <Field
              label="Notice address"
              htmlFor={`party-${index}-notice`}
              hint="Email or postal address."
              error={errorMessage(partyErrors?.noticeAddress)}
            >
              <textarea
                id={`party-${index}-notice`}
                rows={2}
                className={inputClass}
                aria-invalid={Boolean(partyErrors?.noticeAddress)}
                aria-describedby={describedBy(`party-${index}-notice`, Boolean(partyErrors?.noticeAddress))}
                {...register(`parties.${index}.noticeAddress`)}
              />
            </Field>
          </FieldSet>
        );
      })}

      <FieldSet title="Modifications" description="Anything that changes the Standard Terms belongs here — the cover page controls over conflicts.">
        <Field label="MNDA modifications" htmlFor="modifications" error={errorMessage(errors.modifications)}>
          <textarea
            id="modifications"
            rows={3}
            className={inputClass}
            placeholder="Leave blank if there are none."
            aria-invalid={Boolean(errors.modifications)}
            aria-describedby={describedBy("modifications", Boolean(errors.modifications))}
            {...register("modifications")}
          />
        </Field>
      </FieldSet>
    </div>
  );
}
