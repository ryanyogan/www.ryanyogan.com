// The font files worth fetching before the stylesheet asks for them: the two roman faces
// that set the heading and the first paragraph of every page. The italics and the mono
// load when something uses them. See fonts.css.
import frauncesRoman from "./fonts/fraunces-latin-opsz-normal.woff2?url";
import sourceSansRoman from "./fonts/source-sans-3-latin-wght-normal.woff2?url";

export const fontPreloads = [frauncesRoman, sourceSansRoman].map((href) => ({
  rel: "preload",
  as: "font",
  type: "font/woff2",
  href,
  // Fonts are fetched in CORS mode even from the same origin; without this the preload
  // is not reused.
  crossOrigin: "anonymous" as const,
}));
