import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import { BINDINGS_SCOPE } from "../src/gitlab-bindings.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

function stubFetchForVersionAndMergeRequests() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/merge_requests")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ version: "17.0.0-test", revision: "abc123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

describe("paperclip-gitlab-plugin", () => {
  beforeEach(() => {
    stubFetchForVersionAndMergeRequests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("registers GitLab agent tools (ping)", async () => {
    const harness = createTestHarness({
      manifest,
      config: {
        gitlabBaseUrl: "https://gitlab.example.com",
        gitlabTokenRef: "GITLAB_TOKEN_REF",
      },
    });

    await plugin.definition.setup(harness.ctx);

    const ping = await harness.executeTool("ping_gitlab", {});
    expect(ping.error).toBeUndefined();
    expect(ping.content).toContain("GitLab API reachable");

    expect(globalThis.fetch).toHaveBeenCalled();
    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/api/v4/version");
  });

  it("lists merge requests using binding when projectPath omitted", async () => {
    const harness = createTestHarness({
      manifest,
      config: {
        gitlabBaseUrl: "https://gitlab.example.com",
        gitlabTokenRef: "GITLAB_TOKEN_REF",
      },
    });

    await plugin.definition.setup(harness.ctx);
    await harness.ctx.state.set(BINDINGS_SCOPE, {
      version: 1,
      byPaperclipProjectId: {
        "project-test": { pathWithNamespace: "acme/application" },
      },
    });

    const result = await harness.executeTool("list_merge_requests", {}, { projectId: "project-test" });
    expect(result.error).toBeUndefined();

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const mergeRequestCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/merge_requests"),
    );
    expect(mergeRequestCalls.length).toBeGreaterThan(0);
    expect(String(mergeRequestCalls[0]?.[0])).toContain(
      `/projects/${encodeURIComponent("acme/application")}/merge_requests`,
    );
  });

  it("get_git_access_info returns clone hints when binding exists", async () => {
    const harness = createTestHarness({
      manifest,
      config: {
        gitlabBaseUrl: "https://gitlab.com",
        gitlabTokenRef: "GITLAB_TOKEN_REF",
      },
    });

    await plugin.definition.setup(harness.ctx);
    await harness.ctx.state.set(BINDINGS_SCOPE, {
      version: 1,
      byPaperclipProjectId: {
        "project-test": { pathWithNamespace: "foo/bar" },
      },
    });

    const result = await harness.executeTool("get_git_access_info", {}, { projectId: "project-test" });
    expect(result.error).toBeUndefined();
    expect(result.content).toContain("HTTPS clone:");
    expect(result.content).toContain("git@gitlab.com:foo/bar.git");
  });

  it("returns health from onHealth", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);
    const health = await plugin.definition.onHealth?.();
    expect(health?.status).toBe("ok");
  });
});
