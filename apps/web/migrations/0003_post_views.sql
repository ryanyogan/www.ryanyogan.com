-- Page loads of the writing posts (/writing/$slug), counted by POST /api/views/$slug.
-- One row per post slug, made on its first view. To reset a post, delete its row.
CREATE TABLE post_views (
  slug       TEXT PRIMARY KEY,
  views      INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
