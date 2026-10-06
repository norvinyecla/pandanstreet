# AGENTS.md

Instructions for AI coding agents working in this repository. See [README.md](README.md) for the product spec.

## Repo Structure

Monorepo layout:

```
/frontend   — ReactJS + TailwindCSS
/backend    — NestJS
/backend/data — uploaded photos
/backend/supabase — Supabase CLI config and SQL migrations
```

## Tooling

- **Package manager:** yarn (use `yarn`, not `npm` or `pnpm`, for installs and scripts)
- **Node version:** latest LTS. Pin it in an `.nvmrc` at the repo root once the project is scaffolded.
- **Language:** TypeScript everywhere — both `/frontend` and `/backend`. No plain `.js` files.
- **Frontend:** ReactJS, TailwindCSS + DaisyUI (emerald theme, light mode only for now)
- **Backend:** NestJS
- **Data:** Supabase (Postgres), run locally with the Supabase CLI (a `supabase` devDependency; needs Docker). Schema changes go in a new file under `backend/supabase/migrations/` — never edit a migration that has already been merged. Uploaded photos are saved to disk under `backend/data/uploads/`, referenced by path from the database.
- **Formatting:** Prettier, configured in the root `.prettierrc` (2-space indent, semicolons, single quotes, trailing commas). Run `yarn format` at the repo root before committing; CI fails PRs that don't pass `yarn format:check`.

## Running the App

- **Node version:** run `nvm use` at the repo root before starting either dev server, to pick up the pinned version from `.nvmrc`. A newer Node (e.g. 23.x) can break `nest start --watch` with an `ERR_REQUIRE_CYCLE_MODULE` error.
- **Frontend dev server:** `yarn dev` in `/frontend`, runs on `http://localhost:3000`
- **Database:** `yarn db:start` in `/backend` starts local Supabase (API on `http://127.0.0.1:54321`, Studio on `http://127.0.0.1:54323`). Copy the API URL and service-role key from `yarn db:status` into `backend/.env`. `yarn db:reset` re-applies the migrations to an empty database.
- **Test database:** backend tests use a separate local Supabase stack in `backend/test-db/` (API on `http://127.0.0.1:54421`), so they never wipe the dev data. Start it with `yarn db:test:start` in `/backend` and copy the API URL and service-role key from `yarn db:test:status` into `backend/.env.test`. It shares the migrations in `backend/supabase/migrations/` through a symlink, so don't add migrations under `backend/test-db/`. After adding a migration, `yarn db:test:reset` applies it to the test stack.
- **Backend dev server:** `yarn start:dev` in `/backend`, runs on `http://localhost:3001`
- Frontend calls the backend API at `http://localhost:3001` in development. CORS must be enabled on the backend for `http://localhost:3000`.
- Environment-specific config (API URL, port, upload size limits, etc.) belongs in `.env` files (`frontend/.env`, `backend/.env`), not hardcoded. Provide `.env.example` files for both packages.

## Verification

Before considering any task done, agents should run:

1. **Lint** — oxlint, in whichever package(s) were touched
2. **Type check** — `tsc --noEmit`
3. **Tests** — Vitest (backend tests need the test Supabase stack running, `yarn db:test:start`; they wipe its tables, never the dev database)
4. **Manual browser check** — start the dev server and manually verify UI changes actually work in a browser (not just that tests pass)

## Testing Policy

- New features (new endpoint, new component, new business logic) should ship with at least basic test coverage as part of the same change — not as a follow-up.
- Prefer small, focused tests over broad end-to-end ones for the prototype stage.

## Git Conventions

- **Commit messages:** Conventional Commits style (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, etc.)
- **Committing:** Agents should ask the user before creating any commit. Propose the change, let the user review, then commit only after explicit confirmation.
- **Pushing:** Never push without explicit confirmation.

## Data Model Notes

Follow the schema in [README.md](README.md) (`users`, `follows`, `tiles`, `tile_text`, `tile_item`). Keep schema changes reflected in both the README and a migration under `backend/supabase/migrations/`.

- Archiving a tile means setting `archived = true` in `tiles` — never delete the row.
- Only **Text** tiles are editable after creation. **Item** tiles are immutable once created.
- **Database access:** only the backend talks to Supabase, through the `SUPABASE_CLIENT` provider (service-role key, server-side only). Keep RLS enabled on every table. Writes that must be atomic across rows (e.g. create a tile + archive the oldest) go in a Postgres function called via `rpc`, not in several separate requests.

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

<!-- BEGIN AWS Agent Toolkit rules -->

# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- Before starting a task, check whether a relevant AWS skill is available. Load the skill with retrieve_skill and prefer its guidance over general knowledge.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion

<!-- END AWS Agent Toolkit rules -->
