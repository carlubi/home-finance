# Accessibility and quantified craft specs

Linear's own writing treats accessibility lightly: "a baked-in accessibility contrast variable" derived in LCH, an iOS material that "mirrors [Increase Contrast] behavior exactly" and drops refraction for legibility, an underline-links preference, and focus-ring fixes logged as shipped work. That's a real gap: accessibility and the measurable details of interface craft are **structure, not polish**, and in the agent era they have to be written down so an agent can apply and check them. This file is the checkable layer the rest of the skill (which is about product judgment) deliberately doesn't cover.

Two reasons this belongs in the skill: (1) it's the dimension Linear under-documents, and (2) machines can't read tacit taste, codified rules are how craft scales across a large org and how agents apply it (see boundary #7 in `boundaries-and-peers.md`).

> [!note] Sourcing
> The named thresholds below come from **Vercel's Web Interface Guidelines** (https://vercel.com/design/guidelines, also shipped as an agent command and at https://github.com/vercel-labs/web-interface-guidelines) and **Rauno Freiberg's interfaces** (https://github.com/raunofreiberg/interfaces), cross-checked against the **Apple HIG**. Where a specific number lives on one source and not the other, that's noted. Treat the numbers as well-supported community/industry conventions, not as Linear's own published standard.

---

## Accessibility as a first-class discipline (Vercel WIG; Apple HIG)

- **Keyboard operability:** every interactive element reachable and operable by keyboard; logical tab order; no keyboard traps. Support a visible **`:focus-visible`** ring (don't remove focus outlines without replacing them).
- **Focus management:** on opening a dialog/menu, move focus in and **trap** it; on close, **restore** focus to the trigger. Manage focus on route changes.
- **Semantics first, ARIA second:** use native elements (`<button>`, `<a>`, `<label>`); reach for **WAI-ARIA** roles/states only when no native element fits. A `<div>` with a click handler is not a button.
- **Hit targets:** minimum **24×24px** (WCAG 2.2 target size), **44×44px** for primary touch targets (Apple HIG). Small visual controls can keep a larger invisible hit area.
- **Motion:** honor **`prefers-reduced-motion`**: provide a reduced/no-motion variant for every non-essential animation. (See boundary #8 on when motion communicates vs. when it's noise.)
- **Contrast, perceptually:** prefer **APCA** (the WCAG 3 contrast model) over the WCAG 2 ratio for judging real legibility, especially on non-black/white and on dark themes, WCAG 2's ratio misjudges these. Linear's LCH-derived contrast variable is the same instinct (perceptual, not nominal); APCA is the measurable target.
- **Other inputs that are accessibility, not polish:** respect `prefers-color-scheme`; don't convey state by color alone; give images meaningful `alt`; label icon-only buttons; ensure form fields have associated labels and clear error association.

## Quantified craft thresholds

These are the small, checkable numbers that separate "looks fine in a mockup" from "feels right in the product."

- **Inputs on mobile:** font-size **≥16px** on text inputs to prevent iOS Safari from auto-zooming on focus. (Rauno)
- **Interactive feedback scale:** subtle **press/active scale** on tappable controls (e.g. ~0.96–0.97) for tactile feedback; **dialogs/popovers enter at a slightly reduced scale** (e.g. ~0.95→1) rather than sliding far. (Rauno)
- **Focus ring:** a consistent, visible focus ring on all focusable elements, same treatment everywhere, offset so it isn't clipped. (Rauno)
- **Animate only compositor-friendly properties:** `transform` and `opacity`. **Never `transition: all`**: it animates layout-triggering properties and causes jank. (Vercel WIG; matches Linear's own "GPU-composited properties only" rule.)
- **Optical, not mathematical, alignment:** nudge icons and glyphs to look centered rather than being numerically centered; align to the cap height / optical center, not the bounding box.
- **Submenu safe areas (menu aim):** a pointer moving diagonally toward an open submenu must not close it. Use a dynamic safe triangle based on where the submenu sits. Most software "only works if you exactly hover over the menu" (Karri Saarinen, on a Linear engineer building this unasked).
- **Consistent interaction timing:** hover-in/out and press durations are a system standard, and one component breaking it is a defect (the Quality Wednesdays origin story). Codify them as tokens so lint can catch drift (Linear's StyleX rules do this for animation).
- **Tabular numerals** for any changing or column-aligned numbers (counts, timers, tables) so digits don't shift width.
- **Text:** prevent orphans/widows on headings; cap line length for readability; use real ellipsis/truncation with a title attribute, not silent clipping.
- **Touch/scroll hygiene:** disable text selection on controls that act like buttons; avoid accidental double-tap zoom on tap targets; respect safe-area insets on mobile.

## How to use this file

When the task is **product judgment** (what should exist, is this the right problem), this file is not the point, use SKILL.md. When the task is **execution or review of a real interface**, treat the list above as a checklist an agent can actually run against the code. Most items are pass/fail, which is exactly why they're worth codifying: they don't need taste to enforce.
