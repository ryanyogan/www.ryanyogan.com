import { useState, useEffect } from "react";
import { THEME_EVENT, setTheme as applyTheme, storedTheme } from "~/lib/theme";
import type { Theme } from "~/lib/theme";

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

  return (
    <button
      type="button"
      onClick={() => applyTheme(NEXT[theme])}
      className="quiet min-w-14 justify-end px-2 text-[0.875rem]"
      aria-label={`Colour theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}.`}
    >
      {LABEL[theme]}
    </button>
  );
}
