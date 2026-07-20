# Codex project rules

## UI quality rules

These rules apply to every UI change in this repository.

- Present one clear primary path for each task. Do not give equal visual weight to exceptional or fallback actions.
- Keep exceptional inputs and advanced controls hidden until the user explicitly chooses or needs them.
- Do not display the same information twice or require users to enter a value that can be derived from an existing selection.
- Do not use persistent explanatory copy to compensate for an unclear interface. Prefer clear labels, progressive disclosure, contextual tooltips, and confirmation previews.
- Build new setup UI with the shared components in `src/components/setup/SetupFormParts.tsx`. Do not introduce a visually independent panel when an existing shared primitive can express it.
- Preserve the established hierarchy, spacing, color, radius, responsive behavior, and dark-mode behavior of adjacent screens. A new section must look native to the screen that contains it.
- Before considering a UI change complete, review the actual screen for information density, alignment, spacing, operation order, mobile behavior, empty states, and dark mode—not only type correctness.
- When a design decision is ambiguous, prefer the calmer interface: fewer simultaneous controls, less repeated copy, and disclosure at the point of need.

## Documentation

- Place generated reviews, specifications, and reference documents under `docs/`.
- `README.md`, `AGENTS.md`, `CODEX.md`, and tool configuration files may remain at the project root.

