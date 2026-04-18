import type { PluginContext } from "@paperclipai/plugin-sdk";

import type { GitLabCloneUrls } from "./gitlab-clone-urls.js";
import { deriveCloneUrls } from "./gitlab-clone-urls.js";

export const BINDINGS_SCOPE = {
  scopeKind: "instance" as const,
  namespace: "gitlab",
  stateKey: "project-bindings-v1",
};

export interface SingleProjectBinding {
  /** GitLab path with namespace, e.g. engineering/team/myapp */
  pathWithNamespace: string;
}

export interface BindingsPayloadV1 {
  version: 1;
  /** Paperclip project UUID → GitLab mapping */
  byPaperclipProjectId: Record<string, SingleProjectBinding>;
}

export function emptyBindingsPayload(): BindingsPayloadV1 {
  return { version: 1, byPaperclipProjectId: {} };
}

export async function loadBindingsPayload(ctx: PluginContext): Promise<BindingsPayloadV1> {
  const raw = await ctx.state.get(BINDINGS_SCOPE);
  if (!raw || typeof raw !== "object") {
    return emptyBindingsPayload();
  }

  const record = raw as Record<string, unknown>;
  if (record.version !== 1 || typeof record.byPaperclipProjectId !== "object" || record.byPaperclipProjectId === null) {
    return emptyBindingsPayload();
  }

  const entries = Object.entries(record.byPaperclipProjectId as Record<string, unknown>);
  const byPaperclipProjectId: Record<string, SingleProjectBinding> = {};
  for (const [projectId, binding] of entries) {
    if (
      binding
      && typeof binding === "object"
      && typeof (binding as SingleProjectBinding).pathWithNamespace === "string"
    ) {
      const path = (binding as SingleProjectBinding).pathWithNamespace.trim();
      if (path && projectId.trim()) {
        byPaperclipProjectId[projectId.trim()] = { pathWithNamespace: path };
      }
    }
  }

  return { version: 1, byPaperclipProjectId };
}

export async function saveBindingsPayload(ctx: PluginContext, payload: BindingsPayloadV1): Promise<void> {
  await ctx.state.set(BINDINGS_SCOPE, payload);
}

/** Resolve GitLab path for a Paperclip project from stored bindings */
export async function resolveBoundGitLabPath(
  ctx: PluginContext,
  paperclipProjectId: string | undefined,
): Promise<string | null> {
  if (!paperclipProjectId?.trim()) return null;
  const payload = await loadBindingsPayload(ctx);
  const binding = payload.byPaperclipProjectId[paperclipProjectId.trim()];
  const path = binding?.pathWithNamespace?.trim();
  return path?.length ? path : null;
}

export interface BindingRow extends SingleProjectBinding {
  paperclipProjectId: string;
  projectName: string | null;
  urls: GitLabCloneUrls | null;
}
