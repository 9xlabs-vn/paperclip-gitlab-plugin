import type { PluginContext } from "@paperclipai/plugin-sdk";

import { loadBindingsPayload, saveBindingsPayload } from "./gitlab-bindings.js";
import { gitLabApiJson, normalizeGitLabBaseUrl } from "./gitlab-http.js";
import { mergeGitLabPluginConfig, normalizeGitLabPluginConfig } from "./gitlab-plugin-config.js";
import { GITLAB_SETTINGS_SCOPE, loadResolvedGitLabPluginConfig } from "./gitlab-resolved-config.js";

function normalizeCompanyId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSecretRef(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface GitLabConnectorProjectMapping {
  id: string;
  paperclipProjectId: string;
  paperclipProjectName: string;
  gitlabPath: string;
  companyId?: string;
}

export interface GitLabTokenPermissionAuditProject {
  pathWithNamespace: string;
  status: "verified" | "missing_access" | "error";
  message?: string;
}

export interface GitLabTokenPermissionAuditSummary {
  status: "ready" | "missing_token" | "error";
  allProjectsReachable: boolean;
  projects: GitLabTokenPermissionAuditProject[];
  warnings: string[];
  message?: string;
}

function getConfiguredBoardRef(
  resolved: ReturnType<typeof normalizeGitLabPluginConfig>,
  companyId?: string,
): string | undefined {
  if (!companyId?.trim()) return undefined;
  const refs = resolved.paperclipBoardApiTokenRefs;
  if (!refs) return undefined;
  return normalizeSecretRef(refs[companyId]);
}

function hasBoardAccess(resolved: ReturnType<typeof normalizeGitLabPluginConfig>, companyId?: string): boolean {
  if (companyId) {
    return Boolean(getConfiguredBoardRef(resolved, companyId));
  }

  const refs = resolved.paperclipBoardApiTokenRefs;
  return Boolean(refs && Object.keys(refs).length > 0);
}

function isArchivedProject(project: { archivedAt?: unknown }): boolean {
  return typeof project.archivedAt === "string" && project.archivedAt.trim().length > 0;
}

async function validateGitLabToken(
  ctx: PluginContext,
  baseUrlRaw: string,
  token: string,
): Promise<{ username: string }> {
  const base = normalizeGitLabBaseUrl(baseUrlRaw);
  if (!base) {
    throw new Error("GitLab base URL is required to validate a token.");
  }

  const url = `${base}/api/v4/user`;
  const response = await ctx.http.fetch(url, {
    headers: {
      "PRIVATE-TOKEN": token.trim(),
    },
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "GitLab rejected this token. Check that it is valid and has API scope."
        : `GitLab returned HTTP ${response.status} for ${url}.`,
    );
  }

  const username =
    typeof parsed === "object"
    && parsed !== null
    && "username" in parsed
    && typeof (parsed as { username: unknown }).username === "string"
      ? (parsed as { username: string }).username
      : "unknown";

  return { username };
}

async function buildRegistrationPayload(ctx: PluginContext, input: Record<string, unknown>) {
  const requestedCompanyId = normalizeCompanyId(input.companyId);
  const resolved = await loadResolvedGitLabPluginConfig(ctx);
  const payload = await loadBindingsPayload(ctx);

  const rawSaved = await ctx.state.get(GITLAB_SETTINGS_SCOPE);
  const updatedAt =
    rawSaved && typeof rawSaved === "object" && typeof (rawSaved as { updatedAt?: unknown }).updatedAt === "string"
      ? (rawSaved as { updatedAt: string }).updatedAt
      : undefined;

  const mappings: GitLabConnectorProjectMapping[] = [];

  if (requestedCompanyId) {
    const projects = await ctx.projects.list({ companyId: requestedCompanyId });
    const activeProjects = projects.filter((project) => !isArchivedProject(project));
    const byId = new Map(activeProjects.map((project) => [project.id, project]));

    for (const [paperclipProjectId, binding] of Object.entries(payload.byPaperclipProjectId)) {
      const project = byId.get(paperclipProjectId);
      if (!project) continue;

      mappings.push({
        id: paperclipProjectId,
        paperclipProjectId,
        paperclipProjectName: project.name,
        gitlabPath: binding.pathWithNamespace,
        companyId: requestedCompanyId,
      });
    }
  } else {
    for (const [paperclipProjectId, binding] of Object.entries(payload.byPaperclipProjectId)) {
      mappings.push({
        id: paperclipProjectId,
        paperclipProjectId,
        paperclipProjectName: "",
        gitlabPath: binding.pathWithNamespace,
      });
    }
  }

  return {
    gitlabBaseUrl: resolved.gitlabBaseUrl,
    gitlabTokenRef: resolved.gitlabTokenRef,
    gitlabTokenConfigured: Boolean(resolved.gitlabTokenRef?.trim() && resolved.gitlabBaseUrl?.trim()),
    paperclipApiBaseUrl: resolved.paperclipApiBaseUrl,
    paperclipBoardAccessConfigured: hasBoardAccess(resolved, requestedCompanyId),
    mappings,
    updatedAt,
  };
}

async function buildTokenPermissionAudit(
  ctx: PluginContext,
  input: Record<string, unknown>,
): Promise<GitLabTokenPermissionAuditSummary> {
  const requestedCompanyId = normalizeCompanyId(input.companyId);
  if (!requestedCompanyId) {
    return {
      status: "ready",
      allProjectsReachable: true,
      projects: [],
      warnings: ["Open a company to audit GitLab project access for mapped Paperclip projects."],
    };
  }

  const resolved = await loadResolvedGitLabPluginConfig(ctx);
  if (!resolved.gitlabTokenRef?.trim() || !resolved.gitlabBaseUrl?.trim()) {
    return {
      status: "missing_token",
      allProjectsReachable: false,
      projects: [],
      warnings: [],
      message: "Save a GitLab base URL and token secret before auditing project access.",
    };
  }

  const payload = await loadBindingsPayload(ctx);
  const projects = await ctx.projects.list({ companyId: requestedCompanyId });
  const allowed = new Set(
    projects
      .filter((project) => !isArchivedProject(project))
      .map((project) => project.id),
  );

  const paths: string[] = [];
  for (const [paperclipProjectId, binding] of Object.entries(payload.byPaperclipProjectId)) {
    if (!allowed.has(paperclipProjectId)) continue;
    const path = binding.pathWithNamespace.trim();
    if (path) paths.push(path);
  }

  if (paths.length === 0) {
    return {
      status: "ready",
      allProjectsReachable: true,
      projects: [],
      warnings: ["Add at least one Paperclip project → GitLab path mapping for this company."],
    };
  }

  const projectsOut: GitLabTokenPermissionAuditProject[] = [];

  try {
    for (const pathWithNamespace of paths) {
      try {
        await gitLabApiJson<Record<string, unknown>>(
          ctx,
          "GET",
          `/projects/${encodeURIComponent(pathWithNamespace)}`,
        );
        projectsOut.push({ pathWithNamespace, status: "verified" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        projectsOut.push({
          pathWithNamespace,
          status: "missing_access",
          message: message.slice(0, 240),
        });
      }
    }

    const allProjectsReachable = projectsOut.length > 0 && projectsOut.every((entry) => entry.status === "verified");

    return {
      status: "ready",
      allProjectsReachable,
      projects: projectsOut,
      warnings: [],
    };
  } catch (error) {
    return {
      status: "error",
      allProjectsReachable: false,
      projects: [],
      warnings: [],
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function registerGitLabSettingsHandlers(ctx: PluginContext): void {
  ctx.data.register("settings.registration", async (input) => {
    const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
    return buildRegistrationPayload(ctx, record);
  });

  ctx.data.register("settings.tokenPermissionAudit", async (input) => {
    const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
    return buildTokenPermissionAudit(ctx, record);
  });

  ctx.actions.register("settings.saveRegistration", async (input) => {
    const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const companyId = normalizeCompanyId(record.companyId);

    const patch: Record<string, unknown> = {};
    if ("gitlabBaseUrl" in record) patch.gitlabBaseUrl = record.gitlabBaseUrl;
    if ("gitlabTokenRef" in record) patch.gitlabTokenRef = record.gitlabTokenRef;
    if ("paperclipApiBaseUrl" in record) patch.paperclipApiBaseUrl = record.paperclipApiBaseUrl;
    if ("paperclipBoardApiTokenRefs" in record) patch.paperclipBoardApiTokenRefs = record.paperclipBoardApiTokenRefs;

    const prevState = await ctx.state.get(GITLAB_SETTINGS_SCOPE);
    const nextSettings = mergeGitLabPluginConfig(prevState ?? {}, normalizeGitLabPluginConfig(patch));

    await ctx.state.set(GITLAB_SETTINGS_SCOPE, {
      ...nextSettings,
      updatedAt: new Date().toISOString(),
    });

    if (Array.isArray(record.mappings) && companyId) {
      const projects = await ctx.projects.list({ companyId });
      const allowed = new Set(
        projects
          .filter((project) => !isArchivedProject(project))
          .map((project) => project.id),
      );
      const payload = await loadBindingsPayload(ctx);
      const nextPayload = { ...payload };

      for (const projectId of allowed) {
        delete nextPayload.byPaperclipProjectId[projectId];
      }

      for (const row of record.mappings) {
        if (!row || typeof row !== "object") continue;
        const rec = row as Record<string, unknown>;
        const paperclipProjectId =
          typeof rec.paperclipProjectId === "string" ? rec.paperclipProjectId.trim() : "";
        const gitlabPath = typeof rec.gitlabPath === "string" ? rec.gitlabPath.trim() : "";
        if (!paperclipProjectId || !gitlabPath) continue;
        if (!allowed.has(paperclipProjectId)) continue;

        nextPayload.byPaperclipProjectId[paperclipProjectId] = {
          pathWithNamespace: gitlabPath,
        };
      }

      await saveBindingsPayload(ctx, nextPayload);
    }

    return buildRegistrationPayload(ctx, { companyId });
  });

  ctx.actions.register("settings.updateBoardAccess", async (input) => {
    const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const companyId = normalizeCompanyId(record.companyId);
    if (!companyId) {
      throw new Error("A company id is required to update Paperclip board access.");
    }

    const nextSecretRef = normalizeSecretRef(record.paperclipBoardApiTokenRef);
    const prevState = normalizeGitLabPluginConfig(await ctx.state.get(GITLAB_SETTINGS_SCOPE));
    const refs = { ...(prevState.paperclipBoardApiTokenRefs ?? {}) };

    if (nextSecretRef) {
      refs[companyId] = nextSecretRef;
    } else {
      delete refs[companyId];
    }

    const nextSettings = mergeGitLabPluginConfig(prevState, {
      paperclipBoardApiTokenRefs: refs,
    });

    await ctx.state.set(GITLAB_SETTINGS_SCOPE, {
      ...nextSettings,
      updatedAt: new Date().toISOString(),
    });

    return buildRegistrationPayload(ctx, { companyId });
  });

  ctx.actions.register("settings.listRepositoryBranches", async (input) => {
    const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const pathWithNamespace =
      typeof record.pathWithNamespace === "string" ? record.pathWithNamespace.trim() : "";
    if (!pathWithNamespace) {
      throw new Error("GitLab path is required to list branches.");
    }

    const rows = await gitLabApiJson<Array<{ name?: string }>>(
      ctx,
      "GET",
      `/projects/${encodeURIComponent(pathWithNamespace)}/repository/branches`,
      { query: { per_page: 100 } },
    );

    const names = Array.isArray(rows)
      ? rows.map((row) => (typeof row.name === "string" ? row.name : "")).filter(Boolean)
      : [];

    const rank = (name: string): number => {
      if (name === "main" || name === "master") return 0;
      return 1;
    };

    names.sort((a, b) => {
      const diff = rank(a) - rank(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

    return { branches: names };
  });

  ctx.actions.register("settings.validateToken", async (input) => {
    const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const token = typeof record.token === "string" ? record.token.trim() : "";
    const baseUrl =
      typeof record.gitlabBaseUrl === "string" && record.gitlabBaseUrl.trim()
        ? record.gitlabBaseUrl.trim()
        : (await loadResolvedGitLabPluginConfig(ctx)).gitlabBaseUrl ?? "";

    if (!token) {
      throw new Error("Enter a GitLab personal access token.");
    }

    return validateGitLabToken(ctx, baseUrl, token);
  });
}
