import {
  definePlugin,
  runWorker,
  type PluginContext,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";

import {
  loadBindingsPayload,
  resolveBoundGitLabPath,
  saveBindingsPayload,
  type BindingRow,
} from "./gitlab-bindings.js";
import { getGitLabAgentToolDeclaration } from "./gitlab-agent-tools.js";
import { deriveCloneUrls } from "./gitlab-clone-urls.js";
import { normalizeGitLabBaseUrl } from "./gitlab-http.js";
import { gitLabApiJson } from "./gitlab-http.js";
import { registerGitLabSettingsHandlers } from "./gitlab-settings-handlers.js";
import { loadResolvedGitLabPluginConfig } from "./gitlab-resolved-config.js";

function toolSuccess(content: string, data?: unknown): ToolResult {
  return data !== undefined ? { content, data } : { content };
}

function toolFromError(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { error: message, content: message };
}

function readStringParam(params: unknown, key: string): string | undefined {
  if (!params || typeof params !== "object") return undefined;
  const value = (params as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

async function resolveProjectPathOrExplain(
  ctx: PluginContext,
  params: unknown,
  runCtx: ToolRunContext,
): Promise<string | null> {
  const explicit = readStringParam(params, "projectPath")?.trim();
  if (explicit) return explicit;

  const bound = await resolveBoundGitLabPath(ctx, runCtx.projectId);
  if (bound) return bound;

  return null;
}

function registerGitLabTools(ctx: PluginContext): void {
  ctx.tools.register(
    "ping_gitlab",
    getGitLabAgentToolDeclaration("ping_gitlab"),
    async () => {
      try {
        const version = await gitLabApiJson<Record<string, unknown>>(ctx, "GET", "/version");
        const rev = typeof version.revision === "string" ? version.revision : undefined;
        const ver = typeof version.version === "string" ? version.version : JSON.stringify(version);
        return toolSuccess(`GitLab API reachable. Version ${ver}${rev ? ` (${rev})` : ""}.`, {
          version,
        });
      } catch (error) {
        return toolFromError(error);
      }
    },
  );

  ctx.tools.register(
    "get_git_access_info",
    getGitLabAgentToolDeclaration("get_git_access_info"),
    async (params, runCtx) => {
      try {
        const requestedId = readStringParam(params, "paperclipProjectId")?.trim();
        const projectId = requestedId || runCtx.projectId;
        if (!projectId) {
          return toolFromError(
            new Error(
              "No Paperclip project in context. Pass paperclipProjectId or run this tool from a project-scoped agent run.",
            ),
          );
        }

        const payload = await loadBindingsPayload(ctx);
        const binding = payload.byPaperclipProjectId[projectId];
        if (!binding?.pathWithNamespace?.trim()) {
          return toolFromError(
            new Error(
              `No GitLab binding for Paperclip project ${projectId}. Configure it in Settings → Plugins → GitLab Connector (project bindings).`,
            ),
          );
        }

        const config = await loadResolvedGitLabPluginConfig(ctx);
        const baseUrl = normalizeGitLabBaseUrl(config.gitlabBaseUrl);
        const urls = baseUrl ? deriveCloneUrls(baseUrl, binding.pathWithNamespace) : null;

        const contentLines = [
          `Paperclip project: ${projectId}`,
          `GitLab path: ${binding.pathWithNamespace}`,
          urls?.httpCloneUrl ? `HTTPS clone: ${urls.httpCloneUrl}` : null,
          urls?.sshCloneUrl ? `SSH clone: ${urls.sshCloneUrl}` : null,
          urls?.webProjectUrl ? `Web: ${urls.webProjectUrl}` : null,
          "",
          "Access: GitLab REST API uses gitlabTokenRef (PAT) from plugin settings — never embed that token in git URLs.",
          "Git clone/push: use SSH keys or HTTPS credentials on the execution workspace host (deploy keys / user SSH), not the API token.",
        ].filter((line) => line !== null);

        return toolSuccess(contentLines.join("\n"), {
          paperclipProjectId: projectId,
          pathWithNamespace: binding.pathWithNamespace,
          cloneUrls: urls,
          accessNotes: {
            api:
              "Use the configured GitLab token secret only for HTTP API calls (this plugin). Do not use it as a git password unless your operator explicitly configures credential helpers.",
            git: "Clone and push from the agent workspace using SSH or Git credential setup on that machine.",
          },
        });
      } catch (error) {
        return toolFromError(error);
      }
    },
  );

  ctx.tools.register(
    "list_merge_requests",
    getGitLabAgentToolDeclaration("list_merge_requests"),
    async (params, runCtx) => {
      try {
        const projectPath = await resolveProjectPathOrExplain(ctx, params, runCtx);
        if (!projectPath) {
          return toolFromError(
            new Error(
              "Missing GitLab project: pass projectPath (group/repo) or map this Paperclip project in GitLab Connector settings.",
            ),
          );
        }

        const stateRaw = readStringParam(params, "state");
        const state =
          stateRaw === "opened"
          || stateRaw === "closed"
          || stateRaw === "locked"
          || stateRaw === "merged"
          || stateRaw === "all"
            ? stateRaw
            : "opened";

        const perPageRaw = (params as Record<string, unknown>).perPage;
        const perPage =
          typeof perPageRaw === "number" && Number.isFinite(perPageRaw)
            ? Math.min(100, Math.max(1, Math.floor(perPageRaw)))
            : 20;

        const encoded = encodeURIComponent(projectPath);
        const items = await gitLabApiJson<unknown[]>(ctx, "GET", `/projects/${encoded}/merge_requests`, {
          query: { state, per_page: perPage },
        });

        return toolSuccess(
          `Listed ${Array.isArray(items) ? items.length : 0} merge request(s) for ${projectPath} (state=${state}).`,
          { projectPath, state, items },
        );
      } catch (error) {
        return toolFromError(error);
      }
    },
  );

  ctx.tools.register(
    "create_merge_request",
    getGitLabAgentToolDeclaration("create_merge_request"),
    async (params, runCtx) => {
      try {
        const projectPath = await resolveProjectPathOrExplain(ctx, params, runCtx);
        const title = readStringParam(params, "title")?.trim();
        const sourceBranch = readStringParam(params, "source_branch")?.trim();
        const targetBranch = readStringParam(params, "target_branch")?.trim();
        const description = readStringParam(params, "description");

        if (!projectPath) {
          return toolFromError(
            new Error(
              "Missing GitLab project: pass projectPath or map this Paperclip project in GitLab Connector settings.",
            ),
          );
        }

        if (!title || !sourceBranch || !targetBranch) {
          return toolFromError(
            new Error("title, source_branch, and target_branch are required."),
          );
        }

        const encoded = encodeURIComponent(projectPath);
        const mr = await gitLabApiJson<Record<string, unknown>>(ctx, "POST", `/projects/${encoded}/merge_requests`, {
          body: {
            title,
            source_branch: sourceBranch,
            target_branch: targetBranch,
            ...(description !== undefined ? { description } : {}),
          },
        });

        const webUrl = typeof mr.web_url === "string" ? mr.web_url : undefined;
        return toolSuccess(
          webUrl ? `Created merge request: ${webUrl}` : "Created merge request.",
          { mergeRequest: mr },
        );
      } catch (error) {
        return toolFromError(error);
      }
    },
  );
}

function registerGitLabDataAndActions(ctx: PluginContext): void {
  ctx.data.register("gitlab-bindings", async (params) => {
    const companyId =
      typeof params.companyId === "string" && params.companyId.trim() ? params.companyId.trim() : null;
    const config = await loadResolvedGitLabPluginConfig(ctx);
    const baseUrl = normalizeGitLabBaseUrl(config.gitlabBaseUrl);
    const payload = await loadBindingsPayload(ctx);

    const projectNameById: Record<string, string> = {};
    if (companyId) {
      const projects = await ctx.projects.list({ companyId });
      for (const project of projects) {
        projectNameById[project.id] = project.name;
      }
    }

    const rows: BindingRow[] = [];
    for (const [paperclipProjectId, binding] of Object.entries(payload.byPaperclipProjectId)) {
      const urls = baseUrl ? deriveCloneUrls(baseUrl, binding.pathWithNamespace) : null;
      rows.push({
        paperclipProjectId,
        pathWithNamespace: binding.pathWithNamespace,
        projectName: projectNameById[paperclipProjectId] ?? null,
        urls,
      });
    }

    rows.sort((left, right) => left.pathWithNamespace.localeCompare(right.pathWithNamespace));

    return {
      gitlabBaseUrlConfigured: Boolean(baseUrl),
      bindings: rows,
    };
  });

  ctx.actions.register("gitlab-binding-save", async (params) => {
    const paperclipProjectId =
      typeof params.paperclipProjectId === "string" ? params.paperclipProjectId.trim() : "";
    const pathWithNamespace =
      typeof params.pathWithNamespace === "string" ? params.pathWithNamespace.trim() : "";
    if (!paperclipProjectId || !pathWithNamespace) {
      throw new Error("paperclipProjectId and pathWithNamespace are required.");
    }

    const payload = await loadBindingsPayload(ctx);
    payload.byPaperclipProjectId[paperclipProjectId] = { pathWithNamespace };
    await saveBindingsPayload(ctx, payload);
    return { ok: true as const };
  });

  ctx.actions.register("gitlab-binding-remove", async (params) => {
    const paperclipProjectId =
      typeof params.paperclipProjectId === "string" ? params.paperclipProjectId.trim() : "";
    if (!paperclipProjectId) {
      throw new Error("paperclipProjectId is required.");
    }

    const payload = await loadBindingsPayload(ctx);
    delete payload.byPaperclipProjectId[paperclipProjectId];
    await saveBindingsPayload(ctx, payload);
    return { ok: true as const };
  });
}

const plugin = definePlugin({
  async setup(ctx) {
    registerGitLabTools(ctx);
    registerGitLabDataAndActions(ctx);
    registerGitLabSettingsHandlers(ctx);
  },

  async onHealth() {
    return { status: "ok", message: "GitLab Connector worker is running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
