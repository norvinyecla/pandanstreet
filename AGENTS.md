# AGENTS.md

Instructions for AI coding agents working in this repository. See [README.md](README.md) for the product spec.

## Repo Structure

Monorepo layout:

```
/frontend   — ReactJS + TailwindCSS
/backend    — NestJS
/backend/data — CSV data files and uploaded photos
```

## Tooling

- **Package manager:** yarn (use `yarn`, not `npm` or `pnpm`, for installs and scripts)
- **Node version:** latest LTS. Pin it in an `.nvmrc` at the repo root once the project is scaffolded.
- **Language:** TypeScript everywhere — both `/frontend` and `/backend`. No plain `.js` files.
- **Frontend:** ReactJS, TailwindCSS (light mode only for now)
- **Backend:** NestJS
- **Data:** local CSV files under `backend/data/`. Uploaded photos are also saved to disk under `backend/data/` (e.g. `backend/data/uploads/`), referenced by path from the CSVs.
- **Formatting:** Prettier, default config (2-space indent, semicolons, single quotes). Run before committing.

## Running the App

- **Node version:** run `nvm use` at the repo root before starting either dev server, to pick up the pinned version from `.nvmrc`. A newer Node (e.g. 23.x) can break `nest start --watch` with an `ERR_REQUIRE_CYCLE_MODULE` error.
- **Frontend dev server:** `yarn dev` in `/frontend`, runs on `http://localhost:3000`
- **Backend dev server:** `yarn start:dev` in `/backend`, runs on `http://localhost:3001`
- Frontend calls the backend API at `http://localhost:3001` in development. CORS must be enabled on the backend for `http://localhost:3000`.
- Environment-specific config (API URL, port, upload size limits, etc.) belongs in `.env` files (`frontend/.env`, `backend/.env`), not hardcoded. Provide `.env.example` files for both packages.

## Verification

Before considering any task done, agents should run:

1. **Lint** — oxlint, in whichever package(s) were touched
2. **Type check** — `tsc --noEmit`
3. **Tests** — Vitest
4. **Manual browser check** — start the dev server and manually verify UI changes actually work in a browser (not just that tests pass)

## Testing Policy

- New features (new endpoint, new component, new business logic) should ship with at least basic test coverage as part of the same change — not as a follow-up.
- Prefer small, focused tests over broad end-to-end ones for the prototype stage.

## Git Conventions

- **Commit messages:** Conventional Commits style (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, etc.)
- **Committing:** Agents should ask the user before creating any commit. Propose the change, let the user review, then commit only after explicit confirmation.
- **Pushing:** Never push without explicit confirmation.

## Data Model Notes

Follow the CSV schema drafted in [README.md](README.md) (`users.csv`, `follows.csv`, `tiles.csv`, `tile_text.csv`, `tile_item.csv`). Keep schema changes reflected in both the README and the actual CSV read/write code.

- Archiving a tile means setting `archived = true` in `tiles.csv` — never delete the row.
- Only **Text** tiles are editable after creation. **Item** tiles are immutable once created.
- **CSV concurrency:** this is a single-instance prototype, not a multi-server deployment. Reads/writes to each CSV file should go through a single in-process write queue (or mutex) per file to avoid interleaved writes corrupting the file. Do not introduce a real database or external locking system for this — ask the user first if a scenario seems to need it.

## Backend (NestJS) Conventions

- Organize by feature module (e.g. `UsersModule`, `TilesModule`, `FollowsModule`), each with its own controller/service/DTOs — don't dump everything in one module.
- Validate all incoming request bodies with DTOs + `class-validator` decorators; reject invalid input at the controller boundary.
- Error responses should use NestJS's standard exception filters (e.g. `HttpException` / built-in exceptions) with a consistent JSON shape (`statusCode`, `message`, `error`) — don't hand-roll a different error format per endpoint.

## File Uploads

- Max file size: **5MB**
- Allowed types: **jpg, png, webp**
- Enforce both limits server-side (not just via the HTML file input), and return a clear validation error when violated.

## Accessibility

- Use semantic HTML elements (buttons, labels, headings) rather than generic `div`s with click handlers.
- Form inputs (text box, file upload, badge select) must have associated labels.
- Interactive elements must be reachable and operable via touch with adequately sized tap targets (mobile-first).
- Images (profile photo, item photo) must have meaningful `alt` text.

## General Guidelines

- Mobile-first, portrait-oriented UI — check layouts at mobile widths, not just desktop.
- Keep the UI minimal, consistent with the product's "minimal social media app" intent.
- No new dependencies without checking with the user first.
- Don't add features, abstractions, or config beyond what's described in the README for this prototype stage.
- **When the spec is ambiguous or a requirement isn't covered by README.md or this file, stop and ask the user before implementing it.** Don't guess at product behavior for this prototype.
