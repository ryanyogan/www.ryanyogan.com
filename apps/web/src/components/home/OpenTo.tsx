import { Link } from "@tanstack/react-router";
import { contactEmail } from "@repo/shared";

const numbered =
  "relative pl-[34px] text-[1.08rem] before:absolute before:top-[0.1em] before:left-0 before:grid before:size-[23px] before:place-items-center before:rounded-full before:border before:border-rule-strong before:font-mono before:text-[0.72rem] before:text-muted before:content-[counter(open)] [counter-increment:open]";

export function OpenTo() {
  return (
    <section aria-labelledby="open-h" className="pt-[clamp(52px,7vw,88px)]">
      <div className="grid grid-cols-1 gap-[clamp(20px,4vw,48px)] border-t-2 border-b border-t-ink border-b-rule-strong py-[30px] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <span className="label">Open to</span>
          <h2 id="open-h" className="display mt-2 text-[clamp(1.7rem,3.4vw,2.5rem)]">
            Three kinds of work, and not many of each.
          </h2>
          <ol className="mt-3.5 grid gap-3 [counter-reset:open]">
            <li className={numbered}>Advising teams building agent systems</li>
            <li className={numbered}>Fractional engineering leadership</li>
            <li className={numbered}>
              A small number of builds
              <small className="block text-[0.93rem] text-muted">
                MCP servers, agent memory, Cloudflare-native AI products
              </small>
            </li>
          </ol>
        </div>

        <div className="self-center">
          <p className="text-ink-soft">
            One way in. Tell me what you are building and where it is stuck.
          </p>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-3 inline-block font-serif text-[clamp(1.25rem,2.4vw,1.7rem)] font-medium underline decoration-gold decoration-2 underline-offset-[0.18em] hover:decoration-4"
          >
            {contactEmail}
          </a>
          <p className="mt-3 text-[0.95rem]">
            <Link to="/work" hash="work-open" className="link">
              How I work, and what I have scaled &rarr;
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
