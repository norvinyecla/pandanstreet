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

## Phase 9 — Backend: Social Discovery & Feeds

- `FollowsModule`: endpoints to list the current user's following and followers, each entry with profile summary (id, name, photoUrl)
- `TilesModule` additions:
  - Shout-outs feed: active Text tiles authored by profiles the current user follows, most recent first, capped at 20
  - Bulletin Board feed: active Item tiles authored by profiles the current user follows, most recent first, capped at 21
  - Plaza discovery: users the current user does **not** follow (regardless of whether they follow the current user) who authored an active Text tile, or an active Item tile with `badgeColor` green or yellow, within the last 24 hours; randomly sample up to 3 of them; requires at least 2 qualifying candidates to return a result, otherwise returns empty
- Tests: feed ordering and caps (20 / 21), following/follower list endpoints, Plaza filtering (24h window, badge color, excludes already-followed, minimum-2 threshold, sampling up to 3)

## Phase 10 — Frontend: Feeds

- **Shout-outs** page: reverse-chronological list of Text tiles from followed profiles (max 20)
- **Bulletin Board** page: 3-column grid of Item tiles from followed profiles, scrollable, max 21 tiles
- Routing/nav entries for Shout-outs, Bulletin Board, and Plaza (Plaza entry can point to a placeholder route until Phase 11)
- Tests for each new page's rendering and caps/limits

## Phase 11 — Frontend: Follow Management & Plaza

- **Following** page: list of followed profiles, each with an "Unfollow" button; the "Following" count on the user's own profile links here
- **Followers** page: read-only list of profiles following the user; the "Followers" count on the user's own profile links here
- **Plaza** page: shows the 2–3 randomly-selected discoverable profiles with a Follow button on each; empty state when fewer than 2 candidates qualify
- Tests for each new page's rendering, empty states, and the unfollow/follow interactions

## Phase 12 — Username & Password Login

- **Schema:** `users.csv` gains `username` and `passwordHash` columns; existing dev data is reset (no migration)
- **Backend:**
  - `POST /auth/signup` (username, display name, password) creates the user and logs them in; `409` if the username is taken
  - `POST /auth/login` (username, password) only authenticates existing users — no more find-or-create; a wrong username or password returns the same generic `401`
  - Passwords hashed with Node's built-in `crypto.scrypt` (per-user random salt, constant-time compare) — no new dependency
  - Username: 3–30 chars, lowercase letters/digits/underscore, unique; password: 8–20 chars
  - `passwordHash` never leaves the backend (excluded from all profile/user DTOs)
  - Regenerate the session on login/signup
- **Frontend:**
  - Login page: username + password fields, link to sign-up
  - Sign-up page: username, display name, password fields, link to login
- Tests: signup (success, duplicate username, validation), login (success, wrong password, unknown user), hashing round-trip, hash not exposed; Login/Sign-up page rendering and submission

## Phase 13 — Default Profile Image

- **Frontend only:** profiles without an uploaded photo show a default sprout avatar (inline SVG) instead of an empty grey circle; `photoUrl` stays empty in `users.csv` (no schema or backend change), so existing accounts get it too
- Shared `ProfileAvatar` component renders either the uploaded photo or the default, used on the profile page, edit-profile page, and follow lists (Following, Followers, Plaza)
- Tests: `ProfileAvatar` renders the photo with alt text when present, and the default avatar when not

## Out of Scope (for this prototype)

- Dark mode
- OAuth / third-party login
- Password reset, email verification, login rate limiting
- Real database (Postgres, etc.)
- Editing Item tiles
- Notifications, comments, likes, or any interaction beyond follow

## Open Items to Confirm Before Starting

- None currently — proceed per README.md and AGENTS.md decisions. Any new ambiguity found during implementation will be raised before proceeding, per AGENTS.md.
- Phase 9–11 decisions (confirmed with the user):
  - Following/Followers pages show only the **current logged-in user's** own lists (not viewable for other profiles)
  - Plaza's candidates are re-randomized on each page visit/load (no persistence of a prior selection)
  - Plaza requires **at least 2** qualifying candidates to display; if 0 or 1 qualify, show an empty state instead. When 2 or 3 qualify, show all of them (up to 3)
