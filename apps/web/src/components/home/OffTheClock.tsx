export function OffTheClock() {
  return (
    <section aria-labelledby="off-h" className="pt-[clamp(52px,7vw,88px)]">
      <div className="grid grid-cols-1 items-center gap-[clamp(22px,4vw,56px)] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <span className="label">Off the clock</span>
          <h2 id="off-h" className="display mt-2.5 text-[clamp(1.7rem,3.4vw,2.5rem)]">
            Chicago, a cold rink, and a laptop running Linux.
          </h2>
          <ul className="mt-[18px] grid gap-2.5 text-ink-soft [&_b]:text-ink [&>li]:relative [&>li]:pl-[22px] [&>li]:before:absolute [&>li]:before:top-[0.62em] [&>li]:before:left-0 [&>li]:before:size-2.5 [&>li]:before:rounded-full [&>li]:before:bg-gold">
            <li>
              <b>Hockey dad and coach.</b> Two of the projects on this site exist because of it.
            </li>
            <li>
              <b>I build for my family.</b> A household coordination app and a household budget,
              each built in days.
            </li>
            <li>
              <b>Linux, specifically Omarchy.</b> I put vim keys in everything.
            </li>
            <li>
              <b>Elixir loyalist</b> for real-time work. TanStack Start on Cloudflare for everything
              else.
            </li>
            <li>
              <b>I have rebuilt this site at least eight times</b> in two years. This is not the
              last.
            </li>
          </ul>
        </div>

        <svg
          className="block h-auto w-full"
          viewBox="0 0 400 190"
          role="img"
          aria-label="Line drawing of a hockey rink with a puck at centre ice"
        >
          <rect
            x="2"
            y="2"
            width="396"
            height="186"
            rx="52"
            strokeWidth="2"
            className="fill-surface stroke-rule-strong"
          />
          <g className="fill-none stroke-lead">
            <line x1="200" y1="2" x2="200" y2="188" strokeWidth="3" />
            <line x1="34" y1="18" x2="34" y2="172" strokeWidth="1.5" />
            <line x1="366" y1="18" x2="366" y2="172" strokeWidth="1.5" />
            <circle cx="78" cy="52" r="24" strokeWidth="1.5" />
            <circle cx="78" cy="138" r="24" strokeWidth="1.5" />
            <circle cx="322" cy="52" r="24" strokeWidth="1.5" />
            <circle cx="322" cy="138" r="24" strokeWidth="1.5" />
          </g>
          <g className="fill-none stroke-build">
            <line x1="140" y1="2" x2="140" y2="188" strokeWidth="3" />
            <line x1="260" y1="2" x2="260" y2="188" strokeWidth="3" />
            <circle cx="200" cy="95" r="30" strokeWidth="2" />
            <path d="M34 83a12 12 0 0 1 0 24" strokeWidth="1.5" />
            <path d="M366 83a12 12 0 0 0 0 24" strokeWidth="1.5" />
          </g>
          <g className="fill-lead">
            <circle cx="78" cy="52" r="3" />
            <circle cx="78" cy="138" r="3" />
            <circle cx="322" cy="52" r="3" />
            <circle cx="322" cy="138" r="3" />
          </g>
          <circle cx="200" cy="95" r="6" className="fill-ink" />
        </svg>
      </div>
    </section>
  );
}
