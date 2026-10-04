#!/bin/sh
# Checks that the deployed site serves the build in apps/web/dist (the last step of the CI
# deploy job; also usable by hand after `pnpm run deploy`).
#   sh scripts/deploy-smoke.sh                       https://ryanyogan.com
#   sh scripts/deploy-smoke.sh https://example.com   another origin
# Passes when /, /projects and /sitemap.xml answer 200 from the Worker, the HTML of / names
# this build's entry script and stylesheet (their file names carry a content hash), and the
# entry script itself answers 200. Each request carries a query parameter the page cache
# does not know (src/lib/page-cache.ts), so the Worker renders it instead of serving a copy
# an older version stored. A new version takes a moment to reach every data centre:
# ATTEMPTS tries (default 6), WAIT seconds apart (default 10).
set -eu

ORIGIN="${1:-https://ryanyogan.com}"
ATTEMPTS="${ATTEMPTS:-6}"
WAIT="${WAIT:-10}"
here=$(cd "$(dirname "$0")/.." && pwd)
assets="$here/apps/web/dist/client/assets"
tag=$(git -C "$here" rev-parse --short HEAD 2>/dev/null || echo manual)

# The only file of each kind in a build; anything else means the build layout changed.
only() {
  pattern=$1
  set -- "$assets"/$pattern
  if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
    echo "deploy-smoke: FAILED (expected exactly one $pattern in $assets; run pnpm build first)" >&2
    exit 1
  fi
  basename "$1"
}
script=$(only 'main-*.js')
styles=$(only 'app-*.css')

page=$(mktemp)
trap 'rm -f "$page"' EXIT INT TERM

status() { curl -sS --max-time 20 -o "$2" -w '%{http_code}' "$ORIGIN$1" 2>/dev/null || true; }

check() {
  bust="deploy=$tag-$1"
  home=$(status "/?$bust" "$page")
  if [ "$home" != 200 ]; then why="/ answered $home" && return 1; fi
  for marker in "$script" "$styles"; do
    if ! grep -a -q -F "/assets/$marker" "$page"; then
      why="/ does not name /assets/$marker: an older version answered" && return 1
    fi
  done
  for path in "/projects?$bust" "/sitemap.xml?$bust" "/assets/$script" / /projects /sitemap.xml; do
    code=$(status "$path" /dev/null)
    if [ "$code" != 200 ]; then why="$path answered $code" && return 1; fi
  done
}

why=""
i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  if check "$i"; then
    echo "deploy-smoke: OK ($ORIGIN serves $script and $styles; /, /projects, /sitemap.xml 200; attempt $i)"
    exit 0
  fi
  echo "deploy-smoke: attempt $i of $ATTEMPTS: $why"
  [ "$i" -lt "$ATTEMPTS" ] && sleep "$WAIT"
  i=$((i + 1))
done

echo "deploy-smoke: FAILED ($why)"
exit 1
