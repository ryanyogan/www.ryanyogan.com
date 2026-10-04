import { useState, useEffect } from "react";
import { THEME_EVENT, setTheme as applyTheme, storedTheme } from "~/lib/theme";
import type { Theme } from "~/lib/theme";
import { MoonIcon, SunIcon, SystemThemeIcon } from "./Icons";

const NEXT: Record<Theme, Theme> = { system: "dark", dark: "light", light: "system" };
const LABEL: Record<Theme, string> = { system: "System", dark: "Dark", light: "Light" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // The theme can also change from the keyboard layer, so follow the event.
  useEffect(() => {
    const sync = () => setTheme(storedTheme());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  // All three icons are in the markup and the class on <html> picks the one to show (app.css,
  // .theme-icon), so the right one is there on first paint, before this component hydrates.
  return (
    <button
      type="button"
      onClick={() => applyTheme(NEXT[theme])}
      className="quiet icon-btn theme-icon"
      aria-label={`Colour theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}.`}
      title={`Theme: ${LABEL[theme]}`}
    >
      <SystemThemeIcon className="t-system" />
      <MoonIcon className="t-dark" />
      <SunIcon className="t-light" />
    </button>
  );
}
