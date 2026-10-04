/**
 * Rendered markdown. `html` comes from `renderMarkdown` (src/lib/markdown.ts), which
 * sanitises it; nothing else may be passed here. The look comes from the `.prose` rules in
 * styles/app.css; the renderer emits plain elements with no classes.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className ? `prose ${className}` : "prose"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
