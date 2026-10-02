import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function Prose({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => <h1 className="display mb-6 text-[2.2rem] text-ink">{children}</h1>,
        h2: ({ children }) => (
          <h2 className="display mt-12 mb-4 text-[1.7rem] text-ink">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="display mt-8 mb-3 text-[1.35rem] text-ink">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-6 mb-2 font-sans text-[1.1rem] font-semibold text-ink">{children}</h4>
        ),
        // An image alone in its paragraph is a figure, and a <figure> may not sit inside a <p>:
        // the browser closes the <p> early, and the repaired DOM no longer matches what React
        // renders, so hydration fails. Such a paragraph is rendered as the figure itself.
        p: ({ node, children }) => {
          const only = node?.children.length === 1 ? node.children[0] : undefined;
          if (only?.type === "element" && only.tagName === "img") {
            const src = typeof only.properties.src === "string" ? only.properties.src : undefined;
            const alt = typeof only.properties.alt === "string" ? only.properties.alt : "";
            return (
              <figure className="my-10">
                <img src={src} alt={alt} className="w-full rounded-card" loading="lazy" />
                {alt && <figcaption className="mt-3 text-[0.9rem] text-muted">{alt}</figcaption>}
              </figure>
            );
          }
          return <p className="mb-6 text-[1.125rem] leading-relaxed text-ink-soft">{children}</p>;
        },
        ul: ({ children }) => <ul className="mb-6 list-none space-y-2 p-0">{children}</ul>,
        ol: ({ children }) => (
          <ol className="mb-6 list-decimal space-y-2 pl-6 text-[1.125rem] text-ink-soft marker:text-muted">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="border-l border-rule-strong pl-4 text-[1.125rem] leading-relaxed text-ink-soft [ol>&]:border-0 [ol>&]:pl-1">
            {children}
          </li>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="link text-ink decoration-build"
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-8 border-l-[3px] border-build pl-5 font-serif italic [&>p]:text-[1.3rem] [&>p]:leading-snug [&>p]:text-ink [&>p:last-child]:mb-0">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded-[4px] border border-rule bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre
            tabIndex={0}
            className="mb-6 overflow-x-auto rounded-card bg-[#1e1e1e] p-0 font-mono text-sm leading-relaxed text-[#d4d4d4]"
          >
            {children}
          </pre>
        ),
        strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="my-12 border-rule-strong" />,
        table: ({ children }) => (
          <div className="mb-6 overflow-x-auto" tabIndex={0}>
            <table className="w-full font-sans text-[0.95rem]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-rule-strong">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-rule">{children}</tr>,
        th: ({ children }) => <th className="label px-4 py-3 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-4 py-3 text-ink-soft">{children}</td>,
        // An image inside other content (text, a link, a list item) stays phrasing content.
        img: ({ src, alt }) => (
          <img src={src} alt={alt || ""} className="max-w-full rounded-card" loading="lazy" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
