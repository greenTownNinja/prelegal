import { z } from "zod";

/**
 * Shape of the Common Paper Mutual NDA Cover Page (Version 1.0).
 *
 * Every field here maps to a blank on `templates/mutual-nda-coverpage.md`; the
 * Standard Terms then reference these values by name (see `standard-terms.ts`).
 */

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

const yearCount = z
  .number({ error: "Enter a number of years." })
  .int("Use whole years.")
  .min(1, "Must be at least 1 year.")
  .max(99, "Must be 99 years or fewer.");

export const partySchema = z.object({
  companyName: requiredText("Company"),
  signatoryName: requiredText("Print name"),
  title: requiredText("Title"),
  noticeAddress: requiredText("Notice address", 500),
});

export const coverPageSchema = z.object({
  purpose: requiredText("Purpose", 1000),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an effective date."),

  mndaTerm: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("expires"), years: yearCount }),
    z.object({ kind: z.literal("untilTerminated") }),
  ]),

  confidentialityTerm: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("years"), years: yearCount }),
    z.object({ kind: z.literal("perpetual") }),
  ]),

  governingLaw: requiredText("Governing law"),
  jurisdiction: requiredText("Jurisdiction"),
  // Optional in substance, but always present as a string so the form's input
  // and output types stay identical.
  modifications: z.string().trim().max(2000, "Keep modifications under 2000 characters."),

  parties: z.tuple([partySchema, partySchema]),
});

export type Party = z.infer<typeof partySchema>;
export type CoverPage = z.infer<typeof coverPageSchema>;
