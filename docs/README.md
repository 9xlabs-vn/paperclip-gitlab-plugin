# `paperclip-gitlab-plugin` documentation

Documentation for **this connector package** lives **here**. It is maintained in this repo alongside source (not bundled into Paperclip core docs).

Structure follows **SDLC 6.x stage folders** for **this connector’s artifacts** — see the canonical template in [`sdlc/04-templates/project-folder-structure.md`](./sdlc/04-templates/project-folder-structure.md).

## Stage index (this plugin)

| Stage | Folder | Documents |
|-------|--------|-----------|
| **00 — Foundation** | [`00-foundation/`](./00-foundation/problem-context.md) | WHY — problem context, references |
| **01 — Planning** | [`01-planning/`](./01-planning/roadmap-and-status.md) | WHAT — backlog, roadmap, delivery gates |
| **02 — Design** | [`02-design/`](./02-design/github-to-gitlab-parity.md) | HOW — GitHub Sync → GitLab parity |
| **03 — Integrate** | [`03-integrate/`](./03-integrate/paperclip-and-gitlab-contracts.md) | CONTRACTS — Paperclip + GitLab API |
| **04 — Build** | [`04-build/`](./04-build/development-workflow.md) | Implementation workflow |
| **05 — Test** | [`05-test/`](./05-test/test-strategy.md) | Test strategy |
| **06 — Deploy** | [`06-deploy/`](./06-deploy/operator-install.md) | Operator install |

Stages **07–09** (operate/learn/govern) can be added later (runbooks, retros, compliance) per team maturity.

### Quick links

1. [Roadmap and status](./01-planning/roadmap-and-status.md)
2. [GitHub → GitLab parity](./02-design/github-to-gitlab-parity.md)
3. [Delivery phases and gates](./01-planning/delivery-phases-and-gates.md)
4. [Operator install](./06-deploy/operator-install.md)

---

## Methodology bundle (`sdlc/`)

[`sdlc/`](./sdlc/README.md) contains the **MTS-SDLC-Lite / SDLC 6.1.0** reference pack (roles, playbooks, glossary, templates). Use it for **framework vocabulary** and checklists.

It is **not** a substitute for the numbered folders above — those hold **artifact-style** docs specific to shipping this GitLab connector.

---

## References (upstream Paperclip)

General plugin contracts and authoring guidance live in the **[Paperclip](https://github.com/paperclipai/paperclip)** repo. Use these when you need cross-plugin or host semantics (this GitLab connector repo does not duplicate them).

| Topic | Upstream path |
|-------|-----------|
| Plugin manifest & capabilities | [`doc/plugins/PLUGIN_SPEC.md`](https://github.com/paperclipai/paperclip/blob/master/doc/plugins/PLUGIN_SPEC.md) |
| Scaffold & authoring | [`doc/plugins/PLUGIN_AUTHORING_GUIDE.md`](https://github.com/paperclipai/paperclip/blob/master/doc/plugins/PLUGIN_AUTHORING_GUIDE.md) |

---

## Current implementation snapshot

- Connector settings now cover: GitLab access, Paperclip board access, repository mappings, and per-repository default branch.
- `Save settings` performs full apply: resolves/creates projects, ensures git workspaces, stores branch defaults, and syncs `PAPERCLIP_GIT_PERSONAL_TOKEN` to mapped project env.
- Archived Paperclip projects are excluded from suggestion/mapping lists; reconnect flow can unarchive archived projects.
- UI stabilization landed for typing/save flows (reduced branch/candidate reload flicker in settings).

### Important auth note

- GitLab PAT in connector config is for GitLab REST API calls.
- Managed `git clone` still uses host git credentials (SSH keys / credential helper / credentialized repo URL), not automatic PAT injection by Paperclip core.
