import type { ReactNode } from "react";

/** Section heading on a rule, with a note or link on the right. */
export function BlockHead({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-[26px] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule-strong pb-3.5">
      <h2 id={id} className="display text-[clamp(1.7rem,3.4vw,2.5rem)]">
        {title}
      </h2>
      {children}
    </div>
  );
}
