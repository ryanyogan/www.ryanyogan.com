import { RinkPlan } from "./HomeArt";

export function OffTheClock() {
  return (
    <section aria-labelledby="off-h">
      <h2 id="off-h" className="sec-h">
        Off the clock
      </h2>
      <h3 className="off-h">Chicago, a cold rink, and a laptop running Linux.</h3>
      <figure className="rink-fig">
        <RinkPlan />
        <figcaption className="cap">
          Fig. 3 &mdash; 200 ft &times; 85 ft, the play I keep drawing
        </figcaption>
      </figure>
      <ul className="off">
        <li>
          <b>Hockey dad and coach.</b> Two of the projects on this site exist because of it.
        </li>
        <li>
          <b>Linux, specifically Omarchy.</b> I put vim keys in everything.
        </li>
        <li>
          <b>I have rebuilt this site at least eight times</b> in two years. This is not the last.
        </li>
      </ul>
    </section>
  );
}
