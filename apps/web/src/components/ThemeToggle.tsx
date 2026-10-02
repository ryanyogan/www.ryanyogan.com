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
      className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-rule-strong px-3 py-1.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-surface hover:text-ink"
      aria-label={`Colour theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}.`}
    >
      <span
        aria-hidden="true"
        className="size-3 rounded-full bg-[linear-gradient(90deg,var(--lead)_50%,var(--build)_50%)]"
      />
      <span className="hidden sm:inline">{LABEL[theme]}</span>
    </button>
  );
}
