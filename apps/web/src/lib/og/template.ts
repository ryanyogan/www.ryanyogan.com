// The one social preview card (1200x630), as a plain element tree: no JSX and no imports,
// so the build (vite-plugin-og.ts: satori + resvg in Node) and the Worker
// (render-project.ts: @cf-wasm/og) draw the same picture from the same code.
//
// Paper, ink, one typeface at one weight, the lakefront contours from the home page in the
// corner, and the accent once (the point on the shore).

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_FONT_FAMILY = "Hanken Grotesk";
export const OG_FONT_WEIGHT = 500;

// styles/app.css, light theme. A card is always light: it sits on someone else's page.
const PAPER = "#f6f5f1";
const INK = "#25272a";
const MUTED = "#666a6a";
const ACCENT = "#3d6a55";

const SITE_NAME = "Ryan Yogan";
const SITE_ADDRESS = "ryanyogan.com";

export interface OgCard {
  title: string;
  /** Kind, then date or status: "Writing · Sep 2026", "Project · Live". */
  kicker?: string;
}

export interface OgNode {
  type: string;
  props: Record<string, unknown> & { children?: OgNode | string | (OgNode | string)[] };
}

function h(type: string, props: Record<string, unknown>, ...children: (OgNode | string)[]): OgNode {
  if (children.length === 0) return { type, props };
  return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
}

/** Short titles are large; a long one steps down so three lines hold it. */
export function titleSize(title: string): number {
  const length = title.trim().length;
  if (length <= 24) return 84;
  if (length <= 48) return 72;
  if (length <= 72) return 62;
  return 54;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Writing · Sep 2026" from a YYYY-MM-DD day. */
export function postKicker(isoDay: string): string {
  const [year, month] = isoDay.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `Writing · ${name} ${year}` : "Writing";
}

/** "Project · Live" from the status label shown on the page. */
export function projectKicker(statusLabel: string): string {
  const label = statusLabel.trim();
  return label ? `Project · ${label}` : "Project";
}

/** What the card says, for og:image:alt. */
export function ogAlt({ title, kicker }: OgCard): string {
  return `${SITE_NAME}. ${title.trim()}${kicker ? ` (${kicker})` : ""}`;
}

// components/home/HomeArt.tsx: the contour lines, the street grid and the marked point.
const CONTOURS: [d: string, opacity: number][] = [
  ["M96 4c6 22 20 34 26 54c5 17 2 30 12 46c9 15 24 22 30 40c5 15 4 30 10 46", 1],
  ["M122 4c5 20 16 32 21 50c5 17 3 30 12 44c9 14 22 22 27 38c5 16 5 34 10 54", 0.8],
  ["M152 4c4 18 12 30 16 46c4 16 4 28 11 42c8 14 18 24 22 40c4 16 6 36 9 58", 0.6],
  ["M186 4c3 18 8 30 11 46c3 16 4 28 9 42c6 14 12 26 15 42c3 16 5 36 7 56", 0.4],
  ["M224 4c2 20 4 34 6 50c2 16 3 30 5 44c3 16 6 30 8 46", 0.25],
  ["M8 40h88M8 76h106M8 112h124M8 148h146M8 184h160M30 22v164M66 22v164M102 62v124", 0.3],
  ["M131 99c-16 3-30 0-44 6c-12 5-16 18-30 22", 0.8],
];

function art(): OgNode {
  return h(
    "svg",
    {
      viewBox: "0 0 250 192",
      width: 280,
      height: 215,
      style: { position: "absolute", top: 64, right: 72 },
    },
    ...CONTOURS.map(([d, opacity]) =>
      h("path", {
        d,
        fill: "none",
        stroke: INK,
        "stroke-width": 1,
        "stroke-linecap": "round",
        opacity,
      }),
    ),
    h("circle", { cx: 131, cy: 99, r: 4, fill: ACCENT }),
  );
}

export function ogCard({ title, kicker }: OgCard): OgNode {
  const size = titleSize(title);
  return h(
    "div",
    {
      style: {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: PAPER,
        color: INK,
        fontFamily: OG_FONT_FAMILY,
        fontWeight: OG_FONT_WEIGHT,
      },
    },
    art(),
    h("div", { style: { display: "flex", fontSize: 30, letterSpacing: "-0.01em" } }, SITE_NAME),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", width: 1040 } },
      h(
        "div",
        {
          style: {
            display: "block",
            // The art keeps the top right; a title only reaches under it on its last lines.
            maxWidth: size >= 72 ? 760 : 900,
            fontSize: size,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            lineClamp: 3,
          },
        },
        title.trim(),
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginTop: 34,
            fontSize: 30,
            color: MUTED,
          },
        },
        h("div", { style: { display: "flex" } }, kicker ?? ""),
        h("div", { style: { display: "flex" } }, SITE_ADDRESS),
      ),
    ),
  );
}
