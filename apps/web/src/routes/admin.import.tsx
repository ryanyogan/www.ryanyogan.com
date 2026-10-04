import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  adminImportGithubRepo,
  adminListGithubRepos,
  adminReloadGithubRepos,
  type RepoListResult,
} from "~/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/import")({
  loader: () => adminListGithubRepos(),
  component: ImportFromGithub,
});

type Sort = "pushed" | "stars";
const PAGE = 50;

function ImportFromGithub() {
  const loaded = Route.useLoaderData();
  const navigate = useNavigate();
  const [result, setResult] = useState<RepoListResult>(loaded);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("pushed");
  const [showForks, setShowForks] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showUndescribed, setShowUndescribed] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const repos = result.ok ? result.repos : [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = repos.filter(
      (repo) =>
        (showForks || !repo.fork) &&
        (showArchived || !repo.archived) &&
        (showUndescribed || repo.description !== null) &&
        (!needle ||
          `${repo.name} ${repo.description ?? ""} ${repo.language ?? ""} ${repo.topics.join(" ")}`
            .toLowerCase()
            .includes(needle)),
    );
    const byPush = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
      (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "") || a.name.localeCompare(b.name);
    return rows.sort((a, b) =>
      sort === "stars" ? b.stars - a.stars || byPush(a, b) : byPush(a, b),
    );
  }, [repos, query, sort, showForks, showArchived, showUndescribed]);

  async function reload() {
    setBusy("reload");
    setMessage("");
    try {
      const next = await adminReloadGithubRepos();
      setResult(next);
      if (next.ok) setMessage(`Reloaded ${next.repos.length} repositories from GitHub.`);
    } catch {
      setMessage("The reload failed. Reload the page and try again.");
    } finally {
      setBusy("");
    }
  }

  async function importRepo(fullName: string) {
    setBusy(fullName);
    setMessage("");
    try {
      const outcome = await adminImportGithubRepo({ data: fullName });
      if (outcome.ok) {
        await navigate({ to: "/admin/projects/$slug", params: { slug: outcome.slug } });
        return;
      }
      setMessage(outcome.error);
    } catch {
      setMessage("The import failed. Reload the page and try again.");
    }
    setBusy("");
  }

  const toggles: [string, boolean, (value: boolean) => void][] = [
    ["Show forks", showForks, setShowForks],
    ["Show archived", showArchived, setShowArchived],
    ["Show repos with no description", showUndescribed, setShowUndescribed],
  ];

  return (
    <>
      <div className="adm-head flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1>Import from GitHub</h1>
          <p className="mt-2 max-w-[62ch] text-ink-soft">
            Public repositories only. An import creates a draft; nothing is public until you publish
            it.
          </p>
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn" disabled={busy !== ""} onClick={reload}>
            {busy === "reload" ? "Reloading..." : "Reload from GitHub"}
          </button>
          <Link to="/admin" className="adm-btn">
            Back to projects
          </Link>
        </div>
      </div>

      <p role="status" className="adm-ok min-h-6">
        {message}
      </p>

      {!result.ok ? (
        <p role="alert" data-testid="github-error" className="adm-err">
          {result.error}
        </p>
      ) : (
        <>
          <p className="small mt-1" data-testid="repo-counts">
            {result.user}: {repos.length} public repositories, {visible.length} shown &middot;
            fetched <time dateTime={result.fetchedAt}>{result.fetchedAt.slice(11, 16)} UTC</time>
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="flex min-w-0 flex-1 basis-[220px] flex-col">
              <span className="adm-label">Search repositories</span>
              <input
                type="search"
                className="adm-input"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(PAGE);
                }}
              />
            </label>
            <label className="flex flex-col">
              <span className="adm-label">Sort by</span>
              <select
                className="adm-input"
                value={sort}
                onChange={(event) => setSort(event.target.value === "stars" ? "stars" : "pushed")}
              >
                <option value="pushed">Recently pushed</option>
                <option value="stars">Stars</option>
              </select>
            </label>
            {toggles.map(([label, checked, set]) => (
              <label key={label} className="flex min-h-11 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="adm-check"
                  checked={checked}
                  onChange={(event) => set(event.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 text-muted">No repositories match.</p>
          ) : (
            <ol className="adm-rows mt-6">
              {visible.slice(0, limit).map((repo) => {
                const slug = result.imported[repo.fullName.toLowerCase()];
                return (
                  <li key={repo.fullName} data-repo={repo.name}>
                    <div className="min-w-0 flex-1 basis-[260px]">
                      <a href={repo.htmlUrl} rel="noreferrer" className="link adm-title">
                        {repo.name}
                      </a>
                      <p className="mt-0.5 break-words text-ink-soft">
                        {repo.description ?? "No description."}
                      </p>
                      <div className="adm-meta">
                        <span>{repo.language ?? "No language"}</span>
                        <span>Stars: {repo.stars}</span>
                        <span>
                          Pushed{" "}
                          {repo.pushedAt ? (
                            <time dateTime={repo.pushedAt}>{repo.pushedAt.slice(0, 10)}</time>
                          ) : (
                            "never"
                          )}
                        </span>
                        {repo.fork && <span>Fork</span>}
                        {repo.archived && <span>Archived</span>}
                        {slug && <span className="font-medium text-ink">Imported</span>}
                      </div>
                    </div>
                    {slug ? (
                      <Link
                        to="/admin/projects/$slug"
                        params={{ slug }}
                        className="adm-btn"
                        aria-label={`Edit the project imported from ${repo.name}`}
                      >
                        Edit project
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="adm-btn adm-btn-primary"
                        disabled={busy !== ""}
                        aria-label={`Import ${repo.name} as a draft`}
                        onClick={() => importRepo(repo.fullName)}
                      >
                        {busy === repo.fullName ? "Importing..." : "Import as draft"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {visible.length > limit && (
            <button type="button" className="adm-btn mt-3" onClick={() => setLimit(limit + PAGE)}>
              Show {Math.min(PAGE, visible.length - limit)} more
            </button>
          )}
        </>
      )}
    </>
  );
}
