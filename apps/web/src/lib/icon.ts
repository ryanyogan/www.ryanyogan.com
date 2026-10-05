// The site's icon: the letters RY in the header wordmark's face, a step bolder, ink on paper,
// and nothing else. It is a stand-in until there is a real mark. This file is the whole
// definition; the build draws the three files from it (vite-plugin-icons.ts) and no icon
// file is committed.
//
// To replace it with a real mark: make `mark()` in vite-plugin-icons.ts return the mark's own
// path data and its ink bounds instead of setting MARK.text. Everything after that (the
// placing, the two schemes, the PNGs, the links, the tests) stays as it is.

export const MARK = {
  text: "RY",
  /**
   * Hanken Grotesk one step heavier than the wordmark (Header.tsx: font-semibold). In a tab
   * the letters are 8px tall, and at 600 their stems were a thin pixel.
   */
  font: "src/lib/og/hanken-grotesk-latin-700.woff.bin",
  weight: 700,
  /** Space added between the letters, in em: the R's leg sits a little under the Y's arm. */
  tracking: -0.03,
  /** --paper and --ink in styles/app.css. PNGs are always light; the SVG follows the scheme. */
  light: { paper: "#f6f5f1", ink: "#25272a" },
  dark: { paper: "#1c1e1f", ink: "#dddcd6" },
  /** How much of the square's width the letters take. A tab shows the icon at 16px. */
  favicon: 0.82,
  /** iOS rounds the corners of the home screen icon itself: the letters keep well inside. */
  touch: 0.5,
  /** An optical correction to the centring, as a share of the square: right, down. */
  nudge: [0, 0],
} as const;

/** The side of the square every icon is drawn in. Whole units: a tenth of a pixel at 100px. */
export const ICON_BOX = 1000;

export const ICON_PATHS = {
  svg: "/favicon.svg",
  ico: "/favicon.ico",
  touch: "/apple-touch-icon.png",
} as const;

/**
 * The head links. Chrome and Firefox take the SVG and ask for nothing else. A Safari before
 * 26 does not read SVG icons and takes the .ico (which it asks for whether it is linked or
 * not); iOS takes the third when a page is put on the home screen. `sizes` on the .ico keeps
 * Chrome from preferring it to the SVG.
 */
export const ICON_LINKS = [
  { rel: "icon", href: ICON_PATHS.ico, sizes: "32x32" },
  { rel: "icon", href: ICON_PATHS.svg, type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: ICON_PATHS.touch },
] as const;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Path data moved and scaled so that its ink (the bounds given) is `share` of the square
 * wide and centred in it both ways, in whole units. Absolute M, L, Q, C and Z only, which is
 * what a font outline is made of: every number is then an x or a y, in turn.
 */
export function placeMark(
  d: string,
  ink: Bounds,
  share: number,
  nudge: readonly [number, number] = MARK.nudge,
): string {
  const other = d.match(/[^MLQCZ\d\s.,-]/);
  if (other) throw new Error(`placeMark: "${other[0]}" in the path data`);
  const scale = (ICON_BOX * share) / ink.width;
  const dx = (ICON_BOX - ink.width * scale) / 2 + nudge[0] * ICON_BOX - ink.x * scale;
  const dy = (ICON_BOX - ink.height * scale) / 2 + nudge[1] * ICON_BOX - ink.y * scale;
  let isX = true;
  return d.replace(/[MLQCZ]|-?[\d.]+/g, (token) => {
    if (/[MLQCZ]/.test(token)) {
      isX = true;
      return token;
    }
    const value = Math.round(Number(token) * scale + (isX ? dx : dy));
    isX = !isX;
    return String(value);
  });
}

/**
 * The icon as an SVG document: a square of paper and the placed mark. "auto" adds the dark
 * colours behind a media query, which Chrome and Firefox follow for a tab icon; "light" is
 * what gets rasterised.
 */
export function iconSvg(d: string, scheme: "auto" | "light"): string {
  const { light, dark } = MARK;
  const style =
    scheme === "auto"
      ? `<style>@media (prefers-color-scheme:dark){rect{fill:${dark.paper}}path{fill:${dark.ink}}}</style>`
      : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_BOX} ${ICON_BOX}">${style}` +
    `<rect width="${ICON_BOX}" height="${ICON_BOX}" fill="${light.paper}"/>` +
    `<path fill="${light.ink}" d="${d}"/></svg>`
  );
}

/** A .ico file holding one PNG as it is (every browser that reads .ico reads that form). */
export function ico(png: Uint8Array, size: number): Uint8Array {
  const HEADER = 22;
  const file = new Uint8Array(HEADER + png.length);
  const view = new DataView(file.buffer);
  view.setUint16(2, 1, true); // an icon
  view.setUint16(4, 1, true); // one image
  view.setUint8(6, size);
  view.setUint8(7, size);
  view.setUint16(10, 1, true); // colour planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, png.length, true);
  view.setUint32(18, HEADER, true);
  file.set(png, HEADER);
  return file;
}
