import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent, ReactNode } from "react";
import { DIALOG_EVENT, goKeys } from "~/lib/keys";
import type { KeyboardDialog } from "~/lib/keys";
import { toggleTheme } from "~/lib/theme";

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** The page's main list links (project cards, writing rows), in document order. */
function listItems(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("#main [data-kb-item]")].filter(
    (el) => el.getClientRects().length > 0,
  );
}

function moveFocus(direction: 1 | -1) {
  const all = listItems();
  if (all.length === 0) return;
  const index = all.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  if (index > -1) {
    next = all[Math.max(0, Math.min(all.length - 1, index + direction))];
  } else {
    // Nothing selected yet: start from what is on screen.
    const onScreen = all.filter((el) => {
      const top = el.getBoundingClientRect().top;
      return top >= 60 && top < window.innerHeight - 40;
    });
    next = direction > 0 ? (onScreen[0] ?? all[0]) : (onScreen.at(-1) ?? all.at(-1));
  }
  if (!next) return;
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: "nearest" });
}

export function KeyboardLayer() {
  const router = useRouter();
  const [dialog, setDialog] = useState<KeyboardDialog | null>(null);

  useEffect(() => {
    let chord = false;
    let chordTimer: ReturnType<typeof setTimeout> | undefined;

    function setChord(on: boolean) {
      chord = on;
      clearTimeout(chordTimer);
      if (on) chordTimer = setTimeout(() => setChord(false), 1200);
    }

    function onKeyDown(event: KeyboardEvent) {
      // The admin is forms: no shortcuts there at all.
      if (/^\/admin(\/|$)/.test(window.location.pathname)) return;
      const key = event.key;

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      if (key === "?") {
        event.preventDefault();
        setDialog((current) => (current === "help" ? null : "help"));
        return;
      }

      // Dialogs handle their own keys.
      if (document.querySelector("dialog[open]")) return;

      if (chord) {
        setChord(false);
        const target = goKeys.find((go) => go.key === key);
        if (target) {
          event.preventDefault();
          router.history.push(target.href);
        }
        return;
      }

      switch (key) {
        case "g":
          setChord(true);
          break;
        case "j":
          event.preventDefault();
          moveFocus(1);
          break;
        case "k":
          event.preventDefault();
          moveFocus(-1);
          break;
        case "t":
          toggleTheme();
          break;
      }
    }

    function onOpen(event: Event) {
      setDialog((event as CustomEvent<KeyboardDialog>).detail);
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(DIALOG_EVENT, onOpen);
    return () => {
      clearTimeout(chordTimer);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(DIALOG_EVENT, onOpen);
    };
  }, [router]);

  const close = () => setDialog(null);

  return (
    <Modal open={dialog === "help"} onClose={close} labelledBy="kb-help-h">
      {dialog === "help" ? <Help onClose={close} /> : null}
    </Modal>
  );
}

/**
 * A native modal <dialog>: the browser makes the rest of the page inert, closes
 * on Escape and keeps a backdrop. On top of that, Tab wraps inside the dialog
 * and focus goes back to whatever had it before.
 */
function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      // Without scrolling: the reader may have moved the page since they last used it.
      if (before && before.isConnected && before !== document.body) {
        before.focus({ preventScroll: true });
      }
    };
  }, [open]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // A press on the backdrop lands on the dialog element itself.
  function onClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      className="kb-dialog"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {children}
    </dialog>
  );
}

const helpRows: { keys: string[]; chord?: boolean; text: string }[] = [
  ...goKeys.map((go) => ({ keys: ["g", go.key], chord: true, text: `Go to ${go.label}` })),
  { keys: ["j", "k"], text: "Next or previous item in the page's list" },
  { keys: ["Enter"], text: "Open the focused item" },
  { keys: ["t"], text: "Switch between light and dark" },
  { keys: ["?"], text: "Show or hide this list" },
  { keys: ["Esc"], text: "Close this list" },
];

function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="overflow-y-auto p-[clamp(18px,4vw,28px)]">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="kb-help-h">Keys</h2>
        <button data-autofocus type="button" className="cta" onClick={onClose}>
          <span>Close</span>
        </button>
      </div>
      <p className="small mt-1.5">
        Optional. Everything here is also a link or a button on the page.
      </p>
      <dl className="mt-4 border-t border-hair">
        {helpRows.map((row) => (
          <div
            key={row.keys.join("-")}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-hair py-2"
          >
            <dt className="flex items-center gap-1.5">
              {row.keys.map((key, index) => (
                <span key={key} className="contents">
                  {index > 0 ? <span className="lab">{row.chord ? "then" : "/"}</span> : null}
                  <kbd className="kbd">{key}</kbd>
                </span>
              ))}
            </dt>
            <dd className="text-ink-soft">{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
