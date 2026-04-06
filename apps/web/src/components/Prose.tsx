import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function Prose({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-sans text-4xl font-extrabold tracking-tighter text-primary mb-6">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-sans text-2xl font-bold tracking-tight text-primary mt-12 mb-4">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-sans text-xl font-bold tracking-tight mt-8 mb-3">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-sans text-lg font-bold tracking-tight mt-6 mb-2">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-lg leading-relaxed text-on-surface-variant mb-6">{children}</p>
        ),
        ul: ({ children }) => <ul className="list-none space-y-2 mb-6">{children}</ul>,
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-2 mb-6 text-lg text-on-surface-variant">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-lg text-on-surface-variant leading-relaxed pl-4 border-l border-outline-variant/20">
            {children}
          </li>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-outline-variant/30 pl-6 my-6 italic text-on-surface-variant/80">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-surface-container-highest px-1.5 py-0.5 font-mono text-sm">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-0 overflow-x-auto mb-6 text-sm font-mono leading-relaxed rounded-none -mx-5 sm:-mx-6 md:mx-0">
            {children}
          </pre>
        ),
        strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="border-outline-variant/20 my-12" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-6 -mx-5 sm:-mx-6 md:mx-0">
            <table className="w-full font-sans text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-outline-variant/20">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-outline-variant/10">{children}</tr>,
        th: ({ children }) => (
          <th className="text-left py-3 px-4 font-sans text-[10px] tracking-widest uppercase font-bold text-on-surface-variant">
            {children}
          </th>
        ),
        td: ({ children }) => <td className="py-3 px-4 text-on-surface-variant">{children}</td>,
        img: ({ src, alt }) => (
          <figure className="my-10 -mx-5 sm:-mx-6 md:mx-0">
            <img src={src} alt={alt || ""} className="w-full" loading="lazy" />
            {alt && (
              <figcaption className="mt-3 font-sans text-xs text-neutral-400 tracking-wide">
                {alt}
              </figcaption>
            )}
          </figure>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
