export type KeyboardDialog = "palette" | "help";

/** Fired on `window` by the header and footer buttons; KeyboardLayer listens. */
export const DIALOG_EVENT = "site:dialog";

export function openDialog(name: KeyboardDialog) {
  window.dispatchEvent(new CustomEvent<KeyboardDialog>(DIALOG_EVENT, { detail: name }));
}

/** `g` then one of these. */
export const goKeys: { key: string; label: string; href: string }[] = [
  { key: "h", label: "Home", href: "/" },
  { key: "w", label: "Work", href: "/work" },
  { key: "p", label: "Projects", href: "/projects" },
  { key: "r", label: "Writing", href: "/writing" },
];
