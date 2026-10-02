import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StatusPill } from "~/components/StatusPill";

const AUDIT_SLUG = "lincoln-six-months-later";

/**
 * "Where the two meet": the leadership habit of admitting a mistake in public,
 * and the same habit applied to a codebase, shown as the Lincoln audit.
 */
export function WhereTheTwoMeet() {
  return (
    <section aria-labelledby="meet-h" className="pt-[clamp(52px,7vw,88px)]">
      <div className="rounded-card border border-rule bg-surface p-[clamp(22px,3.4vw,44px)]">
        <div className="grid grid-cols-1 items-start gap-[clamp(22px,4vw,56px)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <span className="label">Where the two meet</span>
            <h2 id="meet-h" className="display mt-2.5 text-[clamp(1.7rem,3.4vw,2.5rem)]">
              The same habit, in a team and in a codebase.
            </h2>
          </div>
          <div className="grid gap-[18px]">
            <blockquote className="border-l-[3px] border-lead pl-4 font-serif text-[1.18rem] leading-[1.38]">
              <p>
                &ldquo;The most important thing I ever did as a manager was publicly admit when I
                was wrong.&rdquo;
              </p>
              <footer className="mt-1.5 font-sans text-[0.9rem] text-muted">As a leader</footer>
            </blockquote>
            <p className="text-ink-soft">
              Six months into Lincoln I audited my own claims. Almost everything it remembered was
              something it had told itself.
            </p>
          </div>
        </div>

        <article
          aria-labelledby="neg-h"
          className="mt-[clamp(24px,3.6vw,40px)] border-t-[3px] border-build pt-[22px]"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-2">
            <span className="label text-build!">Negative result &middot; Lincoln</span>
            <StatusPill status="running" label="Running locally" />
          </div>
          <h3 id="neg-h" className="display mt-3.5 max-w-[15em] text-[clamp(1.6rem,3.6vw,2.6rem)]">
            What I got wrong about my own system.
          </h3>

          <div className="mt-[22px] grid grid-cols-1 gap-x-11 gap-y-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <figure>
              <div
                aria-hidden="true"
                className="font-serif text-[clamp(4rem,10vw,7rem)] leading-[0.86] font-normal tracking-[-0.045em] text-build lining-nums"
              >
                98.9
                <sup className="relative top-[0.25em] ml-[0.05em] align-top text-[0.38em] tracking-normal">
                  %
                </sup>
              </div>
              <div
                role="img"
                aria-label="98.9 percent of Lincoln's memories were self-reflections; 1.1 percent were anything else"
                className="mt-[18px] flex h-4 overflow-hidden rounded-full border border-ink"
              >
                <span className="block w-[98.9%] border-r border-ink bg-[repeating-linear-gradient(135deg,var(--build)_0_5px,transparent_5px_8px)]" />
              </div>
              <div className="mt-[7px] flex justify-between gap-3">
                <span className="label">Self-reflection</span>
                <span className="label text-right">Everything else &middot; 1.1%</span>
              </div>
              <figcaption className="mt-3 text-[0.9375rem] leading-[1.42] text-ink-soft">
                Share of Lincoln&rsquo;s memories that were the system reflecting on itself, found
                when I audited it six months in.
              </figcaption>
            </figure>

            <dl className="border-t border-rule-strong">
              <LedgerRow term="Built">
                A belief store with confidence, provenance and revision history, attention scoring
                to decide what gets thought about, and pgvector memory. 158 commits, public.
              </LedgerRow>
              <LedgerRow term="Found">
                98.9% of its memories were self-reflections. The system had been rehearsing, and its
                confidence rose with the rehearsal.
              </LedgerRow>
              <LedgerRow term="Did">
                Published the retraction, in{" "}
                <Link to="/writing/$slug" params={{ slug: AUDIT_SLUG }} className="link italic">
                  Lincoln, Six Months Later
                </Link>
                , rather than shipping another feature on top of it.
              </LedgerRow>
            </dl>
          </div>

          <blockquote className="mt-7 border-t border-rule-strong pt-[22px]">
            <p className="max-w-[22em] font-serif text-[clamp(1.45rem,3.1vw,2.2rem)] leading-[1.16] tracking-[-0.012em] text-balance italic">
              &ldquo;Rehearsal is not corroboration.{" "}
              <span className="text-build">If a system can raise its own confidence, it will.</span>
              &rdquo;
            </p>
            <footer className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <span className="label">As a builder, auditing Lincoln &middot; Sep 2026</span>
              <span className="flex flex-wrap gap-x-5 gap-y-1 font-semibold">
                <Link to="/writing/$slug" params={{ slug: AUDIT_SLUG }} className="link">
                  Read the retraction &rarr;
                </Link>
                <Link to="/projects/$slug" params={{ slug: "lincoln-project" }} className="link">
                  Lincoln project notes &rarr;
                </Link>
              </span>
            </footer>
          </blockquote>
        </article>
      </div>
    </section>
  );
}

function LedgerRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-rule py-[11px] sm:grid-cols-[96px_minmax(0,1fr)]">
      <dt className="label sm:pt-[0.4em]">{term}</dt>
      <dd className="leading-[1.45]">{children}</dd>
    </div>
  );
}
