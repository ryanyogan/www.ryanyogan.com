import { Link } from "@tanstack/react-router";
import { Lakefront } from "./HomeArt";

const scaleNumbers: { from?: string; value: string; label: string }[] = [
  { from: "8", value: "65+", label: "engineers, 11 squads, Procore" },
  { from: "150", value: "2,300", label: "employees, then an IPO" },
  { value: "700+", label: "interviews conducted" },
  { value: "50+", label: "hires made" },
];

/**
 * The lead story: kicker, headline and deck, then leading and building in two ruled columns.
 * Beside them the lakefront and the numbers, under a heavy rule.
 */
export function Hero() {
  return (
    <section aria-labelledby="home-h" className="lead band">
      <div className="lead-head">
        <div className="kicker">The lead &middot; Twenty years in</div>
        <h1 id="home-h">I lead engineering teams and build agent systems myself.</h1>
        <p className="lede">
          Twenty years of scaling engineering orgs. The last two spent deep in agent memory, MCP,
          and durable AI workflows.
        </p>
      </div>
      <div className="lead-body">
        <div>
          <p className="dropcap">
            <b>Co-founder and CTO</b> of an AI startup in construction procurement. Built and led a
            team of 8. <b>VP of R&amp;D at Sonian.</b> Moved 900+ instances to serverless and cut
            costs 40%+. Coined &ldquo;Empathy Driven Development.&rdquo;
          </p>
          <blockquote className="said">
            <p>&ldquo;The team you build is more important than the product you build.&rdquo;</p>
          </blockquote>
          <Link to="/work" className="cta">
            <span>Work with me: here&rsquo;s how I work &rarr;</span>
          </Link>
        </div>
        <div>
          <p>
            By day I lead AI engineering at Chromatic, and I build too: AI, MCP and core services. I
            see things through. Systems I designed, wrote and keep running, with the status stated
            plainly.
          </p>
          <blockquote className="said">
            <p>&ldquo;I would rather publish a negative result than another feature.&rdquo;</p>
          </blockquote>
        </div>
      </div>
      <Lakefront />
      <div className="nums-box">
        <div>
          <div className="nums-h">By the numbers</div>
          <dl className="nums">
            {scaleNumbers.map((item) => (
              <div key={item.label}>
                <dt>
                  {item.from && (
                    <>
                      {item.from} <i aria-hidden="true">&rarr;</i>
                      <span className="sr-only">to</span>{" "}
                    </>
                  )}
                  {item.value}
                </dt>
                <dd>{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
