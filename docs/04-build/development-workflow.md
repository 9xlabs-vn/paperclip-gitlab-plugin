# Development workflow (Stage 04 — Build)

## Prerequisites

- Node ≥ 20 and `pnpm` (see `package.json` `"packageManager"`).
- **`@paperclipai/plugin-sdk`** comes from the public npm registry (`devDependency` range in `package.json`). You do not need to clone Paperclip core to hack on this connector.

## Commands

From the repository root of this package:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev              # watch: worker + manifest + UI
```

## Layout

| Path | Role |
|------|------|
| `src/manifest.ts` | Plugin ID, capabilities, tools, UI slots |
| `src/worker.ts` | Tool handlers, lifecycle |
| `src/gitlab-http.ts` | GitLab REST helper |
| `src/gitlab-agent-tools.ts` | Tool declarations |
| `src/ui/index.tsx` | Settings page bundle |
| `tests/` | Vitest + SDK harness |

## Install into a running Paperclip (dev)

After `pnpm build`, install by absolute local path (see [operator install](../06-deploy/operator-install.md)).

## Related

- Planning backlog: [`../01-planning/roadmap-and-status.md`](../01-planning/roadmap-and-status.md)
- Tests: [`../05-test/test-strategy.md`](../05-test/test-strategy.md)
