-- An unpublished project for the e2e suite (applied by `pnpm db:e2e`). It must never
-- show on a public page, in the palette, or at its own URL. Keep in step with
-- `draft` in e2e/fixtures.ts.
INSERT INTO projects (slug, title, tagline, summary, body, tech, "group", status, sort_order, published, source)
VALUES ('e2e-draft', 'Quixotic Draft', 'Unpublished tagline xq7', 'Unpublished summary xq7', 'Unpublished body xq7', '["Zig"]', 'shipped', 'prototype', 0, 0, 'manual')
ON CONFLICT (slug) DO NOTHING;
