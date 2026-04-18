import React, { useEffect, useMemo, useState } from "react";
import type { PluginActionFn, PluginToastFn } from "@paperclipai/plugin-sdk/ui";

import { fetchJson } from "./gitlab-settings-http.js";
import {
  findGitLabBoundWorkspace,
  listProjectWorkspaces,
  type ProjectWorkspaceSummary,
} from "./gitlab-workspace-binding.js";

export interface CheckoutMappingRow {
  paperclipProjectId: string;
  paperclipProjectName: string;
  gitlabPath: string;
}

interface GitLabWorkspaceCheckoutSectionProps {
  mappings: CheckoutMappingRow[];
  gitlabBaseUrl: string;
  /** Same gate as Repositories (URL + token saved or validated). */
  unlocked: boolean;
  /** From `usePluginAction("settings.listRepositoryBranches")`. */
  listRepositoryBranches: PluginActionFn;
  registrationUpdatedAt?: string;
  getConnectorButtonClassName: (variant: "primary" | "secondary" | "danger") => string;
  toast: PluginToastFn;
}

type RowModel =
  | { status: "loading" }
  | {
      status: "ready";
      workspace: ProjectWorkspaceSummary;
      branches: string[];
      selectedBranch: string;
    }
  | { status: "no_workspace" }
  | { status: "error"; message: string };

function currentRefFromWorkspace(workspace: ProjectWorkspaceSummary): string {
  return (workspace.defaultRef ?? workspace.repoRef ?? "").trim();
}

