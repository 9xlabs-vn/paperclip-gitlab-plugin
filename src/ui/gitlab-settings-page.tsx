import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useHostContext,
  usePluginAction,
  usePluginData,
  usePluginToast,
  type PluginHostContext,
  type PluginSettingsPageProps,
} from "@paperclipai/plugin-sdk/ui";

import { requiresPaperclipBoardAccess } from "../paperclip-health.js";
import { GITLAB_CONNECTOR_UI_STYLES } from "./gitlab-ghsync-styles.js";
import {
  fetchJson,
  fetchPaperclipHealth,
  patchPluginConfig,
  resolveCliAuthPollUrl,
  resolveCliAuthUrl,
} from "./gitlab-settings-http.js";
import {
  filterGitLabWorkspaceCandidates,
  loadGitLabWorkspaceCandidates,
  normalizeGitLabPathInput,
  suggestedPaperclipProjectNameFromGitLabRepositoryInput,
  type GitLabWorkspaceCandidate,
} from "./gitlab-project-bindings.js";
import { resolveOrCreateProject } from "./gitlab-settings-projects.js";
import {
  ensureProjectGitLabRepoBinding,
  findGitLabBoundWorkspace,
  listProjectWorkspaces,
} from "./gitlab-workspace-binding.js";

/** Newer Paperclip hosts expose `companyName`; published SDK typings may omit it — keep plugin buildable standalone. */
function companyScopeLabelFromHost(ctx: PluginHostContext): string {
  const withName = ctx as PluginHostContext & { companyName?: string | null };
  return (
    withName.companyName?.trim()
    || ctx.companyPrefix?.trim()
    || (ctx.companyId ? `${ctx.companyId.slice(0, 8)}…` : "")
  );
}

const HOST_BUTTON_BASE_CLASSNAME = [
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium",
  "transition-[color,background-color,border-color,box-shadow,opacity]",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  "[&_svg]:shrink-0 outline-none focus-visible:border-ring",
  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  "rounded-md gap-1.5 shrink-0 shadow-xs",
].join(" ");

const HOST_DEFAULT_BUTTON_CLASSNAME = [
  HOST_BUTTON_BASE_CLASSNAME,
  "bg-primary text-primary-foreground hover:bg-primary/90",
].join(" ");

const HOST_OUTLINE_BUTTON_CLASSNAME = [
  HOST_BUTTON_BASE_CLASSNAME,
  "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  "dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
].join(" ");

const HOST_DESTRUCTIVE_BUTTON_CLASSNAME = [
  HOST_BUTTON_BASE_CLASSNAME,
  "bg-destructive text-white hover:bg-destructive/90",
  "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
].join(" ");

const HOST_ACTION_BUTTON_SIZE_CLASSNAME = "h-9 px-4 py-2 has-[>svg]:px-3";

function getConnectorButtonClassName(variant: "primary" | "secondary" | "danger"): string {
  const variantClassName =
    variant === "primary"
      ? HOST_DEFAULT_BUTTON_CLASSNAME
      : variant === "danger"
        ? HOST_DESTRUCTIVE_BUTTON_CLASSNAME
        : HOST_OUTLINE_BUTTON_CLASSNAME;

  return ["ghsync__button", variantClassName, HOST_ACTION_BUTTON_SIZE_CLASSNAME].join(" ");
}

type ThemeMode = "light" | "dark";
type Tone = "neutral" | "success" | "warning" | "info" | "danger";

interface ThemePalette {
  text: string;
  title: string;
  muted: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderSoft: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  primaryBg: string;
  primaryBorder: string;
  primaryText: string;
  secondaryBg: string;
  secondaryBorder: string;
  secondaryText: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  successBg: string;
  successBorder: string;
  successText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
  shadow: string;
}

const LIGHT_PALETTE: ThemePalette = {
  text: "#18181b",
  title: "#09090b",
  muted: "#71717a",
  surface: "#ffffff",
  surfaceAlt: "#fafafa",
  surfaceRaised: "#f5f5f5",
  border: "#e4e4e7",
  borderSoft: "#f4f4f5",
  inputBg: "#ffffff",
  inputBorder: "#d4d4d8",
  inputText: "#18181b",
  badgeBg: "#fafafa",
  badgeBorder: "#e4e4e7",
  badgeText: "#3f3f46",
  primaryBg: "#18181b",
  primaryBorder: "#18181b",
  primaryText: "#fafafa",
  secondaryBg: "#ffffff",
  secondaryBorder: "#d4d4d8",
  secondaryText: "#27272a",
  dangerBg: "#fff1f2",
  dangerBorder: "#fecdd3",
  dangerText: "#be123c",
  successBg: "#f0fdf4",
  successBorder: "#bbf7d0",
  successText: "#166534",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  warningText: "#a16207",
  infoBg: "#eff6ff",
  infoBorder: "#bfdbfe",
  infoText: "#1d4ed8",
  shadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
};

const DARK_PALETTE: ThemePalette = {
  text: "#f5f5f5",
  title: "#fafafa",
  muted: "#a1a1aa",
  surface: "rgba(10, 10, 11, 0.96)",
  surfaceAlt: "rgba(15, 15, 17, 1)",
  surfaceRaised: "rgba(19, 19, 24, 1)",
  border: "rgba(63, 63, 70, 0.92)",
  borderSoft: "rgba(39, 39, 42, 1)",
  inputBg: "rgba(15, 15, 17, 1)",
  inputBorder: "rgba(63, 63, 70, 1)",
  inputText: "#fafafa",
  badgeBg: "rgba(24, 24, 27, 0.9)",
  badgeBorder: "rgba(63, 63, 70, 1)",
  badgeText: "#d4d4d8",
  primaryBg: "#f4f4f5",
  primaryBorder: "rgba(82, 82, 91, 1)",
  primaryText: "#111113",
  secondaryBg: "rgba(24, 24, 27, 1)",
  secondaryBorder: "rgba(63, 63, 70, 1)",
  secondaryText: "#e4e4e7",
  dangerBg: "rgba(69, 10, 10, 0.24)",
  dangerBorder: "rgba(127, 29, 29, 0.8)",
  dangerText: "#fca5a5",
  successBg: "rgba(20, 83, 45, 0.16)",
  successBorder: "rgba(34, 197, 94, 0.25)",
  successText: "#bbf7d0",
  warningBg: "rgba(146, 64, 14, 0.2)",
  warningBorder: "rgba(245, 158, 11, 0.24)",
  warningText: "#fcd34d",
  infoBg: "rgba(29, 78, 216, 0.2)",
  infoBorder: "rgba(96, 165, 250, 0.24)",
  infoText: "#93c5fd",
  shadow: "0 18px 40px rgba(0, 0, 0, 0.24)",
};

function buildThemeVars(theme: ThemePalette, themeMode: ThemeMode): React.CSSProperties {
  return {
    colorScheme: themeMode,
    ["--ghsync-text" as string]: theme.text,
    ["--ghsync-title" as string]: theme.title,
    ["--ghsync-muted" as string]: theme.muted,
    ["--ghsync-surface" as string]: theme.surface,
    ["--ghsync-surfaceAlt" as string]: theme.surfaceAlt,
    ["--ghsync-surfaceRaised" as string]: theme.surfaceRaised,
    ["--ghsync-border" as string]: theme.border,
    ["--ghsync-border-soft" as string]: theme.borderSoft,
    ["--ghsync-input-bg" as string]: theme.inputBg,
    ["--ghsync-input-border" as string]: theme.inputBorder,
    ["--ghsync-input-text" as string]: theme.inputText,
    ["--ghsync-badge-bg" as string]: theme.badgeBg,
    ["--ghsync-badge-border" as string]: theme.badgeBorder,
    ["--ghsync-badge-text" as string]: theme.badgeText,
    ["--ghsync-primaryBg" as string]: theme.primaryBg,
    ["--ghsync-primaryBorder" as string]: theme.primaryBorder,
    ["--ghsync-primaryText" as string]: theme.primaryText,
    ["--ghsync-secondaryBg" as string]: theme.secondaryBg,
    ["--ghsync-secondaryBorder" as string]: theme.secondaryBorder,
    ["--ghsync-secondaryText" as string]: theme.secondaryText,
    ["--ghsync-dangerBg" as string]: theme.dangerBg,
    ["--ghsync-dangerBorder" as string]: theme.dangerBorder,
    ["--ghsync-dangerText" as string]: theme.dangerText,
    ["--ghsync-danger-bg" as string]: theme.dangerBg,
    ["--ghsync-danger-border" as string]: theme.dangerBorder,
    ["--ghsync-danger-text" as string]: theme.dangerText,
    ["--ghsync-success-bg" as string]: theme.successBg,
    ["--ghsync-success-border" as string]: theme.successBorder,
    ["--ghsync-success-text" as string]: theme.successText,
    ["--ghsync-warning-bg" as string]: theme.warningBg,
    ["--ghsync-warning-border" as string]: theme.warningBorder,
    ["--ghsync-warning-text" as string]: theme.warningText,
    ["--ghsync-info-bg" as string]: theme.infoBg,
    ["--ghsync-info-border" as string]: theme.infoBorder,
    ["--ghsync-info-text" as string]: theme.infoText,
    ["--ghsync-shadow" as string]: theme.shadow,
  } as React.CSSProperties;
}

