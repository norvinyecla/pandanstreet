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
- Tiles are ordered by creation time
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

## Data Model (CSV files, draft)

- `users.csv` — id, name, photoUrl, bio, createdAt
- `follows.csv` — followerId, followeeId, createdAt
- `tiles.csv` — id, userId, type (`text` | `item`), createdAt, archived (bool)
- `tile_text.csv` — tileId, text
- `tile_item.csv` — tileId, photoUrl, caption, badgeColor

## UX Notes

- Mobile-first, portrait-oriented layouts
- Minimal UI — light mode only for the prototype
- Tile creation forms adapt to type:
  - Text type → text box (140 char limit, live counter)
  - Item type → file upload + caption text box + badge select box

## Decisions

- **Login:** simple session-based auth (no OAuth) for the prototype.
- **Archived tiles:** marked inactive/hidden, not deleted — kept in `tiles.csv` with `archived = true`.
- **Photo storage:** uploaded photos are saved to local disk; the file path is referenced in the CSV (since CSVs can't hold binary data).
- **Editing tiles:** only **Text** tiles can be edited after creation (text content can be updated in place). **Item** tiles are immutable once created — to change one, the user creates a new tile (which may archive the oldest).
- No dark mode for the prototype.

## Status

Prototype planning stage — implementation not yet started.
