import { normalizePaperclipHealthResponse, type PaperclipHealthResponse } from "../paperclip-health.js";

import { mergeGitLabPluginConfig, normalizeGitLabPluginConfig } from "../gitlab-plugin-config.js";

const JSON_CONTENT_TYPE_PATTERN = /\b(?:application\/json|[^;\s]+\/[^;\s]+\+json)\b/i;
const HTML_LIKE_RESPONSE_PATTERN = /^\s*</;
const MAX_RESPONSE_PREVIEW_LENGTH = 160;

function resolveBrowserOrigin(): string | null {
  if (typeof window === "undefined" || typeof window.location?.origin !== "string") {
    return null;
  }

  const origin = window.location.origin.trim();
  return origin ? origin : null;
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }

  return JSON_CONTENT_TYPE_PATTERN.test(contentType);
}

function describeResponseContentType(contentType: string | null): string {
  if (!contentType) {
    return "an unknown content type";
  }

  const [normalized] = contentType.split(";", 1);
  return normalized?.trim().toLowerCase() || "an unknown content type";
}

function summarizeResponseBody(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= MAX_RESPONSE_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_RESPONSE_PREVIEW_LENGTH - 1)}...`;
}

function describeResponseLocation(url?: string): string {
  if (!url) {
    return "the requested endpoint";
  }

  try {
    const resolved = new URL(url, "https://paperclip.invalid");
    return `${resolved.pathname}${resolved.search}` || resolved.toString();
  } catch {
    return url;
  }
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const candidates = [record.message, record.error, record.detail, record.details];

  if (record.error && typeof record.error === "object") {
    const nestedError = record.error as Record<string, unknown>;
    candidates.push(nestedError.message, nestedError.detail);
  }

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function buildPaperclipUrl(pathOrUrl: string, origin?: string): string | null {
  const trimmed = typeof pathOrUrl === "string" ? pathOrUrl.trim() : "";
  if (!trimmed) {
    return null;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  const resolvedOrigin = origin ?? resolveBrowserOrigin();
  if (!resolvedOrigin) {
    return null;
  }

  return new URL(trimmed, resolvedOrigin).toString();
}

export function resolveCliAuthUrl(url?: string, path?: string): string | null {
  if (typeof url === "string" && url.trim()) {
    return buildPaperclipUrl(url.trim());
  }

  if (typeof path !== "string" || !path.trim()) {
    return null;
  }

  return buildPaperclipUrl(path.trim());
}

export function resolveCliAuthPollUrl(pollUrlOrPath?: string, origin?: string): string | null {
  const trimmed = typeof pollUrlOrPath === "string" ? pollUrlOrPath.trim() : "";
  if (!trimmed) {
    return null;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/api/")
    ? trimmed
    : `/api${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;

  return buildPaperclipUrl(normalizedPath, origin);
}

export async function readPaperclipJsonResponse<T>(response: Response, requestUrl?: string): Promise<T> {
  const responseText = await response.text();

  if (!responseText) {
    if (!response.ok) {
      throw new Error(`Paperclip API ${response.status}: ${response.statusText || "Request failed."}`);
    }

    return null as T;
  }

  const contentType = response.headers.get("content-type");
  const responseLocation = describeResponseLocation(response.url || requestUrl);
  const responsePreview = summarizeResponseBody(responseText);

  if (!isJsonContentType(contentType)) {
    const htmlHint =
      responsePreview && HTML_LIKE_RESPONSE_PATTERN.test(responsePreview)
        ? " This usually means Paperclip served a sign-in page or app shell instead of the API endpoint."
        : "";
    const previewHint = responsePreview ? ` Response preview: ${responsePreview}` : "";

    throw new Error(
      `Paperclip API ${response.status} returned ${describeResponseContentType(contentType)} instead of JSON from ${responseLocation}.${htmlHint}${previewHint}`,
    );
  }

  let body: unknown = null;

  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(`Paperclip API ${response.status} returned invalid JSON from ${responseLocation}.`);
  }

  if (!response.ok) {
    const message = extractErrorMessage(body) ?? responsePreview ?? response.statusText ?? "Request failed.";
    throw new Error(`Paperclip API ${response.status}: ${message}`);
  }

  return body as T;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");

  if (typeof init?.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init?.credentials ?? "same-origin",
  });

  return readPaperclipJsonResponse<T>(response, url);
}

export async function fetchPaperclipHealth(origin?: string): Promise<PaperclipHealthResponse | null> {
  const url = buildPaperclipUrl("/api/health", origin);
  if (!url) {
    return null;
  }

  try {
    return normalizePaperclipHealthResponse(await fetchJson<unknown>(url));
  } catch {
    return null;
  }
}

export async function patchPluginConfig(pluginId: string, patch: Record<string, unknown>): Promise<void> {
  const currentResponse = await fetchJson<{ configJson?: Record<string, unknown> } | null>(
    `/api/plugins/${pluginId}/config`,
  );
  const currentConfig = normalizeGitLabPluginConfig(currentResponse?.configJson ?? {});
  const nextConfig = mergeGitLabPluginConfig(currentConfig, normalizeGitLabPluginConfig(patch));

  if (JSON.stringify(nextConfig) === JSON.stringify(currentConfig)) {
    return;
  }

  await fetchJson(`/api/plugins/${pluginId}/config`, {
    method: "POST",
    body: JSON.stringify({
      configJson: nextConfig,
    }),
  });
}
