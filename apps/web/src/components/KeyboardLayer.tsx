import { useRouter } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent, ReactNode } from "react";
import { DIALOG_EVENT, goKeys } from "~/lib/keys";
import type { KeyboardDialog } from "~/lib/keys";
import { toggleTheme } from "~/lib/theme";
import { fetchProjects } from "~/lib/projects.functions";
import type { SearchItem } from "~/lib/search";
import { SearchIcon } from "./Icons";

interface SearchIndex {
  search: typeof import("~/lib/search").search;
  items: SearchItem[];
  types: typeof import("~/lib/search").searchTypes;
}

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

      // The one chord with a modifier. It works from anywhere, and closes the palette too.
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setDialog((current) => (current === "palette" ? null : "palette"));
        return;
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      if (key === "?") {
        event.preventDefault();
        setDialog((current) => (current === "help" ? null : (current ?? "help")));
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
        case "/":
          event.preventDefault();
          setDialog("palette");
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
    <>
      <Modal open={dialog === "palette"} onClose={close} label="Search the site">
        {dialog === "palette" ? <Palette onClose={close} /> : null}
      </Modal>
      <Modal open={dialog === "help"} onClose={close} labelledBy="kb-help-h">
        {dialog === "help" ? <Help onClose={close} /> : null}
      </Modal>
    </>
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
  label,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  labelledBy?: string;
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
      aria-label={label}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {children}
    </dialog>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const base = useId();
  const listId = `${base}-list`;
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    // Without the project list the palette still offers pages, posts and actions.
    void Promise.all([import("~/lib/search"), fetchProjects().catch(() => [])]).then(
      ([loaded, projects]) => {
        if (live)
          setIndex({
            search: loaded.search,
            items: loaded.buildSearchItems(projects),
            types: loaded.searchTypes,
          });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const results = useMemo(() => (index ? index.search(index.items, query) : []), [index, query]);
  const current = results[active];
  const optionId = (index: number) => `${base}-opt-${index}`;

  useEffect(() => {
    document.getElementById(`${base}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [base, active]);

  function run(entry: SearchItem) {
    if (entry.action === "email") {
      navigator.clipboard.writeText(entry.href).then(
        () => setNotice(`Copied ${entry.href}`),
        () => setNotice(`Could not copy. The address is ${entry.href}`),
      );
      return;
    }
    if (entry.action === "theme") toggleTheme();
    else if (entry.action === "github") window.open(entry.href, "_blank", "noopener,noreferrer");
    else router.history.push(entry.href);
    onClose();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (current) run(current);
    }
  }

  const count = `${results.length} ${results.length === 1 ? "result" : "results"}`;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
        <SearchIcon size={15} className="flex-none text-muted" />
        <input
          data-autofocus
          type="text"
          role="combobox"
          aria-label="Search pages, projects and writing"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? optionId(active) : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Search pages, projects and writing"
          className="min-h-11 min-w-0 flex-1 bg-transparent py-1 text-[1.1rem] text-ink outline-none placeholder:text-muted"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setNotice("");
          }}
          onKeyDown={onKeyDown}
        />
        {/* The button is the 44px target; the key cap inside it is only the picture. */}
        <button
          type="button"
          className="-mr-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center"
          onClick={onClose}
        >
          <span className="sr-only">Close search</span>
          <span aria-hidden="true" className="kbd">
            Esc
          </span>
        </button>
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Results"
        className="max-h-[min(440px,62dvh)] min-h-0 overflow-y-auto p-2"
      >
        {index && results.length === 0 ? (
          <p className="px-3 py-6 text-center text-muted">Nothing matches &ldquo;{query}&rdquo;.</p>
        ) : null}
        {index?.types.map(({ type, label }) => {
          const hits = results
            .map((entry, index) => ({ entry, index }))
            .filter((hit) => hit.entry.type === type);
          if (hits.length === 0) return null;
          const groupId = `${base}-g-${type}`;
          return (
            <div key={type} role="group" aria-labelledby={groupId} className="pb-1.5">
              <div id={groupId} className="lab px-3 pt-2.5 pb-1.5">
                {label}
              </div>
              {hits.map(({ entry, index }) => (
                <div
                  key={entry.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  className="group flex cursor-pointer scroll-my-10 flex-col gap-x-4 border-l-2 border-transparent px-3 py-2 aria-selected:border-accent sm:flex-row sm:items-baseline"
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(entry)}
                >
                  <span className="flex-none font-medium text-ink decoration-accent underline-offset-[0.3em] group-aria-selected:underline sm:max-w-[60%]">
                    {entry.title}
                  </span>
                  <span className="min-w-0 truncate text-[0.875rem] text-muted">
                    {entry.detail}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-rule px-4 py-2.5 text-[0.8125rem] text-muted">
        <span role="status" aria-live="polite" aria-atomic="true">
          {notice || (index ? count : "Loading")}
        </span>
        <span aria-hidden="true" className="hidden items-center gap-1.5 sm:flex">
          <kbd className="kbd">&uarr;</kbd>
          <kbd className="kbd">&darr;</kbd> move
          <kbd className="kbd ml-2">Enter</kbd> open
        </span>
      </div>
    </>
  );
}

const helpRows: { keys: string[]; chord?: boolean; text: string }[] = [
  { keys: ["/"], text: "Search the site (also Ctrl K or ⌘ K)" },
  ...goKeys.map((go) => ({ keys: ["g", go.key], chord: true, text: `Go to ${go.label}` })),
  { keys: ["j", "k"], text: "Next or previous item in the page's list" },
  { keys: ["Enter"], text: "Open the focused item" },
  { keys: ["t"], text: "Switch between light and dark" },
  { keys: ["?"], text: "Show or hide this list" },
  { keys: ["Esc"], text: "Close search or this list" },
];

function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="overflow-y-auto p-[clamp(18px,4vw,28px)]">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="kb-help-h">Keys</h2>
        <button
          data-autofocus
          type="button"
          className="link cursor-pointer text-[0.9375rem] font-medium text-ink-soft"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <p className="mt-1.5 text-[0.9375rem] text-muted">
        Optional. Everything here is also a link or a button on the page.
      </p>
      <dl className="mt-4 border-t border-rule">
        {helpRows.map((row) => (
          <div
            key={row.keys.join("-")}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-rule py-2"
          >
            <dt className="flex items-center gap-1.5">
              {row.keys.map((key, index) => (
                <span key={key} className="contents">
                  {index > 0 ? (
                    <span className="text-[0.8125rem] text-muted">{row.chord ? "then" : "/"}</span>
                  ) : null}
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
