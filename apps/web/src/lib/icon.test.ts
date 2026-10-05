import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_BOX, ICON_LINKS, MARK, ico, iconSvg, placeMark } from "./icon";

describe("the site icon", () => {
  it("is drawn in the page's own paper and ink, light and dark", () => {
    const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
    const token = (block: string, name: string) =>
      block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`))?.[1];
    const light = css.slice(css.indexOf(":root"), css.indexOf(".dark {"));
    const dark = css.slice(css.indexOf(".dark {"));
    expect(MARK.light).toEqual({ paper: token(light, "paper"), ink: token(light, "ink") });
    expect(MARK.dark).toEqual({ paper: token(dark, "paper"), ink: token(dark, "ink") });
  });

  it("puts the ink in the middle of the square at the width asked for", () => {
    // A 200 by 100 box of ink somewhere on a large canvas.
    const d = "M300 400L500 400L500 500L300 500Z";
    const ink = { x: 300, y: 400, width: 200, height: 100 };
    expect(placeMark(d, ink, 0.5, [0, 0])).toBe("M250 375L750 375L750 625L250 625Z");
    expect(placeMark(d, ink, 0.5, [0.01, -0.02])).toBe("M260 355L760 355L760 605L260 605Z");
    // Curves too: every number is an x or a y in turn, and a new command starts at x.
    expect(placeMark("M300 400Q400 300 500 400C500 450 400 500 300 500Z", ink, 1, [0, 0])).toBe(
      "M0 250Q500 -250 1000 250C1000 500 500 750 0 750Z",
    );
    expect(() => placeMark("M0 0h10", ink, 1)).toThrow(/"h"/);
  });

  it("is outlines on a square, with the dark pair only in the file a browser tab reads", () => {
    const auto = iconSvg("M0 0L1 1Z", "auto");
    const light = iconSvg("M0 0L1 1Z", "light");
    for (const svg of [auto, light]) {
      expect(svg).toContain(`viewBox="0 0 ${ICON_BOX} ${ICON_BOX}"`);
      expect(svg).toContain(`fill="${MARK.light.paper}"`);
      expect(svg).toContain(`<path fill="${MARK.light.ink}" d="M0 0L1 1Z"/>`);
      expect(svg).not.toMatch(/<text|font-family|<image|url\(/);
    }
    expect(auto).toContain(
      `@media (prefers-color-scheme:dark){rect{fill:${MARK.dark.paper}}path{fill:${MARK.dark.ink}}}`,
    );
    expect(light).not.toContain("<style");
  });

  it("wraps a PNG as a one-image .ico", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const file = ico(png, 32);
    expect([...file.slice(0, 22)]).toEqual([
      0, 0, 1, 0, 1, 0, 32, 32, 0, 0, 1, 0, 32, 0, 7, 0, 0, 0, 22, 0, 0, 0,
    ]);
    expect([...file.slice(22)]).toEqual([...png]);
  });

  it("links the .ico with a size, the SVG with its type, and the home screen icon", () => {
    expect(ICON_LINKS.map((link) => `${link.rel} ${link.href}`)).toEqual([
      "icon /favicon.ico",
      "icon /favicon.svg",
      "apple-touch-icon /apple-touch-icon.png",
    ]);
  });
});
