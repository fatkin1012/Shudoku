# CONTRIBUTING — Toolbox Import Contract (TypeScript Projects)

Use this guide when preparing any external TypeScript project to be imported into Toolbox.

Current Toolbox behavior is static-preview-first:
- It imports repository source code.
- It runs the project build.
- It looks for a static `index.html` in build output.
- It serves that output under Toolbox route.

If the project does not satisfy this contract, Toolbox shows "no static preview detected".

## 1) Required project structure

At repository root:
- `package.json`
- `README.md`
- `.env.example` (if env vars are needed)
- one static build output folder after build (`dist` preferred, `build` or `out` also acceptable)

Recommended source layout:
- `src/`
- `public/` (optional)

## 2) Required scripts and dependency rules

`package.json` must include:
- `dev`
- `build`

Recommended:
- `preview` or `start`
- `typecheck`

Dependency rules:
- All packages needed to execute `npm run build` in CI/import flow must be installable from lockfile/package manifest.
- Keep lockfile in sync with `package.json`.
- Build tooling can stay in `devDependencies`, but build must still succeed in a clean install.

## 3) Static output contract (most important)

After `npm run build`, the project must produce a static HTML entry:
- `dist/index.html` (best), or
- `build/index.html`, or
- `out/index.html`

The generated `index.html` must be production-ready:
- Must not reference development entry like `/src/main.tsx`.
- Must reference built assets/chunks.

## 4) Framework-specific notes

Vite / CRA-style projects:
- Ensure `build` outputs to `dist` or `build`.
- Verify final HTML references bundled assets, not source files.

Next.js projects:
- Must support static export style output.
- Avoid server-only runtime assumptions for imported preview mode.

Projects requiring backend APIs:
- Provide mock/fallback behavior for preview mode, or
- Gracefully render error/retry UI instead of blank screen.

## 5) UI/UX compatibility rules for Toolbox preview

To ensure imported UI can actually be used inside Toolbox:
- First screen must render meaningful content quickly (avoid full-page hard-block).
- On API/auth failure, show actionable fallback and retry.
- Keep mobile/desktop responsive; no horizontal overflow on common breakpoints.
- Avoid hover-only interactions for critical actions.
- Keep touch targets usable (about 44px minimum height/width).
- Ensure text contrast and readable typography.
- Preserve navigation escape path (user should always be able to go back to Toolbox).

## 6) Pre-import self-check (copy/paste)

- [ ] `package.json` contains `dev` and `build` scripts
- [ ] Lockfile is committed and in sync
- [ ] Clean install succeeds
- [ ] `npm run build` succeeds without manual local hacks
- [ ] Build generates `dist/index.html` (or `build/index.html` / `out/index.html`)
- [ ] Generated HTML does not include `/src/...` script entry
- [ ] App renders a usable fallback UI when API/auth/config is missing
- [ ] Mobile and desktop layouts both work without horizontal scroll
- [ ] README includes exact run/build commands

## 7) Suggested quick verification commands

Run in project root:

```bash
npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
npm run build
```

Then manually confirm:
- build output folder exists
- `index.html` exists in that output
- HTML does not use `/src/` runtime entry

Keep this file in every new project template to make Toolbox imports predictable.
