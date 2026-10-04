import { PROJECT_GROUPS, PROJECT_STATUSES } from "@repo/shared";
import type { ProjectGroup, ProjectStatus } from "@repo/shared";
import { buildUserMessage, SYSTEM_PROMPT } from "./ai-prompt";
import type { RepoDetail } from "./github";

// "Draft with AI": one Workers AI call that turns a repository's metadata and README into a
// proposed description. Nothing here writes to the database; the caller returns the draft
// to the editor, where the owner accepts or discards each field. The prompt is ./ai-prompt.ts.

/**
 * The model. The strongest text model on the Workers AI JSON-mode list
 * (developers.cloudflare.com/workers-ai/features/json-mode) when this was written; its 24k
 * token window holds the prompt plus a README cut to PROMPT_README_MAX_CHARS.
 * Cheaper fallback from the same list: "@cf/meta/llama-3.1-8b-instruct".
 */
export const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const AI_TIMEOUT_MS = 45_000;
export const TAGLINE_MAX = 90;
export const SUMMARY_MAX = 300;
/** The prompt asks for 150 to 300 words; models count loosely, so this much is accepted. */
export const BODY_MIN_WORDS = 100;
export const BODY_MAX_WORDS = 400;
export const TECH_MAX = 8;
export const CAVEATS_MAX = 12;

export interface AiDraft {
  tagline: string;
  summary: string;
  body: string;
  tech: string[];
  suggestedGroup: ProjectGroup;
  suggestedStatus: ProjectStatus;
  caveats: string[];
}

export type AiErrorKind = "unavailable" | "rate-limit" | "timeout" | "malformed" | "upstream";

const MESSAGES: Record<AiErrorKind, string> = {
  unavailable:
    'The AI binding is unavailable. It is the "ai" binding named AI in apps/web/wrangler.jsonc; deploy with it, or run `pnpm dev` signed in to wrangler.',
  "rate-limit":
    "Workers AI is rate limited or out of capacity right now. Wait a minute and try again.",
  timeout: "The model took too long to answer. Try again.",
  malformed:
    "The model returned a draft that does not fit the expected shape, so it was discarded.",
  upstream: "The model call failed.",
};

export class AiDraftError extends Error {
  readonly kind: AiErrorKind;
  constructor(kind: AiErrorKind, detail?: string) {
    super(detail ? `${MESSAGES[kind]} (${detail})` : MESSAGES[kind]);
    this.name = "AiDraftError";
    this.kind = kind;
  }
}

/** `env.AI.run`, or a stand-in with the same shape. */
export type AiRunner = (model: string, input: Record<string, unknown>) => Promise<unknown>;

/** The JSON schema sent as `response_format`. validateDraft checks what a schema cannot. */
export const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tagline: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
    tech: { type: "array", items: { type: "string" } },
    suggestedGroup: { type: "string", enum: [...PROJECT_GROUPS] },
    suggestedStatus: { type: "string", enum: [...PROJECT_STATUSES] },
    caveats: { type: "array", items: { type: "string" } },
  },
  required: ["tagline", "summary", "body", "tech", "suggestedGroup", "suggestedStatus", "caveats"],
} as const;

export function buildRequest(detail: RepoDetail): Record<string, unknown> {
  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(detail) },
    ],
    response_format: { type: "json_schema", json_schema: DRAFT_SCHEMA },
    max_tokens: 1500,
    temperature: 0.3,
  };
}

function malformed(why: string): never {
  throw new AiDraftError("malformed", why);
}

function text(value: unknown, field: string, max: number, singleLine: boolean): string {
  if (typeof value !== "string") malformed(`${field} is not text`);
  const clean = (value as string).trim();
  if (!clean) malformed(`${field} is empty`);
  if (clean.length > max) malformed(`${field} is longer than ${max} characters`);
  if (singleLine && /[\r\n]/.test(clean)) malformed(`${field} has more than one line`);
  return clean;
}

function list(value: unknown, field: string, max: number, itemMax: number): string[] {
  if (!Array.isArray(value)) malformed(`${field} is not a list`);
  const items = value as unknown[];
  // Too many entries is not worth discarding a draft for: keep the first `max`.
  const seen = new Set<string>();
  for (const item of items.slice(0, max)) {
    const clean = text(item, `${field} entry`, itemMax, true);
    seen.add(clean);
  }
  return [...seen];
}

