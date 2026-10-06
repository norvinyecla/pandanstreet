# pandanstreet

A minimal, mobile-first social media app. Users log in, build a small profile, and showcase up to three "tiles" of content. Simple by design.

## Tech Stack

- **Frontend:** ReactJS + TailwindCSS + DaisyUI (emerald theme, light mode only, for now)
- **Backend:** NestJS
- **Data storage:** Supabase (Postgres), run locally with the Supabase CLI; uploaded photos in AWS S3
- **Target platform:** Mobile-first, optimized for portrait orientation

## Core Concepts

### Users
- Can log in
- Have a profile with:
  - Name
  - Photo
  - Bio (short, editable text)
  - Follower count
  - Following count
- Can follow / unfollow other users

### Tiles
- Each user has **0 to 3 tiles** at any time
- Tiles are ordered by creation time, most recently created first
- When a user creates a new tile while already at 3, the **oldest tile is automatically archived** (removed from the active set)
- Two tile types:

#### 1. Text Tile
- A single text field, max **140 characters**
- Entered by the profile owner
- UI input: text box

#### 2. Item Tile
- **Photo** — image upload
  - UI input: file upload
- **Caption** — short text describing the photo
- **Badge** — a lozenge/pill with a fixed color-to-message mapping:
  | Color  | Message        |
  |--------|----------------|
  | Red    | "Hello!"       |
  | Yellow | "How are you?" |
  | Green  | "G'day!"       |
  - UI input: select box (choice of Red / Yellow / Green)

### Following
- Users can follow other users
- Profile displays follower count and following count
- Tapping the follower/following count on the user's own profile opens the Followers/Following page

### Discovery & Feeds
- **Shout-outs** — Text tiles from followed profiles, most recent first, max 20
- **Bulletin Board** — Item tiles from followed profiles, in a 3-column scrollable grid, max 21
- **Following** — the current user's followed profiles, each with an Unfollow button
- **Followers** — profiles following the current user (read-only)
- **Plaza** — 2–3 randomly-selected profiles the current user doesn't follow (whether or not they follow back) that posted a Text tile, or an Item tile badged green/yellow, in the last 24 hours; requires at least 2 qualifying profiles, otherwise shows an empty state

## Data Model (Supabase tables)

Defined in `backend/supabase/migrations/`:

- `users` — id, username (unique), password_hash, name, photo_url, bio, created_at
- `follows` — follower_id, followee_id, created_at (primary key on the pair; no self-follows)
- `tiles` — id, user_id, type (`text` | `item`), created_at, archived (bool)
- `tile_text` — tile_id, text
- `tile_item` — tile_id, photo_url, caption, badge_color (`red` | `yellow` | `green`)
- `sessions` — sid, sess (jsonb), expires_at (login sessions, so they survive a backend restart)

## UX Notes

- Mobile-first, portrait-oriented layouts
- Minimal UI — light mode only for the prototype
- Tiles are added from a plain "+" button in the middle of the bottom nav bar. It opens a half-screen pane (fast CSS slide-up) that stays on the current page: choose Text or Item, fill in the form, and the pane closes on post
- Tile creation forms adapt to type:
  - Text type → text box (140 char limit, live counter)
  - Item type → file upload + caption text box + badge select box
- Bulletin Board grid is 3 tiles per row, scrollable, capped at 21 tiles

## Decisions

- **Login:** session-based auth (no OAuth) with a separate sign-up step. Users sign up with a unique username, display name, and password, and log in with username + password. Passwords are hashed with Node's built-in `crypto.scrypt`. Sessions are stored in the `sessions` table in Postgres, so logins survive a backend restart.
- **Archived tiles:** marked inactive/hidden, not deleted — kept in `tiles` with `archived = true`.
- **Photo storage:** uploaded photos are stored in an AWS S3 bucket under `photos/`; the database stores each photo's public URL, and the browser loads photos straight from S3. The backend keeps no files on disk.
- **Editing tiles:** only **Text** tiles can be edited after creation (text content can be updated in place). **Item** tiles are immutable once created — to change one, the user creates a new tile (which may archive the oldest).
- **Deleting tiles:** owners can delete any of their own tiles (Text or Item) from their profile, after a confirmation prompt. Deleting archives the tile (`archived = true`) rather than removing the row, so it disappears from the profile and feeds.
- **Database:** Supabase Postgres, accessed only by the backend with `@supabase/supabase-js` and the service-role key. Row Level Security is on with no policies, so the public keys can't read anything. Replaced the Phase 1 CSV files. Backend tests run against a separate local test stack (`backend/test-db/`), so they never wipe the dev data.
- No dark mode for the prototype.

## Photo Storage Setup (AWS S3)

Uploading photos needs an S3 bucket, even in local development (tests use an in-memory fake, so they don't). Set it up by hand, one bucket per environment (e.g. `pandanstreet-dev`):

1. **Create the bucket** with Object Ownership set to "Bucket owner enforced" (ACLs disabled).
2. **Allow public reads of photos only.** Under Block Public Access, turn off the two "bucket policies" settings (keep the ACL ones on), then add this bucket policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadPhotos",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::<bucket>/photos/*"
       }
     ]
   }
   ```

3. **Give the backend write access** with an IAM user (local development) or an IAM role (EC2) limited to this policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::<bucket>/photos/*"
       }
     ]
   }
   ```

4. **Configure the backend:** set `AWS_REGION`, `S3_BUCKET` and `PHOTOS_BASE_URL` (`https://<bucket>.s3.<region>.amazonaws.com`) in `backend/.env`. Credentials don't go in `.env`: the AWS SDK reads them from its default chain, e.g. `AWS_PROFILE` (or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) in the shell that runs `yarn start:dev`.

No CORS rule is needed: photos are only loaded through `<img>` tags.

## Status

Work is organised into phases in [PLAN.md](PLAN.md); see there for what's planned. The merged PRs on `main` show which phases are done.
