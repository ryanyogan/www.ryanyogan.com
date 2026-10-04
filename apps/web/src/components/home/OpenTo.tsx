import { contactEmail } from "@repo/shared";

export function OpenTo() {
  return (
    <section aria-labelledby="open-h" className="row">
      <div className="gut">
        <h2 id="open-h" className="lab">
          Open to
        </h2>
        <p className="gnote">Three kinds of work, and not many of each.</p>
      </div>
      <div className="col">
        <ol className="open">
          <li>
            <span>Advising teams building agent systems</span>
          </li>
          <li>
            <span>Fractional engineering leadership</span>
          </li>
          <li>
            <span>
              A small number of builds
              <small>MCP servers, agent memory, Cloudflare-native AI products</small>
            </span>
          </li>
        </ol>
        <p className="open-way">One way in. Tell me what you are building and where it is stuck.</p>
        <p>
          <a className="mail" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
