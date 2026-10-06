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

## Phase 14 — Delete Orphaned Photos

- **Backend only:** remove upload files under `backend/data/uploads/` that nothing references any more
  - Replacing a profile photo deletes the previous file once the new `photoUrl` has been saved
  - If creating an Item tile fails after its photo was written to disk (e.g. a CSV write error), delete the file
  - Photos of archived Item tiles are **kept**: an archived tile is still a record in `tiles.csv`, so its photo isn't orphaned
- A failure to delete a file is logged and never fails the request
- Tests: old profile photo removed on replace, first upload (no previous photo) is fine, a file left over from a failed tile creation is removed, archiving a tile keeps its photo, and a failed deletion doesn't fail the request

## Phase 15 — Loading & Error States

- **Frontend only:**
  - **Retry:** every page that loads data (profile, feeds, follow lists, Plaza, edit pages) shows a "Try again" button on error that re-runs the request
  - **Skeletons:** replace the plain "Loading…" text with grey placeholder shapes that match each page's layout (tile grid, shout-out cards, 3-column board, user list rows)
  - **Expired session:** a `401` from any request made after login clears the auth state and sends the user to `/login`. This excludes the login/sign-up requests themselves, which keep showing their own error.
  - **Double-submit guard:** buttons stay disabled while their request is in flight: follow/unfollow, post tile, edit tile, delete tile, save profile, login, sign-up
- Tests: retry re-runs the request and renders the data, skeleton appears while loading, a `401` redirects to `/login`, and a button is disabled while its request is pending

## Phase 16 — Tile Age

- **Frontend only:** the feed responses already include `createdAt`
- Shared `formatTileAge` helper: "just now" (< 1 min), "5m ago", "2h ago", "3d ago"; 7 days or older shows a short date (e.g. "12 Sep"), with the year added for dates outside the current year (e.g. "20 Dec 2025")
- Show the age on each Shout-out card and each Bulletin Board tile, in a `<time dateTime=…>` element
- Tests: `formatTileAge` at each boundary (just under and over 1 min, 1 h, 1 d, 7 d), plus age rendered on both feed pages

## Phase 17 — Full-Screen Item Tile

- **Frontend only:** tapping an Item tile's photo on the Bulletin Board opens a full-screen overlay on the same page (not a new route)
- The overlay shows the photo (`object-contain`), caption, badge, author link and age
- Closes via a close button, the Escape key, or a tap on the backdrop; the grid's scroll position is kept
- Accessible: the photo trigger is a `<button>`; the overlay is a modal dialog with a label, focus moves into it on open and returns to the tile on close
- Tests: opens with the right tile's content, closes on button, Escape and backdrop

## Phase 18 — Author Links Everywhere

- **Frontend only:** names in Shout-outs, the Bulletin Board, Following, Followers and Plaza already link to the author's profile via `FeedAuthorLink`
- Remaining gap: Bulletin Board tiles show the author's name with no avatar; add the small avatar so it matches the other lists (within the 3-column width)
- Check that the full-screen overlay's author link (Phase 17) also works, and that the tap target stays at least 44px
- Tests: Bulletin Board author link renders the avatar and points to `/users/:id`

## Phase 19 — Username Profile URLs

- Profile URLs use the human-readable username instead of the user id: `/users/:username` (e.g. `/users/lovelace`). The id was used before because the display name used to be the login name; since Phase 12 the unique `username` is separate from the display name
- Old id-based URLs (`/users/<uuid>`) are dropped, not redirected — they show the profile's "User not found" error
- **Backend:**
  - `GET /users/by-username/:username` returns the profile (case-insensitive; `404` if unknown), unauthenticated like `GET /users/:id`
  - `username` added to the profile, follow-list (Following, Followers, Plaza) and feed author DTOs so the frontend can build links
  - Id-based endpoints (`/users/:id/bio`, `/users/:id/photo`, `/tiles/:userId`, `/follows/...`) are unchanged
- **Frontend:**
  - `FeedAuthorLink` links to `/users/:username`; the profile page looks the user up by username, then loads tiles and followers by the returned id
  - Visiting your own username shows your own profile (edit link, no Follow button)
  - The profile page shows `@username` under the display name
- Tests: lookup by username (found, case-insensitive, unknown), `username` in profile DTO; profile page loads by username, own username is the own profile, unknown username shows the error, `@username` shown; author links point to `/users/:username`

