import type { PluginToolDeclaration } from "@paperclipai/plugin-sdk";

const projectPathProperty = {
  type: "string",
  description:
    "GitLab project path with namespace (e.g. group/subgroup/myproject). If omitted, the plugin uses the binding for the current Paperclip project (tool run context) when configured in GitLab Connector settings.",
} as const;

export const GITLAB_AGENT_TOOLS: PluginToolDeclaration[] = [
  {
    name: "ping_gitlab",
    displayName: "Ping GitLab",
    description:
      "Verify GitLab API connectivity using the configured base URL and token by calling GET /api/v4/version.",
    parametersSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "get_git_access_info",
    displayName: "Get Git Access Info",
    description:
      "Return GitLab project path, HTTPS/SSH clone URLs, and web URL for a Paperclip project based on connector bindings. Explains that GitLab API uses the configured secret ref while git clone/push uses SSH/credentials on the execution workspace.",
    parametersSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        paperclipProjectId: {
          type: "string",
          description:
            "Paperclip project UUID. Defaults to the tool run context project when omitted (typical when an agent runs in a project workspace).",
        },
      },
    },
  },
  {
    name: "list_merge_requests",
    displayName: "List Merge Requests",
    description:
      "List merge requests for a GitLab project via GET /projects/:id/merge_requests (GitLab REST v4). Provide projectPath or configure a Paperclip→GitLab project binding.",
    parametersSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        projectPath: projectPathProperty,
        state: {
          type: "string",
          enum: ["opened", "closed", "locked", "merged", "all"],
          description: "Merge request state filter.",
        },
        perPage: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Page size (default 20).",
        },
      },
    },
  },
  {
    name: "create_merge_request",
    displayName: "Create Merge Request",
    description:
      "Open a new merge request in a GitLab project (POST /projects/:id/merge_requests). Provide projectPath or configure a Paperclip→GitLab project binding.",
    parametersSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "source_branch", "target_branch"],
      properties: {
        projectPath: projectPathProperty,
        title: {
          type: "string",
          description: "Merge request title.",
        },
        source_branch: {
          type: "string",
          description: "Branch containing commits for the MR.",
        },
        target_branch: {
          type: "string",
          description: "Branch the MR merges into.",
        },
        description: {
          type: "string",
          description: "Optional MR description.",
        },
      },
    },
  },
];

export function getGitLabAgentToolDeclaration(
  name: string,
): Pick<PluginToolDeclaration, "displayName" | "description" | "parametersSchema"> {
  const tool = GITLAB_AGENT_TOOLS.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Unknown GitLab agent tool '${name}'.`);
  }

  const { name: _omit, ...rest } = tool;
  return rest;
}
