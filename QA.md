# PRESSROOM verification

Final local application revision checked on 2026-10-10 at 21:30 UTC using installed Google Chrome with Playwright. Evidence stays in the local ignored `qa-captures/` directory, outside the published site and Git history.

## Audits with findings and corrections

1. **Actual screenshot review** at 1440, 390 and 768: supporting template labels were too small, the mobile print action required too much scrolling, and long input copy was partly hidden in a short textarea. Increased UI captions, expanded the textarea, and added a mobile action dock that hides during text entry and dialogs. Removed a placeholder brand link and named native dialogs. A first sandboxed deterministic 21st CLI review identified the placeholder link. A network-enabled repeat was rejected by automatic approval review; subsequent independent tooling was local axe only.
2. **Local axe audit**: muted captions had contrast 4.42–4.46 against 4.5 required. Darkened the muted token. Expanded mobile axe coverage then found the My works button lost its accessible name when its visible caption was hidden; added a permanent localized name. Rechecked both fixes.
3. **Source and interaction review**: palette/language rebuilds lost focus; duplicate SVG clip IDs could affect other formats; export filename could follow a newer edit rather than the clicked document. Restored control focus and panel scroll, removed shared SVG IDs in favor of viewport clipping, and froze the export snapshot. Verified unique IDs, keyboard focus, formats, history and repeated actions.
4. **Final visual export review** found an incomplete subtitle even though preview and PNG agreed. OpenType.js 2's decimal conversion produced `NaN` for tiny finite glyph coordinates. Added a direct finite SVG path serializer and regression test. Final browser checks validate full subtitle bounds, absence of invalid SVG numbers and normal-page console errors, as well as PNG pixel equality. Final screenshots show the complete subtitle.

## Final successful checks

- `npm run lint`, `npm run typecheck`, `npm test` (6 meaningful model/font/outline tests), `npm run build`.
- Browser suite: **29 passed scenario groups**, no failures and no unexpected browser/console errors on normal pages.
- Desktop 1366×900, 1440×900, 1920×1080; touch emulation 360×800, 390×844, 768×1024. RU and EN screenshots at every width, with no page horizontal overflow.
- Seven axe WCAG A/AA states: desktop text, empty collection, help, ink controls, print controls, finished print, mobile. Zero reported violations in these inspected states; this is not a claim of exhaustive accessibility certification.
- Real touch editing and palette selection; keyboard tab arrows, visible focus, undo/redo, Escape dialogs; protected reset and undo.
- Five distinct templates retain custom text; all three formats; 160-character headline; Russian Й/Ё, selected extended symbols; HTML-like input stays inert.
- Draft, language and saved collection survive reload; 12-work limit, protected deletion and reopening; storage denied, quota failure and corrupt draft recovery.
- Invalid and oversized JSON rejected; exact valid project roundtrip.
- Real downloaded SVG has outlined text and no font dependency or invalid coordinates. Decoded PNG dimensions: portrait 2100×2970, square 2400×2400, landscape 3000×2100. Pixel data matches the same SVG preview rasterized at full resolution in each format.
- Reduced-motion and animated print, repeated clicks, unsupported glyph warning, all-ink-off state, font failure/retry and PNG encoder failure recovery.

## Evidence and practical limits

Local evidence: `qa-captures/first/`, `audit-2/`, `audit-3/`, `audit-4/`, `final/report.json`, seven `final/axe-*.json` files, RU/EN width screenshots, five template screenshots, `final/finished.png`, downloaded PNG/SVG/JSON files. Captures are deliberately ignored by Git and absent from Pages artifacts.

The browser-use connector failed to initialize in this execution environment. QA therefore used the user's installed Chrome through Playwright, plus touch emulation, rather than an existing interactive tab. Physical phone keyboards, Safari and Firefox remain unverified. Exports are RGB, and vector-app multiply blending may differ; PNG captures the browser appearance. Fonts and data limitations are documented in README.

The same suite is part of CI and can run against the live Pages URL with `QA_URL`. A live run is recorded privately after the first deployment; its CI run and exact deployed SHA are reported with delivery.
