-- Projects shown on /, /projects and /projects/$slug.
-- Only rows with published = 1 are ever read by a public route.
CREATE TABLE projects (
  slug            TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  tagline         TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  -- JSON array of strings, e.g. ["Elixir","OTP"].
  tech            TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tech) AND json_type(tech) = 'array'),
  "group"         TEXT NOT NULL CHECK ("group" IN ('agents-memory', 'tools-for-agents', 'shipped', 'desktop-tools', 'for-people-i-know')),
  status          TEXT NOT NULL CHECK (status IN ('running', 'live', 'prototype', 'retired', 'private')),
  status_label    TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  github_url      TEXT,
  live_url        TEXT,
  -- "owner/name" for projects imported from GitHub.
  repo_full_name  TEXT UNIQUE,
  repo_pushed_at  TEXT,
  stars           INTEGER,
  published       INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('seed', 'github', 'manual')),
  ai_generated_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX projects_published_order ON projects (published, "group", sort_order);
