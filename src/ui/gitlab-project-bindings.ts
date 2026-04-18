import { deriveCloneUrls, httpOriginFromGitLabBase, sshHostFromHttpBase } from "../gitlab-clone-urls.js";

import { listProjectWorkspaces, normalizeGitRepoUrlForComparison } from "./gitlab-workspace-binding.js";
import { listCompanyProjects } from "./gitlab-settings-projects.js";

export interface CompanyProjectSummary {
  id: string;
  name: string;
  archivedAt?: string | null;
}

export interface ProjectWorkspaceSummary {
  repoUrl?: string | null;
  sourceType?: string | null;
  isPrimary?: boolean | null;
}

export interface GitLabWorkspaceCandidate {
  projectId: string;
  projectName: string;
  /** Canonical HTTPS `.git` URL used for workspace comparison */
  repositoryUrl: string;
  gitlabPath: string;
  sourceType?: string;
  isPrimary: boolean;
}

function decodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export function parseGitLabPathFromRepoUrl(repoUrl: string, gitlabBaseUrl: string): string | null {
  const trimmed = repoUrl.trim();
  if (!trimmed) {
    return null;
  }

  const fromHttps = parseGitLabPathFromHttpsRepoUrl(trimmed, gitlabBaseUrl);
  if (fromHttps) {
    return fromHttps;
  }

  return parseGitLabPathFromSshRepoUrl(trimmed, gitlabBaseUrl);
}

function parseGitLabPathFromHttpsRepoUrl(repoUrl: string, gitlabBaseUrl: string): string | null {
  const baseOrigin = httpOriginFromGitLabBase(gitlabBaseUrl);
  if (!baseOrigin) {
    return null;
  }

  let repo: URL;
  try {
    repo = new URL(repoUrl);
  } catch {
    return null;
  }

  const base = new URL(baseOrigin.endsWith("/") ? baseOrigin : `${baseOrigin}/`);
  if (repo.origin !== base.origin) {
    return null;
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  let path = repo.pathname.replace(/\/+$/, "").replace(/\.git$/i, "");
  if (basePath) {
    if (!path.startsWith(basePath)) {
      return null;
    }
    path = path.slice(basePath.length).replace(/^\/+/, "");
  } else {
    path = path.replace(/^\/+/, "");
  }

  if (!path) {
    return null;
  }

  return decodePathSegments(path);
}

function parseGitLabPathFromSshRepoUrl(repoUrl: string, gitlabBaseUrl: string): string | null {
  const sshHost = sshHostFromHttpBase(gitlabBaseUrl);
  if (!sshHost) {
    return null;
  }

  const match = repoUrl.trim().match(/^git@([^:]+):(.+)$/i);
  if (!match) {
    return null;
  }

  if (match[1].toLowerCase() !== sshHost.toLowerCase()) {
    return null;
  }

  let path = match[2].trim().replace(/\.git$/i, "");
  path = path.replace(/^\/+|\/+$/g, "");
  return path ? decodePathSegments(path) : null;
}

export function normalizeGitLabPathInput(raw: string, gitlabBaseUrl: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || t.startsWith("git@")) {
    return parseGitLabPathFromRepoUrl(t, gitlabBaseUrl) ?? t.replace(/^\/+|\/+$/g, "");
  }

  return t.replace(/^\/+|\/+$/g, "");
}

/**
 * Derives a Paperclip project name hint from pasted Git URL or `namespace/project` input
 * (last path segment, URL-decoded). Does not depend on configured GitLab base URL.
 */