## Phase 20 — Supabase Database

- **Backend only:** replace the CSV files with Supabase (Postgres); API responses are unchanged, so the frontend needs no changes
- Local development uses the Supabase CLI (`supabase` devDependency, Docker): `yarn db:start` / `db:stop` / `db:status` / `db:reset` in `/backend`; config and migrations in `backend/supabase/`
- Schema migration creates `users`, `follows`, `tiles`, `tile_text`, `tile_item` with uuid ids, foreign keys (`on delete cascade`), unique username, follow pair primary key, and check constraints (no self-follow, tile type, badge color, 140-char text/caption/bio)
- RLS enabled on every table with no policies; the backend connects with `@supabase/supabase-js` and the service-role key (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`)
- Postgres functions for multi-row writes: `create_tile` (archives the oldest active tile and inserts the new one in one transaction, locking the author's row) and `set_user_photo` (returns the replaced photo path so Phase 14 cleanup still works)
- Session auth (scrypt + express-session) and on-disk photo uploads are unchanged
- CSV store code, the CSV files and the `csv-parse` / `csv-stringify` dependencies are removed; existing dev data isn't migrated (the CSVs held no rows)
- CI starts local Supabase before the backend tests
- Tests: existing service, controller and e2e tests run against local Supabase (tables wiped between tests); plus concurrent tile creation keeps at most 3 active

## Phase 21 — Theme (DaisyUI Emerald)

- **Frontend only:** add DaisyUI 5 as a dev dependency and enable it in `src/index.css` via `@plugin 'daisyui'` (Tailwind v4, no config file)
- **Theme:** `emerald`, light mode only; still no dark mode (see Out of Scope). `color-scheme: light only` stays
- **Pandan green primary:** override emerald's `--color-primary` with a deeper pandan green (starting point `#2F7A3A` with white `--color-primary-content`, about 5.3:1 contrast). The final value must meet WCAG AA (4.5:1) for button text
- **Colour tokens:** replace hard-coded colour classes with theme tokens across all components, e.g.
  - `bg-white` → `bg-base-100`, `bg-gray-50/100` → `bg-base-200`
  - `text-gray-900` → `text-base-content`, `text-gray-500/600/700` → `text-base-content/60`–`/80`
  - `border-gray-*` → `border-base-300`
  - red/green success and error styles → `error` / `success` tokens
  - the body background in `index.css` uses the theme instead of `#fff`
- **DaisyUI components** where they fit, keeping the current layout and behaviour:
  - buttons (primary, secondary/outline, destructive, disabled/in-flight) → `btn` variants
  - text inputs, textareas, file input, badge select → `input` / `textarea` / `file-input` / `select`, with labels kept
  - Shout-out cards and Bulletin Board tiles → `card`; the tile badge → `badge`
  - toasts → `alert`; skeletons → `skeleton`; the full-screen overlay keeps its current accessible dialog behaviour
- Keep tap targets at least 44px and the mobile-first portrait layout
- Tests: update tests that assert on the old colour classes (`ToastProvider.test.tsx`, `BulletinBoardPage.test.tsx`) to assert on behaviour or the new classes
- Manual check at mobile width: every page (login, sign-up, profile, edit profile, tile create/edit, Shout-outs, Bulletin Board, overlay, Following, Followers, Plaza), including loading, error and empty states
- Docs: AGENTS.md tooling line becomes "ReactJS, TailwindCSS + DaisyUI (emerald theme, light mode only)"

## Phase 22 — Separate Test Database

- **Backend only:** tests run against their own local Supabase stack, so `yarn test` / `yarn test:e2e` no longer wipe the dev database
- Second Supabase CLI project in `backend/test-db/` with its own `project_id` (`pandanstreet-test`) and ports (API `54421`, DB `54422`); its `supabase/migrations` is a symlink to `backend/supabase/migrations`, so both stacks always share one schema. Studio is disabled; auth stays on because `supabase status` only prints the service-role key when it runs
- Scripts in `/backend`: `yarn db:test:start` / `db:test:stop` / `db:test:status` / `db:test:reset`
- Tests read `backend/.env.test` (with a tracked `.env.test.example`) instead of `backend/.env`; variables already set in the environment (e.g. CI) still take precedence
- A Vitest global setup fails the run with a clear message, before any test runs, when:
  - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` aren't set (copy them from `yarn db:test:status`)
  - the test stack isn't reachable (run `yarn db:test:start`)
  - `SUPABASE_URL` is the same as the dev URL in `backend/.env`
- CI starts the test stack with `yarn db:test:start` instead of the dev one
- Docs: AGENTS.md (Running the App, Verification) and README note the test database

## Phase 23 — Persistent Sessions

- **Backend only:** sessions survive a backend restart (including every `nest start --watch` reload), so users stay logged in. Today `express-session` uses its default in-memory store, which loses every session on restart
- **Schema:** new migration adding a `sessions` table: `sid` (text, primary key), `sess` (jsonb), `expires_at` (timestamptz, indexed). RLS on with no policies, like the other tables
- **Store:** a small custom `SupabaseSessionStore` (extends `session.Store` from `express-session`) in `backend/src/common/auth/`, using the `SUPABASE_CLIENT` provider. No new dependency
  - `get`: returns the session, or nothing if the row is missing or expired
  - `set`: upserts the row, with `expires_at` from the session cookie's expiry (7-day `maxAge`, unchanged), and deletes expired rows
  - `destroy`: deletes the row (logout)
  - `touch`: updates `expires_at`
  - Database errors go to the callback, so the request fails with a 500 and is never treated as logged out
- **Wiring:** move the session setup out of `main.ts` into a shared helper that takes the Supabase client, so `main.ts` and the e2e specs (which currently copy the session config) use the same store
- `resetDatabase` in tests also clears `sessions`
- Session regeneration on login/sign-up and the cookie settings are unchanged
- Tests: store round-trip (set, then get), an expired session comes back empty, destroy removes the row, touch moves the expiry forward, set prunes expired rows; e2e: a session cookie still works with a fresh app instance (simulated restart), and logout removes the session
- **Docs:**
  - README Data Model adds `sessions`; the Login decision notes that sessions are stored in Postgres
  - README Tech Stack frontend line becomes "ReactJS + TailwindCSS + DaisyUI (emerald theme, light mode only)" to match AGENTS.md (missed in Phase 21)
  - Fix the stale `test-database.ts` comment, which still points at `yarn db:start` and `backend/.env` instead of the test stack

## Phase 24 — Photo Storage on AWS S3

- **Goal:** store uploaded photos (profile photos and Item tile photos) in an AWS S3 bucket instead of `backend/data/uploads/`, so the backend keeps no files on local disk. This is needed before deploying to EC2 (Phase 25)
- **Decisions (confirmed with the user):**
  - Real S3 everywhere: local development uses a dev bucket; tests use a fake storage, so no AWS access is needed to run tests or CI
  - The bucket allows public reads of photos, and the browser loads them straight from S3 (same exposure as today's public `/uploads/` route)
  - New backend dependency: `@aws-sdk/client-s3` (only the S3 client, not the whole SDK)
  - Existing files on disk aren't migrated (the dev uploads folder is empty, as with the CSV data in Phase 20)
- **No schema change:** `users.photo_url` and `tile_item.photo_url` now hold the photo's full public URL (e.g. `https://<bucket>.s3.<region>.amazonaws.com/photos/<uuid>.jpg`) instead of `/uploads/<uuid>.jpg`. API response shapes are unchanged
- **Backend:**
  - Replace `common/uploads/photo-files.ts` with a `PhotoStorage` provider (in the existing `common/uploads/` folder) that wraps an `S3Client`, injected into `UsersController` and `TilesController`
    - `save(buffer, extension, contentType)`: `PutObject` under `photos/<uuid>.<ext>` with the right `Content-Type` and a long `Cache-Control` (keys never change), and returns the public URL
    - `delete(photoUrl)`: `DeleteObject` for URLs under `PHOTOS_BASE_URL/photos/`; ignores empty values, old `/uploads/` paths and any other URL; logs and never throws on failure
  - The Phase 14 cleanup rules are unchanged: replacing a profile photo deletes the old object once the new URL is saved; a failed tile creation deletes the object it just uploaded; archived tiles keep their photos
  - A failed upload to S3 fails the request with a standard `500` (nothing is written to the database)
  - Upload limits are unchanged: 5MB and jpg/png/webp, checked on the server before anything is sent to S3 (multer keeps files in memory, as now)
  - Remove the `/uploads/` static route and `DATA_DIR` from `main.ts`, and the `backend/data/` folder
  - **Config** in `backend/.env` / `.env.example`: `AWS_REGION`, `S3_BUCKET`, `PHOTOS_BASE_URL`. The app fails at startup with a clear message if any are missing. AWS credentials are never in code or committed `.env` files: the SDK's default credential chain picks them up (`AWS_PROFILE` or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` locally, the instance role on EC2 in Phase 25)
- **Frontend:** photo URLs are now absolute, so remove `resolveAssetUrl` and use `photoUrl` directly in `TileGrid`, `FeedAuthorLink`, `ItemTileOverlay`, `ProfilePage`, `ProfileEditPage` and `BulletinBoardPage`. The default sprout avatar for an empty `photoUrl` is unchanged
- **Bucket setup (manual, documented in README; no infrastructure-as-code yet):**
  - One bucket per environment (e.g. a dev bucket now, a prod bucket in Phase 25), with Object Ownership "bucket owner enforced" (no ACLs)
  - A bucket policy allowing public `s3:GetObject` on `photos/*` only (so Block Public Access is relaxed for bucket policies)
  - An IAM user (dev) or role (EC2) limited to `s3:PutObject` and `s3:DeleteObject` on `photos/*` of that bucket
  - No CORS rule is needed: the browser only loads photos through `<img>` tags
- **Tests:**
  - `PhotoStorage` with a fake `S3Client`: save sends the right key, body, content type and cache header and returns the public URL; delete sends the right key; delete ignores empty, `/uploads/` and other URLs; a failed delete is logged, not thrown
  - Controller and e2e tests swap in a fake `PhotoStorage` provider (no network): the existing Phase 14 cases are ported (old photo deleted on replace, first upload, cleanup after a failed tile creation, archived tile keeps its photo, failed delete doesn't fail the request), plus a failed upload returns `500` and saves nothing
  - Frontend tests that build photo URLs with `resolveAssetUrl` are updated
  - Startup config check: missing S3 settings give a clear error
- **Manual check** against the dev bucket: upload a profile photo and an Item tile at mobile width, confirm the images load from the S3 URL, replace the profile photo and confirm the old object is gone, and check a too-large or wrong-type file is still rejected
- **Docs:** AGENTS.md (repo structure drops `/backend/data`; the Data and File Uploads sections say photos go to S3; Running the App says to set the S3 settings and AWS credentials) and README (Tech Stack, bucket setup)

## Phase 25 — Cloud Deployment on AWS EC2

- **Goal:** run the app in production at `https://pandanstreet.trade` (frontend) and `https://api.pandanstreet.trade` (backend), deployed automatically when `main` changes
- **Decisions (confirmed with the user):**
  - Database: a **hosted Supabase** project (Sydney region, to sit next to the instance); nothing database-related runs on EC2
  - **One EC2 `t4g.micro`** (Arm, 1GB) in the project's AWS Region (`ap-southeast-2`; confirm in AWS Settings), running the NestJS backend under `systemd` and **nginx** in front, which serves the frontend's static build and proxies the API
  - Domain: `pandanstreet.trade` serves the app, `api.pandanstreet.trade` the API. They're the same _site_, so the `SameSite=Lax` session cookie still works; the backend allows CORS from `https://pandanstreet.trade`. `www.` is not set up
  - **Cloudflare** (where the domain's DNS already lives) proxies both names (orange cloud): it serves HTTPS to visitors and hides the instance's IP. Cloudflare reaches the instance over HTTPS with SSL mode **Full (strict)**, using a free **Cloudflare Origin Certificate** on nginx (15-year validity, so no certbot and no renewals)
  - AWS resources in one **CloudFormation** template, created and updated by hand with the AWS CLI. GitHub Actions only ships code, so its AWS identity needs no IAM or EC2 rights
  - **Deploys from GitHub Actions** on every push to `main` (and by hand with "Run workflow"). The 1GB instance doesn't build anything: Actions builds, then tells the instance to install the release
- **AWS resources** (`deploy/cloudformation.yaml`):
  - **Prod photos bucket**: the Phase 24 manual setup as code: owner-enforced (no ACLs), SSE-S3 encryption, public `s3:GetObject` on `photos/*` only, HTTPS-only requests, kept if the stack is deleted. No versioning, since replaced photos are deleted on purpose
  - **Releases bucket** (private, all public access blocked): build archives from Actions, expired after 30 days
  - **EC2 instance**: Ubuntu 24.04 arm64 (the AMI ID is a stack parameter, so a stack update never swaps the instance by surprise), IMDSv2 required, encrypted gp3 root volume, default VPC, with an **Elastic IP**
  - **Security group**: only port 443, and only from Cloudflare's IP ranges (kept in a managed prefix list in the template), so nobody can skip Cloudflare and reach the instance directly. No port 80 (Cloudflare redirects HTTP to HTTPS) and no SSH port: shell access is through SSM Session Manager
  - **Instance role**: SSM Session Manager/Run Command; `s3:PutObject`/`s3:DeleteObject` on the photos bucket's `photos/*`; read the releases bucket; read SSM parameters under `/pandanstreet/prod/`
  - A **deploy IAM user** for GitHub Actions. It can upload to the releases bucket and run `AWS-RunShellScript` on this one instance through SSM, nothing else. Its access key is created with the CLI (never in the template or its outputs) and piped straight into GitHub. (GitHub OIDC was the first choice, but the AWS project's Free plan service control policy denies `iam:*Provider*`; the user chose to stay on the Free plan and use a key.)
  - Outputs: the Elastic IP, instance ID, deploy role ARN, bucket names, `PHOTOS_BASE_URL`
- **Config and secrets** (never in the repo, the template or GitHub logs):
  - SSM Parameter Store, created by hand: `/pandanstreet/prod/SUPABASE_URL` (String), `/pandanstreet/prod/SUPABASE_SERVICE_ROLE_KEY`, `/pandanstreet/prod/SESSION_SECRET`, `/pandanstreet/prod/ORIGIN_CERT` and `/pandanstreet/prod/ORIGIN_KEY` (SecureString; the last two are the Cloudflare Origin Certificate and its private key)
  - Stack values (`AWS_REGION`, `S3_BUCKET`, `PHOTOS_BASE_URL`, `FRONTEND_ORIGIN`) are written on the instance at first boot
  - On each release the instance renders `/etc/pandanstreet/backend.env` (root-owned, readable only by the app user) from both, plus `NODE_ENV=production` and `PORT=3001`
  - GitHub: a `production` environment limited to the `main` branch, holding the secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `SUPABASE_DB_URL` (so no other branch's workflow can read them); repository variables `AWS_REGION`, `STACK_NAME`, `VITE_API_URL` (the workflow reads the instance ID and releases bucket from the stack's outputs, so replacing the instance needs no GitHub change); `SUPABASE_DB_URL` is the hosted project's session-pooler connection string, for migrations
- **Instance setup:** the instance's user data only writes the stack values to `/etc/pandanstreet/stack.env` and installs the AWS CLI. Everything else is in `deploy/bootstrap.sh`, which `release.sh` runs at the start of every release, so the server setup ships and is versioned with the code. Each step is skipped when already done. It does the following: install nginx, Node 22 (matching `.nvmrc`) with Corepack, and the AWS CLI; add a 1GB swap file; create an unprivileged `pandanstreet` user; install the `pandanstreet-backend` systemd unit and the nginx site
- **Deploy workflow** (`.github/workflows/deploy.yml`, one run at a time):
  1. Install dependencies and build the backend and frontend (`VITE_API_URL=https://api.pandanstreet.trade`)
  2. Apply new migrations to the hosted database (`supabase db push --db-url "$SUPABASE_DB_URL"`) before the new code starts, so migrations must stay compatible with the code that's still running (they already are: additive only)
  3. Package a release archive (backend `dist`, frontend `dist`, `package.json` files, `yarn.lock`, `.yarnrc.yml`, `.nvmrc`, `deploy/`) and upload it to the releases bucket as `<commit sha>.tar.gz`
  4. Sign in as the deploy user and run `deploy/release.sh <sha>` on the instance through SSM Run Command, waiting for it and failing the job if it fails
- **Release script** (`deploy/release.sh`, on the instance): the SSM command unpacks the archive into `/opt/pandanstreet/releases/<timestamp>-<sha>`, then the script runs bootstrap, renders `backend.env` and writes the origin certificate and key (readable by root only), installs backend production dependencies only (`yarn workspaces focus backend --production`), switches the `current` symlink (nginx serves the frontend straight from `current`, so both apps switch together), installs the nginx site, restarts the backend, and check it answers on `127.0.0.1:3001`. If the check fails, switch back to the previous release and fail. Keep the last 3 releases
- **nginx:**
  - HTTPS only (port 443) with the origin certificate
  - `pandanstreet.trade`: serves the frontend; unknown paths fall back to `index.html` (client-side routes like `/users/<username>`); hashed `/assets/` get a long cache
  - `api.pandanstreet.trade`: proxies to `127.0.0.1:3001` with `X-Forwarded-For`/`X-Forwarded-Proto`; `client_max_body_size 6m` (the backend still enforces the 5MB photo limit)
  - Any other host name (e.g. the bare IP) is refused
- **Cloudflare setup (manual, in the dashboard):** proxied A records for `pandanstreet.trade` and `api` pointing at the Elastic IP; SSL/TLS mode Full (strict); "Always Use HTTPS" on; an Origin Certificate for `pandanstreet.trade` and `*.pandanstreet.trade`, saved into the two SSM parameters. Cloudflare's default caching already skips HTML and API responses and caches the hashed assets
- **Backend changes** (the only app code change):
  - With `NODE_ENV=production`: trust the first proxy (`app.set('trust proxy', 1)`) and set the session cookie to `secure`
  - In production, startup fails with a clear message if `SESSION_SECRET` is missing or is still the dev default
  - The cookie stays host-only on `api.pandanstreet.trade`; CORS still comes from `FRONTEND_ORIGIN`
  - The frontend needs no change: `VITE_API_URL` is set at build time
- **Tests:**
  - Session settings: development keeps today's behavior; production requires a real `SESSION_SECRET` (missing or default → error) and sets a `secure` cookie
  - E2E: with production settings, a login through a proxy (`X-Forwarded-Proto: https`) returns a `Secure` session cookie
  - The infrastructure isn't covered by the test suite. Instead, a new `deploy` job in `ci.yml` checks it on every PR: `cfn-lint` on the template (installed with `pip` in the job; not a project dependency) `shellcheck` (already on GitHub's runners) on the `deploy/` scripts, and `nginx -t` on the site config in the `nginx:1.24` image (Ubuntu 24.04's version) with a throwaway certificate
- **Manual check** after the first deploy, at mobile width on `https://pandanstreet.trade`:
  - sign up, log out and log in, and reload to confirm the session holds
  - upload a profile photo and an Item tile, and confirm they load from the prod bucket
  - open a `/users/<username>` URL directly, and confirm the cookie is `Secure`
  - push a trivial change to `main` and watch it deploy
- **Docs:**
  - README: a new "Deployment (AWS EC2)" section with the one-time checklist: confirm the Region, create the Supabase project, find the AMI ID, create the stack, set up Cloudflare (DNS, SSL mode, origin certificate), create the SSM parameters, set the GitHub variables and secret, and do the first deploy. It also explains how to update the Cloudflare IP ranges in the template if Cloudflare changes them. It also covers updating the stack, rough monthly cost, and how to tear it down
  - README Tech Stack mentions the deployment
  - AGENTS.md: repo structure adds `/deploy`; a note that merging to `main` deploys to production (migrations included, so they must stay compatible with the running code)
  - `backend/.env.example`: a note on what `NODE_ENV=production` changes
- **Follow-ups after launch** (confirmed with the user): the page title becomes "PandanStreet" (it was Vite's default "frontend"), and any URL that matches no route shows a "Page not found" page with a link to the home page, logged in or not (it used to show an empty page)
- **Not in this phase:** `www.` redirect, Cloudflare Authenticated Origin Pulls, a staging environment, monitoring/alerting, multiple instances

## Out of Scope (for this prototype)

- Dark mode
- OAuth / third-party login
- Password reset, email verification, login rate limiting
- Editing Item tiles
- Notifications, comments, likes, or any interaction beyond follow

## Open Items to Confirm Before Starting

- None currently — proceed per README.md and AGENTS.md decisions. Any new ambiguity found during implementation will be raised before proceeding, per AGENTS.md.
- Phase 9–11 decisions (confirmed with the user):
  - Following/Followers pages show only the **current logged-in user's** own lists (not viewable for other profiles)
  - Plaza's candidates are re-randomized on each page visit/load (no persistence of a prior selection)
  - Plaza requires **at least 2** qualifying candidates to display; if 0 or 1 qualify, show an empty state instead. When 2 or 3 qualify, show all of them (up to 3)
