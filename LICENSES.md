# Third-Party Material and AI Disclosure

List material frameworks, libraries, starters, templates, UI kits, fonts, icons and assets used in this repository.

| Name | Version or source URL | Licence | Used for |
|---|---|---|---|
| React | 19.2.8 — <https://react.dev/> | MIT | UI component framework |
| react-dom | 19.2.8 — <https://react.dev/> | MIT | DOM rendering for React |
| Recharts | 3.10.1 — <https://recharts.org/> | MIT | The balance chart (required item 2) |
| lucide-react | 1.37.0 — <https://lucide.dev/> | ISC | Icons throughout the UI |
| Vite | 8.2.2 — <https://vitejs.dev/> | MIT | Dev server and production build (build-time only, not shipped) |
| @vitejs/plugin-react | 6.1.1 — <https://github.com/vitejs/vite-plugin-react> | MIT | React support in Vite (build-time only) |
| Tailwind CSS | 4.3.3 — <https://tailwindcss.com/> | MIT | Utility-class styling, compiled to static CSS at build time |
| @tailwindcss/vite | 4.3.3 — <https://tailwindcss.com/> | MIT | Tailwind's Vite plugin (build-time only) |
| TypeScript | 6.0.3 — <https://www.typescriptlang.org/> | Apache-2.0 | Type checking (`tsc -b`); compiled away, no runtime shipped |
| Vitest | 4.1.11 — <https://vitest.dev/> | MIT | Test runner (`npm run test`), 57 tests |
| oxlint | 1.80.0 — <https://oxc.rs/> | MIT | Linting (`npm run lint`) |
| create-vite react-ts template | bundled with `create-vite` — <https://vite.dev/> | MIT | Initial project scaffold (`index.html`, `tsconfig*.json`, `.gitignore` shape); all application code (`src/`) was written for this problem |
| Google Fonts — Inter, JetBrains Mono | <https://fonts.google.com/> | SIL Open Font License 1.1 | Display typography only; the app falls back to system fonts if this fails to load and remains fully functional either way |

Vite/TypeScript/Vitest/oxlint/Tailwind's build tooling are development-time
dependencies only and do not appear in the built `dist/` output shipped to
the live URL.

The sample household in `src/lib/data.ts` (case `PUB-01`) is drawn from
the problem's own published sample dataset
(`P10_prepaid_meter_public.json`), supplied for this problem by the
organisers. It is data, not third-party code, and carries no separate
licence beyond the problem's own terms.

## AI tools

Claude (Anthropic) was used throughout — for scaffolding the project,
writing the domain logic in `src/lib/`, writing the UI components in
`src/components/`, writing the test suites, and reviewing the build for
bugs. See `evaluation-manifest.json`'s `ai_tools_used` for what it was
used for and how its output was verified (short version: every
calculation was independently cross-checked — see the note in
`evaluation-manifest.json` and the "Problem-solving approach" section
of `README.md`).

## Original-work statement

Everything not declared in this file or `EVENT.md` was created by the
registered team during the event window.