export function suggestedPaperclipProjectNameFromGitLabRepositoryInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let pathNs = "";

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      pathNs = u.pathname.replace(/\/+$/, "").replace(/\.git$/i, "").replace(/^\/+/, "");
    } catch {
      return null;
    }
  } else if (trimmed.startsWith("git@")) {
    const match = trimmed.match(/^git@[^:]+:(.+)$/i);
    if (match?.[1]) {
      pathNs = match[1].trim().replace(/\.git$/i, "");
    }
  } else {
    pathNs = trimmed.replace(/^\/+|\/+$/g, "");
  }

  const segments = pathNs.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) {
    return null;
  }

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function discoverGitLabWorkspaceCandidates(params: {
  projects: CompanyProjectSummary[];
  workspacesByProjectId: Record<string, ProjectWorkspaceSummary[] | undefined>;
  gitlabBaseUrl: string;
}): GitLabWorkspaceCandidate[] {
  const discovered = new Map<string, GitLabWorkspaceCandidate>();
  const base = params.gitlabBaseUrl.trim();
  if (!base) {
    return [];
  }

  for (const project of params.projects) {
    const projectId = project.id.trim();
    const projectName = project.name.trim();
    const archivedAt = typeof project.archivedAt === "string" ? project.archivedAt.trim() : "";
    if (!projectId || !projectName) {
      continue;
    }
    if (archivedAt) {
      // Archived projects should not be suggested as new connector candidates.
      continue;
    }

    const workspaces = params.workspacesByProjectId[projectId] ?? [];
    for (const workspace of workspaces) {
      const repoUrl = typeof workspace.repoUrl === "string" ? workspace.repoUrl.trim() : "";
      if (!repoUrl) {
        continue;
      }

      const gitlabPath = parseGitLabPathFromRepoUrl(repoUrl, base);
      if (!gitlabPath) {
        continue;
      }

      const urls = deriveCloneUrls(base, gitlabPath);
      const repositoryUrl = urls?.httpCloneUrl ?? repoUrl;
      const key = `${projectId}:${gitlabPath}`;
      const sourceType =
        typeof workspace.sourceType === "string" && workspace.sourceType.trim()
          ? workspace.sourceType.trim()
          : undefined;
      const isPrimary = workspace.isPrimary === true;

      const existing = discovered.get(key);
      if (existing) {
        discovered.set(key, {
          ...existing,
          sourceType: existing.sourceType ?? sourceType,
          isPrimary: existing.isPrimary || isPrimary,
        });
      } else {
        discovered.set(key, {
          projectId,
          projectName,
          repositoryUrl,
          gitlabPath,
          sourceType,
          isPrimary,
        });
      }
    }
  }

  return [...discovered.values()].sort((left, right) => {
    const byName = left.projectName.localeCompare(right.projectName, undefined, { sensitivity: "base" });
    if (byName !== 0) {
      return byName;
    }
    return left.gitlabPath.localeCompare(right.gitlabPath);
  });
}

export function filterGitLabWorkspaceCandidates(
  candidates: GitLabWorkspaceCandidate[],
  mappings: Array<{ paperclipProjectId?: string; gitlabPath?: string }>,
  gitlabBaseUrl: string,
): GitLabWorkspaceCandidate[] {
  const mappedProjectIds = new Set(
    mappings.map((mapping) => mapping.paperclipProjectId?.trim()).filter((value): value is string => Boolean(value)),
  );
  const mappedPaths = new Set(
    mappings.map((mapping) => mapping.gitlabPath?.trim()).filter((value): value is string => Boolean(value)),
  );

  const mappedRepoNorms = new Set<string>();
  for (const mapping of mappings) {
    const path = mapping.gitlabPath?.trim();
    if (!path) {
      continue;
    }
    const urls = deriveCloneUrls(gitlabBaseUrl, path);
    if (urls) {
      mappedRepoNorms.add(normalizeGitRepoUrlForComparison(urls.httpCloneUrl));
    }
  }

  return candidates.filter((candidate) => {
    if (mappedProjectIds.has(candidate.projectId)) {
      return false;
    }
    if (mappedPaths.has(candidate.gitlabPath)) {
      return false;
    }
    if (mappedRepoNorms.has(normalizeGitRepoUrlForComparison(candidate.repositoryUrl))) {
      return false;
    }
    return true;
  });
}

export async function loadGitLabWorkspaceCandidates(
  companyId: string,
  gitlabBaseUrl: string,
): Promise<GitLabWorkspaceCandidate[]> {
  const projects = await listCompanyProjects(companyId);
  const workspacesByProjectId = Object.fromEntries(
    await Promise.all(
      projects.map(async (project): Promise<[string, ProjectWorkspaceSummary[]]> => [
        project.id,
        await listProjectWorkspaces(project.id),
      ]),
    ),
  ) as Record<string, ProjectWorkspaceSummary[]>;

  return discoverGitLabWorkspaceCandidates({
    projects,
    workspacesByProjectId,
    gitlabBaseUrl,
  });
}
