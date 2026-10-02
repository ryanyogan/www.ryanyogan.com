# ryanyogan.com

pnpm workspace: the site is `apps/web` (TanStack Start on a Cloudflare Worker) and shared content types
live in `packages/shared`. Needs Node 22.6 or newer and pnpm 9.

```sh
pnpm install    # pnpm only: npm, yarn and Bun are refused by the preinstall guard
pnpm dev        # http://localhost:3000; migrates and seeds the local database when needed
pnpm check      # format check, lint, typecheck
pnpm build
```

## Where content lives

- `/work`, `/writing`, posts and `/rss.xml` are prerendered at build time from `packages/shared` and
  `apps/web/content/writing/*.md`.
- Projects (`/`, `/projects`, `/projects/$slug`, the search palette) are read from Cloudflare D1
  (binding `DB`, table `projects`, schema in `apps/web/migrations`) on each request, so an edit to a row
  shows without a redeploy. Only rows with `published = 1` are ever read by a public route.
- `apps/web/content/projects/*.md` stays in the repo as the seed source. `db:seed:generate` turns it into
  `apps/web/db/seed.sql` (git-ignored): one upsert per file, `published = 1`, `source = 'seed'`. Re-running
  the seed only overwrites rows whose `source` is still `'seed'`, never changes `published`, and skips
  every slug in `deleted_seed_slugs` (migration 0002): deleting a project in `/admin`, or renaming its slug,
  records the old slug there, so the seed does not bring it back. To restore one, delete its row from
  that table and run the seed again.
- Those three pages are kept in the edge cache by the Worker itself (`caches.default`,
  `apps/web/src/lib/page-cache.ts`): fresh for 60 seconds, then served once more while a new copy is
  rendered, for up to 5 more minutes. The response says which happened in `x-cache`
  (`MISS`, `HIT`, `STALE`, `BYPASS`). Every admin write purges `/`, `/projects` and the project's page, so
  an edit shows on the next request. Two limits: the purge only reaches the Cloudflare data centre that
  handled the write (elsewhere a copy lives out its 6 minutes at most), and a change made straight to D1
  (`wrangler d1 execute`, the seed) purges nothing. Never cached: anything but a 200, any request carrying
  the Access cookie or token, `/admin`, server functions. `vite dev` does not cache at all.

Local dev, `vite preview` and the tests use a local D1 (miniflare, under `apps/web/.wrangler`); none of them
needs a Cloudflare account. `pnpm typecheck` runs `wrangler types` first to generate the `Env` types
(`apps/web/worker-configuration.d.ts`, git-ignored).

### Remote database

The remote D1 database `ryanyogan-com` already exists (created 2026-10-02); its id is in
`apps/web/wrangler.jsonc`. There is nothing to create. If its schema or seed ever has to be applied again,
from `apps/web`:

```sh
pnpm exec wrangler d1 migrations apply DB --remote
pnpm db:seed:generate
pnpm exec wrangler d1 execute DB --remote --file db/seed.sql
```

A deploy that adds a migration (0002, `deleted_seed_slugs`, is not applied remotely yet) needs the first
command run before `pnpm run deploy`: the admin's delete and slug change write to that table, and the
generated seed reads it.

Local D1 files are keyed by `database_id`; when that id changes, the next `pnpm dev` sets the new local
database up.

## Admin

`/admin` lists every project (drafts included), edits them, creates manual ones, reorders within a group
and deletes. It is server-rendered on each request, `noindex`, `Cache-Control: no-store`, and not linked
from any public page.

Access is single-owner through Cloudflare Access. The Worker itself verifies the
Access token (the `Cf-Access-Jwt-Assertion` header, or the `CF_Authorization` cookie) on every admin
page and admin server function: RS256 signature against
the team's keys (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`), `iss`, `aud`, expiry, and
the email, which must equal `ADMIN_EMAIL`. If any of the three settings is missing, or the token fails,
the answer is a bare 401/403. Writes must also be same-origin POSTs.

### Local

```sh
cp apps/web/.dev.vars.example apps/web/.dev.vars   # ADMIN_DEV_BYPASS=1, git-ignored
pnpm dev                                           # http://localhost:3000/admin
```

The bypass only applies when the var is exactly `1` and the request is for `localhost` / `127.0.0.1`.
`wrangler deploy` never uploads `.dev.vars`; never create a deployed var or secret named
`ADMIN_DEV_BYPASS`.

### Deploy

The Cloudflare Access application for `ryanyogan.com/admin*` already exists (created 2026-10-02), with a
policy that allows one address: the owner's Cloudflare Access email. Its team domain and audience tag are
plain `vars` in `apps/web/wrangler.jsonc` (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`; neither is sensitive). The
third setting, `ADMIN_EMAIL`, is a secret and is never written to a file. The Worker reads all three from
`env` the same way, var or secret. Until `ADMIN_EMAIL` is set, the deployed /admin answers 403.

What is left, from `apps/web`:

```sh
pnpm exec wrangler secret put ADMIN_EMAIL   # prompts; enter the owner's Cloudflare Access email
pnpm run deploy
```

If the Worker has never been deployed, `secret put` asks whether to create it first; answer yes, or
deploy first and set the secret afterwards (a secret takes effect at once, no second deploy).

After the deploy, check in this order:

1. Signed out, `curl -i https://ryanyogan.com/admin` must not return the admin (an Access login redirect,
   or 401/403 from the Worker).
