import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The "generated look" tells from the redesign brief, as greps over the public source. A tell
// that is on the site on purpose goes in ALLOWED with its exact count and a reason; anything
// else fails with the file, line and rule. Admin pages are not public and are skipped.

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const DIRS = ["apps/web/src", "packages/shared/src"];
const SKIP = /\.test\.ts$|routeTree\.gen\.ts$|(^|\/)admin[./]/;

type Source = { path: string; css: boolean; code: string; classes: [number, number][] };
type Rule = { id: string; fix: string; find: (file: Source) => number[] };

const blank = (match: string) => match.replace(/[^\n]/g, " ");

/** The source with comments blanked out, so offsets and line numbers still match the file. */
function stripComments(text: string, css: boolean): string {
  // A "/*" straight after a path character is a glob in a string ("writing/*.md"), not a comment.
  const code = text.replace(/(?<![\w.*"'/])\/\*[\s\S]*?\*\//g, blank);
  return css ? code : code.replace(/(?<=^|\s)\/\/.*$/gm, blank);
}

/** The [start, end) of every className value: a quoted string or a braced expression. */
function classRanges(code: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const match of code.matchAll(/className=/g)) {
    const start = match.index + match[0].length;
    let end = start + 1;
    if (code[start] === '"') {
      end = code.indexOf('"', end);
    } else if (code[start] === "{") {
      for (let depth = 1; depth > 0 && end < code.length; end++) {
        if (code[end] === "{") depth++;
        if (code[end] === "}") depth--;
      }
    }
    if (end > start) ranges.push([start, end]);
  }
  return ranges;
}

const sources: Source[] = DIRS.flatMap((dir) =>
  (readdirSync(ROOT + dir, { recursive: true }) as string[])
    .map((name) => `${dir}/${name.replaceAll("\\", "/")}`)
    .filter((path) => /\.(ts|tsx|css)$/.test(path) && !SKIP.test(path))
    .map((path) => {
      const css = path.endsWith(".css");
      const code = stripComments(readFileSync(ROOT + path, "utf8"), css);
      return { path, css, code, classes: css ? [] : classRanges(code) };
    }),
);

const offsets = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map((match) => match.index);

/** Anywhere outside a comment: markup, strings and stylesheets. */
const anywhere = (pattern: RegExp) => (file: Source) => offsets(file.code, pattern);
/** In a stylesheet. */
const inCss = (pattern: RegExp) => (file: Source) => (file.css ? offsets(file.code, pattern) : []);
/** As a class name inside a className value, with or without a variant prefix. */
const asClass = (name: string) => (file: Source) =>
  offsets(file.code, new RegExp(`(?<![\\w-])(?:${name})(?![\\w-])`, "g")).filter((at) =>
    file.classes.some(([start, end]) => at >= start && at < end),
  );
const either =
  (...finders: ((file: Source) => number[])[]) =>
  (file: Source) =>
    finders.flatMap((find) => find(file));

const VALUE = String.raw`[\w.\[\]/%()-]+`;

const rules: Rule[] = [
  {
    id: "arrow",
    fix: "link text alone, underlined; a figure as a sentence",
    find: anywhere(/[→←↗↘]|&[lr]arr;|&#(?:8592|8594|x219[02]);|\\u219[02]|\\219[02]/gi),
  },
  {
    id: "middle-dot",
    fix: "commas, or separate elements with spacing",
    find: anywhere(/[·•]|&(?:middot|bull);|&#(?:183|xb7);|\\u00b7/gi),
  },
  {
    id: "eyebrow",
    fix: "no uppercase or tracked-out labels; sentence case in the body face",
    find: either(
      inCss(/text-transform\s*:\s*uppercase|letter-spacing\s*:\s*\+?(?:[1-9]|0*\.0*[1-9])/g),
      asClass(String.raw`uppercase|tracking-wide(?:r|st)?|tracking-\[(?!-|0\])[^\]]*\]`),
    ),
  },
  {
    id: "radius",
    fix: "no pills or rounded corners; square boxes and hairline rules",
    find: either(
      inCss(/border(?:-[a-z-]+)?-radius\s*:(?!\s*0\s*(?:[;!]|$))/gm),
      asClass(String.raw`rounded(?:-(?!none)${VALUE})?`),
    ),
  },
  {
    id: "blur",
    fix: "an opaque header that scrolls away",
    find: either(inCss(/backdrop-filter\s*:/g), asClass(`backdrop-${VALUE}`)),
  },
  {
    id: "shadow",
    fix: "no shadows; 1px rules",
    find: either(
      inCss(/(?:box|text)-shadow\s*:(?!\s*none)|drop-shadow\(/g),
      asClass(String.raw`(?:drop-|text-)?shadow(?:-(?!none)${VALUE})?`),
    ),
  },
  {
    id: "gradient",
    fix: "flat colour",
    find: either(inCss(/-gradient\(/g), asClass(`bg-(?:gradient|linear|radial|conic)-${VALUE}`)),
  },
  {
    id: "motion",
    fix: "no entrance animations or hover transitions; underline change on links only",
    find: either(
      inCss(/(?<![\w-])(?:transition|animation)\s*:(?!\s*none)|@keyframes/g),
      asClass(String.raw`transition(?:-(?!none)${VALUE})?|animate-(?!none)${VALUE}`),
    ),
  },
  {
    id: "mono",
    fix: "the monospace face is for code only",
    find: either(
      inCss(/var\(--font-mono\)|font(?:-family)?\s*:[^;{}]*monospace/g),
      asClass("font-mono"),
    ),
  },
  {
    id: "headline-italic",
    fix: "a headline in one style",
    find: (file) =>
      [...file.code.matchAll(/<h([12])\b[\s\S]*?<\/h\1>/g)].flatMap((heading) =>
        offsets(heading[0], /<(?:em|i)[\s>]|className="[^"]*(?<![\w-])italic(?![\w-])/g).map(
          (at) => heading.index + at,
        ),
      ),
  },
  {
    id: "web-font",
    fix: "self-hosted fonts; not Fraunces or Instrument Serif",
    find: anywhere(/fonts\.(?:googleapis|gstatic)\.com|Fraunces|Instrument[ _+]Serif/g),
  },
  {
    id: "emoji",
    fix: "no emoji as icons",
    find: anywhere(/(?![©®™])\p{Extended_Pictographic}/gu),
  },
];

type Allowed = { rule: string; file: string; count: number; reason: string };

const allow = (rule: string, entries: [file: string, count: number, reason: string][]): Allowed[] =>
  entries.map(([file, count, reason]) => ({ rule, file: `apps/web/src/${file}`, count, reason }));

/** Tells that are on the site on purpose. `count` is exact, so an entry cannot outlive its tell. */
const ALLOWED = [
  ...allow("arrow", [
    ["components/home/Hero.tsx", 1, "the figures (150 → 2,300); the owner has seen and kept it"],
    ["routes/work.tsx", 2, "the same figures, and the link to Projects"],
    ["components/home/LeadAndBuild.tsx", 1, "the link to Work"],
    ["routes/projects.index.tsx", 1, "the link to what I am open to"],
    ["routes/projects.$slug.tsx", 4, "previous and next project, which point a direction"],
    ["routes/__root.tsx", 1, "the 404 page's link home"],
  ]),
  ...allow("middle-dot", [
    ["components/Footer.tsx", 1, "name and city in the footer"],
    ["routes/now.tsx", 1, "the updated line"],
    ["routes/writing.index.tsx", 1, "post count and RSS"],
    ["routes/writing.$slug.tsx", 2, "date, reading time and author under a post title"],
    ["routes/projects.$slug.tsx", 1, "a project's tech list"],
    ["lib/seo.ts", 1, "the document title, page then site name"],
    ["lib/og/template.ts", 2, "the kicker on a share image"],
  ]),
  ...allow("motion", [
    [
      "styles/app.css",
      4,
      "the search dialog's 140ms entrance (2); a view count's 180ms fade in, opacity only, asked for by the owner (2)",
    ],
  ]),
  ...allow("mono", [["styles/app.css", 3, "inline code, code blocks, the admin code field"]]),
];

/** Arbitrary Tailwind values ("text-[0.97rem]") on public pages. This only goes down. */
const ARBITRARY_VALUES = 23;

const lineOf = (file: Source, at: number) => file.code.slice(0, at).split("\n").length;

describe("generated-look lint", () => {
  it("reads the source tree", () => {
    expect(sources.length).toBeGreaterThan(40);
    expect(sources.some((file) => file.css)).toBe(true);
    expect(sources.some((file) => file.classes.length > 0)).toBe(true);
  });

  it.each(rules)("$id", (rule) => {
    const allowed = ALLOWED.filter((entry) => entry.rule === rule.id);
    const problems: string[] = [];
    for (const file of sources) {
      const lines = rule.find(file).map((at) => lineOf(file, at));
      const count = allowed.find((entry) => entry.file === file.path)?.count ?? 0;
      if (lines.length > count) {
        const note = count ? `, ${lines.length} found and ${count} allowed` : "";
        problems.push(
          ...lines.map((line) => `${file.path}:${line} ${rule.id}: ${rule.fix}${note}`),
        );
      } else if (lines.length < count) {
        problems.push(
          `${file.path} ${rule.id}: ALLOWED says ${count}, found ${lines.length}; lower or remove the entry`,
        );
      }
    }
    for (const entry of allowed) {
      if (!sources.some((file) => file.path === entry.file)) {
        problems.push(`${entry.file} ${rule.id}: ALLOWED names a file that is not scanned`);
      }
    }
    expect(problems.join("\n")).toBe("");
  });

  it("allows only rules that exist, once per file", () => {
    const keys = ALLOWED.map((entry) => `${entry.file} ${entry.rule}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of ALLOWED) {
      expect(rules.map((rule) => rule.id)).toContain(entry.rule);
      expect(entry.count, entry.file).toBeGreaterThan(0);
      expect(entry.reason, entry.file).not.toBe("");
    }
  });

  it("has no more arbitrary Tailwind values than before", () => {
    const found = sources.flatMap((file) =>
      asClass(String.raw`[\w:.-]*\[[^\]\s]+\][\w:/.-]*`)(file).map(
        (at) => `${file.path}:${lineOf(file, at)}`,
      ),
    );
    // Fewer than the ceiling fails too, so that the ceiling is lowered in the same change.
    expect(found.length, found.join("\n")).toBe(ARBITRARY_VALUES);
  });
});