export function wordCount(markdown: string): number {
  return markdown.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Checks a model answer (an object, or JSON text) and returns the clean draft, or throws. */
export function validateDraft(raw: unknown): AiDraft {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      malformed("not JSON");
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    malformed("not an object");
  const o = value as Record<string, unknown>;
  const extra = Object.keys(o).filter((key) => !(key in DRAFT_SCHEMA.properties));
  if (extra.length) malformed(`unexpected field ${extra[0]}`);

  const body = text(o.body, "body", 6000, false);
  const words = wordCount(body);
  if (words < BODY_MIN_WORDS || words > BODY_MAX_WORDS) {
    malformed(`body is ${words} words, outside ${BODY_MIN_WORDS} to ${BODY_MAX_WORDS}`);
  }
  if (!(PROJECT_GROUPS as readonly unknown[]).includes(o.suggestedGroup)) {
    malformed("suggestedGroup is not a known group");
  }
  if (!(PROJECT_STATUSES as readonly unknown[]).includes(o.suggestedStatus)) {
    malformed("suggestedStatus is not a known status");
  }
  return {
    tagline: text(o.tagline, "tagline", TAGLINE_MAX, true),
    summary: text(o.summary, "summary", SUMMARY_MAX, true),
    body,
    tech: list(o.tech, "tech", TECH_MAX, 40),
    suggestedGroup: o.suggestedGroup as ProjectGroup,
    suggestedStatus: o.suggestedStatus as ProjectStatus,
    caveats: list(o.caveats, "caveats", CAVEATS_MAX, 400),
  };
}

/** Turns whatever the binding (or the stub) threw into one of the kinds the UI explains. */
export function mapAiError(error: unknown): AiDraftError {
  if (error instanceof AiDraftError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError" || /timed? ?out/i.test(message)) {
    return new AiDraftError("timeout");
  }
  if (/\b(429|529|3040)\b|rate.?limit|capacity|overload|too many requests/i.test(message)) {
    return new AiDraftError("rate-limit");
  }
  if (/\b(401|403|10000)\b|authentication|not logged in|binding/i.test(message)) {
    return new AiDraftError("unavailable", message.slice(0, 200));
  }
  return new AiDraftError("upstream", message.slice(0, 200));
}

/** The answer's payload: Workers AI puts it in `response`, as an object or as JSON text. */
function payloadOf(result: unknown): unknown {
  if (typeof result === "object" && result !== null && "response" in result) {
    return (result as { response: unknown }).response;
  }
  return result;
}

/** One model call. `run` is null when there is no binding. Throws AiDraftError only. */
export async function draftProject(
  run: AiRunner | null,
  detail: RepoDetail,
  options: { timeoutMs?: number; model?: string } = {},
): Promise<AiDraft> {
  if (!run) throw new AiDraftError("unavailable");
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AiDraftError("timeout")), timeoutMs);
  });
  let result: unknown;
  try {
    result = await Promise.race([run(options.model ?? AI_MODEL, buildRequest(detail)), timeout]);
  } catch (error) {
    throw mapAiError(error);
  } finally {
    clearTimeout(timer);
  }
  return validateDraft(payloadOf(result));
}

/** The stand-in for tests: POSTs the same input to a local server. Loopback http only. */
export function stubRunner(stubUrl: string, fetchImpl: typeof fetch = fetch): AiRunner | null {
  let url: URL;
  try {
    url = new URL(stubUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) return null;
  return async (model, input) => {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input }),
    });
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
    return response.json();
  };
}

/**
 * The runner for this request: the AI binding, unless the local dev bypass applies AND
 * AI_STUB_URL names a loopback server (the Playwright suite). `bypass` is the result of
 * `devBypassApplies`, so a deployed Worker can never be pointed at a stub.
 */
export function resolveRunner(
  vars: { AI?: { run: AiRunner } | undefined; AI_STUB_URL?: string | undefined },
  bypass: boolean,
): AiRunner | null {
  if (bypass && vars.AI_STUB_URL) {
    const stub = stubRunner(vars.AI_STUB_URL);
    if (stub) return stub;
  }
  const ai = vars.AI;
  return ai && typeof ai.run === "function" ? (model, input) => ai.run(model, input) : null;
}

// A short cooldown per project against accidental double clicks. Per isolate, in memory.
export const COOLDOWN_MS = 8_000;
const lastDraftAt = new Map<string, number>();

/** Seconds still to wait for this slug, or 0 (and the clock restarts). */
export function cooldownLeft(slug: string, now = Date.now()): number {
  const last = lastDraftAt.get(slug);
  if (last !== undefined && now - last < COOLDOWN_MS) {
    return Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
  }
  lastDraftAt.set(slug, now);
  return 0;
}

export function clearCooldowns(): void {
  lastDraftAt.clear();
}
