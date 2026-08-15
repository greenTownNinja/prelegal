# prelegal — frontend

Next.js app for prelegal. Currently hosts the **Mutual NDA creator** (KAN-2): fill in a
Common Paper cover page, watch the agreement assemble live, then print it or save it as a PDF.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## How it fits together

The prototype is entirely client-side — there is no API and nothing is persisted.

```
src/
  app/                     App Router entry, global + print styles
  components/
    NdaCreator.tsx         Owns the form state; editor beside live preview
    CoverPageForm.tsx      One control per blank on the cover page
    AgreementPreview.tsx   The document that gets printed
    Field.tsx              Label / hint / error wrappers shared by the form
  lib/nda/
    schema.ts              Zod schema for the cover page (source of truth)
    defaults.ts            Starting values
    standard-terms.ts      Standard Terms v1.0 text + cross-reference tokens
    render.ts              Phrases cover page answers as prose
```

`react-hook-form` holds the cover page; `NdaCreator` watches it so the preview re-renders as you
type. Printing runs through `handleSubmit`, so an incomplete agreement shows validation errors
instead of printing.

### Export

"Print / Save as PDF" calls `window.print()`. The print stylesheet in `app/globals.css` hides the
app chrome (`.print-hidden`), unwraps the fixed-height shell (`.print-shell`), and lets the
preview pane (`.print-document`) flow across pages.

### Template text

`lib/nda/standard-terms.ts` transcribes `templates/mutual-nda.md` from the repository root, and the
preview mirrors the layout of `templates/mutual-nda-coverpage.md`. The one notational change: the
source marks references back to the cover page with `<span class="coverpage_link">…</span>`, which
become `{{…}}` tokens here so `render.ts` can resolve them to live values (shown on hover).

If those templates are ever updated, `standard-terms.ts` has to be updated alongside them.

Common Paper templates are used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Prototype scope

Deliberately not built yet: saving or reloading drafts, more than two parties, e-signature, and any
of the other 11 templates in `catalog.json`. Output is a draft from a public template — not legal
advice.
