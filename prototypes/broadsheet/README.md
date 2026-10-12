# Broadsheet prototype

`index.html` is the home page exactly as designed, with the tokens from
`docs/design/broadsheet-tokens.css` and a Day / System / Night switch (bottom-right; prototype only).
Open it directly in a browser — no build. Narrow the window under 600px for the phone layout,
600–900px for the tablet layout.

It loads Newsreader and IBM Plex Sans Condensed from Google Fonts for convenience; the site itself
self-hosts the static files in `apps/web/src/styles/fonts/`. The Google variable font renders
display sizes with optical sizing, which the static files do not — that is the one known difference
between this file and what ships.

The three drawings are inline copies of the site's own `HomeArt.tsx` figures so the prototype is
self-contained; in the app, keep the real components.
