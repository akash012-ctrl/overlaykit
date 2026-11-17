---
inclusion: always
---

# Architecture rules

Full design: `docs/ARCHITECTURE.md`. Module table in §4, dependency map in §5, error codes in §8.

## Layers

Modules live in `src/modules/<name>/` and expose their public API only through `index.ts`.

```
app (src/app routes) → ui
ui         → guide, components, locale, speech, ocr, capture, geometry, shared
guide      → components, geometry, shared
components → geometry, shared
geometry, ocr, capture, locale, speech → shared
shared     → nothing
```

- No cycles, no imports between same-level modules, no deep imports. `ui` is the only place where modules get wired together.
- Routes in `src/app` stay thin: they render a `ui` screen and hold no logic.
- `components` means machine components (card reader, buttons). Reusable React views belong in `ui`.
- `backend/` is never imported by app code. `locale` calls it over HTTPS, with text only.

## Typed observations

- OCR output is `OcrResult` (defined in `shared`): lines with text, a quad in upright image pixels, the script, confidence when the engine provides it, the frame ID, and the capture timestamp.
- Every derived result (overlay, machine match, checkpoint) keeps the frame ID it came from.
- Only `geometry` converts image space to view space. No coordinate math in `ui`.
- Failures are `Result` values using codes from `shared`. Don't throw across module boundaries. Every code maps to a UI state.

## Provider adapters

- Camera, OCR, translation, and text-to-speech engines sit behind interfaces in their own module (for example `TranslationProvider`). App behaviour depends on the interface, never on the vendor.
- Adapters convert vendor types to `shared` types at the boundary. Vendor types never leave `capture`, `ocr`, `locale`, or `speech`.
- Swapping a provider changes one adapter and adds an entry to `docs/DECISIONS.md`.
- TM-01 fixture content is typed data in `components` and `guide`, validated by tests. It is never used as a translation source.

## State

- Use React state and hooks in `ui`, plus one small settings store in `locale`. Adding a state library needs a decision.
- The Guide step logic is a pure reducer with no React or camera imports (D-019).
- No mutable global singletons other than native adapter instances.
