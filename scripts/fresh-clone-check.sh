#!/bin/sh
# Checks that a fresh clone works with `pnpm install && pnpm dev` and no database step.
#   sh scripts/fresh-clone-check.sh             copy the tree (tracked and unignored files:
#                                               no node_modules, no .wrangler) to a temp
#                                               directory, install there, start dev, check
#   sh scripts/fresh-clone-check.sh --in-place  start dev in this checkout and check (CI,
#                                               where the checkout already is a fresh clone)
# Passes when / and /projects answer 200, /projects links the 13 seeded projects and the
# server log has no "no such table". PORT picks the dev port (default 3111).
set -eu

PORT="${PORT:-3111}"
EXPECTED=13
here=$(cd "$(dirname "$0")/.." && pwd)
work=""
pid=""

cleanup() {
  [ -n "$pid" ] && kill -- "-$pid" 2>/dev/null || true
  [ -n "$work" ] && rm -rf "$work"
  return 0
}
trap cleanup EXIT INT TERM

if [ "${1:-}" = "--in-place" ]; then
  dir="$here"
  log="${TMPDIR:-/tmp}/fresh-clone-dev.$$.log"
else
  work=$(mktemp -d)
  dir="$work/repo"
  mkdir "$dir"
  (cd "$here" && git ls-files -co --exclude-standard -z | tar -c --null -T - -f - 2>/dev/null) | tar -x -C "$dir"
  log="$work/dev.log"
  (cd "$dir" && pnpm install --frozen-lockfile --prefer-offline >"$work/install.log" 2>&1) || {
    tail -30 "$work/install.log"
    echo "fresh-clone: FAILED (pnpm install)"
    exit 1
  }
fi

cd "$dir"
# Its own process group, so the whole dev tree can be stopped; no remote bindings needed.
NO_REMOTE_BINDINGS=1 setsid pnpm --filter @repo/web dev --port "$PORT" --strictPort >"$log" 2>&1 &
pid=$!

status() { curl -s -o "$2" -w '%{http_code}' "http://localhost:$PORT$1" || true; }

home=000
i=0
while [ "$i" -lt 90 ]; do
  home=$(status / /dev/null)
  [ "$home" = 200 ] && break
  kill -0 "$pid" 2>/dev/null || break
  i=$((i + 1))
  sleep 1
done

page="${log%.log}.projects.html"
projects=$(status /projects "$page")
count=$(grep -a -o 'href="/projects/[^"#?]*"' "$page" 2>/dev/null | sort -u | wc -l | tr -d ' ')
missing=$(grep -a -c 'no such table' "$log" || true)
rm -f "$page"

echo "fresh-clone: / $home, /projects $projects, $count projects, $missing \"no such table\" in the log"
if [ "$home" = 200 ] && [ "$projects" = 200 ] && [ "$count" = "$EXPECTED" ] && [ "$missing" = 0 ]; then
  echo "fresh-clone: OK"
  [ -z "$work" ] && rm -f "$log"
  exit 0
fi
tail -30 "$log"
echo "fresh-clone: FAILED"
exit 1
