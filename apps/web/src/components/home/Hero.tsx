import { Lakefront } from "./HomeArt";

const scaleNumbers: { from?: string; value: string; label: string }[] = [
  { from: "8", value: "65+", label: "engineers, across 11 squads, at Procore" },
  { from: "150", value: "2,300", label: "employees while I was there, then an IPO" },
  { value: "700+", label: "interviews conducted" },
  { value: "50+", label: "hires made" },
];

export function Hero() {
  return (
    <section aria-labelledby="home-h" className="row first">
      <div className="gut">
        <p className="who">
          <b>Ryan Yogan</b>Chicago. Engineering leader, agent builder.
        </p>
        <ul className="else">
          <li>
            <a href="https://github.com/ryanyogan" rel="me">
              GitHub
            </a>
          </li>
          <li>
            <a href="https://linkedin.com/in/ryanyogan" rel="me">
              LinkedIn
            </a>
          </li>
        </ul>
      </div>
      <div className="col hero">
        <div>
          <h1 id="home-h">I lead engineering teams and build agent systems myself.</h1>
          <p className="lede">
            Twenty years of scaling engineering orgs. The last two spent deep in agent memory, MCP,
            and durable AI workflows.
          </p>
        </div>
        <Lakefront />
        <dl className="nums">
          {scaleNumbers.map((item) => (
            <div key={item.label}>
              <dt>
                {item.from && (
                  <>
                    {item.from}
                    <i aria-hidden="true">&rarr;</i>
                    <span className="sr-only"> to </span>
                  </>
                )}
                {item.value}
              </dt>
              <dd>{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
