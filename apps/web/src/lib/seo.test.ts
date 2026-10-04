import { describe, expect, it } from "vitest";
import { absoluteUrl, jsonLd, personNode, projectNode, safeJson, seo } from "./seo";

describe("absoluteUrl", () => {
  it("has one form: no trailing slash except the root", () => {
    expect(absoluteUrl("/")).toBe("https://ryanyogan.com/");
    expect(absoluteUrl("")).toBe("https://ryanyogan.com/");
    expect(absoluteUrl("/work")).toBe("https://ryanyogan.com/work");
    expect(absoluteUrl("/work/")).toBe("https://ryanyogan.com/work");
  });
});

describe("safeJson", () => {
  it("cannot close a script element and still parses to the same value", () => {
    const value = { name: `</script><script>alert(1)</script><!-- & \u2028 "q"` };
    const out = safeJson(value);
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(value);
  });
});

describe("structured data", () => {
  it("describes the person without an employer or a gmail address", () => {
    const person = personNode();
    expect(person.name).toBe("Ryan Yogan");
    expect(person.sameAs).toEqual([
      "https://github.com/ryanyogan",
      "https://linkedin.com/in/ryanyogan",
    ]);
    expect(person).not.toHaveProperty("worksFor");
    expect(person).not.toHaveProperty("email");
    expect(JSON.stringify(person)).not.toMatch(/gmail|procore|sonian/i);
  });

  it("is source code only for a project with a public repository", () => {
    const base = {
      slug: "x",
      title: "X",
      tagline: "An x.",
      tech: ["TypeScript", "Cloudflare Workers"],
    };
    const code = projectNode({ ...base, github: "https://github.com/ryanyogan/x" });
    expect(code["@type"]).toBe("SoftwareSourceCode");
    expect(code.codeRepository).toBe("https://github.com/ryanyogan/x");
    expect(code.programmingLanguage).toEqual(["TypeScript"]);
    expect(code.keywords).toBe("Cloudflare Workers");
    const work = projectNode(base);
    expect(work["@type"]).toBe("CreativeWork");
    expect(work).not.toHaveProperty("codeRepository");
    expect(work).not.toHaveProperty("programmingLanguage");
  });

  it("is one @graph per page", () => {
    const block = jsonLd(personNode());
    expect(block.type).toBe("application/ld+json");
    expect(JSON.parse(block.children)["@graph"]).toHaveLength(1);
  });
});

describe("seo", () => {
  it("uses the same URL for canonical and og:url", () => {
    const head = seo({
      title: "T",
      description: "D",
      path: "/projects/",
      image: { path: "/og/projects/x.png?v=1", alt: "A card" },
    });
    expect(head.links).toEqual([{ rel: "canonical", href: "https://ryanyogan.com/projects" }]);
    expect(head.meta).toContainEqual({
      property: "og:url",
      content: "https://ryanyogan.com/projects",
    });
    expect(head.meta).toContainEqual({ property: "og:type", content: "website" });
    expect(head.scripts).toEqual([]);
  });

  it("names the preview image with an absolute URL, its size, type and alt text", () => {
    const head = seo({
      title: "T",
      description: "D",
      path: "/work",
      image: { path: "/og/projects/x.png?v=1", alt: "A card" },
    });
    const url = "https://ryanyogan.com/og/projects/x.png?v=1";
    for (const tag of [
      { property: "og:image", content: url },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "A card" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: url },
    ]) {
      expect(head.meta).toContainEqual(tag);
    }
  });
});