function getThemeMode(): ThemeMode {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "dark";
  }

  const root = document.documentElement;
  const body = document.body;
  const candidates = [root, body].filter((node): node is HTMLElement => Boolean(node));

  for (const node of candidates) {
    const attrTheme = node.getAttribute("data-theme") || node.getAttribute("data-color-mode") || node.getAttribute("data-mode");
    if (attrTheme === "light" || attrTheme === "dark") {
      return attrTheme;
    }

    if (node.classList.contains("light")) {
      return "light";
    }

    if (node.classList.contains("dark")) {
      return "dark";
    }
  }

  const colorScheme = window.getComputedStyle(body).colorScheme || window.getComputedStyle(root).colorScheme;
  if (colorScheme === "light" || colorScheme === "dark") {
    return colorScheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function useResolvedThemeMode(): ThemeMode {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const matcher = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      setThemeMode(getThemeMode());
    };

    handleChange();
    matcher.addEventListener("change", handleChange);

    const observer = new MutationObserver(handleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-mode", "data-mode"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-mode", "data-mode"],
    });

    return () => {
      matcher.removeEventListener("change", handleChange);
      observer.disconnect();
    };
  }, []);

  return themeMode;
}

function getToneClass(tone: Tone): string {
  switch (tone) {
    case "success":
      return "ghsync__badge--success";
    case "warning":
      return "ghsync__badge--warning";
    case "info":
      return "ghsync__badge--info";
    case "danger":
      return "ghsync__badge--danger";
    default:
      return "ghsync__badge--neutral";
  }
}

type BoardAccessRequirementStatus = "loading" | "required" | "not_required" | "unknown";

function usePaperclipBoardAccessRequirement(): {
  status: BoardAccessRequirementStatus;
  required: boolean;
} {
  const [status, setStatus] = useState<BoardAccessRequirementStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const healthSnapshot = await fetchPaperclipHealth();
      if (cancelled) {
        return;
      }

      if (!healthSnapshot) {
        setStatus("unknown");
        return;
      }

      setStatus(requiresPaperclipBoardAccess(healthSnapshot) ? "required" : "not_required");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    status,
    required: status === "required",
  };
}

function LoadingButtonContent(props: {
  busy: boolean;
  label: string;
  busyLabel?: string;
}): React.JSX.Element {
  if (!props.busy) {
    return <>{props.label}</>;
  }

  return (
    <span className="ghsync__button-content">
      <LoadingSpinner size="sm" />
      <span>{props.busyLabel ?? props.label}</span>
    </span>
  );
}

function LoadingSpinner(props: { size?: "sm" | "md"; label?: string }): React.JSX.Element {
  const sizeClassName = props.size === "sm" ? "ghsync__spinner--sm" : "ghsync__spinner--md";

  return (
    <span
      role="status"
      aria-label={props.label ?? "Loading"}
      className={["ghsync__spinner", sizeClassName].join(" ")}
    />
  );
}

function getPluginIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  const pluginsIndex = parts.indexOf("plugins");
  if (pluginsIndex === -1 || pluginsIndex + 1 >= parts.length) {
    return null;
  }

  return parts[pluginsIndex + 1] ?? null;
}

const syncedPaperclipApiBaseUrlsByPluginId = new Map<string, string>();

function getPaperclipApiBaseUrlFromBrowser(): string | undefined {
  if (typeof window === "undefined" || !window.location?.origin) {
    return undefined;
  }

  return window.location.origin;
}

/**
 * Trust the current browser origin and persist it to instance config so the worker can
 * call Paperclip REST without a separate “API base URL” field in the form.
 */
