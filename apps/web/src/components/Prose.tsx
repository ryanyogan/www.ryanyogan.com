import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Prose({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
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
          <pre className="bg-surface-container-highest p-6 overflow-x-auto mb-6 text-sm font-mono leading-relaxed">
            {children}
          </pre>
        ),
        strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
        hr: () => <hr className="border-outline-variant/20 my-12" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
