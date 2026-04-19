import { createRequire } from "node:module";
import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

import { GITLAB_AGENT_TOOLS } from "./gitlab-agent-tools.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version?: unknown };
const MANIFEST_VERSION =
  process.env.PLUGIN_VERSION?.trim()
  || (typeof packageJson.version === "string" && packageJson.version.trim())
  || process.env.npm_package_version?.trim()
  || "0.0.0-dev";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclip-gitlab-plugin",
  apiVersion: 1,
  version: MANIFEST_VERSION,
  displayName: "GitLab Connector",
  description: "Link GitLab projects to Paperclip and expose GitLab REST API agent tools.",
  author: "9xLabs",
  categories: ["connector", "ui"],
  capabilities: [
    "instance.settings.register",
    "plugin.state.read",
    "plugin.state.write",
    "http.outbound",
    "secrets.read-ref",
    "agent.tools.register",
    "projects.read",
    "ui.action.register",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      gitlabBaseUrl: {
        type: "string",
        title: "GitLab base URL",
        description: "Root URL of your GitLab instance (e.g. https://gitlab.com or https://gitlab.example.com).",
      },
      gitlabTokenRef: {
        type: "string",
        format: "secret-ref",
        title: "GitLab token secret",
        description: "Paperclip secret reference for a GitLab personal access token or project/bot token (api scope).",
      },
      lastGitLabApiIdentity: {
        type: "string",
        title: "Last validated GitLab user",
        description:
          "Display label from the last successful GitLab token check (GitLab API /api/v4/user); kept for the settings Summary after reload.",
      },
      paperclipBoardApiTokenRefs: {
        type: "object",
        title: "Paperclip Board Token Secrets",
        description:
          "Per-company secret references for Paperclip board API access. Used when the connector calls back into Paperclip.",
        additionalProperties: {
          type: "string",
        },
      },
      paperclipApiBaseUrl: {
        type: "string",
        title: "Trusted Paperclip API Origin",
        description:
          "Origin for Paperclip REST API when the plugin worker calls the host (e.g. https://paperclip.example.com).",
      },
    },
  },
  tools: GITLAB_AGENT_TOOLS,
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui/",
  },
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: "paperclip-gitlab-plugin-settings",
        displayName: "GitLab Connector",
        exportName: "GitLabConnectorSettingsPage",
      },
      {
        type: "toolbarButton",
        id: "gitlab-connector-project-toolbar",
        displayName: "GitLab Connector",
        exportName: "GitLabProjectToolbarButton",
        entityTypes: ["project"],
        order: 0,
      },
    ],
  },
};

export default manifest;
