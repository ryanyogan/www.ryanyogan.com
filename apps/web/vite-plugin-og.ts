import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { Plugin } from "vite";
import { parseFrontmatter } from "./src/lib/frontmatter";
import {
  OG_FONT_FAMILY,
  OG_FONT_WEIGHT,
  OG_HEIGHT,
  OG_WIDTH,
  type OgCard,
  ogAlt,
  ogCard,
  postKicker,
} from "./src/lib/og/template";

/**
 * Social preview images for the pages whose text is known when the site is built: Home,
 * /work, /now, /projects, /writing and every post. Each is drawn once per build (satori lays the
 * card out as SVG, resvg rasterises it) and emitted as a static asset whose name carries a
 * hash of its bytes, so it is cached for good (public/_headers) and a changed title is a
 * new URL. Project pages are drawn by the Worker instead (src/lib/og/render-project.ts).
 *
 *   import images from "virtual:og-images"   // { "/work": { path, alt }, ... }
 */

const VIRTUAL = "virtual:og-images";
const RESOLVED = `\0${VIRTUAL}`;

// The page's own headline (its <h1>), and the section it is.
const PAGES: (OgCard & { route: string; file: string })[] = [
  {
    route: "/",
    file: "home",
    title: "I lead engineering teams and build agent systems myself.",
  },
  { route: "/work", file: "work", title: "How to work with me.", kicker: "Work" },
  { route: "/now", file: "now", title: "What I am doing now.", kicker: "Now" },
  {
    route: "/projects",
    file: "projects",
    title: "Everything I’ve built, with its real status.",
    kicker: "Projects",
  },
  {
    route: "/writing",
    file: "writing",
    title: "Build logs, one retraction, and what I learned running teams.",
    kicker: "Writing",
  },
];

function isoDay(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
}

function cards(root: string): (OgCard & { route: string; file: string })[] {
  const dir = join(root, "content/writing");
  const posts = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const slug = basename(name, ".md");
      const { data } = parseFrontmatter(readFileSync(join(dir, name), "utf8"));
      return {
        route: `/writing/${slug}`,
        file: `writing/${slug}`,
        title: String(data.title),
        kicker: postKicker(isoDay(String(data.date))),
      };
    });
  return [...PAGES, ...posts];
}

export async function renderCard(card: OgCard, font: Buffer): Promise<Buffer> {
  const svg = await satori(ogCard(card) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [{ name: OG_FONT_FAMILY, data: font, weight: OG_FONT_WEIGHT, style: "normal" }],
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();
}

interface Built {
  manifest: Record<string, { path: string; alt: string }>;
  files: Map<string, Buffer>;
}

export function ogImages(): Plugin {
  let root = process.cwd();
  let built: Promise<Built> | undefined;

  // Once per process: the client and server builds share the result.
  function build(): Promise<Built> {
    built ??= (async () => {
      const font = readFileSync(join(root, "src/lib/og/hanken-grotesk-latin-500.woff.bin"));
      const manifest: Built["manifest"] = {};
      const files: Built["files"] = new Map();
      for (const { route, file, ...card } of cards(root)) {
        const png = await renderCard(card, font);
        const hash = createHash("sha256").update(png).digest("hex").slice(0, 10);
        const path = `og/${file}.${hash}.png`;
        files.set(path, png);
        manifest[route] = { path: `/${path}`, alt: ogAlt(card) };
      }
      return { manifest, files };
    })();
    return built;
  }

  return {
    name: "og-images",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },
    async load(id) {
      if (id !== RESOLVED) return null;
      const { manifest } = await build();
      return `export default ${JSON.stringify(manifest)};`;
    },
    // `vite dev` has no built assets: answer from memory.
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = (request.url ?? "").split("?")[0].slice(1);
        if (!path.startsWith("og/") || path.startsWith("og/projects/")) return next();
        const png = (await build()).files.get(path);
        if (!png) return next();
        response.setHeader("Content-Type", "image/png");
        response.end(png);
      });
    },
    async generateBundle() {
      if (this.environment.name !== "client") return;
      for (const [fileName, source] of (await build()).files) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}
