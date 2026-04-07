export function ConsultingCTA() {
  return (
    <section className="bg-surface-container-low p-6 sm:p-8 md:p-12 lg:p-16" id="contact">
      <h2 className="font-sans font-extrabold text-xl sm:text-2xl md:text-4xl tracking-tight mb-6 md:mb-8">
        Consulting &amp; Advisory
      </h2>
      <p className="font-serif text-lg md:text-xl leading-relaxed text-on-surface-variant mb-8 md:mb-12 max-w-xl">
        I partner with technical founders to solve scaling bottlenecks, audit architecture, and
        build robust engineering cultures.
      </p>
      <a
        className="inline-block bg-primary text-white px-6 py-3 md:px-8 md:py-4 font-sans text-xs md:text-sm tracking-widest uppercase font-bold hover:bg-neutral-800 transition-colors"
        href="https://yogan.dev"
        target="_blank"
        rel="noopener noreferrer"
      >
        Inquire at yogan.dev
      </a>
    </section>
  );
}
