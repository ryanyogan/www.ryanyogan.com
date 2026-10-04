import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import type { Plugin } from "vite";
import type { ProseImages } from "./src/lib/markdown";

/**
 * The pictures in public/images, for prose. Each PNG or JPEG there is measured and encoded
 * once per build as AVIF and WebP, at 720 and 1440 px (the reading column at 1x and 2x), never wider than
 * the file itself. The copies are static assets whose names carry a hash of their bytes
 * (cached for good, public/_headers); the original stays where it is as the fallback `src`.
 * The markdown renderer takes the result and writes `<picture>` with `width` and `height`.
 *
 *   import images from "virtual:prose-images"   // { "/images/brain.png": { width, ... } }
 */

const VIRTUAL = "virtual:prose-images";
const RESOLVED = `\0${VIRTUAL}`;

const DIR = "images";
const OUT = "images/opt";
/** The reading column is about 608 CSS px wide: one width for 1x screens, one for 2x. */
const WIDTHS = [720, 1440];

const FORMATS = {
  avif: (image: sharp.Sharp) => image.avif({ quality: 55 }),
  webp: (image: sharp.Sharp) => image.webp({ quality: 80 }),
} as const;

/** The widths to encode for a file this wide: no copy is larger than its source. */
function widthsFor(width: number): number[] {
  return [...new Set(WIDTHS.map((w) => Math.min(w, width)))];
}

interface Built {
  manifest: ProseImages;
  files: Map<string, Buffer>;
}

async function encodeImages(dir: string): Promise<Built> {
  const manifest: ProseImages = {};
  const files: Built["files"] = new Map();
  const names = readdirSync(dir)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .sort();
  for (const name of names) {
    const source = readFileSync(join(dir, name));
    const { width, height } = await sharp(source).metadata();
    if (!width || !height) continue;
    const srcset = { avif: [] as string[], webp: [] as string[] };
    for (const format of Object.keys(FORMATS) as (keyof typeof FORMATS)[]) {
      for (const w of widthsFor(width)) {
        const bytes = await FORMATS[format](sharp(source).resize({ width: w })).toBuffer();
        const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
        const path = `${OUT}/${basename(name, extname(name))}.${w}.${hash}.${format}`;
        files.set(path, bytes);
        srcset[format].push(`/${path} ${w}w`);
      }
    }
    manifest[`/${DIR}/${name}`] = {
      width,
      height,
      avif: srcset.avif.join(", "),
      webp: srcset.webp.join(", "),
    };
  }
  return { manifest, files };
}

export function proseImages(): Plugin & { manifest(): Promise<ProseImages> } {
  let root = process.cwd();
  let built: Promise<Built> | undefined;

  // Once per process: the client and server builds share the result.
  function build(): Promise<Built> {
    built ??= encodeImages(join(root, "public", DIR));
    return built;
  }

  return {
    name: "prose-images",
    /** For the posts plugin, which renders markdown outside the module graph. */
    manifest: async () => (await build()).manifest,
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
        if (!path.startsWith(`${OUT}/`)) return next();
        const bytes = (await build()).files.get(path);
        if (!bytes) return next();
        response.setHeader("Content-Type", `image/${extname(path).slice(1)}`);
        response.end(bytes);
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
