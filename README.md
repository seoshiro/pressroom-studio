# PRESSROOM

**[Open the studio →](https://seoshiro.github.io/pressroom-studio/)**

An independent poster workshop by seoshiro. A tactile worktable, bold type, and three visible ink layers. Write, compose, offset the inks, then make a print.

## What you can do

- Five distinct compositions: Form / feel, Type matter, Exhibition, Rhythm, Cut / shift.
- Edit the headline, subheading and edition caption. Russian and English interface; switching language preserves your draft.
- Four curated ink palettes, three formats, bounded graphic scale, position, rotation, and seeded variations.
- Separate three ink layers; control density, multiply blending, registration offset, halftone and paper grain.
- Short mechanical print interaction; immediate result with reduced motion. No sound.
- Undo/redo (80 document states), protected reset, automatic local draft and a collection of up to 12 works.
- Download PNG at 3× resolution: portrait **2100 × 2970**, square **2400 × 2400**, landscape **3000 × 2100**. SVG exports contain outlined letters, so the typeface travels with the artwork.
- Save and reopen versioned JSON projects. Imports are schema checked and limited to 32 KiB; user text never becomes HTML.
- Touch controls, a mobile action dock, visible keyboard focus, accessible native dialogs, arrow-key tabs, and Ctrl/⌘ Z / Shift Z outside text fields.

No accounts, backend, trackers, API keys, subscriptions, or external runtime assets. Free static GitHub Pages hosting. Existing portfolio projects are separate and unmodified.

## Run locally

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

For real-browser QA, run the dev server in another terminal, then `npm run qa`. By default the suite uses installed Google Chrome. In CI it uses Playwright Chromium (`npx playwright install --with-deps chromium`). Set `QA_URL` to test a deployment, and `QA_FOLDER` to choose a private local evidence directory. The workflow verifies the project before publishing `dist/` to Pages; QA screenshots are **not** uploaded as workflow artifacts or shipped with the site.

## Stack and document model

TypeScript, Vite, native DOM controls, SVG geometry, and OpenType.js. A single bounded document model drives the preview, project JSON and export. Text is converted to paths with the bundled fonts; PNG is rasterized from the same SVG. Random grain and shapes are deterministic for a given seed. Rendering occurs only on document changes; there is no idle animation loop.

## Fonts, license and design references

Code and original procedural artwork: [MIT](LICENSE). Bundled **IBM Plex Sans Regular** and **IBM Plex Sans Condensed Bold**: IBM, SIL Open Font License 1.1; full notice at [public/fonts/OFL.txt](public/fonts/OFL.txt), original source at [IBM/plex](https://github.com/IBM/plex). Tests check actual Latin, Russian including Й/Ё, and selected extended glyphs in both TTF files. Font files are renamed for paths only; the typefaces are unmodified.

Primary references studied for principles of editorial contrast, type as image, and layered printing: [Cooper Hewitt — How Posters Work](https://www.cooperhewitt.org/2015/02/05/cooper-hewitt-to-present-special-exhibition-how-posters-work/), [Cooper Hewitt — Light Years](https://www.cooperhewitt.org/2013/03/11/light-years/), [MoMA — Armin Hofmann, Kunsterziehung in USA](https://www.moma.org/collection/works/7746), and [Peacock — Risograph](https://peacock.studio/making/risograph). No artwork, museum imagery or poster layouts are reproduced. All visuals in this project are original SVG geometry.

## Practical limits

This is an **RGB web tool**, not a CMYK proof, physical ink separation service or prepress package. Real paper, printer and colour management affect a physical print. Multiply blending can vary in vector software; PNG preserves the browser appearance. Fonts cover Latin/Cyrillic and many symbols; unsupported glyphs display a visible warning and a font replacement mark. Original Unicode text remains in JSON. Six headline lines are composed directly; additional lines are joined into the last line. Very long text is fitted to its reserved area.

Local works belong to this browser and site origin; clearing site data removes them. Back up important work with JSON. History is session-only. Storage errors do not stop editing and are reported clearly. Safari/Firefox and physical phone keyboards have not been verified in this Windows QA environment; mobile testing uses Chrome touch emulation.

See [QA.md](QA.md) for audit findings, corrections and the scope of the final checks.
