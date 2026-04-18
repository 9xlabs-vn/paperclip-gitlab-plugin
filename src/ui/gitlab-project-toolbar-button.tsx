import React, { useEffect, useMemo, useState } from "react";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";

import { httpOriginFromGitLabBase } from "../gitlab-clone-urls.js";
import { listProjectWorkspaces, normalizeGitRepoUrlForComparison } from "./gitlab-workspace-binding.js";

/**
 * Project toolbar — opens instance GitLab Connector settings for this plugin install.
 * Host passes `slot.pluginId` (installed plugin UUID) for `/instance/settings/plugins/:pluginId`.
 */
export interface GitLabProjectToolbarButtonProps {
  slot: {
    pluginId: string;
    displayName?: string;
  };
  context: {
    companyId?: string | null;
    companyPrefix?: string | null;
    projectId?: string | null;
    entityId?: string | null;
    entityType?: string | null;
  };
}

interface GitLabRegistrationData {
  gitlabBaseUrl?: string;
}

export function GitLabProjectToolbarButton({ slot, context }: GitLabProjectToolbarButtonProps): React.JSX.Element {
  const projectId = useMemo(
    () => (context.entityType === "project" ? (context.entityId ?? context.projectId ?? "").trim() : ""),
    [context.entityId, context.entityType, context.projectId],
  );

  const [visibleForProject, setVisibleForProject] = useState(false);

  const registration = usePluginData<GitLabRegistrationData>(
    "settings.registration",
    context.companyId ? { companyId: context.companyId } : {},
  );

  useEffect(() => {
    let cancelled = false;

    const gitlabBaseUrl = registration.data?.gitlabBaseUrl?.trim() ?? "";
    if (!projectId || !gitlabBaseUrl) {
      setVisibleForProject(false);
      return () => {
        cancelled = true;
      };
    }

    const gitlabOrigin = httpOriginFromGitLabBase(gitlabBaseUrl);
    if (!gitlabOrigin) {
      setVisibleForProject(false);
      return () => {
        cancelled = true;
      };
    }

    const gitlabRepoPrefixNorm = `${normalizeGitRepoUrlForComparison(`${gitlabOrigin}/x`).replace(/\/x$/, "")}/`;

    void (async () => {
      try {
        const workspaces = await listProjectWorkspaces(projectId);
        const hasGitLabWorkspace = workspaces.some((workspace) => {
          const repoUrl = workspace.repoUrl?.trim();
          if (!repoUrl) {
            return false;
          }
          return normalizeGitRepoUrlForComparison(repoUrl).startsWith(gitlabRepoPrefixNorm);
        });
        if (!cancelled) {
          setVisibleForProject(hasGitLabWorkspace);
        }
      } catch {
        if (!cancelled) {
          setVisibleForProject(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, registration.data?.gitlabBaseUrl]);

  if (!visibleForProject) {
    return <></>;
  }

  const href = `/instance/settings/plugins/${encodeURIComponent(slot.pluginId)}`;
  const projectHint = projectId;
  const title = projectHint
    ? `GitLab Connector settings (current project ${projectHint.slice(0, 8)}…)`
    : "Open GitLab Connector settings";

  return (
    <a
      href={href}
      title={title}
      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      GitLab Connector
    </a>
  );
}
