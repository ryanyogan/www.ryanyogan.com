-- Slugs the owner deleted (or renamed away from) in /admin. The seed (scripts/seed-projects.ts)
-- skips them, so re-running it never resurrects a project that was removed on purpose.
-- To bring a seed project back, delete its row here and run the seed again.
CREATE TABLE deleted_seed_slugs (
  slug       TEXT PRIMARY KEY,
  deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
