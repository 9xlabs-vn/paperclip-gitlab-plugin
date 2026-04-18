# GitHub Sync → GitLab Connector parity (Stage 02 — Design)

Traceability from `paperclip-github-plugin` to **this** GitLab connector: intended equivalent and current status.

**Principles** (monorepo `doc/plans/2026-04-18-mantis-and-gitlab-connector-plugins.md`): GitLab ≠ GitHub APIs; **full parity day one is not required**.

Legend: **Done** · **Planned** · **Later / TBD** · **N/A**

---

## Manifest capabilities

| GitHub Sync | GitLab Connector intent | Status |
|-------------|-------------------------|--------|
| `http.outbound` | GitLab REST `/api/v4` | Done |
| `secrets.read-ref` | Token via secret ref | Done |
| `plugin.state.read` / `write` | Mappings | Partial |
| `instance.settings.register` | Settings page | Done |
| `agent.tools.register` | MR/API tools | Done (minimal) |
| `jobs.schedule` | Optional sync jobs | Later / TBD |
| `projects.read` | Bindings UI / resolution | Planned |
| `issues.*` / `issue.comments.*` | GitLab Issues linking if in scope | Later / TBD |
| `agents.read` | Reviewer-style flows | Later / TBD |
| UI slots (sidebar, page, detailTab, …) | MR/pipeline surfaces | Planned |

---

## Scheduled jobs

| GitHub | GitLab | Status |
|--------|--------|--------|
| `sync.github-issues` | Optional poll / webhook backlog job | Not started |

---

## UI slots

| GitHub surface | GitLab intent | Status |
|----------------|---------------|--------|
| `settingsPage` | GitLab URL + token | Done |
| `page` / sidebar — PRs | MRs | Planned |
| `dashboardWidget` | Health / snapshot | Planned |
| `detailTab` / `commentAnnotation` / toolbars | Links + actions | Planned |

---

## Agent tools

| GitHub tool | GitLab counterpart | Status |
|-------------|-------------------|--------|
| `search_repository_items` | Search / list APIs | Later / TBD |
| `get_issue` / comments / update / add comment | GitLab issues & notes | Later / TBD |
| `create_pull_request` | `create_merge_request` | Done |
| `get_pull_request` / `update_*` / files / checks / threads / … | MR + pipelines + discussions APIs | Planned |
| `list_organization_projects` / `add_pull_request_to_project` | Boards/epics — different model | N/A / Later |

**Shipped GitLab-only tools**: `ping_gitlab`, `list_merge_requests`, `create_merge_request`.

---

## Instance config

| GitHub | GitLab | Status |
|--------|--------|--------|
| `githubTokenRef` | `gitlabTokenRef` | Done |
| `paperclipBoardApiTokenRefs` / `paperclipApiBaseUrl` | Same pattern when needed | Planned |
| — | `gitlabBaseUrl` | Done |

---

Update this file when shipping new tools or capabilities.
