/**
 * Derive clone and browse URLs from configured GitLab base URL + project path.
 * Git operations over SSH use the host derived from HTTPS origin (GitLab convention).
 */

export interface GitLabCloneUrls {
  /** Typical HTTPS clone URL (.git suffix). */
  httpCloneUrl: string;
  /** Typical SSH clone URL — requires SSH key / deploy key on the workspace host. */
  sshCloneUrl: string;
  /** Browser URL for the GitLab project (no .git). */
  webProjectUrl: string;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Hostname only, suitable for SSH `git@host:`. */
export function sshHostFromHttpBase(gitlabBaseUrl: string): string | null {
  try {
    const trimmed = gitlabBaseUrl.trim();
    if (!trimmed) return null;
    const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

/** HTTP(S) origin without trailing slash (scheme + host + optional port/path prefix). */
export function httpOriginFromGitLabBase(gitlabBaseUrl: string): string | null {
  try {
    const trimmed = gitlabBaseUrl.trim();
    if (!trimmed) return null;
    const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    const origin =
      `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname.replace(/\/+$/, "")}`;
    return trimTrailingSlash(origin);
  } catch {
    return null;
  }
}

export function deriveCloneUrls(gitlabBaseUrl: string, pathWithNamespace: string): GitLabCloneUrls | null {
  const normalizedPath = pathWithNamespace.trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedPath) return null;

  const origin = httpOriginFromGitLabBase(gitlabBaseUrl);
  const sshHost = sshHostFromHttpBase(gitlabBaseUrl);
  if (!origin || !sshHost) return null;

  const encodedPathSegments = normalizedPath.split("/").map((segment) => encodeURIComponent(segment)).join("/");

  const httpCloneUrl = `${origin}/${encodedPathSegments}.git`;
  const webProjectUrl = `${origin}/${encodedPathSegments}`;
  const sshCloneUrl = `git@${sshHost}:${normalizedPath}.git`;

  return {
    httpCloneUrl,
    sshCloneUrl,
    webProjectUrl,
  };
}
