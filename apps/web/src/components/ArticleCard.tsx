import type { Article } from "@repo/shared";

export function ArticleCard({ date, title, excerpt, href }: Article) {
  return (
    <article className="group">
      <a className="block" href={href}>
        <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-400 mb-2">
          {date}
        </span>
        <h3 className="font-sans font-bold text-3xl group-hover:text-neutral-600 transition-colors mb-4">
          {title}
        </h3>
        <p className="font-serif text-lg text-on-surface-variant leading-relaxed">{excerpt}</p>
      </a>
    </article>
  );
}