2. Sign in at `/admin` through Access with the owner's Cloudflare Access email; the project list shows.
3. Save an edit to any project. This is the one path that could not be tested before a real Access
   application existed: the admin's reads and writes are requests to `/_serverFn/...`, outside the
   `admin*` path, where Access adds no header, so the Worker verifies the `CF_Authorization` cookie from
   the login instead (same signed token, same checks). If saving answers 401, the cookie is not reaching
   `/_serverFn`, and the fix is in code: serve the admin functions from a path under `/admin`. Do not
   loosen the check.
4. Import one repository at `/admin/import`.
5. Open the imported draft and run "Draft with AI" once (the first production use of the `AI` binding).

### Import from GitHub

`/admin/import` lists the PUBLIC repositories of `GITHUB_USER` (default `ryanyogan`) through
`GET /users/{user}/repos`, so a private repository can never be listed or imported. Importing one creates
an unpublished draft (`source = 'github'`); it is public only after you tick Published and save. The edit
page of an imported project has "Refresh from GitHub", which updates stars and the last-push date only.

- The repo list is cached in memory for 15 minutes; "Reload from GitHub" refetches it. Without a token
  GitHub allows 60 requests an hour per IP (a full listing is one request per 100 repos, an import three).
- Optional: `pnpm exec wrangler secret put GITHUB_TOKEN` (a fine-grained token with public read-only
  access) raises the limit. Locally put it in `.dev.vars`. Never commit one; CI and the tests use none
  (`e2e/github-stub.mjs` stands in for the API, via `GITHUB_API_BASE`).

### Draft with AI

The edit page of a GitHub-imported project has "Draft with AI". It sends the repository's public
metadata and README to Workers AI (model id: `AI_MODEL` in `apps/web/src/lib/admin/ai.ts`) and shows the
answer beside the current tagline, summary, tech and body, with the things the model could not confirm
listed first. "Use this" / "Use all" only fill the form; the database changes when you press Save
changes, which also stamps `ai_generated_at`. Drafting never changes Published.

- Setup: none. The `AI` binding is declared in `apps/web/wrangler.jsonc` and exists on the next
  `pnpm run deploy`; there is no secret to set. It has not run in production yet (see "Deploy").
- Workers AI is billed per token, a fraction of a cent per draft. `pnpm dev` calls the real service
  (it needs `wrangler login`); `vite build`, `vite preview`, CI and the tests never do: the e2e suite sets
  `AI_STUB_URL`, honoured only together with the local admin bypass, to use `e2e/ai-stub.mjs`.
- The wording rules sent to the model are in `apps/web/src/lib/admin/ai-prompt.ts`; edit them there.

## Unit tests

`apps/web/src/routeTree.gen.ts` is generated (git-ignored). On a fresh clone run `pnpm build` (or
`pnpm dev`) once before `pnpm check`; CI builds before it typechecks for the same reason.

`pnpm test` (also part of `pnpm check`) runs vitest over `apps/web/src/**/*.test.ts`: the Access JWT
verification with a locally generated key pair, the admin guard, write validation, the GitHub client and the
AI draft (prompt assembly, answer validation, error mapping; the model is stubbed).

## Smoke tests

A small Playwright suite (Chromium only) in `apps/web/e2e` runs against the built site. It starts two
`vite preview` servers itself and refuses to reuse ones already running, so stop any `pnpm preview`
first: port 4173 is the public site with no admin settings (so `/admin` must be closed), port 4174 is the
same build with the admin bypass on, for the admin tests. `pnpm test:e2e` first rebuilds two throwaway
local D1 databases (`db:e2e`: migrations, the seed, and one unpublished row from `e2e/draft.sql`) in
`apps/web/.wrangler/e2e` and `.wrangler/e2e-admin`, separate from the database `pnpm dev` uses. It also
deletes `dist/server/.dev.vars` (the build's copy of your `.dev.vars`) so the tests control the bypass;
rebuild before using `pnpm preview` with the admin again.

```sh
pnpm --filter @repo/web exec playwright install chromium   # once
pnpm build                                                 # the tests read apps/web/dist
pnpm test:e2e
```

The HTML report is written to `apps/web/playwright-report`
(`pnpm --filter @repo/web exec playwright show-report`).

## CI

`.github/workflows/ci.yml` runs format check, lint, typecheck, unit tests, build, and `pnpm test:e2e` (the same script as locally: local D1 migrate and seed, Playwright, a summary) on pull requests
and on pushes to `master`. It only validates; deploys are run by hand with `pnpm deploy`.
