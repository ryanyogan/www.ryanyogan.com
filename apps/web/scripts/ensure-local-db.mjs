// Makes the local D1 usable before `pnpm dev` / `pnpm preview` (the predev and prepreview
// hooks), so a fresh clone needs no database step. Local only: every wrangler call here
// passes --local, and nothing in this file can reach the remote database.
//
//   1. Apply pending migrations (a no-op when there are none).
//   2. Seed from content/projects/*.md, but only when the `projects` table has no rows, so
//      projects edited, added or deleted through the admin are never overwritten.
//
// After a successful run a stamp (the database id and the migration file names) is written
// inside the state directory; while it matches and a database file exists, later starts
// skip wrangler entirely.
// Deleting .wrangler/state deletes the stamp with it.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const STATE_DIR = ".wrangler/state";
const STAMP = `${root}${STATE_DIR}/local-db.stamp`;

// The e2e suite owns its state directories (scripts/e2e-db.sh); one of them is empty on purpose.
if (process.env.LOCAL_STATE_DIR) process.exit(0);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`local database setup failed: ${command} ${args.join(" ")}`);
    console.error(result.error?.message ?? `${result.stdout}${result.stderr}`.trim());
    console.error("Fix the error above, or run `pnpm db:migrate:local` and `pnpm db:seed:local`.");
    process.exit(1);
  }
  return result.stdout;
}

const databaseId = /"database_id":\s*"([^"]+)"/.exec(readFileSync(`${root}wrangler.jsonc`, "utf8"));
const migrations = readdirSync(`${root}migrations`)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const stamp = JSON.stringify({ databaseId: databaseId?.[1] ?? null, migrations });

const D1_DIR = `${root}${STATE_DIR}/v3/d1/miniflare-D1DatabaseObject`;
const hasDatabaseFile =
  existsSync(D1_DIR) && readdirSync(D1_DIR).some((name) => name.endsWith(".sqlite"));
if (hasDatabaseFile && existsSync(STAMP) && readFileSync(STAMP, "utf8") === stamp) process.exit(0);

const started = Date.now();
run("wrangler", ["d1", "migrations", "apply", "DB", "--local"]);

const counted = run("wrangler", [
  "d1",
  "execute",
  "DB",
  "--local",
  "--json",
  "--command",
  "SELECT count(*) AS n FROM projects",
]);
const rows = JSON.parse(counted.slice(counted.indexOf("[")))[0].results[0].n;

if (rows === 0) {
  run(process.execPath, ["--experimental-strip-types", "scripts/seed-projects.ts"]);
  run("wrangler", ["d1", "execute", "DB", "--local", "--file", "db/seed.sql"]);
}

mkdirSync(`${root}${STATE_DIR}`, { recursive: true });
writeFileSync(STAMP, stamp);
console.log(
  `local database ready: ${migrations.length} migration(s) applied, ` +
    `${rows === 0 ? "seeded from content/projects" : `${rows} existing projects kept`} ` +
    `(${((Date.now() - started) / 1000).toFixed(1)}s)`,
);
