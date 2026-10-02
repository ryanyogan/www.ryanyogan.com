import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { PROJECT_STATUSES, projectGroups, projectStatusLabels } from "@repo/shared";
import type { ProjectGroup, ProjectStatus } from "@repo/shared";
import { Prose } from "~/components/Prose";
import {
  adminCreateProject,
  adminDeleteProject,
  adminDraftWithAi,
  adminUpdateProject,
} from "~/lib/admin/admin.functions";
import type { AiDraft } from "~/lib/admin/ai";
import type { AdminProjectDetail } from "~/lib/db/projects";
import type { FieldErrors, ProjectField } from "~/lib/admin/validate";

/** The form's own state: everything is text or a boolean until it is submitted. */
export interface ProjectFormValues {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  body: string;
  /** Comma separated. */
  tech: string;
  group: ProjectGroup;
  status: ProjectStatus;
  statusLabel: string;
  github: string;
  live: string;
  published: boolean;
}

export const emptyProjectForm: ProjectFormValues = {
  slug: "",
  title: "",
  tagline: "",
  summary: "",
  body: "",
  tech: "",
  group: "shipped",
  status: "prototype",
  statusLabel: "",
  github: "",
  live: "",
  published: false,
};

export function toFormValues(project: AdminProjectDetail): ProjectFormValues {
  return {
    slug: project.slug,
    title: project.title,
    tagline: project.tagline,
    summary: project.summary,
    body: project.content,
    tech: project.tech.join(", "),
    group: project.group,
    status: project.status,
    statusLabel: project.statusLabel ?? "",
    github: project.github ?? "",
    live: project.live ?? "",
    published: project.published,
  };
}

