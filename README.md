# PokeScan MVP (Expo + TypeScript)

Production-oriented MVP for **fast bulk Pokémon card inventory entry** on iPhone.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Expo:
   ```bash
   npm run start
   ```
3. Run recognition/matching tests (TypeScript via `tsx` + Node test runner):
   ```bash
   npm run test
   ```
   - Optional forwarded flags are accepted (for compatibility with commands like `npm test -- --runInBand --verbose`).

## UX Polish Highlights (iPhone-first)

### Scan-confirm-add loop
- Near full-screen scan view with a compact top status strip.
- Bottom-anchored result panel with thumb-friendly primary **Add** action.
- Human-readable confidence labels: **Very likely / Likely / Needs review**.
- One-tap quantity adjust, one-tap variant cycle, and one-tap undo.
- Subtle success toast + haptic feedback after add.
- Debounced recognition updates to reduce flicker during rapid OCR changes.

### Selected-set visibility
- Scope chip is always visible on scan screen (`Selected Sets (N)` or `All Sets`).
- Scope picker opens as a bottom sheet modal for quick switching.
- Sets screen includes summary chips (`X selected`, `Y cached`) and clear messaging that selected sets improve speed.

### Fast correction flow
- Wrong-card/candidate review uses a lightweight bottom sheet with top likely matches.
- Inline candidate previews in result panel for quick tapping.
- Review queue count visible during scanning.

### Collection + Sets mobile polish
- Improved spacing, larger touch targets, and consistent dark visual style.
- Collection list uses cleaner cards, quick +/- quantity controls, duplicate filter chip, and detail sheet.
- Sets list uses clearer selected/cached states, cache summary card, and friendly empty/error copy.

## Recognition + Matching Pipeline

- Structured OCR output (`raw`, `lines`, normalized lines, candidate names/numbers/set hints/language hints).
- OCR normalization for common confusions (`O/0`, `I/l/1`, `S/5`, `B/8`, `G/6`).
- Weighted deterministic matcher with confidence buckets and explainable score components.
- Selected-set-first candidate pooling with local indexing for speed.


## Troubleshooting

- If `expo start` crashes with `Cannot find module expo-router/internal/routing`, make sure typed routes are disabled in `app.json` (this repo defaults to disabled) and reinstall dependencies.
- Use Node **20 LTS** (recommended for Expo SDK 52). Node 24 can be unstable with some Expo tooling.
- Reset local installs when switching branches:
  - macOS/Linux:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    npm run start
    ```
  - Windows PowerShell:
    ```powershell
    Remove-Item -Recurse -Force node_modules, package-lock.json
    npm install
    npm run start
    ```

## MVP Limitations

- Camera OCR provider is still mocked by default.
- Candidate review is embedded in scan flow; a dedicated full review queue screen is a future enhancement.
- Settings toggles are scaffolded and not fully persisted through UI controls.

## Next Steps

- Integrate real live-camera OCR provider.
- Add dedicated batch review queue screen with skip/resolve workflow.
- Add richer manual fallback search route with prefilled OCR terms.
