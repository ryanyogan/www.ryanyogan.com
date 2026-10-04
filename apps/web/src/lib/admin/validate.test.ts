import { describe, expect, it } from "vitest";
import { validateProjectInput } from "./validate";

const good = {
  slug: "my-project",
  title: "My project",
  tagline: "A tagline",
  summary: "A summary",
  body: "# Hello",
  tech: ["Elixir", " OTP ", ""],
  group: "shipped",
  status: "prototype",
  statusLabel: "",
  github: "https://github.com/ryanyogan/x",
  live: "",
  published: true,
};

function errorsOf(over: Record<string, unknown>) {
  const result = validateProjectInput({ ...good, ...over });
  return result.ok ? {} : result.errors;
}

describe("validateProjectInput", () => {
  it("accepts and normalises a good payload", () => {
    const result = validateProjectInput(good);
    expect(result).toEqual({
      ok: true,
      value: { ...good, tech: ["Elixir", "OTP"], statusLabel: null, live: null },
    });
  });

  it("requires title and slug, and reports each field", () => {
    expect(errorsOf({ title: " ", slug: "" })).toMatchObject({
      title: expect.any(String),
      slug: expect.any(String),
    });
    expect(validateProjectInput(null).ok).toBe(false);
    expect(validateProjectInput("x").ok).toBe(false);
  });

  it("checks the slug format", () => {
    for (const slug of ["My-Project", "a b", "-a", "a--b", "a/b", "../x", "new", "a".repeat(65)]) {
      expect(errorsOf({ slug }), slug).toHaveProperty("slug");
    }
    expect(errorsOf({ slug: "a1-b2" })).toEqual({});
  });

  it("only allows the known groups and statuses", () => {
    expect(errorsOf({ group: "nope" })).toHaveProperty("group");
    expect(errorsOf({ status: "done" })).toHaveProperty("status");
    expect(errorsOf({ group: undefined, status: 3 })).toMatchObject({
      group: expect.any(String),
      status: expect.any(String),
    });
  });

  it("limits URLs to https", () => {
    for (const url of [
      "http://example.com",
      "javascript:alert(1)",
      "data:text/html,x",
      "//example.com",
      "example.com",
      "https://user:pw@example.com",
      7,
    ]) {
      expect(errorsOf({ github: url }), String(url)).toHaveProperty("github");
      expect(errorsOf({ live: url }), String(url)).toHaveProperty("live");
    }
    expect(errorsOf({ live: "https://example.com/a?b=1" })).toEqual({});
  });

  it("needs a summary and tagline only when published", () => {
    expect(errorsOf({ summary: "", tagline: "" })).toMatchObject({
      summary: expect.any(String),
      tagline: expect.any(String),
    });
    expect(errorsOf({ summary: "", tagline: "", published: false })).toEqual({});
  });

  it("rejects a non-boolean published and a non-list tech", () => {
    expect(errorsOf({ published: "yes" })).toHaveProperty("published");
    expect(errorsOf({ tech: "Elixir" })).toHaveProperty("tech");
    expect(errorsOf({ tech: [1] })).toHaveProperty("tech");
  });
});
