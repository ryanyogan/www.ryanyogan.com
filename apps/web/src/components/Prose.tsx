/**
 * Rendered markdown. `html` comes from `renderMarkdown` (src/lib/markdown.ts), which
 * sanitises it and carries the prose styles; nothing else may be passed here.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
