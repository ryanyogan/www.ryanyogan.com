import { describe, expect, it } from "vitest";
import { type OgNode, ogAlt, ogCard, postKicker, projectKicker, titleSize } from "./template";

function texts(node: OgNode | string): string[] {
  if (typeof node === "string") return [node];
  const children = node.props.children;
  if (children === undefined) return [];
  return (Array.isArray(children) ? children : [children]).flatMap(texts);
}

describe("the preview card", () => {
  it("says the name, the title, the kind and the address, and nothing else", () => {
    const card = ogCard({ title: "  A title  ", kicker: "Project · Live" });
    expect(texts(card)).toEqual(["Ryan Yogan", "A title", "Project · Live", "ryanyogan.com"]);
    expect(card.props.style).toMatchObject({ width: 1200, height: 630 });
  });

  it("steps the title down as it gets longer, never under 54px", () => {
    const sizes = [10, 24, 25, 48, 49, 72, 73, 300].map((length) => titleSize("x".repeat(length)));
    expect(sizes).toEqual([84, 84, 72, 72, 62, 62, 54, 54]);
  });

  it("clamps the title to three lines", () => {
    const [, , block] = ogCard({ title: "T" }).props.children as OgNode[];
    const [title] = block.props.children as OgNode[];
    expect(title.props.style).toMatchObject({ lineClamp: 3 });
  });

  it("writes the secondary line and the alt text", () => {
    expect(postKicker("2026-09-22")).toBe("Writing · Sep 2026");
    expect(postKicker("")).toBe("Writing");
    expect(projectKicker("Live")).toBe("Project · Live");
    expect(projectKicker(" ")).toBe("Project");
    expect(ogAlt({ title: "Lincoln", kicker: "Project · Live" })).toBe(
      "Ryan Yogan. Lincoln (Project · Live)",
    );
    expect(ogAlt({ title: "Work" })).toBe("Ryan Yogan. Work");
  });
});
