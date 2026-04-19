import type { PluginContext } from "@paperclipai/plugin-sdk";

import { normalizeGitLabPluginConfig, type GitLabConnectorPluginConfig } from "./gitlab-plugin-config.js";

export const GITLAB_SETTINGS_SCOPE = {
  scopeKind: "instance" as const,
  stateKey: "paperclip-gitlab-plugin-settings-v1",
};

export async function loadResolvedGitLabPluginConfig(ctx: PluginContext): Promise<GitLabConnectorPluginConfig> {
  const [dbRaw, savedRaw] = await Promise.all([
    ctx.config.get(),
    ctx.state.get(GITLAB_SETTINGS_SCOPE),
  ]);

  const db = normalizeGitLabPluginConfig(dbRaw);
  const st = normalizeGitLabPluginConfig(savedRaw);

  return normalizeGitLabPluginConfig({
    ...db,
    ...st,
    paperclipBoardApiTokenRefs: {
      ...(db.paperclipBoardApiTokenRefs ?? {}),
      ...(st.paperclipBoardApiTokenRefs ?? {}),
    },
    lastGitLabApiIdentity: st.lastGitLabApiIdentity?.trim() || db.lastGitLabApiIdentity?.trim() || undefined,
  });
}
