export function Hero() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-32">
      <div className="md:col-span-8">
        <h1 className="font-sans font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-none text-primary mb-12">
          Engineering leader, occasional writer, and full-time builder.
        </h1>
        <p className="font-serif text-xl md:text-2xl leading-relaxed text-on-surface-variant max-w-2xl">
          I specialize in building high-performance distributed systems and refining the developer
          experience. Currently focused on{" "}
          <a
            className="text-primary underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
            href="https://yogan.dev"
          >
            architectural consulting
          </a>{" "}
          for early-stage engineering teams.
        </p>
      </div>

      <div className="md:col-span-4 flex flex-col justify-end">
        <InfoBlock label="Location" value="Chicago, IL" />
        <InfoBlock label="Availability" value="Accepting New Clients" className="mt-6" />
      </div>
    </section>
  );
}

function InfoBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`border-l border-outline-variant/20 pl-6 py-2 ${className}`}>
      <span className="block font-sans text-[10px] tracking-widest uppercase text-neutral-500 mb-2">
        {label}
      </span>
      <span className="block font-sans font-bold text-sm">{value}</span>
    </div>
  );
}
