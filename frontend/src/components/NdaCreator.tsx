"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { AgreementPreview } from "@/components/AgreementPreview";
import { CoverPageForm } from "@/components/CoverPageForm";
import { DEFAULT_COVER_PAGE, todayISO } from "@/lib/nda/defaults";
import { coverPageSchema, type CoverPage } from "@/lib/nda/schema";

/**
 * Owns the cover page state and puts the editor beside a live preview.
 * Printing goes through validation first, so an incomplete agreement can be
 * drafted on screen but never quietly printed.
 */
export function NdaCreator() {
  const form = useForm<CoverPage>({
    resolver: zodResolver(coverPageSchema),
    defaultValues: DEFAULT_COVER_PAGE,
    mode: "onBlur",
  });

  const { handleSubmit, setValue, watch } = form;

  // Defaulting to today has to happen in the browser — see DEFAULT_COVER_PAGE.
  useEffect(() => {
    setValue("effectiveDate", todayISO());
  }, [setValue]);

  const cover = watch();
  const print = handleSubmit(() => window.print());

  return (
    <div className="print-shell mx-auto flex max-w-7xl flex-col px-4 py-8 lg:h-screen">
      <header className="print-hidden mb-6 flex flex-none flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mutual NDA creator</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fill in the cover page; the agreement on the right updates as you type. When it looks
            right, print it or save it as a PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={print}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Print / Save as PDF
        </button>
      </header>

      {/* Each pane scrolls on its own so the form and the document stay side by side. */}
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <form className="print-hidden space-y-5 lg:h-full lg:overflow-y-auto lg:pr-2" onSubmit={print} noValidate>
          <CoverPageForm form={form} />
          <p className="text-xs text-slate-500">
            Prototype only — this generates a draft from a public template and is not legal advice.
          </p>
        </form>

        <div className="print-document rounded-lg border border-slate-200 bg-white p-8 shadow-sm lg:h-full lg:overflow-y-auto">
          <AgreementPreview cover={cover} />
        </div>
      </div>
    </div>
  );
}
