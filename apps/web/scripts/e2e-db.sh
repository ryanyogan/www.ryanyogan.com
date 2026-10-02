#!/bin/sh
# Rebuilds the two throwaway local D1 databases the Playwright suite uses (run from apps/web
# by `pnpm db:e2e`): migrations, the seed, and one unpublished row. Local only, no account.
#   .wrangler/e2e        the public preview (port 4173)
#   .wrangler/e2e-admin  the preview with the admin bypass on (port 4174); its tests write
set -eu

pnpm db:seed:generate

for dir in .wrangler/e2e .wrangler/e2e-admin; do
  rm -rf "$dir"
  wrangler d1 migrations apply DB --local --persist-to "$dir"
  wrangler d1 execute DB --local --persist-to "$dir" --file db/seed.sql
  wrangler d1 execute DB --local --persist-to "$dir" --file e2e/draft.sql
done

# Unpublished imported projects the admin tests use for the GitHub and AI failure states.
wrangler d1 execute DB --local --persist-to .wrangler/e2e-admin --file e2e/admin-fixtures.sql

# A third preview runs on a database with no tables at all, to see what a D1 failure looks
# like from outside (port 4177): keep its state directory empty.
rm -rf .wrangler/e2e-broken

# `vite build` copies a developer's .dev.vars into dist/server, and `vite preview` would read
# it. The suite needs to control ADMIN_DEV_BYPASS itself (off on 4173, on on 4174), so drop
# the copy; the next `pnpm build` puts it back.
rm -f dist/server/.dev.vars
