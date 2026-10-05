import { describe, expect, it } from "vitest";
import { BREAK, OPAQUE, straightQuotes, typographicQuotes } from "./quotes";

// Written with escapes, so that what is expected cannot be mistaken for what was typed.
const L = "\u201c"; // opening double
const R = "\u201d"; // closing double
const l = "\u2018"; // opening single
const r = "\u2019"; // closing single, and the apostrophe

describe("typographicQuotes", () => {
  it("sets an apostrophe in a contraction and a possessive", () => {
    expect(typographicQuotes("What Held, What Didn't, and")).toBe(`What Held, What Didn${r}t, and`);
    // A no-break space before the word changes nothing: the apostrophe is inside it.
    expect(typographicQuotes("What Held, What\u00a0Didn't, and")).toBe(
      `What Held, What\u00a0Didn${r}t, and`,
    );
    // Straight after one, a quote opens, as after any space.
    expect(typographicQuotes("the\u00a0'loop'")).toBe(`the\u00a0${l}loop${r}`);
    expect(typographicQuotes("Lincoln's loop, the teams' work")).toBe(
      `Lincoln${r}s loop, the teams${r} work`,
    );
    expect(typographicQuotes("the 90's, runnin' late")).toBe(`the 90${r}s, runnin${r} late`);
    // After a full stop, a bracket or a closing quote it is still a possessive.
    expect(typographicQuotes(`Hu et al.'s survey, (OTP)'s part, "it"'s`)).toBe(
      `Hu et al.${r}s survey, (OTP)${r}s part, ${L}it${R}${r}s`,
    );
  });

  it("sets an apostrophe, not an opening quote, before a decade or an elision", () => {
    expect(typographicQuotes("the '90s and '08")).toBe(`the ${r}90s and ${r}08`);
    expect(typographicQuotes("tell 'em, rock 'n' roll, 'til then, 'Tis so")).toBe(
      `tell ${r}em, rock ${r}n${r} roll, ${r}til then, ${r}Tis so`,
    );
    // A word that only starts like one is a quoted word.
    expect(typographicQuotes("the 'empty' set")).toBe(`the ${l}empty${r} set`);
  });

  it("opens a quote at the start, after a space, a bracket or a dash", () => {
    expect(typographicQuotes('"impossible in Python" claim')).toBe(
      `${L}impossible in Python${R} claim`,
    );
    expect(typographicQuotes('the "impossible" claim')).toBe(`the ${L}impossible${R} claim`);
    expect(typographicQuotes('("quoted") and ["this"]')).toBe(
      `(${L}quoted${R}) and [${L}this${R}]`,
    );
    expect(typographicQuotes('it held—"mostly"—and - "then" -')).toBe(
      `it held—${L}mostly${R}—and - ${L}then${R} -`,
    );
    expect(typographicQuotes("'quoted' words")).toBe(`${l}quoted${r} words`);
  });

  it("closes a quote before punctuation and at the end", () => {
    expect(typographicQuotes('He said "no."')).toBe(`He said ${L}no.${R}`);
    expect(typographicQuotes('narrowed AGM to "AGM-inspired," and')).toBe(
      `narrowed AGM to ${L}AGM-inspired,${R} and`,
    );
    expect(typographicQuotes('say "yes"; "no"? "ok"! "fine": "so".')).toBe(
      `say ${L}yes${R}; ${L}no${R}? ${L}ok${R}! ${L}fine${R}: ${L}so${R}.`,
    );
    expect(typographicQuotes('"...and then"')).toBe(`${L}...and then${R}`);
  });

  it("pairs nested quotes", () => {
    expect(typographicQuotes(`"She said 'no'"`)).toBe(`${L}She said ${l}no${r}${R}`);
    expect(typographicQuotes(`"'Hi,' he said"`)).toBe(`${L}${l}Hi,${r} he said${R}`);
    expect(typographicQuotes(`'He said "no"'`)).toBe(`${l}He said ${L}no${R}${r}`);
  });

  it("leaves feet and inches after a digit as typed, and closes a quote that is open", () => {
    expect(typographicQuotes(`6' 2" tall, a 27" screen, 85 ft is fine`)).toBe(
      `6' 2" tall, a 27" screen, 85 ft is fine`,
    );
    expect(typographicQuotes(`"version 2" and 'take 2'`)).toBe(
      `${L}version 2${R} and ${l}take 2${r}`,
    );
  });

  it("reads a quote next to something opaque as next to a word", () => {
    expect(typographicQuotes(`"${OPAQUE}" and ${OPAQUE}'s and '${OPAQUE}'`)).toBe(
      `${L}${OPAQUE}${R} and ${OPAQUE}${r}s and ${l}${OPAQUE}${r}`,
    );
  });

  it("does not carry an open quote over a break", () => {
    // Each paragraph of a long quotation opens; only the last closes.
    expect(typographicQuotes(`"one${BREAK}"two" three${BREAK}"four`)).toBe(
      `${L}one${BREAK}${L}two${R} three${BREAK}${L}four`,
    );
    // A line feed is inside a paragraph, and the quote runs across it.
    expect(typographicQuotes('"one\ntwo"')).toBe(`${L}one\ntwo${R}`);
  });

  it("keeps typographic quotes as they are, and changes nothing on a second pass", () => {
    const set = `${L}kept${R}, it${r}s ${l}kept${r}`;
    expect(typographicQuotes(set)).toBe(set);
    expect(typographicQuotes(`${L}version 2" and "this${R}`)).toBe(
      `${L}version 2${R} and ${L}this${R}`,
    );
    for (const typed of [
      `"She said 'no'" and didn't`,
      `6' 2" and "version 2"`,
      `the '90s, "a"—'b'`,
      "nothing to change",
      "",
    ]) {
      const once = typographicQuotes(typed);
      expect(typographicQuotes(once)).toBe(once);
      // One character for one: markdown.ts cuts the result back at the offsets it joined at.
      expect(once.length).toBe(typed.length);
      expect(straightQuotes(once)).toBe(typed);
    }
  });
});

describe("straightQuotes", () => {
  it("gives back the quotes a keyboard types", () => {
    expect(straightQuotes(`What Didn${r}t, ${L}a${R} ${l}b${r}`)).toBe(`What Didn't, "a" 'b'`);
  });

  it("gives back the space a keyboard types for a no-break one", () => {
    expect(straightQuotes(`What\u00a0Didn${r}t`)).toBe("What Didn't");
  });
});
