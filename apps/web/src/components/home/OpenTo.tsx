import { contactEmail } from "@repo/shared";

/** The classifieds: what I am open to, numbered in a ruled box, and where to write. */
export function OpenTo() {
  return (
    <section aria-labelledby="open-h" className="cls">
      <div>
        <h2 id="open-h" className="sec-h">
          Classifieds &middot; Open to
        </h2>
        <p className="stand">Three kinds of work, a few at a time, so each gets real attention.</p>
      </div>
      <div className="cls-box">
        <ol>
          <li>Advising teams building agent systems</li>
          <li>Fractional engineering leadership</li>
          <li>
            A small number of builds
            <small>MCP servers, agent memory, Cloudflare-native AI products</small>
          </li>
        </ol>
        <div className="hello">
          <p>Say hello. Tell me what you are building and where it is stuck.</p>
          <a className="mail" href={`mailto:${contactEmail}`}>
            <span>{contactEmail}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
