# pandanstreet

A minimal, mobile-first social media app. Users log in, build a small profile, and showcase up to three "tiles" of content. Simple by design.

## Tech Stack

- **Frontend:** ReactJS + TailwindCSS + DaisyUI (emerald theme, light mode only, for now)
- **Backend:** NestJS
- **Data storage:** Supabase (Postgres), run locally with the Supabase CLI and hosted on supabase.com in production; uploaded photos in AWS S3
- **Hosting:** one AWS EC2 instance (nginx + NestJS) behind Cloudflare at `pandanstreet.trade`, deployed from GitHub Actions (see [Deployment](#deployment-aws-ec2))
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
- **Deployment:** `pandanstreet.trade` (frontend) and `api.pandanstreet.trade` (API) on a single EC2 instance behind Cloudflare, with the database on hosted Supabase. Every push to `main` deploys. The AWS resources are one CloudFormation template applied by hand.
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

## Deployment (AWS EC2)

Production runs at `https://pandanstreet.trade` (frontend) and `https://api.pandanstreet.trade` (API):

- **Cloudflare** proxies both names and serves HTTPS to visitors. It connects to the instance over HTTPS ("Full (strict)") with a Cloudflare Origin Certificate.
- **One EC2 `t4g.micro`** (Ubuntu 24.04, Arm) runs nginx, which serves the frontend's static build and proxies `api.` to the NestJS backend (a `systemd` service). Only Cloudflare's IP ranges can reach it, on port 443. There is no SSH: shell access goes through SSM Session Manager.
- **Hosted Supabase** (supabase.com, Sydney) holds the database; **S3** holds the photos.
- **GitHub Actions** (`.github/workflows/deploy.yml`) deploys every push to `main`. It builds both apps, applies new migrations, uploads a release archive to S3 and runs `deploy/release.sh` on the instance through SSM. That script sets up the server on first run (`deploy/bootstrap.sh`), installs the release, restarts the backend, and rolls back if it doesn't answer. Actions signs in to AWS with GitHub OIDC, so no AWS keys are stored anywhere.
- **The AWS resources** are in `deploy/cloudformation.yaml`, applied by hand. They are the instance, Elastic IP, security group, IAM roles, the prod photos bucket and the releases bucket.
- **Secrets** live in SSM Parameter Store under `/pandanstreet/prod/`. The instance reads them on each release.

### One-time setup

You need the AWS CLI signed in to the project (e.g. `aws login`). Confirm the project's Region in AWS Settings > View all projects > Overview > Additional Info > Region. These steps assume `ap-southeast-2`.

1. **Supabase project:** create one on supabase.com in the Sydney region, with a strong database password. Note three values:
   - the project URL and the `service_role` (secret) key, under Project Settings > API
   - the **session pooler** connection string, under Connect. Use the session pooler rather than the direct connection, which is IPv6-only and unreachable from GitHub's runners

   The free plan pauses a project after about a week without activity; restore it from the dashboard.

2. **Find the Ubuntu AMI** (24.04, arm64):

   ```bash
   aws ssm get-parameter --region ap-southeast-2 --name /aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id --query Parameter.Value --output text
   ```

3. **Create the stack.** If the account already has a GitHub OIDC provider (`aws iam list-open-id-connect-providers`), also pass `GitHubOidcProviderArn=<its ARN>`:

   ```bash
   aws cloudformation deploy --region ap-southeast-2 --stack-name pandanstreet-prod --template-file deploy/cloudformation.yaml --capabilities CAPABILITY_IAM --parameter-overrides ImageId=<ami id>
   ```

   Then read its outputs (Elastic IP, deploy role, buckets):

   ```bash
   aws cloudformation describe-stacks --region ap-southeast-2 --stack-name pandanstreet-prod --query 'Stacks[0].Outputs' --output table
   ```

4. **Cloudflare** (dashboard for `pandanstreet.trade`):
   - DNS: two **proxied** A records, `@` and `api`, pointing at the `ElasticIp` output
   - SSL/TLS > Overview: encryption mode **Full (strict)**
   - SSL/TLS > Edge Certificates: **Always Use HTTPS** on
   - SSL/TLS > Origin Server > Create Certificate: RSA, host names `pandanstreet.trade` and `*.pandanstreet.trade`, 15 years. Save the certificate as `origin.pem` and the private key as `origin.key`, outside the repo; you only need them for the next step

5. **Secrets in SSM Parameter Store** (`read -rs` keeps the key out of your shell history):

   ```bash
   aws ssm put-parameter --region ap-southeast-2 --name /pandanstreet/prod/SUPABASE_URL --type String --value https://<project ref>.supabase.co
   read -rs KEY && aws ssm put-parameter --region ap-southeast-2 --name /pandanstreet/prod/SUPABASE_SERVICE_ROLE_KEY --type SecureString --value "$KEY"
   aws ssm put-parameter --region ap-southeast-2 --name /pandanstreet/prod/SESSION_SECRET --type SecureString --value "$(openssl rand -hex 32)"
   aws ssm put-parameter --region ap-southeast-2 --name /pandanstreet/prod/ORIGIN_CERT --type SecureString --value file://origin.pem
   aws ssm put-parameter --region ap-southeast-2 --name /pandanstreet/prod/ORIGIN_KEY --type SecureString --value file://origin.key
   ```

   Then delete `origin.key`.

6. **GitHub** (Settings > Secrets and variables > Actions):
   - variables: `AWS_REGION` = `ap-southeast-2`; `STACK_NAME` = `pandanstreet-prod`; `AWS_DEPLOY_ROLE_ARN` = the `DeployRoleArn` output; `VITE_API_URL` = `https://api.pandanstreet.trade`
   - secret: `SUPABASE_DB_URL` = the session pooler connection string, with the database password filled in

7. **First deploy:** Actions > Deploy > Run workflow (or merge to `main`). This creates the tables in the empty database, and the first run on a new instance installs Node and nginx, so it takes a few minutes. Then open `https://pandanstreet.trade`.

### Day to day

- **Deploying:** merge to `main`. Watch it under Actions > Deploy; a failed release leaves the previous one running.
- **Logs and a shell:** `aws ssm start-session --region ap-southeast-2 --target <InstanceId>` (needs the Session Manager plugin for the AWS CLI), then `journalctl -u pandanstreet-backend -f`.
- **Changing a secret:** update the SSM parameter (`put-parameter ... --overwrite`), then re-run the Deploy workflow.
- **Changing the AWS resources:** edit the template and run the same `aws cloudformation deploy` command. Changing the AMI, instance type or user data **replaces the instance**: the Elastic IP moves over automatically, but the new instance is empty until you re-run the Deploy workflow.
- **Cloudflare IP ranges:** the security group only allows the ranges in `CloudflarePrefixList`. If Cloudflare publishes new ones (https://www.cloudflare.com/ips-v4), update the template and the stack.

### Cost and teardown

Roughly US$7/month for the instance, US$3.60 for its public IPv4 address and US$2 for the disk, plus cents for S3. Supabase and Cloudflare are on free plans.

To tear it down:

1. Delete the stack: `aws cloudformation delete-stack --region ap-southeast-2 --stack-name pandanstreet-prod`.
2. The photos bucket is kept on purpose: empty and delete it by hand if you really want the photos gone.
3. Delete the `/pandanstreet/prod/` parameters, the Cloudflare records and the Supabase project.

## Status

Work is organised into phases in [PLAN.md](PLAN.md); see there for what's planned. The merged PRs on `main` show which phases are done.
