import { Link } from "@tanstack/react-router";

export function LeadAndBuild() {
  return (
    <section aria-labelledby="both-h" className="row">
      <div className="gut">
        <h2 id="both-h" className="lab">
          Lead and build
        </h2>
        <p className="gnote">
          By day I lead AI engineering at Chromatic, and I build too: AI, MCP and core services.
        </p>
      </div>
      <div className="col twin">
        <div>
          <h3 className="h-m">I lead</h3>
          <ul className="facts">
            <li>
              <b>Co-founder and CTO</b> of an AI startup in construction procurement. Built and led
              a team of 8.
            </li>
            <li>
              <b>VP of R&amp;D at Sonian.</b> Moved 900+ instances to serverless and cut costs 40%+.
            </li>
            <li>
              <b>Coined &ldquo;Empathy Driven Development.&rdquo;</b>
            </li>
          </ul>
          <blockquote className="said">
            <p>&ldquo;The team you build is more important than the product you build.&rdquo;</p>
          </blockquote>
          <p className="more">
            <Link to="/work">Work with me: here&rsquo;s how I like to work &rarr;</Link>
          </p>
        </div>
        <div>
          <h3 className="h-m">I build</h3>
          <p>
            I see things through. Systems I designed, wrote and keep running, with the status stated
            plainly.
          </p>
          <blockquote className="said">
            <p>&ldquo;I would rather publish a negative result than another feature.&rdquo;</p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
