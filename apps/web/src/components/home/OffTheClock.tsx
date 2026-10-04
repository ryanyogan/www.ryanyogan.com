import { RinkPlan } from "./HomeArt";

export function OffTheClock() {
  return (
    <section aria-labelledby="off-h" className="row">
      <div className="gut">
        <h2 id="off-h" className="lab">
          Off the clock
        </h2>
      </div>
      <div className="col">
        <h3 className="h-xl">Chicago, a cold rink, and a laptop running Linux.</h3>
        <div className="off">
          <ul>
            <li>
              <b>Hockey dad and coach.</b> Two of the projects on this site exist because of it.
            </li>
            <li>
              <b>Linux, specifically Omarchy.</b> I put vim keys in everything.
            </li>
            <li>
              <b>I have rebuilt this site at least eight times</b> in two years. This is not the
              last.
            </li>
          </ul>
          <RinkPlan />
        </div>
      </div>
    </section>
  );
}
