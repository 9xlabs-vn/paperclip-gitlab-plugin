import type { PluginContext } from "@paperclipai/plugin-sdk";

import { loadResolvedGitLabPluginConfig } from "./gitlab-resolved-config.js";

export function normalizeGitLabBaseUrl(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

export async function requireGitLabConfig(ctx: PluginContext): Promise<{
  baseUrl: string;
  token: string;
}> {
  const config = await loadResolvedGitLabPluginConfig(ctx);
  const baseUrl = normalizeGitLabBaseUrl(config.gitlabBaseUrl);
  if (!baseUrl) {
    throw new Error(
      "Configure gitlabBaseUrl in Paperclip → Settings → Plugins → GitLab Connector (include scheme, e.g. https://gitlab.example.com).",
    );
  }

  const tokenRef =
    typeof config.gitlabTokenRef === "string" ? config.gitlabTokenRef.trim() : "";
  if (!tokenRef) {
    throw new Error(
      "Configure gitlabTokenRef to a Paperclip secret reference that holds your GitLab personal access token or bot token.",
    );
  }

  const token = await ctx.secrets.resolve(tokenRef);
  return { baseUrl, token };
}

/** GitLab REST path under /api/v4 (leading slash optional). */
export async function gitLabApiJson<T>(
  ctx: PluginContext,
  method: string,
  apiPath: string,
  init?: { query?: Record<string, string | number | undefined>; body?: unknown },
): Promise<T> {
  const { baseUrl, token } = await requireGitLabConfig(ctx);
  const pathPart = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const search = new URLSearchParams();
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value === undefined) continue;
      search.set(key, String(value));
    }
  }

  const qs = search.toString();
  const url = `${baseUrl}/api/v4${pathPart}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = {
    "PRIVATE-TOKEN": token,
  };

  let body: string | undefined;
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  const response = await ctx.http.fetch(url, { method, headers, body });
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed !== null && "message" in parsed
        ? JSON.stringify((parsed as { message: unknown }).message)
        : text.slice(0, 500);
    throw new Error(`GitLab API ${response.status}: ${message}`);
  }

  return parsed as T;
}
