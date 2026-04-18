# Paperclip and GitLab contracts (Stage 03 — Integrate)

**CONTRACTS** — how this plugin binds to the Paperclip host and to GitLab.

## Paperclip plugin contract

| Topic | Reference |
|-------|-----------|
| Manifest shape, capabilities, tools, UI slots | Monorepo `doc/plugins/PLUGIN_SPEC.md` |
| Scaffold, local install, worker UI bridge | Monorepo `doc/plugins/PLUGIN_AUTHORING_GUIDE.md` |
| This package manifest | `src/manifest.ts` |

### Capabilities in use (summary)

- `instance.settings.register` — operator settings (`gitlabBaseUrl`, `gitlabTokenRef`).
- `http.outbound` — calls to `${gitlabBaseUrl}/api/v4/...`.
- `secrets.read-ref` — resolve `gitlabTokenRef` at runtime (never persist secret values).
- `plugin.state.read` / `plugin.state.write` — reserved for project bindings and sync cursors.
- `agent.tools.register` — MR-oriented tools declared in manifest + implemented in worker.

## GitLab REST contract

| Topic | Detail |
|-------|--------|
| Base URL | Configurable; must include scheme (e.g. `https://gitlab.example.com`). No assumption of `gitlab.com` only. |
| API prefix | `/api/v4` |
| Auth | `PRIVATE-TOKEN` header from resolved secret (see worker HTTP helper). |
| Self-managed | Same contract; only base URL changes. |

### External references

- [GitLab REST API documentation](https://docs.gitlab.com/ee/api/rest/) (upstream).

## Cross-system linking

Linking Paperclip issues or projects to GitLab MRs/branches is **product-specific**; follow monorepo `doc/plans/2026-04-18-mantis-and-gitlab-connector-plugins.md` (metadata vs plugin entities).

## Next stage

Implementation workflow: [`../04-build/development-workflow.md`](../04-build/development-workflow.md).