export function GitLabWorkspaceCheckoutSection(props: GitLabWorkspaceCheckoutSectionProps): React.JSX.Element | null {
  const {
    mappings,
    gitlabBaseUrl,
    unlocked,
    listRepositoryBranches,
    registrationUpdatedAt,
    getConnectorButtonClassName,
    toast,
  } = props;

  const [rows, setRows] = useState<Record<string, RowModel>>({});
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);

  const sig = useMemo(
    () =>
      `${registrationUpdatedAt ?? ""}|${mappings
        .map((m) => `${m.paperclipProjectId}:${m.gitlabPath.trim()}`)
        .sort()
        .join(";")}`,
    [mappings, registrationUpdatedAt],
  );

  useEffect(() => {
    if (!unlocked || !gitlabBaseUrl.trim()) {
      setRows({});
      return;
    }

    const trimmedMappings = mappings.filter((m) => m.paperclipProjectId.trim() && m.gitlabPath.trim());
    if (trimmedMappings.length === 0) {
      setRows({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const next: Record<string, RowModel> = {};
      for (const m of trimmedMappings) {
        next[m.paperclipProjectId] = { status: "loading" };
      }
      setRows((prev) => ({ ...prev, ...next }));

      for (const m of trimmedMappings) {
        const projectId = m.paperclipProjectId;
        try {
          const workspaces = await listProjectWorkspaces(projectId);
          const workspace = findGitLabBoundWorkspace(workspaces, gitlabBaseUrl, m.gitlabPath);
          if (!workspace) {
            if (!cancelled) {
              setRows((prev) => ({
                ...prev,
                [projectId]: { status: "no_workspace" },
              }));
            }
            continue;
          }

          const listed = (await listRepositoryBranches({
            pathWithNamespace: m.gitlabPath.trim(),
          })) as { branches?: unknown };
          const rawBranches = listed.branches;
          const branches = Array.isArray(rawBranches)
            ? rawBranches.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
            : [];
          const current = currentRefFromWorkspace(workspace);
          const selectedBranch =
            current && branches.includes(current) ? current : branches[0] ?? current ?? "";

          if (!cancelled) {
            setRows((prev) => ({
              ...prev,
              [projectId]: {
                status: "ready",
                workspace,
                branches,
                selectedBranch,
              },
            }));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!cancelled) {
            setRows((prev) => ({
              ...prev,
              [projectId]: { status: "error", message },
            }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sig, unlocked, gitlabBaseUrl, listRepositoryBranches]);

  const trimmedMappings = useMemo(
    () => mappings.filter((m) => m.paperclipProjectId.trim() && m.gitlabPath.trim()),
    [mappings],
  );

  if (!unlocked || trimmedMappings.length === 0) {
    return null;
  }

  async function saveBranch(projectId: string, workspaceId: string, branch: string): Promise<void> {
    const trimmed = branch.trim();
    if (!trimmed) {
      toast({ title: "Branch required", body: "Choose a branch before saving.", tone: "warn" });
      return;
    }

    setSavingProjectId(projectId);
    try {
      await fetchJson(`/api/projects/${projectId}/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ defaultRef: trimmed, repoRef: trimmed }),
      });
      setRows((prev) => {
        const row = prev[projectId];
        if (!row || row.status !== "ready") {
          return prev;
        }
        return {
          ...prev,
          [projectId]: {
            ...row,
            workspace: {
              ...row.workspace,
              defaultRef: trimmed,
              repoRef: trimmed,
            },
            selectedBranch: trimmed,
          },
        };
      });
      toast({
        title: "Branch saved",
        body: "Paperclip will use this branch for managed clone when an agent prepares this workspace.",
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: "Could not save branch", body: message, tone: "error" });
    } finally {
      setSavingProjectId(null);
    }
  }

  const loadingCount = trimmedMappings.filter((m) => rows[m.paperclipProjectId]?.status === "loading").length;
  const readyCount = trimmedMappings.filter((m) => rows[m.paperclipProjectId]?.status === "ready").length;
  const badgeLabel = loadingCount > 0 ? "Loading" : readyCount > 0 ? `${readyCount} ready` : "—";

  return (
    <section className="ghsync__section">
      <div className="ghsync__section-head">
        <div className="ghsync__section-copy">
          <div className="ghsync__section-title-row">
            <h4>Default branch and clone</h4>
            <div className="ghsync__section-tags">
              <span className="ghsync__scope-pill ghsync__scope-pill--company">Company</span>
            </div>
          </div>
          <p>
            Choose the branch Paperclip stores on the primary git workspace. When a branch is saved, the server uses{" "}
            <strong>git clone -b</strong> for the managed checkout the first time an agent prepares that workspace.
          </p>
        </div>
        <span
          className={`ghsync__badge ${readyCount > 0 && loadingCount === 0 ? "ghsync__badge--success" : "ghsync__badge--neutral"}`}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="ghsync__stack">
        {trimmedMappings.map((m, index) => {
          const rowState = rows[m.paperclipProjectId];
          const label = m.paperclipProjectName.trim() || m.paperclipProjectId;
          const savedRef =
            rowState && rowState.status === "ready"
              ? (rowState.workspace.defaultRef ?? rowState.workspace.repoRef ?? "").trim()
              : "";

          return (
            <section key={`${m.paperclipProjectId}:${m.gitlabPath}`} className="ghsync__mapping-card">
              <div className="ghsync__mapping-head">
                <div className="ghsync__mapping-title">
                  <strong>
                    {label}
                    <span className="ghsync__hint"> · Repository {index + 1}</span>
                  </strong>
                  <span>{m.gitlabPath.trim()}</span>
                </div>
              </div>

              {!rowState || rowState.status === "loading" ? (
                <p className="ghsync__hint">Loading workspace and branches…</p>
              ) : rowState.status === "no_workspace" ? (
                <p className="ghsync__hint">
                  No matching git workspace yet. Save repository mappings above so Paperclip can create the primary git
                  workspace for this project.
                </p>
              ) : rowState.status === "error" ? (
                <p className="ghsync__hint ghsync__hint--error">{rowState.message}</p>
              ) : (
                <>
                  <div className="ghsync__mapping-grid">
                    <div className="ghsync__field">
                      <label htmlFor={`gitlab-branch-${m.paperclipProjectId}`}>Default branch</label>
                      <select
                        id={`gitlab-branch-${m.paperclipProjectId}`}
                        className="ghsync__input"
                        value={rowState.selectedBranch}
                        disabled={savingProjectId === m.paperclipProjectId || rowState.branches.length === 0}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setRows((prev) => {
                            const current = prev[m.paperclipProjectId];
                            if (!current || current.status !== "ready") {
                              return prev;
                            }
                            return {
                              ...prev,
                              [m.paperclipProjectId]: { ...current, selectedBranch: value },
                            };
                          });
                        }}
                      >
                        {rowState.branches.length === 0 ? (
                          <option value="">No branches returned</option>
                        ) : (
                          rowState.branches.map((name) => (
                            <option key={name} value={name}>
                              {name}
                              {savedRef && name === savedRef ? " (saved)" : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="ghsync__button-row">
                    <button
                      type="button"
                      className={getConnectorButtonClassName("primary")}
                      disabled={
                        savingProjectId === m.paperclipProjectId
                        || rowState.branches.length === 0
                        || !rowState.selectedBranch.trim()
                      }
                      onClick={() =>
                        void saveBranch(m.paperclipProjectId, rowState.workspace.id, rowState.selectedBranch)
                      }
                    >
                      {savingProjectId === m.paperclipProjectId ? "Saving…" : "Save branch"}
                    </button>
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
