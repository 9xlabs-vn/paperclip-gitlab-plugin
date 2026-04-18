# Delivery phases and gates (Stage 01 — Planning)

This page maps **who owns what** and **what “done” means** per delivery slice for `paperclip-gitlab-plugin`.

It complements the methodology bundle in [`../../sdlc/`](../../sdlc/README.md) (roles, playbooks, templates). That folder is **reference**; this file is **this plugin’s** operating agreement.

## Phase map (delivery)

| Slice | Focus | Primary artifacts | Owners (typical) |
|-------|--------|-------------------|------------------|
| **Requirements** | Self-hosted GitLab, token model, MR workflows | [`roadmap-and-status.md`](./roadmap-and-status.md); monorepo `doc/plans/*.md` | Product + engineering |
| **Design** | Manifest capabilities, `instanceConfigSchema`, UI slots | [`../02-design/github-to-gitlab-parity.md`](../02-design/github-to-gitlab-parity.md); `PLUGIN_SPEC` review | Engineering |
| **Implementation** | Worker, UI bundles, tests | [`../04-build/`](../04-build/development-workflow.md) | Engineering |
| **Verification** | Harness tests; smoke vs live GitLab | [`../05-test/test-strategy.md`](../05-test/test-strategy.md) | Engineering + QA |
| **Release** | npm / private registry | `package.json`, changelog, tag | Engineering |
| **Operations** | Install, secrets | [`../06-deploy/operator-install.md`](../06-deploy/operator-install.md); monorepo `docs/deploy/*` for host | Operators |

## Documentation layout (SDLC stage folders)

Aligned with [`../../sdlc/04-templates/project-folder-structure.md`](../../sdlc/04-templates/project-folder-structure.md):

```text
plugins/paperclip-gitlab-plugin/docs/
  README.md
  00-foundation/
  01-planning/
  02-design/
  03-integrate/
  04-build/
  05-test/
  06-deploy/
  sdlc/                    # Methodology reference (vendor bundle)
```

Product narratives stay in **monorepo** `doc/plans/` unless summarized under `00-foundation/` or `01-planning/`.

## Lightweight gates

1. **Design** — Capabilities justified; every secret is a ref in schema; no undocumented host assumptions.
2. **Implementation** — `pnpm build`, `pnpm test`, `pnpm typecheck` green.
3. **Verification** — Harness tests; manual GitLab steps noted in [roadmap-and-status](./roadmap-and-status.md) when run.
4. **Release** — Install path documented in [operator install](../06-deploy/operator-install.md).

## Relation to `sdlc/`

Use [`sdlc/`](../../sdlc/README.md) for **framework vocabulary** (10-stage lifecycle, roles, quality gates). Use **numbered `docs/` folders** here for **artifacts of this package**.
