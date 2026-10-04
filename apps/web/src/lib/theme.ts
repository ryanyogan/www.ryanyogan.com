export type Theme = "system" | "dark" | "light";

/** Fired on `window` whenever the theme changes, so every control shows the same state. */
export const THEME_EVENT = "site:theme";

export function storedTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    return "system";
  }
}

export function setTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  if (theme !== "system") html.classList.add(theme);
  syncThemeColor(theme);
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    // Storage can be unavailable (private mode); the class on <html> still applies.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

/**
 * The browser's theme colour is the chosen theme's --paper: that theme's meta applies whatever
 * the OS says and the other never does. With "system" each follows the OS again. The inline
 * script in routes/__root.tsx does the same before first paint.
 */
function syncThemeColor(theme: Theme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.getAttribute("data-scheme");
    meta.setAttribute(
      "media",
      theme === "system"
        ? `(prefers-color-scheme: ${scheme})`
        : theme === scheme
          ? "all"
          : "not all",
    );
  });
}

/** Flip between light and dark, starting from whatever is showing now. */
export function toggleTheme(): Theme {
  const stored = storedTheme();
  const dark =
    stored === "dark" ||
    (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next: Theme = dark ? "light" : "dark";
  setTheme(next);
  return next;
}
