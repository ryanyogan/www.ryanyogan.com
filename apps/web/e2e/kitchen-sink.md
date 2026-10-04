A first paragraph of ordinary reading text, long enough to wrap over several lines at any width, with a [link to another page](/work), some **strong words**, some _emphasis_, and `inline code` in the middle of it. Internationalisation and misunderstanding are long words that a narrow column may hyphenate.

A second paragraph follows, so the space between two paragraphs can be measured. It holds a long token that must not push the page wide: `a_very_long_identifier_that_keeps_going_and_going_without_any_break_at_all_until_the_end`.

## Lists

- A first item in a plain list.
- A second item, which is long enough to wrap onto a second line at phone width so the hanging indent shows.
  - A nested item.
  - Another nested item.
- A third item.

1. Step one.
2. Step two.
3. Step three.

## A quotation

> A quoted passage, set as running text beside a rule. It is the same size as the body.
>
> It has a second paragraph.

### Setup

Text under the first heading called Setup.

### Setup

Text under the second heading called Setup, which needs an id of its own.

## Main

A heading whose plain id would be the id of the page's main landmark.

## Code

```ts
// A comment far wider than the reading column, so the block has to scroll sideways inside itself: it is never wrapped.
export function measure(column: number, glyph: number): number {
  const characters = column / glyph;
  return (
    Math.round(characters * 100) / 100 + Number("0") + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].length - 10
  );
}
```

```
A block with no language: plain text, no colours.
```

## A table

| Route    | Requests | JS gzip  |  Change | Note             |
| -------- | -------- | -------- | ------: | :--------------- |
| /        | 12       | 117.4 KB |   -3.1% | Rendered from D1 |
| /work    | 9        | 98.0 KB  |   +0.4% | Prerendered      |
| /writing | 1,204    | 101.2 KB | -12.75% | Prerendered      |

## A figure

![A drawing of a brain made of nodes and edges](/images/brain.png "1098x921 The memory graph after six attempts.")

A last paragraph after the figure, with a footnote[^cost], then a rule.

---

The end.

[^cost]: The note itself, set small under a hairline at the end of the body.
