// The font files worth fetching before the stylesheet asks for them: the interface face
// (header, headings, labels) and the body roman. The body semibold and italic load when
// something uses them. See fonts.css.
import hankenRoman from "./fonts/hanken-grotesk-latin-wght-normal.woff2?url";
import sourceSerifRoman from "./fonts/source-serif-4-latin-400-normal.woff2?url";

export const fontPreloads = [hankenRoman, sourceSerifRoman].map((href) => ({
  rel: "preload",
  as: "font",
  type: "font/woff2",
  href,
  // Fonts are fetched in CORS mode even from the same origin; without this the preload
  // is not reused.
  crossOrigin: "anonymous" as const,
}));
