# pandanstreet

A minimal, mobile-first social media app. Users log in, build a small profile, and showcase up to three "tiles" of content. Simple by design.

## Tech Stack

- **Frontend:** ReactJS + TailwindCSS (light mode only, for now)
- **Backend:** NestJS
- **Data storage:** Local CSV file(s) (multiple files as needed, e.g. one per entity)
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

## Data Model (CSV files, draft)

- `users.csv` — id, username, passwordHash, name, photoUrl, bio, createdAt
- `follows.csv` — followerId, followeeId, createdAt
- `tiles.csv` — id, userId, type (`text` | `item`), createdAt, archived (bool)
- `tile_text.csv` — tileId, text
- `tile_item.csv` — tileId, photoUrl, caption, badgeColor

## UX Notes

- Mobile-first, portrait-oriented layouts
- Minimal UI — light mode only for the prototype
- Tiles are added from a plain "+" button in the middle of the bottom nav bar. It opens a half-screen pane (fast CSS slide-up) that stays on the current page: choose Text or Item, fill in the form, and the pane closes on post
- Tile creation forms adapt to type:
  - Text type → text box (140 char limit, live counter)
  - Item type → file upload + caption text box + badge select box
- Bulletin Board grid is 3 tiles per row, scrollable, capped at 21 tiles

## Decisions

- **Login:** session-based auth (no OAuth) with a separate sign-up step. Users sign up with a unique username, display name, and password, and log in with username + password. Passwords are hashed with Node's built-in `crypto.scrypt`.
- **Archived tiles:** marked inactive/hidden, not deleted — kept in `tiles.csv` with `archived = true`.
- **Photo storage:** uploaded photos are saved to local disk; the file path is referenced in the CSV (since CSVs can't hold binary data).
- **Editing tiles:** only **Text** tiles can be edited after creation (text content can be updated in place). **Item** tiles are immutable once created — to change one, the user creates a new tile (which may archive the oldest).
- **Deleting tiles:** owners can delete any of their own tiles (Text or Item) from their profile, after a confirmation prompt. Deleting archives the tile (`archived = true`) rather than removing the row, so it disappears from the profile and feeds.
- No dark mode for the prototype.

## Status

Work is organised into phases in [PLAN.md](PLAN.md); see there for what's planned. The merged PRs on `main` show which phases are done.
