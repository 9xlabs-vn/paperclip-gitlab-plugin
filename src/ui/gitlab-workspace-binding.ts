import { deriveCloneUrls } from "../gitlab-clone-urls.js";

import { fetchJson } from "./gitlab-settings-http.js";

export interface ProjectWorkspaceSummary {
  id: string;
  name: string | null;
  repoUrl: string | null;
  sourceType: string | null;
  isPrimary: boolean;
  defaultRef: string | null;
  repoRef: string | null;
}

/** Lists Paperclip execution workspaces for a project (same shape as GitHub Sync). */
export async function listProjectWorkspaces(projectId: string): Promise<ProjectWorkspaceSummary[]> {
  const response = await fetchJson<unknown>(`/api/projects/${projectId}/workspaces`);
  if (!Array.isArray(response)) {
    throw new Error(`Unexpected project workspaces response for project ${projectId}: expected an array.`);
  }

  const workspaces: ProjectWorkspaceSummary[] = [];
  for (const entry of response) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    if (!id) {
      continue;
    }

    workspaces.push({
      id,
      name: typeof record.name === "string" ? record.name : null,
      repoUrl: typeof record.repoUrl === "string" ? record.repoUrl : null,
      sourceType: typeof record.sourceType === "string" ? record.sourceType : null,
      isPrimary: record.isPrimary === true,
      defaultRef: typeof record.defaultRef === "string" ? record.defaultRef : null,
      repoRef: typeof record.repoRef === "string" ? record.repoRef : null,
    });
  }

  return workspaces;
}

/** Compare clone URLs regardless of trailing slash or optional `.git` suffix. */
/**
 * Picks the git workspace row created by the connector (matching HTTPS clone URL for the GitLab path).
 */
export function findGitLabBoundWorkspace(
  workspaces: ProjectWorkspaceSummary[],
  gitlabBaseUrl: string,
  pathWithNamespace: string,
): ProjectWorkspaceSummary | null {
  const urls = deriveCloneUrls(gitlabBaseUrl, pathWithNamespace);
  if (!urls) {
    return null;
  }

  const targetNorm = normalizeGitRepoUrlForComparison(urls.httpCloneUrl);
  const matches = workspaces.filter((workspace) => {
    if (typeof workspace.repoUrl !== "string" || !workspace.repoUrl.trim()) {
      return false;
    }
    return normalizeGitRepoUrlForComparison(workspace.repoUrl) === targetNorm;
  });

  if (matches.length === 0) {
    return null;
  }

  const primary = matches.find((workspace) => workspace.isPrimary);
  return primary ?? matches[0] ?? null;
}

export function normalizeGitRepoUrlForComparison(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const u = new URL(trimmed);
    const path = u.pathname.replace(/\/+$/, "").replace(/\.git$/i, "");
    return `${u.origin.toLowerCase()}${path}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

/**
 * Ensures the Paperclip project has a primary `git_repo` workspace pointing at the GitLab HTTPS clone URL.
 * Mirrors GitHub Sync's `ensureProjectRepoBinding` (POST `/api/projects/:id/workspaces`).
 */
export async function ensureProjectGitLabRepoBinding(
  projectId: string,
  gitlabBaseUrl: string,
  pathWithNamespace: string,
): Promise<void> {
  const urls = deriveCloneUrls(gitlabBaseUrl, pathWithNamespace);
  if (!urls) {
    throw new Error(`Cannot derive GitLab HTTPS URL for path "${pathWithNamespace}".`);
  }

  const normalizedRepositoryUrl = urls.httpCloneUrl;

  try {
    const workspaces = await listProjectWorkspaces(projectId);
    const targetNorm = normalizeGitRepoUrlForComparison(normalizedRepositoryUrl);
    const alreadyBound = workspaces.some((workspace) => {
      if (typeof workspace.repoUrl !== "string" || !workspace.repoUrl.trim()) {
        return false;
      }
      return normalizeGitRepoUrlForComparison(workspace.repoUrl) === targetNorm;
    });

    if (alreadyBound) {
      return;
    }
  } catch {
    // Fall back to attempting the create call when workspace listing is unavailable.
  }

  await fetchJson(`/api/projects/${projectId}/workspaces`, {
    method: "POST",
    body: JSON.stringify({
      repoUrl: normalizedRepositoryUrl,
      sourceType: "git_repo",
      isPrimary: true,
    }),
  });
}
