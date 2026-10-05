import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Ticket A1: four drawings have one slow accent each, by CSS alone (styles/app.css, at the
// end). A still cannot show motion, so this does: each piece has one endless CSS animation of
// at least the stated length, its value changes a little between looks and stays in its range,
// and under reduced motion, or where the drawing is hidden, nothing runs. Chromium only (the
// other projects pick specs by name).
const moving = [
  // [what, page, piece, keyframes, shortest ms, property, lowest, highest]
  ["the point on the lakefront", "/", ".lake circle", "art-pulse", 3000, "opacity", 0.3, 1],
  ["the pass on the rink", "/", ".rink .pass", "art-drift", 6000, "strokeDashoffset", -10, 0],
  ["the top of the org chart", "/work", ".org .me", "art-pulse", 3000, "opacity", 0.3, 1],
  ["the cursor on the sheet", "/writing", ".sheet .cur", "art-pulse", 3000, "opacity", 0.3, 1],
] as const;

const drawn = ["/", "/work", "/writing", "/now"];

/** Every CSS animation on a drawing or a piece of one, as "<class> <keyframes>". */
const running = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".art, .art *")].flatMap((piece) =>
      piece.getAnimations().map((animation) => {
        const name = animation instanceof CSSAnimation ? animation.animationName : "other";
        return `${piece.getAttribute("class") ?? piece.tagName} ${name}`;
      }),
    ),
  );

for (const [what, path, piece, keyframes, shortest, property, lowest, highest] of moving) {
  test(`${what} moves slowly, a little, and for good`, async ({ page }) => {
    await page.goto(path);
    const target = page.locator(piece);
    await expect(target).toHaveCount(1);
    await target.scrollIntoViewIfNeeded();

    const look = () =>
      target.evaluate(async (node, name) => {
        // A frame first, so the page's clock is this moment's.
        await new Promise((done) => requestAnimationFrame(done));
        const animations = node.getAnimations();
        const timing = animations[0]?.effect?.getComputedTiming();
        return {
          names: animations.map((animation) =>
            animation instanceof CSSAnimation ? animation.animationName : "other",
          ),
          state: animations[0]?.playState,
          duration: Number(timing?.duration),
          endless: timing?.iterations === Infinity,
          value: Number.parseFloat(getComputedStyle(node)[name]),
          transform: getComputedStyle(node).transform,
        };
      }, property);

    const looks = [await look()];
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(700);
      looks.push(await look());
    }
    const values = looks.map((seen) => seen.value);
    test.info().annotations.push({ type: "motion", description: `${piece} ${values.join(" ")}` });

    for (const seen of looks) {
      expect(seen.names).toEqual([keyframes]);
      expect(seen.state).toBe("running");
      expect(seen.duration).toBeGreaterThanOrEqual(shortest);
      expect(seen.endless).toBe(true);
      expect(seen.transform).toBe("none");
      expect(seen.value).toBeGreaterThanOrEqual(lowest);
      expect(seen.value).toBeLessThanOrEqual(highest);
    }
    // It changes: three looks 0.7 s apart cannot all fall on the same value of a slow wave.
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.01);
    // And only a little: far less than the whole range in 1.4 s.
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan((highest - lowest) * 0.9);
  });
}

test("nothing else on a drawing moves", async ({ page }) => {
  const seen: string[] = [];
  for (const path of drawn) {
    await page.goto(path);
    await expect(page.locator(".art").first()).toBeVisible();
    seen.push(...(await running(page)).map((entry) => `${path} ${entry}`));
  }
  expect(seen.sort()).toEqual(
    [
      "/ pass art-drift",
      "/ circle art-pulse",
      "/work me art-pulse",
      "/writing cur art-pulse",
    ].sort(),
  );
});

test("reduced motion: no drawing moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of drawn) {
    await page.goto(path);
    await expect(page.locator(".art").first()).toBeVisible();
    expect(await running(page), path).toEqual([]);
    for (const [, where, piece, , , property] of moving) {
      if (where !== path) continue;
      const value = await page
        .locator(piece)
        .evaluate((node, name) => getComputedStyle(node)[name], property);
      expect(Number.parseFloat(value), piece).toBe(property === "opacity" ? 1 : 0);
    }
  }
});

test("a drawing that is hidden at a phone's width does not run", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/work", "/writing"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    for (const art of await page.locator(".lake, .rink, .org, .sheet").all()) {
      await expect(art).toBeHidden();
    }
    expect(await running(page), path).toEqual([]);
  }
});

test("the header drawings on Work and Writing show from 1280 and not below", async ({ page }) => {
  for (const [path, art] of [
    ["/work", ".org"],
    ["/writing", ".sheet"],
  ] as const) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    const lede = page.locator("main .lede").first();
    await expect(page.locator(art)).toBeVisible();
    const beside = await lede.boundingBox();
    await page.setViewportSize({ width: 1279, height: 800 });
    await expect(page.locator(art)).toBeHidden();
    const alone = await lede.boundingBox();
    // The drawing takes no line from the lede: same height with and without it.
    expect(beside?.height).toBe(alone?.height);
  }
});
