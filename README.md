# Shudoku

A lightweight Sudoku mini-game built with React + TypeScript + Vite, designed to work with ProjectOrbit static preview import rules.

## Scripts

- `npm run dev`: Start local development server
- `npm run build`: Build production assets to `dist/`
- `npm run start`: Preview production build
- `npm run typecheck`: Run TypeScript checks without emit
- `npm run lint`: Lint TypeScript and TSX files

## Local Run

```bash
npm install --include=dev --no-audit --no-fund
npm run dev
```

## Production Build Check

```bash
npm run build
```

After build, verify:

- `dist/index.html` exists
- `dist/index.html` references bundled assets, not `/src/...`

## Orbit Preview Compatibility

- First screen renders immediate, meaningful content
- Works without backend dependency
- Responsive layout for desktop and mobile
- Keyboard and touch friendly interaction base

## Current Status

Phase 4 complete:

- Static entry wired for Vite
- Playable 9x9 Sudoku board with keyboard and click input
- Puzzle controls: easy/medium/hard new game, reset, check, and hint
- Responsive mobile/desktop layout with accessible focus states
- Context-aware highlights (row/column/box and matching numbers)
- In-game timer and enhanced status guidance
- Local auto-save and session recovery in browser storage
- Toggleable real-time conflict check mode (classic/manual mode optional)
- Generator mode: each new game builds a fresh Sudoku puzzle client-side

Next phase can focus on generation speed tuning, streak leaderboard, and theme packs.
