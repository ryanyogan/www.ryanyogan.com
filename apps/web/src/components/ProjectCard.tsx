import type { Project } from "@repo/shared";

export function ProjectCard({ category, title, description, linkLabel, href }: Project) {
  return (
    <div className="flex flex-col">
      <span className="font-sans text-[10px] tracking-widest uppercase text-neutral-400 mb-4">
        {category}
      </span>
      <h3 className="font-sans font-bold text-xl mb-3">{title}</h3>
      <p className="font-serif text-on-surface-variant leading-relaxed mb-6">{description}</p>
      <a
        className="mt-auto font-sans text-[10px] tracking-widest uppercase font-bold border-b border-primary inline-block w-fit"
        href={href}
      >
        {linkLabel}
      </a>
    </div>
  );
}
