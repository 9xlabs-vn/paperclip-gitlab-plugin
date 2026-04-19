/**
 * Instance plugin config normalization — mirrors GitHub Sync’s pattern for
 * Paperclip board tokens + trusted API origin, extended with GitLab fields.
 */

export type PluginConfigBoardTokenRefs = Record<string, string>;

export interface GitLabConnectorPluginConfig extends Record<string, unknown> {
  gitlabBaseUrl?: string;
  gitlabTokenRef?: string;
  /** Set when token validation succeeds; shown in settings summary and survives reload when merged into instance config. */
  lastGitLabApiIdentity?: string;
  paperclipBoardApiTokenRefs?: PluginConfigBoardTokenRefs;
  paperclipApiBaseUrl?: string;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizePaperclipApiBaseUrl(value: unknown): string | undefined {
  const normalizedValue = normalizeOptionalString(value);
  if (!normalizedValue) {
    return undefined;
  }

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return undefined;
  }
}

export function normalizePluginConfigBoardTokenRefs(value: unknown): PluginConfigBoardTokenRefs | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([companyId, secretRef]) => {
      const normalizedCompanyId = normalizeOptionalString(companyId);
      const normalizedSecretRef = normalizeOptionalString(secretRef);
      return normalizedCompanyId && normalizedSecretRef
        ? [normalizedCompanyId, normalizedSecretRef] as const
        : null;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export function normalizeGitLabPluginConfig(value: unknown): GitLabConnectorPluginConfig {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = { ...(value as Record<string, unknown>) };
  const gitlabBaseUrl = normalizeOptionalString(record.gitlabBaseUrl);
  const gitlabTokenRef = normalizeOptionalString(record.gitlabTokenRef);
  const lastGitLabApiIdentity =
    typeof record.lastGitLabApiIdentity === "string" && record.lastGitLabApiIdentity.trim()
      ? record.lastGitLabApiIdentity.trim()
      : undefined;
  const paperclipBoardApiTokenRefs = normalizePluginConfigBoardTokenRefs(record.paperclipBoardApiTokenRefs);
  const paperclipApiBaseUrl = normalizePaperclipApiBaseUrl(record.paperclipApiBaseUrl);

  const next: GitLabConnectorPluginConfig = {};

  if (gitlabBaseUrl) next.gitlabBaseUrl = gitlabBaseUrl;
  if (gitlabTokenRef) next.gitlabTokenRef = gitlabTokenRef;
  if (lastGitLabApiIdentity) next.lastGitLabApiIdentity = lastGitLabApiIdentity;
  if (paperclipBoardApiTokenRefs) next.paperclipBoardApiTokenRefs = paperclipBoardApiTokenRefs;
  if (paperclipApiBaseUrl) next.paperclipApiBaseUrl = paperclipApiBaseUrl;

  return next;
}

export function mergeGitLabPluginConfig(
  currentValue: unknown,
  patch: Partial<GitLabConnectorPluginConfig>,
): GitLabConnectorPluginConfig {
  const a = normalizeGitLabPluginConfig(currentValue);
  const b = patch;
  const current = a;
  const currentBoardTokenRefs = normalizePluginConfigBoardTokenRefs(current.paperclipBoardApiTokenRefs);
  const patchBoardTokenRefs = normalizePluginConfigBoardTokenRefs(patch.paperclipBoardApiTokenRefs);
  const merged = normalizeGitLabPluginConfig({
    ...current,
    ...patch,
  });

  const identity =
    typeof b.lastGitLabApiIdentity === "string"
      ? b.lastGitLabApiIdentity.trim() || undefined
      : merged.lastGitLabApiIdentity?.trim()
        ? merged.lastGitLabApiIdentity.trim()
        : a.lastGitLabApiIdentity?.trim()
          ? a.lastGitLabApiIdentity.trim()
          : undefined;

  const next = normalizeGitLabPluginConfig({
    ...merged,
    lastGitLabApiIdentity: identity,
  });

  if ("paperclipBoardApiTokenRefs" in patch) {
    const mergedBoardTokenRefs = {
      ...(currentBoardTokenRefs ?? {}),
      ...(patchBoardTokenRefs ?? {}),
    };

    if (Object.keys(mergedBoardTokenRefs).length > 0) {
      next.paperclipBoardApiTokenRefs = mergedBoardTokenRefs;
    } else {
      delete next.paperclipBoardApiTokenRefs;
    }
  } else if (currentBoardTokenRefs) {
    next.paperclipBoardApiTokenRefs = currentBoardTokenRefs;
  }

  return next;
}
