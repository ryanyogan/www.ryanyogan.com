// Straight quotes to typographic ones, for prose a person reads: the posts and /now are typed
// with ' and " (content/), and the pages set them in a serif face. Pure text in, text out, and
// one character for one, so a caller can run it over the joined text of several nodes and cut
// the result back at the same offsets (src/lib/markdown.ts). Nothing here knows about HTML.

const OPEN_DOUBLE = "\u201c";
const CLOSE_DOUBLE = "\u201d";
const OPEN_SINGLE = "\u2018";
const CLOSE_SINGLE = "\u2019";

/**
 * Stands for something that is not prose inside a run of text (inline code, say). It reads as
 * a letter, so `"` after it closes and `'s` after it is a possessive, and it is never changed.
 */
export const OPAQUE = "\ufffc";

/**
 * Between two blocks of text: a quote opened in one paragraph is not waiting in the next. Not
 * a line feed, which a paragraph typed over several lines has inside it.
 */
export const BREAK = "\u2029";

/**
 * Words written with a leading apostrophe. Only ones that do not also start a quoted phrase
 * often: "'round" and "'cause" are left to the general rule.
 */
const ELISION = /^(?:em|tis|twas|twere|til|n|bout|nuff)(?![\p{L}\p{N}])/iu;
/** A decade or a year: '90s, '08. */
const DECADE = /^\d{2}(?:s|(?![\p{L}\p{N}]))/u;

const isWord = (ch: string) => ch === OPAQUE || /[\p{L}\p{N}]/u.test(ch);
const isDigit = (ch: string) => /\p{N}/u.test(ch);
/** What a quote opens after: nothing, a space, an opening bracket, a dash, an opening quote. */
const opensAfter = (ch: string) =>
  ch === "" || /[\s([{<\u2018\u201c\u2013\u2014\u2012/=-]/.test(ch);
/** What a quote closes before: nothing, a space, punctuation, a dash, another quote. */
const closesBefore = (ch: string) =>
  ch === "" || /[\s.,;:!?)\]}>'"\u2019\u201d\u2026\u2013\u2014\u2012/-]/.test(ch);

/**
 * `'` becomes an apostrophe or a single quote and `"` a double quote, by what stands on
 * either side:
 *   - with a letter or digit after it, and no space, bracket or dash before it, it is an
 *     apostrophe (Didn't, Lincoln's, the 90's, et al.'s);
 *   - before a decade or a known elision ('90s, 'em, rock 'n' roll) it is an apostrophe;
 *   - after a space, a bracket, a dash or an opening quote it opens; before a space,
 *     punctuation or the end it closes (teams' is the same glyph as a closing quote);
 *   - where both or neither holds, it closes a quote that is open and opens one otherwise;
 *   - after a digit it is a prime and stays as typed (6' 2"), unless a quote of its kind is
 *     open, which it then closes ("version 2").
 * Typographic quotes already in the text are kept and counted, so a second pass changes
 * nothing.
 */
export function typographicQuotes(text: string): string {
  if (!/['"]/.test(text)) return text;
  const out = [...text];
  // Everything here is in the Basic Multilingual Plane or copied through, so working on
  // code points and joining them gives back a string of the same length in UTF-16 units.
  let double = false;
  let single = false;
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    if (ch === BREAK) {
      double = false;
      single = false;
    } else if (ch === OPEN_DOUBLE) double = true;
    else if (ch === CLOSE_DOUBLE) double = false;
    else if (ch === OPEN_SINGLE) single = true;
    else if (ch === CLOSE_SINGLE) single = false;
    if (ch !== '"' && ch !== "'") continue;

    const before = out[i - 1] ?? "";
    const after = out[i + 1] ?? "";
    const left = opensAfter(before);
    const right = closesBefore(after);

    if (ch === '"') {
      if (isDigit(before) && !double) continue;
      const opens = left === right ? !double : left;
      out[i] = opens ? OPEN_DOUBLE : CLOSE_DOUBLE;
      double = opens;
      continue;
    }

    // Inside a word, or a possessive after a full stop or a bracket: et al.'s, (OTP)'s.
    if (!left && isWord(after) && after !== OPAQUE) {
      out[i] = CLOSE_SINGLE;
      continue;
    }
    if (left) {
      const rest = out.slice(i + 1, i + 8).join("");
      if (ELISION.test(rest) || DECADE.test(rest)) {
        out[i] = CLOSE_SINGLE;
        continue;
      }
    }
    if (isDigit(before) && !single) continue;
    const opens = left === right ? !single : left;
    out[i] = opens ? OPEN_SINGLE : CLOSE_SINGLE;
    single = opens;
  }
  return out.join("");
}

/**
 * The other way, for matching and for plain text: a reader types ' and " into the search box,
 * and a title that says Didn’t has to answer to "didn't". A no-break space (a title keeps two
 * words on one line with it) is the space bar's too.
 */
export function straightQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, " ");
}
