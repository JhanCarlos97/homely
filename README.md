# Homely

Homely is a bilingual home services marketplace prototype for the United States and Colombia. Customers can book assessment visits, post jobs with their own budget or a suggested estimate, accept proposals, and track a project through delivery, claims, and feedback. An administrator can manage fees, cities, professional approvals, cost observations, and disputes.

This repository contains the full application source. The local experience uses a simulated ChatGPT sign-in and a local Cloudflare D1 database. **No real payments, transfers, insurance policies, or contractor guarantees are connected.**

## Run on a Mac

Requirements:

- macOS with Terminal and Git
- Node.js **22.13.0 or newer** (`node --version`)
- pnpm **11.25.0**, pinned by `package.json`

Install Node.js through your preferred Node version manager or the official Node.js installer. Enable Corepack if available, or install pnpm with `npm install -g pnpm@11.25.0`. Confirm with `pnpm --version`.

From the project directory:

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nifty_black_bird.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_common_excalibur.sql
pnpm dev
```

Open **http://localhost:5173**. For the first local sign-in, visit **http://localhost:5173/signin-with-chatgpt?return_to=/**. The development server signs you in as the fixed test user `seedy@sites.test`. The Admin link then appears; `/admin` is also available directly. Stop the server with `Ctrl+C`.

Apply the two SQL files **only once for a fresh local database**, in the order shown. Subsequent `pnpm dev` runs keep the data in ignored `.wrangler/state`. To deliberately reset all local data, stop the server, remove `.wrangler/state`, rebuild if needed, then apply both migrations again. This never changes the hosted site's database.

The `.dev.vars` file sets `ADMIN_EMAILS="seedy@sites.test"` for local development and is ignored by Git. To test a non-admin user, remove that email from the file and restart `pnpm dev`. Do not commit actual credentials or production secrets. The hosted site uses a separate `ADMIN_EMAILS` runtime setting and ChatGPT authentication managed by Sites.

## What is included

- English for the US market and Spanish for Colombia; changing language changes the market context.
- Professional listings, visit booking, customer project posts, proposals, and project contracts.
- Visit fee of 10% and project fee of 5%, charged to the customer on top of the agreed price. The base visit price becomes a one-time credit when the customer hires that same contractor for a project.
- Optional contractor-provided materials with a simulated advance of 40% of the project price, limited by the principal still due after visit credit.
- Customer claims that hold the remaining simulated payment; administrator resolution and release after the configured review window if no claim exists.
- Suggested budgets built from labor and material quantities. Starter values are illustrative; the admin can enter documented observations for city-level averages.
- Admin dashboard for fees, coverage cities, sample listings, professional review, projects, claims, cost observations, and audit history.

The project fee and visit fee are calculated in both the direct booking and posted job flows. The claim window defaults to seven days. This prototype records the payment states in its database; it does not move money. An eligible release is reconciled when project activity is opened, while it remains open, or when an admin triggers reconciliation. There is no independent background payment scheduler.

## Project structure

| Path                                           | Purpose                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `app/page.tsx`                                 | Marketplace interface                                              |
| `app/admin/`                                   | Protected admin dashboard                                          |
| `app/api/`                                     | Marketplace, admin, estimates, config, and contract endpoints      |
| `components/marketplace-controls.tsx`          | Estimator, pricing, contract, and payment-state controls           |
| `lib/policy.ts`                                | Fee, credit, advance, estimator, and release rules                 |
| `db/`, `drizzle/`                              | D1 schema and SQL migrations                                       |
| `public/`                                      | Static assets                                                      |
| `vite.config.ts`, `build/sites-vite-plugin.ts` | Vinext/Cloudflare local development and loopback-only mock sign-in |
| `.openai/hosting.json`                         | Local-only Sites project association, ignored by Git               |

## Useful commands

```bash
pnpm dev                    # development server on localhost:5173
pnpm build                  # production-compatible Worker build
pnpm start                  # run the built Worker locally (no mock sign-in)
pnpm exec tsc --noEmit      # typecheck
pnpm run db:generate        # generate migration after changing db/schema.ts
```

If you change the schema, review the generated SQL before applying it. For a fresh database, apply every migration in filename order. The `pnpm start` built preview does not simulate ChatGPT sign-in; use `pnpm dev` to exercise customer and admin flows locally.

## Put this project on your GitHub account

Create a new **empty private repository** on GitHub without an automatically generated README, then run from the extracted folder:

```bash
git init
git add .
git commit -m "Initial Homely source"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the HTTPS or SSH URL displayed by GitHub. GitHub authentication may require GitHub CLI, a credential manager, or an SSH key. Generated `node_modules`, `dist`, local D1 state, `.dev.vars`, and `.openai/hosting.json` are ignored. Keep `.openai/hosting.json` locally only if you intend to continue editing that same Site through Sites.

## Deployment and production work

The current live site is hosted through ChatGPT Sites, which supplies the Cloudflare runtime, D1 database, sign-in identity, and access policy. Pushing this ZIP's contents to GitHub alone does **not** update the live site. For independent hosting, you must provision a compatible Cloudflare Worker/D1 setup and replace or integrate the dispatch-owned ChatGPT sign-in. Before accepting real jobs, integrate a payment provider and payout automation, select an insurer or guarantee provider, establish claims/refund procedures, and verify contractors' legal and coverage requirements for each market.

This is an application prototype, not a payment or insurance service. Sample provider data and fallback estimator prices are demonstrations.
