import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { CLIENT_DIR, expect, publicRoutes, test } from "./fixtures";

// Images: every <img> reserves its box (width and height), the files in public/images are
// served as AVIF or WebP copies made by the build (vite-plugin-images.ts), and no PNG in
// the build is heavy.

const POST = "/writing/building-agent-memory-from-research-to-reality";
const PNG_MAX_BYTES = 200 * 1024;
const IMMUTABLE = "public, max-age=31536000, immutable";

function files(dir: string, extension: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return files(path, extension);
    return entry.name.endsWith(extension) ? [path] : [];
  });
}

const tags = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? [];
const attribute = (tag: string, name: string) => tag.match(new RegExp(` ${name}="([^"]*)"`))?.[1];

function expectSized(html: string, where: string): number {
  const images = tags(html.replace(/<script[\s\S]*?<\/script>/g, ""), "img");
  for (const tag of images) {
    expect(attribute(tag, "width"), `${where}: ${tag}`).toMatch(/^[1-9]\d*$/);
    expect(attribute(tag, "height"), `${where}: ${tag}`).toMatch(/^[1-9]\d*$/);
    expect(attribute(tag, "decoding"), `${where}: ${tag}`).toBe("async");
    // An image is lazy unless it is marked as the page's largest paint.
    if (attribute(tag, "fetchpriority") === "high") expect(tag, where).not.toContain("loading=");
    else expect(attribute(tag, "loading"), `${where}: ${tag}`).toBe("lazy");
  }
  return images.length;
}

test("every img in the built HTML has a width and a height", () => {
  const pages = files(CLIENT_DIR, ".html");
  expect(pages.length).toBeGreaterThan(2);
  let count = 0;
  for (const page of pages) count += expectSized(readFileSync(page, "utf8"), page);
  // The check is not empty: one post has a picture.
  expect(count).toBeGreaterThan(0);
});

test("every img on every public route has a width and a height", async ({ request }) => {
  for (const route of publicRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expectSized(await response.text(), route);
  }
});

test("no PNG in the build is over 200 KB", () => {
  const pngs = files(CLIENT_DIR, ".png");
  expect(pngs.length).toBeGreaterThan(0);
  for (const png of pngs) expect(statSync(png).size, png).toBeLessThanOrEqual(PNG_MAX_BYTES);
});

test("a post image is a picture of AVIF and WebP copies that exist and are cached for good", async ({
  request,
}) => {
  const html = await (await request.get(POST)).text();
  const picture = html.match(/<figure><picture>([\s\S]*?)<\/picture>/)?.[1] ?? "";
  const sources = tags(picture, "source");
  expect(sources.map((tag) => attribute(tag, "type"))).toEqual(["image/avif", "image/webp"]);

  const img = tags(picture, "img")[0] ?? "";
  expect(attribute(img, "src")).toBe("/images/brain.png");
  const width = Number(attribute(img, "width"));

  for (const source of sources) {
    const type = attribute(source, "type") ?? "";
    expect(attribute(source, "sizes"), type).toBeTruthy();
    const candidates = (attribute(source, "srcset") ?? "").split(", ").map((c) => c.split(" "));
    // The column's width and its double, capped at the file's own width.
    expect(candidates.map(([, w]) => w)).toEqual(["720w", `${Math.min(1440, width)}w`]);
    for (const [path] of candidates) {
      expect(path).toMatch(
        new RegExp(`^/images/opt/brain\\.\\d+\\.[0-9a-f]{10}\\.${type.slice(6)}$`),
      );
      expect(existsSync(`${CLIENT_DIR}${path}`), path).toBe(true);
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toBe(type);
      expect(response.headers()["cache-control"], path).toBe(IMMUTABLE);
      // Smaller than the PNG it stands in for.
      expect((await response.body()).length, path).toBeLessThan(
        statSync(`${CLIENT_DIR}/images/brain.png`).size,
      );
    }
  }
});

test("the post image holds its box before it loads and shows a modern format", async ({ page }) => {
  await page.goto(POST);
  const img = page.locator(".prose figure img");
  await expect(img).toHaveCount(1);
  const declared = await img.evaluate((element: HTMLImageElement) => ({
    width: element.width,
    height: element.height,
    ratio: Number(element.getAttribute("width")) / Number(element.getAttribute("height")),
  }));
  // Laid out from the attributes alone: the image is below the fold and lazy.
  expect(declared.height).toBeGreaterThan(0);
  expect(Math.abs(declared.width / declared.height - declared.ratio)).toBeLessThan(0.02);

  await img.scrollIntoViewIfNeeded();
  await expect
    .poll(() => img.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
  const shown = await img.evaluate((element: HTMLImageElement) => ({
    src: new URL(element.currentSrc).pathname,
    width: element.width,
    height: element.height,
  }));
  expect(shown.src).toMatch(/^\/images\/opt\/brain\.\d+\.[0-9a-f]{10}\.(avif|webp)$/);
  // Loading it moved nothing.
  expect({ width: shown.width, height: shown.height }).toEqual({
    width: declared.width,
    height: declared.height,
  });
});