type AiField = "tagline" | "summary" | "body" | "tech";
/** The fields a draft can fill, in the order the proposal shows them. */
const AI_FIELDS: readonly AiField[] = ["tagline", "summary", "tech", "body"];

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const described = [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": described || undefined })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[0.9rem] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-[0.95rem] font-semibold text-lead">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProjectForm({
  mode,
  initial,
  repoFullName = null,
}: {
  mode: "create" | "edit";
  initial: ProjectFormValues;
  /** Set for a GitHub import: the only projects "Draft with AI" is offered for. */
  repoFullName?: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // "Draft with AI": the proposal lives here only. It reaches the database through the
  // ordinary save, after the owner has taken fields from it into the form.
  const [proposal, setProposal] = useState<AiDraft | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiAccepted, setAiAccepted] = useState(false);

  async function draftWithAi() {
    setAiBusy(true);
    setAiError("");
    try {
      const result = await adminDraftWithAi({ data: initial.slug });
      if (result.ok) setProposal(result.draft);
      else setAiError(result.error);
    } catch {
      setAiError("The draft request failed. Reload the page and try again.");
    } finally {
      setAiBusy(false);
    }
  }

  const proposed = (field: AiField): string =>
    !proposal ? "" : field === "tech" ? proposal.tech.join(", ") : proposal[field];

  function useProposed(fields: readonly AiField[]) {
    if (!proposal) return;
    setValues((current) => {
      const next = { ...current };
      for (const field of fields) next[field] = proposed(field);
      return next;
    });
    setAiAccepted(true);
  }

  function set<K extends keyof ProjectFormValues>(field: K, value: ProjectFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const payload = {
      ...values,
      tech: values.tech.split(","),
      aiAccepted,
      // The row being edited: `slug` may now hold a new name for it.
      originalSlug: mode === "edit" ? initial.slug : undefined,
    };
    try {
      const result =
        mode === "create"
          ? await adminCreateProject({ data: payload })
          : await adminUpdateProject({ data: payload });
      if (!result.ok) {
        setErrors(result.errors);
        const count = Object.keys(result.errors).length;
        setMessage({
          kind: "error",
          text: `Not saved: ${count} ${count === 1 ? "field needs" : "fields need"} fixing.`,
        });
        return;
      }
      setErrors({});
      if (mode === "create") {
        await router.navigate({ to: "/admin/projects/$slug", params: { slug: result.slug } });
        return;
      }
      if (result.slug !== initial.slug) {
        // Renamed: the old admin URL no longer exists.
        await router.navigate({
          to: "/admin/projects/$slug",
          params: { slug: result.slug },
          replace: true,
        });
        return;
      }
      await router.invalidate();
      setAiAccepted(false);
      setMessage({ kind: "ok", text: `Saved at ${new Date().toLocaleTimeString()}.` });
    } catch {
      setMessage({ kind: "error", text: "Not saved: the request failed. Reload and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setMessage(null);
    try {
      await adminDeleteProject({ data: initial.slug });
      await router.navigate({ to: "/admin" });
    } catch {
      setMessage({ kind: "error", text: "Not deleted: the request failed." });
      setBusy(false);
    }
  }

  const err = (field: ProjectField) => errors[field];

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      {mode === "edit" && repoFullName && (
        <section
          aria-labelledby="adm-ai-h"
          data-testid="ai-draft"
          className="mb-8 rounded-card border border-rule bg-surface p-[clamp(16px,2.4vw,22px)]"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="adm-ai-h" className="font-semibold">
              Draft with AI
            </h2>
            <button
              type="button"
              className="adm-btn"
              disabled={aiBusy || busy}
              onClick={draftWithAi}
            >
              {aiBusy ? "Drafting..." : proposal ? "Draft again" : "Draft with AI"}
            </button>
            <span className="text-[0.9rem] text-muted">
              Reads {repoFullName} and its README. Nothing is saved until you press Save changes.
            </span>
          </div>
          <div aria-live="polite">
            {aiError && (
              <p data-testid="ai-error" className="mt-3 font-semibold text-lead">
                {aiError}
              </p>
            )}
          </div>
          {proposal && (
            <div className="mt-4">
              <div
                data-testid="ai-caveats"
                className="rounded-card border border-lead-rule bg-lead-bg p-[clamp(12px,2vw,18px)]"
              >
                <h3 className="font-semibold">Check before using: the model could not confirm</h3>
                {proposal.caveats.length ? (
                  <ul className="mt-1 list-disc pl-5">
                    {proposal.caveats.map((caveat) => (
                      <li key={caveat}>{caveat}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">
                    The model listed nothing. That is not proof: read the draft against the repo.
                  </p>
                )}
              </div>
              {AI_FIELDS.map((field) => (
                <div
                  key={field}
                  data-testid={`ai-field-${field}`}
                  className="mt-4 grid grid-cols-1 gap-3 border-t border-rule pt-3 md:grid-cols-2"
                >
                  <div className="min-w-0">
                    <p className="label">Current {field}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-ink-soft">
                      {values[field] || "(empty)"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="label">Proposed {field}</p>
                    <p
                      data-testid={`ai-proposed-${field}`}
                      className="mt-1 whitespace-pre-wrap break-words"
                    >
                      {proposed(field)}
                    </p>
                    <button
                      type="button"
                      className="adm-btn mt-2"
                      disabled={values[field] === proposed(field)}
                      onClick={() => useProposed([field])}
                    >
                      {values[field] === proposed(field) ? "In the form" : "Use this"}
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                <button type="button" className="adm-btn" onClick={() => useProposed(AI_FIELDS)}>
                  Use all
                </button>
                <button type="button" className="adm-btn" onClick={() => setProposal(null)}>
                  Discard proposal
                </button>
                <span className="text-[0.9rem] text-muted" data-testid="ai-suggested">
                  Suggested group: {proposal.suggestedGroup}, status: {proposal.suggestedStatus}{" "}
                  (not applied; set them below if you agree).
                </span>
              </div>
              {aiAccepted && (
                <p className="mt-3 font-semibold" data-testid="ai-unsaved">
                  AI text is in the form but not saved. Edit it, then press Save changes.
                </p>
              )}
            </div>
          )}
        </section>
      )}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Title" error={err("title")}>
            {(a) => (
              <input
                {...a}
                className="adm-input"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Slug"
            hint={
              mode === "create"
                ? "Lower-case letters, digits and hyphens. Becomes /projects/<slug>."
                : "Changing it moves the page: the old /projects/<slug> address becomes a 404."
            }
            error={err("slug")}
          >
            {(a) => (
              <input
                {...a}
                className="adm-input font-mono"
                value={values.slug}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => set("slug", e.target.value)}
              />
            )}
          </Field>

          <Field label="Summary" hint="One line for index rows." error={err("summary")}>
            {(a) => (
              <input
                {...a}
                className="adm-input"
                value={values.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Tagline"
            hint="Longer description for the project page and meta description."
            error={err("tagline")}
          >
            {(a) => (
              <textarea
                {...a}
                rows={3}
                className="adm-input !font-sans !text-[1rem]"
                value={values.tagline}
                onChange={(e) => set("tagline", e.target.value)}
              />
            )}
          </Field>

          <Field label="Tech" hint="Comma separated, e.g. Elixir, OTP, SQLite." error={err("tech")}>
            {(a) => (
              <input
                {...a}
                className="adm-input"
                value={values.tech}
                onChange={(e) => set("tech", e.target.value)}
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Group" error={err("group")}>
              {(a) => (
                <select
                  {...a}
                  className="adm-input"
                  value={values.group}
                  onChange={(e) => set("group", e.target.value as ProjectGroup)}
                >
                  {projectGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Status" error={err("status")}>
              {(a) => (
                <select
                  {...a}
                  className="adm-input"
                  value={values.status}
                  onChange={(e) => set("status", e.target.value as ProjectStatus)}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {projectStatusLabels[s]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <Field
            label="Status label"
            hint='Optional pill text in place of the status word, e.g. "On npm".'
            error={err("statusLabel")}
          >
            {(a) => (
              <input
                {...a}
                className="adm-input"
                value={values.statusLabel}
                onChange={(e) => set("statusLabel", e.target.value)}
              />
            )}
          </Field>

          <Field label="GitHub URL" hint="Optional. https only." error={err("github")}>
            {(a) => (
              <input
                {...a}
                type="url"
                inputMode="url"
                className="adm-input"
                value={values.github}
                onChange={(e) => set("github", e.target.value)}
              />
            )}
          </Field>

          <Field label="Live URL" hint="Optional. https only." error={err("live")}>
            {(a) => (
              <input
                {...a}
                type="url"
                inputMode="url"
                className="adm-input"
                value={values.live}
                onChange={(e) => set("live", e.target.value)}
              />
            )}
          </Field>

          <div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
              <input
                type="checkbox"
                className="size-5 accent-build"
                checked={values.published}
                onChange={(e) => set("published", e.target.checked)}
              />
              Published
            </label>
            <p className="text-[0.9rem] text-muted">
              Unticked, the project is a draft: it is on no public page and its URL is a 404.
            </p>
            {err("published") && (
              <p className="mt-1 text-[0.95rem] font-semibold text-lead">{err("published")}</p>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Body (markdown)" error={err("body")}>
            {(a) => (
              <textarea
                {...a}
                rows={16}
                className="adm-input"
                spellCheck
                value={values.body}
                onChange={(e) => set("body", e.target.value)}
              />
            )}
          </Field>
          <section aria-labelledby="adm-preview-h">
            <h2 id="adm-preview-h" className="label mb-2">
              Preview
            </h2>
            <div
              data-testid="body-preview"
              className="min-h-24 rounded-card border border-rule bg-surface p-[clamp(16px,2.4vw,26px)]"
            >
              {values.body.trim() ? (
                <Prose content={values.body} />
              ) : (
                <p className="text-muted">Nothing to preview yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule-strong pt-5">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
          {mode === "create" ? "Create project" : "Save changes"}
        </button>
        <Link to="/admin" className="adm-btn">
          Back to list
        </Link>
        {mode === "edit" && values.published && (
          <a href={`/projects/${initial.slug}`} className="link font-semibold">
            View public page
          </a>
        )}
        <p
          role="status"
          className={`font-semibold ${message?.kind === "error" ? "text-lead" : "text-build"}`}
        >
          {message?.text}
        </p>
      </div>

      {mode === "edit" && (
        <div className="mt-8 rounded-card border border-lead-rule bg-lead-bg p-[clamp(16px,2.4vw,22px)]">
          <h2 className="font-semibold">Delete this project</h2>
          <p className="mt-1 text-ink-soft">
            Removes the row from the database. This cannot be undone.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {confirmingDelete ? (
              <>
                <span className="font-semibold">
                  Delete &ldquo;{initial.title}&rdquo; for good?
                </span>
                <button
                  type="button"
                  className="adm-btn adm-btn-danger"
                  disabled={busy}
                  onClick={onDelete}
                >
                  Yes, delete it
                </button>
                <button
                  type="button"
                  className="adm-btn"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete project
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
