# PLAN.md

Implementation plan for the pandanstreet prototype. See [README.md](README.md) for the product spec and [AGENTS.md](AGENTS.md) for conventions agents must follow while executing this plan.

## Phase 0 — Scaffolding

- Initialize monorepo structure (`/frontend`, `/backend`)
- Set up `.nvmrc` (latest Node LTS), root-level `.gitignore`, `.editorconfig`
- Scaffold NestJS app in `/backend` (`yarn`, TypeScript, oxlint, Prettier, Vitest preconfigured by Nest CLI)
- Scaffold React app in `/frontend` (TypeScript template), install TailwindCSS and configure it (mobile-first breakpoints, light mode only)
- Add `.env.example` for both packages; wire up basic config loading (ports, upload limits)
- Enable CORS on backend for `http://localhost:3000`
- Verify both dev servers boot: frontend on 3000, backend on 3001

## Phase 1 — Data Layer (Backend)

- Define CSV schemas and create initial empty CSV files under `backend/data/`:
  `users.csv`, `follows.csv`, `tiles.csv`, `tile_text.csv`, `tile_item.csv`
- Build a small CSV read/write utility module:
  - Per-file write queue/mutex (per [AGENTS.md](AGENTS.md) concurrency guidance)
  - Typed read/parse and append/update helpers
- Unit tests for the CSV utility (read, write, concurrent write ordering)

## Phase 2 — Backend: Users & Auth

- `UsersModule`: create user, get user by id, get user profile (name, photo, follower/following counts)
- Simple session-based login (per README decision — no OAuth)
- Profile photo upload endpoint (multipart, 5MB limit, jpg/png/webp only, saved to `backend/data/uploads/`)
- DTO validation with `class-validator`
- Tests for user creation, login, profile fetch, upload validation (size/type rejection)

## Phase 3 — Backend: Follows

- `FollowsModule`: follow/unfollow endpoints, list followers/following, counts exposed on profile
- Prevent duplicate follows / self-follow
- Tests for follow/unfollow logic and count accuracy

## Phase 4 — Backend: Tiles

- `TilesModule`:
  - Create Text tile (≤140 chars)
  - Create Item tile (photo upload + caption + badge color)
  - Enforce 0–3 active tile limit; auto-archive oldest active tile on 4th creation
  - Edit endpoint for Text tiles only (Item tiles immutable)
  - Fetch active tiles for a profile (ordered by creation, excluding archived)
- Tests covering: tile creation, 140-char validation, auto-archive behavior, edit restricted to Text type, badge color validation (must be red/yellow/green)

## Phase 5 — Frontend: Core Shell & Auth

- App shell, routing (login, profile view/edit, other user's profile)
- Mobile-first layout primitives (portrait-oriented containers, touch-friendly nav)
- Login screen wired to backend session auth
- Basic auth state handling (logged-in user context)

## Phase 6 — Frontend: Profile

- Profile view: name, photo, bio, follower/following counts, follow/unfollow button (when viewing another user)
- Profile edit: bio (text, ≤140 chars) + photo upload (file upload input)
- Tile grid (up to 3 tiles) rendering both Text and Item tile types

## Phase 7 — Frontend: Tile Creation & Editing

- Tile creation flow: type selection → Text (text box, live 140-char counter) or Item (file upload + caption text box + badge select box)
- Edit flow for existing Text tiles
- Client-side validation mirroring backend rules (char limit, file size/type) with clear error states
- Badge lozenge rendering (red/yellow/green with fixed messages)

## Phase 8 — Integration & Polish

- End-to-end manual pass through: signup/login → edit profile → create 3 tiles → create a 4th (verify oldest archives) → edit a Text tile → follow another user → verify counts
- Accessibility pass (labels, alt text, tap target sizing) per [AGENTS.md](AGENTS.md)
- Manual browser check at mobile viewport widths (per verification steps in AGENTS.md)
- Full verification pass: lint, type check, tests, manual browser check across both packages

## Out of Scope (for this prototype)

- Dark mode
- OAuth / third-party login
- Real database (Postgres, etc.)
- Editing or deleting Item tiles
- Notifications, comments, likes, or any interaction beyond follow

## Open Items to Confirm Before Starting

- None currently — proceed per README.md and AGENTS.md decisions. Any new ambiguity found during implementation will be raised before proceeding, per AGENTS.md.
