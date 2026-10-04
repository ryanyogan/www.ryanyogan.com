-- Unpublished, "imported" projects for e2e/admin-extra.spec.ts, in the admin test database
-- only (applied by `pnpm db:e2e`). Their repositories exist only in e2e/github-stub.mjs,
-- They sit in a group the reorder test in admin.spec.ts does not touch.
-- which fails or answers for each by name, as does e2e/ai-stub.mjs.
INSERT INTO projects (slug, title, tagline, summary, body, tech, "group", status, sort_order, published, source, repo_full_name, stars)
VALUES
  ('stub-ai-malformed', 'Fixture stub-ai-malformed', 'Fixture tagline stub-ai-malformed', 'Fixture summary stub-ai-malformed', 'Fixture body.', '["Zig"]', 'agents-memory', 'prototype', 900, 0, 'github', 'ryanyogan/stub-ai-malformed', 3),
  ('stub-ai-timeout', 'Fixture stub-ai-timeout', 'Fixture tagline stub-ai-timeout', 'Fixture summary stub-ai-timeout', 'Fixture body.', '["Zig"]', 'agents-memory', 'prototype', 901, 0, 'github', 'ryanyogan/stub-ai-timeout', 3),
  ('stub-ai-down', 'Fixture stub-ai-down', 'Fixture tagline stub-ai-down', 'Fixture summary stub-ai-down', 'Fixture body.', '["Zig"]', 'agents-memory', 'prototype', 902, 0, 'github', 'ryanyogan/stub-ai-down', 3),
  ('stub-gh-limited', 'Fixture stub-gh-limited', 'Fixture tagline stub-gh-limited', 'Fixture summary stub-gh-limited', 'Fixture body.', '["Zig"]', 'agents-memory', 'prototype', 903, 0, 'github', 'ryanyogan/stub-gh-limited', 3),
  ('stub-gh-broken', 'Fixture stub-gh-broken', 'Fixture tagline stub-gh-broken', 'Fixture summary stub-gh-broken', 'Fixture body.', '["Zig"]', 'agents-memory', 'prototype', 904, 0, 'github', 'ryanyogan/stub-gh-broken', 3)
ON CONFLICT (slug) DO NOTHING;