async function syncTrustedPaperclipApiBaseUrl(pluginId: string | null): Promise<string | undefined> {
  const paperclipApiBaseUrl = getPaperclipApiBaseUrlFromBrowser();
  if (!paperclipApiBaseUrl) {
    return undefined;
  }

  const resolvedPluginId = pluginId?.trim() ?? null;
  if (!resolvedPluginId) {
    return undefined;
  }

  const lastSynced = syncedPaperclipApiBaseUrlsByPluginId.get(resolvedPluginId);
  if (lastSynced === paperclipApiBaseUrl) {
    return paperclipApiBaseUrl;
  }

  await patchPluginConfig(resolvedPluginId, {
    paperclipApiBaseUrl,
  });
  syncedPaperclipApiBaseUrlsByPluginId.set(resolvedPluginId, paperclipApiBaseUrl);

  return paperclipApiBaseUrl;
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

interface GitLabRegistration {
  gitlabBaseUrl?: string;
  gitlabTokenRef?: string;
  /** From last successful GitLab /api/v4/user check (stored as @username). */
  gitlabApiIdentity?: string;
  gitlabTokenConfigured: boolean;
  paperclipApiBaseUrl?: string;
  paperclipBoardAccessConfigured: boolean;
  mappings: GitLabMappingRow[];
  updatedAt?: string;
}

interface GitLabMappingRow {
  id: string;
  paperclipProjectId: string;
  paperclipProjectName: string;
  gitlabPath: string;
  companyId?: string;
}

interface GitLabAuditProject {
  pathWithNamespace: string;
  status: "verified" | "missing_access" | "error";
  message?: string;
}

interface GitLabAuditSummary {
  status: string;
  allProjectsReachable: boolean;
  projects: GitLabAuditProject[];
  warnings: string[];
  message?: string;
}

interface RepositoryBranchState {
  loading: boolean;
  workspaceId: string | null;
  branches: string[];
  selectedBranch: string;
  savedBranch: string;
  error: string | null;
}

function repositoryBranchTargetsSignature(targets: Array<{ projectId: string; gitlabPath: string }>): string {
  return targets
    .map((row) => `${row.projectId}::${row.gitlabPath}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

/** Stable snapshot for skipping redundant form resets after registration.refresh (avoids save flicker). */
function registrationMappingsSyncSignature(data: {
  gitlabBaseUrl?: string;
  mappings?: GitLabMappingRow[];
}): string {
  return JSON.stringify({
    base: data.gitlabBaseUrl ?? "",
    rows: (data.mappings ?? []).map((m) => ({
      pid: m.paperclipProjectId ?? "",
      path: m.gitlabPath ?? "",
      name: m.paperclipProjectName ?? "",
    })),
  });
}

interface CliAuthChallengeResponse {
  token?: string;
  boardApiToken?: string;
  approvalUrl?: string;
  approvalPath?: string;
  pollUrl?: string;
  pollPath?: string;
  expiresAt?: string;
  suggestedPollIntervalMs?: number;
}

interface CliAuthChallengePollResponse {
  status?: string;
  boardApiToken?: string;
}

interface CliAuthIdentityResponse {
  user?: { displayName?: string; name?: string; login?: string; email?: string };
  displayName?: string;
  name?: string;
  login?: string;
  email?: string;
}

const CLI_AUTH_POLL_MIN_MS = 500;
const CLI_AUTH_POLL_MAX_MS = 5000;
const CLI_AUTH_POLL_FALLBACK_MS = 1000;

function normalizeCliAuthPollIntervalMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return CLI_AUTH_POLL_FALLBACK_MS;
  }

  return Math.min(CLI_AUTH_POLL_MAX_MS, Math.max(CLI_AUTH_POLL_MIN_MS, Math.floor(value)));
}

function waitForDuration(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, durationMs);
  });
}

function getCliAuthIdentityLabel(identity: CliAuthIdentityResponse): string | null {
  const candidates = [
    identity.user?.displayName,
    identity.user?.name,
    identity.user?.login,
    identity.user?.email,
    identity.displayName,
    identity.name,
    identity.login,
    identity.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

async function resolveOrCreateCompanySecret(
  companyId: string,
  name: string,
  value: string,
): Promise<{ id: string; name: string }> {
  const existingSecrets = await fetchJson<Array<{ id: string; name: string }>>(`/api/companies/${companyId}/secrets`);
  const existing = existingSecrets.find((secret) => secret.name.trim().toLowerCase() === name.trim().toLowerCase());

  if (existing) {
    return fetchJson<{ id: string; name: string }>(`/api/secrets/${existing.id}/rotate`, {
      method: "POST",
      body: JSON.stringify({
        value,
      }),
    });
  }

  return fetchJson<{ id: string; name: string }>(`/api/companies/${companyId}/secrets`, {
    method: "POST",
    body: JSON.stringify({
      name,
      value,
    }),
  });
}

async function requestBoardAccessChallenge(companyId: string): Promise<CliAuthChallengeResponse> {
  return fetchJson<CliAuthChallengeResponse>("/api/cli-auth/challenges", {
    method: "POST",
    body: JSON.stringify({
      command: "paperclip plugin gitlab settings",
      clientName: "GitLab Connector plugin",
      requestedAccess: "board",
      requestedCompanyId: companyId,
    }),
  });
}

async function waitForBoardAccessApproval(challenge: CliAuthChallengeResponse): Promise<string> {
  const challengeToken = typeof challenge.token === "string" ? challenge.token.trim() : "";
  const pollUrl = resolveCliAuthPollUrl(challenge.pollUrl ?? challenge.pollPath);
  if (!challengeToken || !pollUrl) {
    throw new Error("Paperclip did not return a usable board access challenge.");
  }

  const expiresAtTimeMs = typeof challenge.expiresAt === "string" ? Date.parse(challenge.expiresAt) : NaN;
  const pollIntervalMs = normalizeCliAuthPollIntervalMs(challenge.suggestedPollIntervalMs);

  while (true) {
    const pollUrlWithToken = new URL(pollUrl);
    pollUrlWithToken.searchParams.set("token", challengeToken);
    const pollResult = await fetchJson<CliAuthChallengePollResponse>(pollUrlWithToken.toString());
    const status = typeof pollResult.status === "string" ? pollResult.status.trim().toLowerCase() : "pending";

    if (status === "approved") {
      const boardApiToken =
        typeof pollResult.boardApiToken === "string" && pollResult.boardApiToken.trim()
          ? pollResult.boardApiToken.trim()
          : typeof challenge.boardApiToken === "string" && challenge.boardApiToken.trim()
            ? challenge.boardApiToken.trim()
            : "";
      if (!boardApiToken) {
        throw new Error("Paperclip approved board access but did not return a usable API token.");
      }

      return boardApiToken;
    }

    if (status === "cancelled") {
      throw new Error("Board access approval was cancelled.");
    }

    if (status === "expired") {
      throw new Error("Board access approval expired. Start the connection flow again.");
    }

    if (Number.isFinite(expiresAtTimeMs) && Date.now() >= expiresAtTimeMs) {
      throw new Error("Board access approval expired. Start the connection flow again.");
    }

    await waitForDuration(pollIntervalMs);
  }
}

async function fetchBoardAccessIdentity(boardApiToken: string): Promise<string | null> {
  const identity = await fetchJson<CliAuthIdentityResponse>("/api/cli-auth/me", {
    headers: {
      authorization: `Bearer ${boardApiToken.trim()}`,
    },
  });

  return getCliAuthIdentityLabel(identity);
}

function createEmptyMapping(index: number): GitLabMappingRow {
  return {
    id: `mapping-${index}`,
    paperclipProjectId: "",
    paperclipProjectName: "",
    gitlabPath: "",
  };
}

const PROJECT_GIT_PERSONAL_TOKEN_ENV_KEY = "PAPERCLIP_GIT_PERSONAL_TOKEN";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProjectEnvBinding =
  | string
  | {
    type: "plain";
    value: string;
  }
  | {
    type: "secret_ref";
    secretId: string;
    version?: "latest" | number;
  };

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

function normalizeProjectEnvMap(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function resolveProjectGitTokenEnvBinding(input: {
  gitlabTokenRef: string;
  fallbackPlainToken: string;
}): ProjectEnvBinding | null {
  const tokenRef = input.gitlabTokenRef.trim();
  if (tokenRef && isUuid(tokenRef)) {
    return {
      type: "secret_ref",
      secretId: tokenRef,
      version: "latest",
    };
  }

  const plainToken = input.fallbackPlainToken.trim();
  if (plainToken) {
    return {
      type: "plain",
      value: plainToken,
    };
  }

  return null;
}

async function upsertProjectGitTokenEnv(projectId: string, envBinding: ProjectEnvBinding): Promise<void> {
  const project = await fetchJson<{ env?: unknown }>(`/api/projects/${projectId}`);
  const currentEnv = normalizeProjectEnvMap(project?.env);

  await fetchJson(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      env: {
        ...currentEnv,
        [PROJECT_GIT_PERSONAL_TOKEN_ENV_KEY]: envBinding,
      },
    }),
  });
}

async function ensureProjectUnarchived(projectId: string): Promise<void> {
  const project = await fetchJson<{ archivedAt?: unknown }>(`/api/projects/${projectId}`);
  const archivedAt = typeof project?.archivedAt === "string" ? project.archivedAt.trim() : "";
  if (!archivedAt) {
    return;
  }

  await fetchJson(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      archivedAt: null,
    }),
  });
}

function auditTone(summary: GitLabAuditSummary | undefined): Tone {
  if (!summary || summary.status === "missing_token") {
    return "warning";
  }

  if (summary.status === "error") {
    return "danger";
  }

  if (!summary.projects.length) {
    return "neutral";
  }

  return summary.allProjectsReachable ? "success" : "warning";
}

export function GitLabConnectorSettingsPage(_props: PluginSettingsPageProps): React.JSX.Element {
  const hostContext = useHostContext();
  const toast = usePluginToast();
  const pluginIdFromLocation = getPluginIdFromLocation();

  const registration = usePluginData<GitLabRegistration>(
    "settings.registration",
    hostContext.companyId ? { companyId: hostContext.companyId } : {},
  );

  const tokenAudit = usePluginData<GitLabAuditSummary>(
    "settings.tokenPermissionAudit",
    hostContext.companyId ? { companyId: hostContext.companyId } : {},
  );

  const saveRegistration = usePluginAction("settings.saveRegistration");
  const updateBoardAccess = usePluginAction("settings.updateBoardAccess");
  const validateToken = usePluginAction("settings.validateToken");
  const listRepositoryBranches = usePluginAction("settings.listRepositoryBranches");

  const themeMode = useResolvedThemeMode();
  const theme = themeMode === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  const themeVars = buildThemeVars(theme, themeMode);

  const [formBaseUrl, setFormBaseUrl] = useState("");
  /** Debounced — used for workspace discovery so each keystroke does not refetch / flash the Repositories section. */
  const [debouncedFormBaseUrl, setDebouncedFormBaseUrl] = useState("");
  /** Raw PAT from the user; stored only after save via company secret + ref. */
  const [gitlabPatDraft, setGitlabPatDraft] = useState("");
  const [mappingRows, setMappingRows] = useState<GitLabMappingRow[]>([createEmptyMapping(0)]);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatedUser, setValidatedUser] = useState<string | null>(null);
  const [connectingBoard, setConnectingBoard] = useState(false);
  const [boardAccessIdentity, setBoardAccessIdentity] = useState<string | null>(null);
  /** When token is saved or just validated, show compact summary cards until Replace / edit form. */
  const [replacingGitLabToken, setReplacingGitLabToken] = useState(true);

  const [existingGitLabCandidates, setExistingGitLabCandidates] = useState<GitLabWorkspaceCandidate[]>([]);
  const [existingGitLabCandidatesLoading, setExistingGitLabCandidatesLoading] = useState(false);
  const [existingGitLabCandidatesError, setExistingGitLabCandidatesError] = useState<string | null>(null);
  const [repositoryBranchStateByProjectId, setRepositoryBranchStateByProjectId] = useState<Record<string, RepositoryBranchState>>({});

  const boardAccessRequirement = usePaperclipBoardAccessRequirement();

  const lastRegistrationMappingsSyncSigRef = useRef<string>("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedFormBaseUrl(formBaseUrl), 450);
    return () => window.clearTimeout(id);
  }, [formBaseUrl]);

  useEffect(() => {
    if (!registration.data) {
      return;
    }
    if (submitting) {
      // Avoid overwriting in-progress form state with stale registration snapshots.
      return;
    }

    const sig = registrationMappingsSyncSignature(registration.data);
    if (sig === lastRegistrationMappingsSyncSigRef.current) {
      return;
    }
    lastRegistrationMappingsSyncSigRef.current = sig;

    setFormBaseUrl(registration.data.gitlabBaseUrl ?? "");

    const incoming = registration.data.mappings ?? [];
    setMappingRows(
      incoming.length > 0
        ? incoming.map((row, index) => ({
            ...row,
            id: row.id || `mapping-${index}`,
          }))
        : [createEmptyMapping(0)],
    );
  }, [registration.data, submitting]);

  useEffect(() => {
    if (!registration.data?.paperclipBoardAccessConfigured) {
      setBoardAccessIdentity(null);
    }
  }, [registration.data?.paperclipBoardAccessConfigured]);

  useEffect(() => {
    if (registration.data?.gitlabTokenConfigured) {
      setReplacingGitLabToken(false);
      return;
    }
    if (!validatedUser) {
      setReplacingGitLabToken(true);
    }
  }, [registration.data?.gitlabTokenConfigured, validatedUser]);

  const companyId = hostContext.companyId ?? "";
  const hasCompany = Boolean(companyId);
  /** Prefer display name (when host provides it), then slug prefix; last resort short id. */
  const companyScopeLabel = companyScopeLabelFromHost(hostContext);

  const effectiveGitLabBaseUrl = useMemo(
    () => formBaseUrl.trim() || registration.data?.gitlabBaseUrl?.trim() || "",
    [formBaseUrl, registration.data?.gitlabBaseUrl],
  );

  /** Saved URL wins; otherwise debounced draft — avoids refetch on every keystroke. */
  const discoveryGitLabBaseUrl = useMemo(
    () => registration.data?.gitlabBaseUrl?.trim() || debouncedFormBaseUrl.trim() || "",
    [registration.data?.gitlabBaseUrl, debouncedFormBaseUrl],
  );

  const gitLabCandidatesSilentAfterFirstFetchRef = useRef(false);

  useEffect(() => {
    gitLabCandidatesSilentAfterFirstFetchRef.current = false;
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !discoveryGitLabBaseUrl) {
      setExistingGitLabCandidates([]);
      setExistingGitLabCandidatesLoading(false);
      setExistingGitLabCandidatesError(null);
      gitLabCandidatesSilentAfterFirstFetchRef.current = false;
      return;
    }

    let cancelled = false;
    const silent = gitLabCandidatesSilentAfterFirstFetchRef.current || existingGitLabCandidates.length > 0;
    if (!silent) {
      setExistingGitLabCandidatesLoading(true);
    }
    setExistingGitLabCandidatesError(null);

    void (async () => {
      try {
        const candidates = await loadGitLabWorkspaceCandidates(companyId, discoveryGitLabBaseUrl);
        if (!cancelled) {
          setExistingGitLabCandidates(candidates);
          gitLabCandidatesSilentAfterFirstFetchRef.current = true;
        }
      } catch (error) {
        if (!cancelled) {
          setExistingGitLabCandidates([]);
          gitLabCandidatesSilentAfterFirstFetchRef.current = false;
          setExistingGitLabCandidatesError(
            getActionErrorMessage(error, "Could not inspect GitLab-linked projects in this company."),
          );
        }
      } finally {
        if (!cancelled) {
          setExistingGitLabCandidatesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, discoveryGitLabBaseUrl, existingGitLabCandidates.length, registration.data?.updatedAt]);

  const gitlabTokenSaved = Boolean(registration.data?.gitlabTokenConfigured);
  /** Validate succeeded in this session but credential not persisted yet until Save settings. */
  const validatedPendingSave = Boolean(validatedUser && !gitlabTokenSaved);

  const tokenTone: Tone = gitlabTokenSaved
    ? "success"
    : validatedPendingSave
      ? "info"
      : gitlabPatDraft.trim()
        ? "info"
        : "warning";

  const gitLabHeaderStatusLabel = gitlabTokenSaved
    ? "Valid"
    : validatedPendingSave
      ? "Save to connect"
      : "Needs URL + token";

  const gitLabSectionBadgeLabel = gitlabTokenSaved ? "Valid" : validatedPendingSave ? "Save settings" : "Required";

  const gitLabSummaryTokenLabel = gitlabTokenSaved ? "Valid" : validatedPendingSave ? "Pending save" : "Missing";

  const gitlabIdentityDisplay = (() => {
    if (validatedUser?.trim()) {
      return `@${validatedUser.trim()}`;
    }
    const s = registration.data?.gitlabApiIdentity?.trim();
    return s || null;
  })();

  const hasMappedProjects = mappingRows.some((row) => row.gitlabPath.trim() && row.paperclipProjectId.trim());

  const showGitLabAccessCompact =
    !replacingGitLabToken && (gitlabTokenSaved || Boolean(validatedUser));

  const auditMeta = tokenAudit.data;

  const repositoriesUnlocked =
    Boolean(effectiveGitLabBaseUrl) && (gitlabTokenSaved || Boolean(validatedUser));

  const savedConnectorBindingCount =
    registration.data?.mappings?.filter((row) => row.gitlabPath?.trim() && row.paperclipProjectId?.trim()).length ?? 0;

  /** Prefer server registration; fall back to form rows so branch UI matches what you see under Repositories. */
  const checkoutMappingsForBranch = useMemo(() => {
    const fromRegistration = (registration.data?.mappings ?? []).filter(
      (row) => row.gitlabPath?.trim() && row.paperclipProjectId?.trim(),
    );
    if (fromRegistration.length > 0) {
      return fromRegistration;
    }
    return mappingRows.filter((row) => row.gitlabPath?.trim() && row.paperclipProjectId?.trim());
  }, [registration.data?.mappings, mappingRows]);

  const repositoryBranchTargets = useMemo(
    () =>
      checkoutMappingsForBranch
        .map((row) => ({
          projectId: row.paperclipProjectId.trim(),
          gitlabPath: row.gitlabPath.trim(),
        }))
        .filter((row) => row.projectId && row.gitlabPath),
    [checkoutMappingsForBranch],
  );

  const repositoryBranchTargetsSig = useMemo(
    () => repositoryBranchTargetsSignature(repositoryBranchTargets),
    [repositoryBranchTargets],
  );

  useEffect(() => {
    if (!repositoriesUnlocked || !effectiveGitLabBaseUrl.trim()) {
      setRepositoryBranchStateByProjectId({});
      return;
    }

    const targets = repositoryBranchTargets;

    if (targets.length === 0) {
      setRepositoryBranchStateByProjectId({});
      return;
    }

    let cancelled = false;
    setRepositoryBranchStateByProjectId((prev) => {
      const next = { ...prev };
      for (const target of targets) {
        const previous = prev[target.projectId];
        next[target.projectId] = {
          loading: true,
          workspaceId: previous?.workspaceId ?? null,
          branches: previous?.branches ?? [],
          selectedBranch: previous?.selectedBranch ?? "",
          savedBranch: previous?.savedBranch ?? "",
          error: null,
        };
      }
      return next;
    });

    void (async () => {
      for (const target of targets) {
        try {
          const workspaces = await listProjectWorkspaces(target.projectId);
          const workspace = findGitLabBoundWorkspace(workspaces, effectiveGitLabBaseUrl, target.gitlabPath);
          if (!workspace) {
            if (!cancelled) {
              setRepositoryBranchStateByProjectId((prev) => ({
                ...prev,
                [target.projectId]: {
                  loading: false,
                  workspaceId: null,
                  branches: [],
                  selectedBranch: "",
                  savedBranch: "",
                  error: "Save settings first to create the GitLab workspace binding.",
                },
              }));
            }
            continue;
          }

          const listed = (await listRepositoryBranches({ pathWithNamespace: target.gitlabPath })) as { branches?: unknown };
          const rawBranches = listed.branches;
          const branches = Array.isArray(rawBranches)
            ? rawBranches.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
            : [];
          const savedBranch = (workspace.defaultRef ?? workspace.repoRef ?? "").trim();
          const selectedBranch = savedBranch && branches.includes(savedBranch)
            ? savedBranch
            : (branches[0] ?? savedBranch ?? "");

          if (!cancelled) {
            setRepositoryBranchStateByProjectId((prev) => ({
              ...prev,
              [target.projectId]: {
                loading: false,
                workspaceId: workspace.id,
                branches,
                selectedBranch,
                savedBranch,
                error: null,
              },
            }));
          }
        } catch (error) {
          if (!cancelled) {
            setRepositoryBranchStateByProjectId((prev) => ({
              ...prev,
              [target.projectId]: {
                loading: false,
                workspaceId: null,
                branches: [],
                selectedBranch: "",
                savedBranch: "",
                error: getActionErrorMessage(error, "Could not load repository branches."),
              },
            }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveGitLabBaseUrl, listRepositoryBranches, repositoriesUnlocked, repositoryBranchTargetsSig]);

  const repositoriesSectionBadgeLabel = !hasCompany
    ? "Scoped"
    : !repositoriesUnlocked
      ? "Locked"
      : savedConnectorBindingCount > 0
        ? `${savedConnectorBindingCount} saved`
        : "Open";

  const repositoriesSectionBadgeTone: Tone = !hasCompany || !repositoriesUnlocked
    ? "neutral"
    : savedConnectorBindingCount > 0
      ? "success"
      : "info";

  const availableExistingGitLabCandidates = filterGitLabWorkspaceCandidates(
    existingGitLabCandidates,
    mappingRows,
    discoveryGitLabBaseUrl || effectiveGitLabBaseUrl,
  );

  function addMappingRow(): void {
    setMappingRows((rows) => [...rows, createEmptyMapping(rows.length)]);
  }

  function addExistingGitLabCandidate(candidate: GitLabWorkspaceCandidate): void {
    setMappingRows((rows) => {
      const emptyMappingIndex = rows.findIndex(
        (row) =>
          !row.gitlabPath.trim() && !row.paperclipProjectName.trim() && !row.paperclipProjectId.trim(),
      );
      const nextMapping: GitLabMappingRow = {
        ...(emptyMappingIndex === -1 ? createEmptyMapping(rows.length) : rows[emptyMappingIndex]),
        id: emptyMappingIndex === -1 ? `mapping-${rows.length}` : rows[emptyMappingIndex].id,
        gitlabPath: candidate.gitlabPath,
        paperclipProjectName: candidate.projectName,
        paperclipProjectId: candidate.projectId,
        companyId,
      };

      if (emptyMappingIndex === -1) {
        return [...rows, nextMapping];
      }

      return rows.map((row, index) => (index === emptyMappingIndex ? nextMapping : row));
    });
  }

  async function handleValidateToken(): Promise<void> {
    if (!gitlabPatDraft.trim()) {
      toast({ title: "Token required", body: "Enter a GitLab personal access token to validate.", tone: "warn" });
      return;
    }

    setValidating(true);
    try {
      const result = (await validateToken({
        token: gitlabPatDraft,
        gitlabBaseUrl: formBaseUrl.trim() || registration.data?.gitlabBaseUrl,
      })) as { username?: string };
      setValidatedUser(typeof result.username === "string" ? result.username : null);
      setReplacingGitLabToken(false);
      toast({
        title: "GitLab token valid",
        body: result.username
          ? `Authenticated as ${result.username}. Click Save settings to store the token and finish connecting.`
          : "Token accepted. Click Save settings to store the token and finish connecting.",
        tone: "success",
      });
      await registration.refresh?.();
    } catch (error) {
      setValidatedUser(null);
      toast({
        title: "Validation failed",
        body: getActionErrorMessage(error, "GitLab rejected this token."),
        tone: "error",
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    if (!hasCompany) {
      toast({
        title: "Company context required",
        body: "Open these settings from a company workspace to save mappings.",
        tone: "warn",
      });
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = formBaseUrl.trim();
      if (!baseUrl) {
        toast({
          title: "GitLab base URL required",
          body: "Enter your GitLab instance URL (for example https://gitlab.com).",
          tone: "warn",
        });
        return;
      }

      let gitlabTokenRef = registration.data?.gitlabTokenRef ?? "";
      if (gitlabPatDraft.trim()) {
        const secretName = `paperclip_gitlab_pat_${companyId.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
        const secret = await resolveOrCreateCompanySecret(companyId, secretName, gitlabPatDraft.trim());
        gitlabTokenRef = secret.id;
      }

      if (!gitlabTokenRef.trim()) {
        toast({
          title: "Personal access token required",
          body: "Paste a GitLab PAT with api scope, or save again after one was stored previously.",
          tone: "warn",
        });
        return;
      }

      const pluginId = pluginIdFromLocation?.trim();
      if (!pluginId) {
        toast({
          title: "Missing plugin id",
          body: "Reload the page or open GitLab Connector from Instance → Settings → Plugins.",
          tone: "error",
        });
        return;
      }

      const trustedPaperclipApiBaseUrl = await syncTrustedPaperclipApiBaseUrl(pluginIdFromLocation);

      const identityToPersist =
        validatedUser?.trim()
          ? `@${validatedUser.trim()}`
          : registration.data?.gitlabApiIdentity?.trim() ?? "";

      await patchPluginConfig(pluginId, {
        gitlabBaseUrl: baseUrl,
        gitlabTokenRef,
        ...(identityToPersist ? { lastGitLabApiIdentity: identityToPersist } : {}),
      });

      const resolvedMappings: GitLabMappingRow[] = [];
      for (const row of mappingRows) {
        const projectNameInput = row.paperclipProjectName.trim();
        const projectIdInput = row.paperclipProjectId.trim();
        const rawPath = row.gitlabPath.trim();

        if (!rawPath && !projectNameInput && !projectIdInput) {
          continue;
        }

        const gitlabPath = normalizeGitLabPathInput(row.gitlabPath, baseUrl);
        if (!gitlabPath) {
          throw new Error("Each repository row needs a valid GitLab path, or paste a clone URL from this GitLab instance.");
        }

        if (!projectIdInput && !projectNameInput) {
          throw new Error("Each repository row needs a Paperclip project name (or choose an existing GitLab-linked project above).");
        }

        let paperclipProjectId = projectIdInput;
        let paperclipProjectName = projectNameInput;

        if (!paperclipProjectId && projectNameInput) {
          const resolved = await resolveOrCreateProject(companyId, projectNameInput);
          paperclipProjectId = resolved.id;
          paperclipProjectName = resolved.name;
        }

        if (!paperclipProjectId) {
          throw new Error("Could not resolve the Paperclip project for a mapping row.");
        }

        resolvedMappings.push({
          ...row,
          gitlabPath,
          paperclipProjectId,
          paperclipProjectName,
        });
      }

      for (const row of resolvedMappings) {
        await ensureProjectGitLabRepoBinding(row.paperclipProjectId, baseUrl, row.gitlabPath);
      }

      for (const row of resolvedMappings) {
        await ensureProjectUnarchived(row.paperclipProjectId);
      }

      const gitTokenEnvBinding = resolveProjectGitTokenEnvBinding({
        gitlabTokenRef,
        fallbackPlainToken: gitlabPatDraft.trim(),
      });
      if (!gitTokenEnvBinding) {
        throw new Error(
          "Could not set PAPERCLIP_GIT_PERSONAL_TOKEN on mapped projects. Paste a GitLab PAT and save again.",
        );
      }

      const mappedProjectIds = Array.from(
        new Set(
          resolvedMappings
            .map((row) => row.paperclipProjectId.trim())
            .filter((projectId) => projectId.length > 0),
        ),
      );
      for (const mappedProjectId of mappedProjectIds) {
        await upsertProjectGitTokenEnv(mappedProjectId, gitTokenEnvBinding);
      }

      for (const row of resolvedMappings) {
        const selectedBranch = repositoryBranchStateByProjectId[row.paperclipProjectId]?.selectedBranch?.trim() ?? "";
        if (!selectedBranch) {
          continue;
        }

        const workspaces = await listProjectWorkspaces(row.paperclipProjectId);
        const workspace = findGitLabBoundWorkspace(workspaces, baseUrl, row.gitlabPath);
        if (!workspace?.id) {
          continue;
        }

        await fetchJson(`/api/projects/${row.paperclipProjectId}/workspaces/${workspace.id}`, {
          method: "PATCH",
          body: JSON.stringify({ defaultRef: selectedBranch, repoRef: selectedBranch }),
        });
      }

      await saveRegistration({
        companyId,
        gitlabBaseUrl: baseUrl,
        gitlabTokenRef,
        ...(identityToPersist ? { lastGitLabApiIdentity: identityToPersist } : {}),
        ...(trustedPaperclipApiBaseUrl ? { paperclipApiBaseUrl: trustedPaperclipApiBaseUrl } : {}),
        mappings: resolvedMappings,
      });

      // Keep the UI stable immediately after save to avoid transient row disappearance.
      setMappingRows(
        resolvedMappings.length > 0
          ? resolvedMappings.map((row, index) => ({
              ...row,
              id: row.id || `mapping-${index}`,
            }))
          : [createEmptyMapping(0)],
      );
      lastRegistrationMappingsSyncSigRef.current = registrationMappingsSyncSignature({
        gitlabBaseUrl: baseUrl,
        mappings: resolvedMappings,
      });

      await registration.refresh?.();
      await tokenAudit.refresh?.();

      setGitlabPatDraft("");

      toast({
        title: "GitLab Connector saved",
        body:
          "GitLab URL, token, and bindings are saved; each mapped Paperclip project now has a primary git workspace when linking succeeded.",
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        body: getActionErrorMessage(error, "Unable to save GitLab Connector settings."),
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConnectBoard(): Promise<void> {
    if (!companyId) {
      return;
    }

    const pluginId = pluginIdFromLocation;
    if (!pluginId) {
      toast({ title: "Missing plugin id", body: "Reload the page and try again.", tone: "error" });
      return;
    }

    setConnectingBoard(true);
    let approvalWindow: Window | null = null;

    try {
      if (typeof window !== "undefined") {
        approvalWindow = window.open("about:blank", "_blank");
      }

      const challenge = await requestBoardAccessChallenge(companyId);
      const approvalUrl = resolveCliAuthUrl(challenge.approvalUrl, challenge.approvalPath);

      if (!approvalUrl) {
        throw new Error("Paperclip did not return a board approval URL.");
      }

      if (!approvalWindow && typeof window !== "undefined") {
        approvalWindow = window.open(approvalUrl, "_blank");
      } else {
        approvalWindow?.location.replace(approvalUrl);
      }

      if (!approvalWindow) {
        throw new Error("Allow pop-ups for Paperclip, then try connecting board access again.");
      }

      const boardApiToken = await waitForBoardAccessApproval(challenge);
      const identity = await fetchBoardAccessIdentity(boardApiToken);
      const secretName = `paperclip_board_api_${companyId.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
      const secret = await resolveOrCreateCompanySecret(companyId, secretName, boardApiToken);

      await patchPluginConfig(pluginId, {
        paperclipBoardApiTokenRefs: {
          [companyId]: secret.id,
        },
      });

      await updateBoardAccess({
        companyId,
        paperclipBoardApiTokenRef: secret.id,
      });

      await registration.refresh?.();

      setBoardAccessIdentity(identity);

      toast({
        title: identity ? `Paperclip board connected as ${identity}` : "Paperclip board connected",
        body: "The connector can authenticate back to Paperclip when needed.",
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Board access failed",
        body: getActionErrorMessage(error, "Unable to finish Paperclip board access."),
        tone: "error",
      });
    } finally {
      setConnectingBoard(false);
      try {
        approvalWindow?.close();
      } catch {
        /* ignore */
      }
    }
  }

  function updateMapping(index: number, patch: Partial<GitLabMappingRow>): void {
    setMappingRows((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function handleGitLabRepositoryInputChange(index: number, value: string): void {
    setMappingRows((rows) => {
      const row = rows[index];
      if (!row) {
        return rows;
      }

      const nextRow: GitLabMappingRow = { ...row, gitlabPath: value };

      if (!row.paperclipProjectId && !row.paperclipProjectName.trim()) {
        const hint = suggestedPaperclipProjectNameFromGitLabRepositoryInput(value);
        if (hint) {
          nextRow.paperclipProjectName = hint;
        }
      }

      const next = [...rows];
      next[index] = nextRow;
      return next;
    });
  }

  const lastSaved = registration.data?.updatedAt
    ? new Date(registration.data.updatedAt).toLocaleString()
    : "Not saved yet";

  const showInitialLoading = registration.loading && !registration.data;

  const boardAccessConfigured = Boolean(registration.data?.paperclipBoardAccessConfigured);
  const boardAccessRequired = boardAccessRequirement.required;

  const boardAccessTone: Tone =
    connectingBoard ? "info" : boardAccessConfigured ? "success" : boardAccessRequired ? "warning" : "info";

  const boardAccessBannerLabel =
    connectingBoard
      ? "Connecting"
      : boardAccessConfigured
        ? "Connected"
        : boardAccessRequired
          ? "Required"
          : boardAccessRequirement.status === "loading"
            ? "Checking"
            : "Optional";

  const canConnectBoardAccess = hasCompany && !connectingBoard && !showInitialLoading;

  return (
    <div className="ghsync ghsync-settings" style={themeVars}>
      <style>{GITLAB_CONNECTOR_UI_STYLES}</style>

      <section className="ghsync__header">
        <div className="ghsync__header-copy">
          <h2>GitLab Connector settings</h2>
          <p>
            Link this Paperclip instance to GitLab: validate your token against the GitLab API, map Paperclip projects to
            GitLab paths, connect Paperclip board access when your deployment needs it, and on save we store this page’s
            origin as the trusted Paperclip API base URL—no separate field for that.
          </p>
        </div>
        <div className="ghsync__section-head-actions">
          <span
            className={`ghsync__scope-pill ${hasCompany ? "ghsync__scope-pill--company" : "ghsync__scope-pill--mixed"}`}
            title={hasCompany ? companyId : undefined}
          >
            {hasCompany ? companyScopeLabel : "No company"}
          </span>
          <span className="ghsync__scope-pill ghsync__scope-pill--global">Shared</span>
          <span className={`ghsync__badge ${getToneClass(tokenTone)}`}>
            <span className="ghsync__badge-dot" aria-hidden="true" />
            {gitLabHeaderStatusLabel}
          </span>
        </div>
      </section>

      <div className="ghsync__layout">
        <section className="ghsync__card">
          <div className="ghsync__card-header">
            <h3>Settings</h3>
            <p>{hasCompany ? companyScopeLabel : "Read-only until a company context is available."}</p>
          </div>

          {showInitialLoading ? (
            <div className="ghsync__loading-inline" aria-live="polite">
              <LoadingSpinner size="sm" />
              <span>Loading GitLab Connector settings…</span>
            </div>
          ) : null}

          <form className="ghsync__stack" onSubmit={(e) => void handleSave(e)}>
            <section className="ghsync__section">
              <div className="ghsync__section-head">
                <div className="ghsync__section-copy">
                  <div className="ghsync__section-title-row">
                    <h4>GitLab access</h4>
                    <span className="ghsync__scope-pill ghsync__scope-pill--global">Shared</span>
                  </div>
                  {showGitLabAccessCompact ? (
                    gitlabTokenSaved ? (
                      <p>Shared token.</p>
                    ) : (
                      <p>Token verified — save below to connect.</p>
                    )
                  ) : (
                    <p>
                      GitLab API access is shared across companies on this Paperclip instance. Use Validate to check your
                      token; <strong>Save settings</strong> stores it securely and completes the connection.
                    </p>
                  )}
                </div>
                <span className={`ghsync__badge ${getToneClass(tokenTone)}`}>{gitLabSectionBadgeLabel}</span>
              </div>

              {showGitLabAccessCompact ? (
                <div className="ghsync__stack">
                  <div className="ghsync__connected">
                    <div>
                      <strong>{gitlabTokenSaved ? "Shared token ready" : "Token verified"}</strong>
                      <span>
                        {gitlabTokenSaved
                          ? "Shared across all companies."
                          : "Save settings to store this credential for all companies."}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={getConnectorButtonClassName("secondary")}
                      onClick={() => {
                        setReplacingGitLabToken(true);
                        setGitlabPatDraft("");
                        if (gitlabTokenSaved) {
                          setValidatedUser(null);
                        }
                      }}
                    >
                      Replace token
                    </button>
                  </div>
                  <div
                    className={`ghsync__permission-audit ${
                      !hasMappedProjects
                      || !auditMeta?.projects?.length
                      || (auditMeta.projects.length > 0 && !auditMeta.allProjectsReachable)
                        ? "ghsync__permission-audit--warning"
                        : ""
                    }`}
                  >
                    <div className="ghsync__permission-audit-item">
                      <strong>
                        {!hasMappedProjects
                          ? "Token permission audit pending"
                          : !auditMeta?.projects?.length
                            ? "Token permission audit pending"
                            : auditMeta.allProjectsReachable
                              ? "Token permission audit complete"
                              : "Token permission audit needs attention"}
                      </strong>
                      <span>
                        {!hasMappedProjects
                          ? "Add at least one mapped project in this company to audit token permissions."
                          : !auditMeta?.projects?.length
                            ? "Save settings with a valid token to verify access to mapped GitLab paths."
                            : auditMeta.allProjectsReachable
                              ? "Token can reach every mapped GitLab project."
                              : "Some mapped projects returned errors — verify paths and token scope."}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="ghsync__field">
                    <label htmlFor="gitlab-base-url">GitLab base URL</label>
                    <input
                      id="gitlab-base-url"
                      className="ghsync__input"
                      value={formBaseUrl}
                      onChange={(event) => setFormBaseUrl(event.currentTarget.value)}
                      placeholder="https://gitlab.com"
                      autoComplete="off"
                    />
                  </div>

                  <div className="ghsync__field">
                    <label htmlFor="gitlab-pat">Personal access token</label>
                    <input
                      id="gitlab-pat"
                      className="ghsync__input"
                      type="password"
                      value={gitlabPatDraft}
                      onChange={(event) => setGitlabPatDraft(event.currentTarget.value)}
                      placeholder={registration.data?.gitlabTokenConfigured ? "Leave blank to keep saved token" : "glpat-…"}
                      autoComplete="new-password"
                    />
                    <div className="ghsync__hint">
                      Validate only checks GitLab; Save settings writes the PAT to a Paperclip company secret and updates
                      instance config so the connector can run.
                    </div>
                  </div>

                  <div className="ghsync__actions">
                    <button
                      type="button"
                      className={getConnectorButtonClassName("secondary")}
                      disabled={validating}
                      onClick={() => void handleValidateToken()}
                    >
                      {validating ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Validating…
                        </>
                      ) : (
                        "Validate token"
                      )}
                    </button>
                    {validatedUser ? (
                      <span className="ghsync__hint">
                        Last check: <strong>{validatedUser}</strong>
                        {!gitlabTokenSaved ? " — click Save settings to finish connecting." : null}
                      </span>
                    ) : null}
                  </div>

                  {replacingGitLabToken && (gitlabTokenSaved || validatedUser) ? (
                    <div className="ghsync__actions">
                      <button
                        type="button"
                        className={getConnectorButtonClassName("secondary")}
                        onClick={() => setReplacingGitLabToken(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}

                  {auditMeta?.projects?.length ? (
                    <div
                      className={`ghsync__message${auditMeta.allProjectsReachable ? "" : " ghsync__message--warning"}`}
                    >
                      <strong>Project access audit</strong>
                      <span>
                        {auditMeta.allProjectsReachable
                          ? "Token can reach every mapped GitLab project."
                          : "Some mapped projects returned errors — verify paths and token scope."}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <section className="ghsync__section">
              <div className="ghsync__section-head">
                <div className="ghsync__section-copy">
                  <div className="ghsync__section-title-row">
                    <h4>Paperclip board access</h4>
                    <div className="ghsync__section-tags">
                      <span className="ghsync__scope-pill ghsync__scope-pill--company">Company</span>
                    </div>
                  </div>
                </div>
                <span className={`ghsync__badge ${getToneClass(boardAccessTone)}`}>{boardAccessBannerLabel}</span>
              </div>

              {hasCompany ? (
                <div className="ghsync__connected">
                  <div>
                    <strong>
                      {boardAccessConfigured
                        ? boardAccessIdentity
                          ? `Connected as ${boardAccessIdentity}`
                          : "Connected"
                        : boardAccessRequired
                          ? "Required"
                          : boardAccessRequirement.status === "loading"
                            ? "Checking requirement"
                            : "Optional"}
                    </strong>
                    <span>
                      {boardAccessConfigured
                        ? "Used for Paperclip API calls."
                        : boardAccessRequired
                          ? "Required in authenticated deployments."
                          : boardAccessRequirement.status === "loading"
                            ? "Checking whether it is required."
                            : "Only needed when Paperclip API calls require sign-in."}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={getConnectorButtonClassName(boardAccessConfigured ? "secondary" : "primary")}
                    disabled={!canConnectBoardAccess}
                    onClick={() => void handleConnectBoard()}
                  >
                    <LoadingButtonContent
                      busy={connectingBoard}
                      label={boardAccessConfigured ? "Reconnect" : "Connect board access"}
                      busyLabel="Waiting for approval…"
                    />
                  </button>
                </div>
              ) : (
                <div className="ghsync__locked">
                  <div>
                    <strong>Company required</strong>
                    <span>Open a company to connect it.</span>
                  </div>
                  <span className="ghsync__badge ghsync__badge--neutral">Unavailable</span>
                </div>
              )}
            </section>

            <section className="ghsync__section">
              <div className="ghsync__section-head">
                <div className="ghsync__section-copy">
                  <div className="ghsync__section-title-row">
                    <h4>Repositories</h4>
                    <div className="ghsync__section-tags">
                      <span className="ghsync__scope-pill ghsync__scope-pill--company">Company</span>
                    </div>
                  </div>
                  <p>
                    Link GitLab projects to Paperclip projects in {companyScopeLabel}. Saved bindings power MR tools and
                    clone metadata; issue sync is not included yet.
                  </p>
                </div>
                <span className={`ghsync__badge ${getToneClass(repositoriesSectionBadgeTone)}`}>
                  {repositoriesSectionBadgeLabel}
                </span>
              </div>

              {!hasCompany ? (
                <div className="ghsync__locked">
                  <div>
                    <strong>Company required</strong>
                    <span>Open settings inside a company to edit repositories.</span>
                  </div>
                  <span className="ghsync__badge ghsync__badge--neutral">Scoped</span>
                </div>
              ) : !repositoriesUnlocked ? (
                <div className="ghsync__locked">
                  <div>
                    <strong>Repositories are locked</strong>
                    <span>Add your GitLab base URL and validate or save a token first.</span>
                  </div>
                  <span className="ghsync__badge ghsync__badge--neutral">Locked</span>
                </div>
              ) : (
                <div className="ghsync__stack">
                  {existingGitLabCandidatesLoading ? (
                    <p className="ghsync__hint">Checking this company for Paperclip projects that already have a GitLab git workspace…</p>
                  ) : null}
                  {existingGitLabCandidatesError ? (
                    <p className="ghsync__hint ghsync__hint--error">{existingGitLabCandidatesError}</p>
                  ) : null}

                  {availableExistingGitLabCandidates.length > 0 ? (
                    <div className="ghsync__existing-projects">
                      <div className="ghsync__mapping-title">
                        <strong>Existing GitLab-linked projects</strong>
                        <span>
                          Add connector bindings for projects that already have a GitLab repository workspace in{" "}
                          {companyScopeLabel}.
                        </span>
                      </div>
                      {availableExistingGitLabCandidates.map((candidate) => (
                        <section
                          key={`${candidate.projectId}:${candidate.gitlabPath}`}
                          className="ghsync__mapping-card ghsync__existing-project-card"
                        >
                          <div className="ghsync__existing-project-meta">
                            <strong>{candidate.projectName}</strong>
                            <span>{candidate.repositoryUrl}</span>
                            <div className="ghsync__existing-project-tags">
                              <span className="ghsync__scope-pill ghsync__scope-pill--company">Existing project</span>
                              <span className="ghsync__scope-pill ghsync__scope-pill--global">GitLab workspace</span>
                            </div>
                          </div>
                          <div className="ghsync__button-row">
                            <button
                              type="button"
                              className={getConnectorButtonClassName("secondary")}
                              disabled={submitting}
                              onClick={() => addExistingGitLabCandidate(candidate)}
                            >
                              Add to connector
                            </button>
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : null}

                  <div className="ghsync__mapping-list">
                    {mappingRows.map((row, index) => {
                      const canRemove =
                        mappingRows.length > 1
                        || Boolean(row.gitlabPath.trim())
                        || Boolean(row.paperclipProjectName.trim())
                        || Boolean(row.paperclipProjectId.trim());

                      return (
                        <section key={row.id} className="ghsync__mapping-card">
                          <div className="ghsync__mapping-head">
                            <div className="ghsync__mapping-title">
                              <strong>{row.paperclipProjectName.trim() || `Repository ${index + 1}`}</strong>
                              {row.paperclipProjectId ? (
                                <span>This mapping uses an existing Paperclip project.</span>
                              ) : null}
                            </div>
                            {canRemove ? (
                              <button
                                type="button"
                                className={getConnectorButtonClassName("danger")}
                                disabled={submitting}
                                onClick={() =>
                                  setMappingRows((rows) => {
                                    if (rows.length === 1) {
                                      return [createEmptyMapping(0)];
                                    }
                                    return rows.filter((_, rowIndex) => rowIndex !== index);
                                  })
                                }
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>

                          <div className="ghsync__mapping-grid">
                            <div className="ghsync__field">
                              <label htmlFor={`gitlab-path-${row.id}`}>GitLab repository</label>
                              <input
                                id={`gitlab-path-${row.id}`}
                                className="ghsync__input"
                                value={row.gitlabPath}
                                disabled={submitting}
                                onChange={(event) => handleGitLabRepositoryInputChange(index, event.currentTarget.value)}
                                placeholder="namespace/project or https://gitlab.example.com/group/repo.git"
                                autoComplete="off"
                              />
                            </div>

                            <div className="ghsync__field">
                              <label htmlFor={`paperclip-project-${row.id}`}>Paperclip project</label>
                              <input
                                id={`paperclip-project-${row.id}`}
                                className="ghsync__input"
                                value={row.paperclipProjectName}
                                disabled={submitting || Boolean(row.paperclipProjectId)}
                                onChange={(event) =>
                                  updateMapping(index, { paperclipProjectName: event.currentTarget.value })
                                }
                                placeholder="Project name in this company"
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          {repositoriesUnlocked && row.paperclipProjectId.trim() && row.gitlabPath.trim() ? (
                            <div className="ghsync__field">
                              <label htmlFor={`gitlab-default-branch-${row.id}`}>Default branch</label>
                              <div className="ghsync__button-row">
                                <select
                                  id={`gitlab-default-branch-${row.id}`}
                                  className="ghsync__input ghsync__input--select"
                                  value={repositoryBranchStateByProjectId[row.paperclipProjectId]?.selectedBranch ?? ""}
                                  disabled={
                                    submitting
                                    || Boolean(repositoryBranchStateByProjectId[row.paperclipProjectId]?.loading)
                                    || (repositoryBranchStateByProjectId[row.paperclipProjectId]?.branches.length ?? 0) === 0
                                  }
                                  onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setRepositoryBranchStateByProjectId((prev) => ({
                                      ...prev,
                                      [row.paperclipProjectId]: {
                                        ...prev[row.paperclipProjectId]!,
                                        selectedBranch: value,
                                      },
                                    }));
                                  }}
                                >
                                  {(repositoryBranchStateByProjectId[row.paperclipProjectId]?.branches ?? []).map((branchName) => (
                                    <option key={branchName} value={branchName}>
                                      {branchName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <p
                                className={`ghsync__hint ghsync__branch-hint${
                                  repositoryBranchStateByProjectId[row.paperclipProjectId]?.error ? " ghsync__hint--error" : ""
                                }`}
                              >
                                {repositoryBranchStateByProjectId[row.paperclipProjectId]?.error
                                  ? repositoryBranchStateByProjectId[row.paperclipProjectId]?.error
                                  : repositoryBranchStateByProjectId[row.paperclipProjectId]?.loading
                                    ? "Refreshing branches…"
                                    : ""}
                              </p>
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>

                  <div className="ghsync__section-footer">
                    <div className="ghsync__button-row">
                      <button
                        type="button"
                        className={getConnectorButtonClassName("secondary")}
                        disabled={submitting}
                        onClick={() => addMappingRow()}
                      >
                        Add another repository
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="ghsync__section">
              <div className="ghsync__section-head">
                <div className="ghsync__section-copy">
                  <h4>Connector scope</h4>
                  <p>
                    This plugin exposes GitLab REST tools (merge requests, clone metadata). GitLab issue sync into
                    Paperclip is not included yet and may ship in a future release.
                  </p>
                </div>
              </div>
            </section>

            <div className="ghsync__section-footer">
              <button
                type="submit"
                className={getConnectorButtonClassName("primary")}
                disabled={submitting || !hasCompany}
              >
                {submitting ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>

          {registration.error ? (
            <div className="ghsync__message ghsync__message--error">{registration.error.message}</div>
          ) : null}
        </section>

        <aside className="ghsync__card">
          <div className="ghsync__card-header">
            <h3>Summary</h3>
            <p>Quick health snapshot</p>
          </div>

          <div className="ghsync__side-body">
            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>GitLab token</strong>
                <span className={`ghsync__badge ${getToneClass(tokenTone)}`}>{gitLabSummaryTokenLabel}</span>
              </div>
              <span className="ghsync__hint">
                {gitlabIdentityDisplay ? (
                  <>
                    <strong>GitLab API:</strong> {gitlabIdentityDisplay}
                    <br />
                  </>
                ) : null}
                {gitlabTokenSaved
                  ? "Stored in Paperclip; worker calls GitLab REST with this credential."
                  : validatedPendingSave
                    ? "Token checked with GitLab — save settings to persist and connect."
                    : "Add URL + PAT, then save — validate alone does not connect."}
              </span>
            </div>

            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>Projects</strong>
                <span className={`ghsync__badge ${getToneClass(mappingRows.some((row) => row.gitlabPath.trim()) ? "success" : "neutral")}`}>
                  {mappingRows.filter((row) => row.gitlabPath.trim() && row.paperclipProjectId.trim()).length > 0
                    ? "Mapped"
                    : "Empty"}
                </span>
              </div>
              <span className="ghsync__hint">Bindings power MR tools and clone URLs.</span>
            </div>

            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>Paperclip board</strong>
                <span className={`ghsync__badge ${getToneClass(boardAccessTone)}`}>{boardAccessBannerLabel}</span>
              </div>
              <span className="ghsync__hint">Needed when the host requires sign-in for API calls.</span>
            </div>

            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>GitLab reachability</strong>
                <span className={`ghsync__badge ${getToneClass(auditTone(tokenAudit.data ?? undefined))}`}>
                  {tokenAudit.data?.projects?.length
                    ? tokenAudit.data.allProjectsReachable
                      ? "Verified"
                      : "Needs attention"
                    : "Not checked"}
                </span>
              </div>
              <span className="ghsync__hint">Run save with valid token to audit mapped paths.</span>
            </div>

            <div className="ghsync__detail-list">
              <div className="ghsync__detail">
                <span className="ghsync__detail-label">Last saved</span>
                <strong className="ghsync__detail-value">{lastSaved}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
