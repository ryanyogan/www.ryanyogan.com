/** A small YAML-frontmatter reader: scalars, booleans and string lists. */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw.trim() };

  const yaml = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  let currentKey = "";
  let collectingArray = false;
  const arrayValues: string[] = [];

  for (const line of yaml.split("\n")) {
    if (collectingArray) {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        arrayValues.push(stripQuotes(itemMatch[1].trim()));
        continue;
      }
      data[currentKey] = [...arrayValues];
      arrayValues.length = 0;
      collectingArray = false;
    }

    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    const value = kvMatch[2].trim();

    if (value === "") {
      currentKey = key;
      collectingArray = true;
      continue;
    }

    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = stripQuotes(value);
  }

  if (collectingArray) {
    data[currentKey] = [...arrayValues];
  }

  return { data, content: content.trim() };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
