// The stylesheet travels inside the document, in a <style>, so the first paint needs no
// second request: on a slow connection that request shared the line with the scripts and
// fonts and held the text back for over a second (`pnpm perf --detail --applied`). The
// server has the text from the build; the browser reads it back from the <style> the
// server sent, so the bundle does not carry it a second time. `vite dev` keeps the <link>,
// which is what hot reload updates.
import appCss from "./app.css?url";
import text from "./app.css?inline";

export const APP_CSS_ID = "app-css";

/** The built file. Still imported outside dev: the client build emits the font files through it. */
export const appCssHref = appCss;

export const inlineAppCss = !import.meta.env.DEV;

export const appCssText = import.meta.env.SSR
  ? text
  : (document.getElementById(APP_CSS_ID)?.textContent ?? "");
