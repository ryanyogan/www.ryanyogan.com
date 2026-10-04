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
- View counts of the writing posts are in the table `post_views` (migration 0003): one row per post slug,
  made on the first view. A post is a static file, so its page asks for the count after it has loaded:
  `POST /api/views/<slug>` adds one in a single statement and answers with the new total; `GET /api/views`
  lists every post's total. Neither is cached, and only the slug of a real post is counted. The number is
  raw page loads: a refresh counts again, and so does any bot that runs JavaScript. If the database fails
  the post shows no count. To reset a post, delete its row (from `apps/web`):
  `pnpm exec wrangler d1 execute DB --remote --command "DELETE FROM post_views WHERE slug = '<slug>'"`.

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

CI runs these three on every deploy (see [Deploy from CI](#deploy-from-ci)), always before the new code
goes live. A deploy by hand that adds a migration (0002, `deleted_seed_slugs`, is applied by the first CI
deploy) needs the first command run before `pnpm run deploy`: the admin's delete and slug change write to
that table, and the generated seed reads it.

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

The secret is set once, by hand, from `apps/web`; a deploy (from CI or by hand) never reads, sets or
removes it:

```sh
pnpm exec wrangler secret put ADMIN_EMAIL   # prompts; enter the owner's Cloudflare Access email
```

If the Worker has never been deployed, `secret put` asks whether to create it first; answer yes, or
deploy first and set the secret afterwards (a secret takes effect at once, no second deploy).

Code is deployed by CI on every green push to `master` ([Deploy from CI](#deploy-from-ci)). CI's smoke
check does not sign in, so after a deploy that touches the admin, check in this order:

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

A small Playwright suite in `apps/web/e2e` runs against the built site, in three projects: `chromium`
(everything, desktop size), `mobile` (Chromium at 390px: the page tests, the mobile menu and the view
count) and `webkit` (Safari's engine as an iPhone 14, public pages only: the device matrix in
`viewports.spec.ts`, the mobile menu, the page tests, the view count and the hydration check). It starts two
`vite preview` servers itself and refuses to reuse ones already running, so stop any `pnpm preview`
first: port 4173 is the public site with no admin settings (so `/admin` must be closed), port 4174 is the
same build with the admin bypass on, for the admin tests. `pnpm test:e2e` first rebuilds two throwaway
local D1 databases (`db:e2e`: migrations, the seed, and one unpublished row from `e2e/draft.sql`) in
`apps/web/.wrangler/e2e` and `.wrangler/e2e-admin`, separate from the database `pnpm dev` uses. It also
deletes `dist/server/.dev.vars` (the build's copy of your `.dev.vars`) so the tests control the bypass;
rebuild before using `pnpm preview` with the admin again.

```sh
pnpm --filter @repo/web exec playwright install chromium webkit   # once
pnpm build                                                        # the tests read apps/web/dist
pnpm test:e2e
```

Playwright's WebKit build needs system libraries it only packages for Ubuntu, Debian and macOS. On a
machine where it does not start, run the two Chromium projects and leave WebKit to CI:
`pnpm test:e2e --project=chromium --project=mobile`.

The HTML report is written to `apps/web/playwright-report`
(`pnpm --filter @repo/web exec playwright show-report`).

## Performance

Two checks, both against the production build, neither on the Worker's dependency list.

`pnpm perf:budget` is the gate: part of `validate` in CI, so it runs on every pull request and push. It
loads each public page type from a `vite preview` it starts itself, sums what the page downloads (gzip)
and fails when the JavaScript or CSS is over the budgets in `apps/web/scripts/perf-budget.mjs`, when a
page makes more requests than its ceiling there (6 to 10 today; the shared modules are one chunk and
the stylesheet is inlined in the document), when a public page fetches the markdown parser or the
highlighter, or when a script carries another post's body.
`pnpm perf:budget --report` prints the table without failing.

`pnpm perf` is the report: Lighthouse (mobile emulation, simulated Slow 4G, 4x CPU slowdown; median of
three runs) for `/`, the longest post and one project page, against the lab budgets: LCP, CLS, TBT,
transfer, request count and TTFB. INP and the cache-miss TTFB cannot be measured by a page-load run and
are printed as such. Lab numbers are noisy on shared runners, so a line over budget is reported and
only fails the script with `--strict`. It runs in `.github/workflows/perf.yml`, never on a push and not
as a required check: every Monday against https://ryanyogan.com, and on demand:

```sh
gh workflow run perf.yml -f base_url=https://ryanyogan.com   # the live site
gh workflow run perf.yml --ref my-branch                     # builds that ref, measures its preview
```

The workflow passes `--detail`: under the table, each page's requests (type, priority, size, whether
it blocks rendering or is preloaded), the LCP element with its breakdown and the chain of critical
requests; the same as JSON in the run's `perf-detail` artifact. `-f applied=true` (`--applied`) makes
Chrome throttle for real instead of Lighthouse simulating: the simulation charges the paint with every
request that finished before it in an unthrottled load, scripts and fonts included, so it reads about
a second higher than a throttled load of this site; use it to see what actually holds the paint back.

The table is in the run's summary. The preview does not compress, so there transfer is not judged and
LCP reads high; the run against the deployed site is the one to trust. Locally it is
`pnpm build && pnpm perf` (or `pnpm perf https://ryanyogan.com`, which needs no build); it needs Chrome
installed and fetches the pinned Lighthouse with `pnpm dlx` on first use, so Lighthouse is not in
`package.json` or the lockfile.

## CI

`.github/workflows/ci.yml` has two jobs. `validate` runs on pull requests and on pushes to `master`:
format check, lint, build, typecheck, unit tests, the fresh-clone check, `pnpm test:e2e` (the same script
as locally: local D1 migrate and seed, Playwright in Chromium and WebKit, a summary) and the transfer
budget. The browser downloads are cached between runs, keyed on `pnpm-lock.yaml`. `deploy` runs only
for a push to `master` in this repository, after `validate` passed for that commit; on a pull request
(and in a fork) it shows as skipped.

### Deploy from CI

Merging to `master` deploys. The `deploy` job checks out the commit that was validated and, from
`apps/web`:

1. Fails at once, before anything is changed, if either repository secret below is missing.
2. Builds (`pnpm build`), then checks the token with a read-only call (`wrangler deployments status`).
3. Applies pending D1 migrations to the remote database (`wrangler d1 migrations apply DB --remote`;
   Wrangler skips its confirmation in CI). This comes before the deploy so the new code never runs
   against a schema that lacks its tables. Write migrations the old code can live with (add, do not
   rename or drop, in the same deploy): the old version keeps serving until step 5.
4. Generates and applies the project seed (`pnpm db:seed:generate`,
   `wrangler d1 execute DB --remote --file db/seed.sql`), so an edit to `content/projects/*.md` reaches
   production with the deploy. The seed only writes a row that is still an untouched seed row and whose
   file changed; projects edited, reordered, deleted or renamed in `/admin` are left alone. A seed change
   purges no cached page: it shows within 6 minutes.
5. `wrangler deploy --message "CI <sha>"` to the Worker `ryanyogan-com`. The custom domain and the
   Worker's secrets are not in `wrangler.jsonc`, and a deploy keeps both.
6. Runs `scripts/deploy-smoke.sh`: `/`, `/projects` and `/sitemap.xml` on https://ryanyogan.com must
   answer 200, rendered by the Worker (a query parameter keeps the page cache out of it), and `/` must
   name this build's entry script and stylesheet, whose file names carry a content hash. Six tries, ten
   seconds apart. If it fails, the new version is live and wrong: roll back. A commit that changes only
   server code leaves both file names as they were; for that commit the check proves the site is up,
   not which version answered.

Runs on `master` go one at a time and are never cancelled once started, so a deploy cannot be cut off
halfway. A push that lands while a run is in progress waits; if several wait, only the newest is kept
(the others show as cancelled) and it deploys everything before it. Re-running an old run from the
Actions page deploys that old commit again.

The job needs two repository secrets (Settings, Secrets and variables, Actions). It never prints them,
and only the steps that call Wrangler receive them.

- `CLOUDFLARE_ACCOUNT_ID`: the account that owns the Worker and the database (`wrangler whoami`, or the
  dashboard's account overview).
- `CLOUDFLARE_API_TOKEN`: an API token limited to that account, with these permissions:
  - Account, Workers Scripts, Edit (upload the Worker and its assets)
  - Account, D1, Edit (migrations and the seed)
  - Account, Account Settings, Read

  Cloudflare's guide for GitHub Actions starts from the "Edit Cloudflare Workers" template; that template
  is wider than this site needs (KV, R2, Pages, routes on every zone), so a custom token with the three
  rows above is the better choice. If you do use the template, add D1 Edit to it. No zone permission is
  needed: the workflow adds no routes and the custom domain is already attached.

  Checked against Cloudflare's documentation on 2026-10-04: the secret names and the template name
  ([GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)) and
  the permission names, listed there as Workers Scripts Write, D1 Write and Account Settings Read; the
  dashboard labels Write as Edit
  ([API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)).
  Not confirmed by a real run: that these three are enough for this Worker (it has a Workers AI
  binding), and that the template lacks D1. If a step answers "Authentication error [code: 10000]", the
  token is missing the permission for that step.

### Deploy by hand

If CI is down, from `apps/web`, on a clean checkout of the commit to deploy and after
`pnpm exec wrangler login`:

```sh
pnpm exec wrangler d1 migrations apply DB --remote   # only when there is a new migration
pnpm db:seed:generate                                # only when content/projects changed
pnpm exec wrangler d1 execute DB --remote --file db/seed.sql
pnpm run deploy                                      # pnpm build && wrangler deploy
sh ../../scripts/deploy-smoke.sh                     # the same check CI runs
```

### Roll back

From `apps/web`:

```sh
pnpm exec wrangler deployments list          # recent deployments; CI's carry "CI <commit>"
pnpm exec wrangler rollback <version-id>     # the version id of the last good one
```

A rollback takes effect at once and changes the code only: D1 keeps its migrations and data. Then
revert the commit on `master`, or the next green push deploys the bad code again.
