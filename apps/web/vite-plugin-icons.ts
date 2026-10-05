import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { Plugin } from "vite";
import { type Bounds, ICON_PATHS, MARK, ico, iconSvg, placeMark } from "./src/lib/icon";
import { OG_FONT_FAMILY } from "./src/lib/og/template";

/**
 * The site icon, drawn once per build from src/lib/icon.ts with the tools that draw the
 * preview cards (vite-plugin-og.ts): satori turns the letters into the font's own outlines,
 * resvg measures their ink and rasterises. Three files at the root of the site, none of
 * them committed:
 *
 *   /favicon.svg           paper and ink, the dark pair behind a media query
 *   /favicon.ico           one 32px PNG, light
 *   /apple-touch-icon.png  180px, light, the letters smaller (iOS rounds the corners)
 *
 * Their names carry no hash, so public/_headers gives them a day.
 */

/** The mark as path data with the bounds of its ink. A real mark would be returned here. */
async function mark(root: string): Promise<{ d: string; ink: Bounds }> {
  const size = 1000;
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: size,
          lineHeight: 1.2,
          letterSpacing: MARK.tracking * size,
          color: "#000",
        },
        children: MARK.text,
      },
    } as never,
    {
      width: size * (MARK.text.length + 1),
      height: size * 1.4,
      fonts: [
        {
          name: OG_FONT_FAMILY,
          data: readFileSync(join(root, MARK.font)),
          weight: MARK.weight,
          style: "normal",
        },
      ],
    },
  );
  const d = [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]).join("");
  const ink = new Resvg(svg).getBBox();
  if (!d || !ink) throw new Error("site-icons: satori drew no outline for the mark");
  return { d, ink: { x: ink.x, y: ink.y, width: ink.width, height: ink.height } };
}

function png(svg: string, size: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

export function siteIcons(): Plugin {
  let root = process.cwd();
  let built: Promise<Map<string, { type: string; body: string | Uint8Array }>> | undefined;

  // Once per process: the client and server builds share the result.
  function build() {
    built ??= (async () => {
      const { d, ink } = await mark(root);
      const favicon = placeMark(d, ink, MARK.favicon);
      const touch = placeMark(d, ink, MARK.touch);
      return new Map<string, { type: string; body: string | Uint8Array }>([
        [ICON_PATHS.svg, { type: "image/svg+xml", body: iconSvg(favicon, "auto") }],
        [
          ICON_PATHS.ico,
          { type: "image/x-icon", body: ico(png(iconSvg(favicon, "light"), 32), 32) },
        ],
        [ICON_PATHS.touch, { type: "image/png", body: png(iconSvg(touch, "light"), 180) }],
      ]);
    })();
    return built;
  }

  return {
    name: "site-icons",
    configResolved(config) {
      root = config.root;
    },
    // `vite dev` has no built assets: answer from memory.
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = (request.url ?? "").split("?")[0];
        if (!Object.values<string>(ICON_PATHS).includes(path)) return next();
        const file = (await build()).get(path);
        if (!file) return next();
        response.setHeader("Content-Type", file.type);
        response.end(file.body);
      });
    },
    async generateBundle() {
      if (this.environment.name !== "client") return;
      for (const [path, { body }] of await build()) {
        this.emitFile({ type: "asset", fileName: path.slice(1), source: body });
      }
    },
  };
}
