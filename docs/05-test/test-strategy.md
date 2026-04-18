# Test strategy (Stage 05 — Test)

## Automated

- **Unit / harness**: `pnpm test` runs Vitest against `@paperclipai/plugin-sdk/testing` (`tests/plugin.spec.ts`).
- **Typecheck**: `pnpm typecheck` (`tsc --noEmit`).

Extend tests when adding tools (mock `fetch` via harness `ctx.http.fetch`).

## Manual / integration (recommended when changing GitLab paths)

1. Configure a GitLab test project (or gitlab.com sandbox) and a PAT with appropriate scopes.
2. Install plugin on dev Paperclip; set `gitlabBaseUrl` and `gitlabTokenRef` in settings.
3. Run agent tool **ping_gitlab** from a controlled session; then **list_merge_requests** / **create_merge_request** against a non-production branch.

Record notable manual runs in [`../01-planning/roadmap-and-status.md`](../01-planning/roadmap-and-status.md) if they affect release confidence.

## CI

CI expectations for this package follow monorepo conventions once wired; until then, run the commands above locally before publish.
