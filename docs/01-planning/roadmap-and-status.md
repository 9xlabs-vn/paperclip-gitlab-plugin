# Roadmap and status (Stage 01 — Planning)

**Last reviewed**: 2026-04-18 (updated after connector settings + workspace flow stabilization)  
**Sources**: monorepo `doc/plans/2026-04-18-mantis-and-gitlab-connector-plugins.md`, packages under `plugins/`.

Living tracker for **connector scope** (GitLab + related). Update when milestones land.

## Program phases (design plan)

| Phase | Theme | Contents |
|-------|--------|----------|
| **A — Foundations** | Scaffold, minimal tools | GitLab settings + minimal MR tools; Mantis scaffold/sync (separate package) |
| **B — Workflow depth** | Richer automation & UI | GitLab: pipelines, discussions, MR UI; Mantis: reverse sync |
| **C — Hardening** | Production quality | Dedup, repair paths, board tokens, rate limits |

---

## Plugin inventory and feature matrix

Legend: **Done** | **In progress** | **Planned** | **Not started**

### 1. `paperclip-gitlab-plugin` (this package)

| Feature | Phase | Status | Notes |
|---------|-------|--------|--------|
| Package scaffold + build | A | Done | |
| Instance settings (`gitlabBaseUrl`, `gitlabTokenRef`) | A | Done | Self-managed OK |
| Agent tool `ping_gitlab` | A | Done | `/api/v4/version` |
| Agent tool `list_merge_requests` | A | Done | By `projectPath` |
| Agent tool `create_merge_request` | A | Done | |
| Plugin state: Paperclip `projectId` ↔ GitLab `pathWithNamespace` (+ clone URL hints for agents) | A | Done | Stored in instance state; MR tools resolve path from run context when omitted |
| Repositories settings UX parity with GitHub connector | A | Done | Existing linked-project picker, add/remove rows, project-name auto-suggest from repo input |
| Workspace binding on save (`git_repo`) | A | Done | `Save settings` ensures per-project GitLab workspace binding |
| Per-repository default branch in item card | A | Done | Branch list + selected branch saved via main `Save settings` |
| Clone-source branch propagation in heartbeat | A | Done | Managed clone uses `defaultRef/repoRef` with `git clone -b` |
| Project env key sync for git token (`PAPERCLIP_GIT_PERSONAL_TOKEN`) | A | Done | Set on mapped projects during save (secret_ref preferred, plain fallback) |
| Archived project handling in connector settings | A | Done | Archived projects excluded from candidates/mappings; reconnect can unarchive |
| Settings flicker fixes (typing/save/branch reload) | A | Done | Reduced branch/candidate reload churn; stable row rendering after save |
| Jobs / polling | B | Planned | If sync beyond on-demand tools |
| Pipelines, MR discussions, richer tools | B | Planned | REST `/api/v4` |
| Project UI (sidebar / MR / pipeline) | B | Planned | |
| Rate limits, observability | C | Planned | |

**Today**: Phase **A** is functionally complete for settings + binding + branch + managed clone preparation. Optional jobs/UI remain for later phases.

---

## Known limitations (current)

1. **Private repo clone auth is host-level**
   - Connector PAT (`gitlabTokenRef`) is used for GitLab REST API calls.
   - Managed `git clone` still relies on host git auth (SSH keys / credential helper / credentialized URL).
2. **No direct unarchive control in core project page**
   - Unarchive currently happens through reconnect flow in GitLab Connector.
3. **No issue sync yet**
   - Current scope is project/repo binding + MR tools, not GitLab issue import.

---

### 2. `paperclip-mantis-plugin` (planned)

| Feature | Phase | Status |
|---------|-------|--------|
| Scaffold | A | Not started |
| Mantis → Paperclip issue sync | A | Not started |
| State mappings + cursors | A | Not started |
| Webhooks / scheduled poll | A–B | Not started |

---

### 3. `paperclip-github-plugin` (reference)

Shipped (npm / optional in-tree). Use for **patterns only**.

Detailed mapping: [`../02-design/github-to-gitlab-parity.md`](../02-design/github-to-gitlab-parity.md).

---

## Cross-plugin coordination

| Concern | Status |
|---------|--------|
| Mantis issue ↔ GitLab MR context | Planned (metadata / entities); see design plan |

---

## Process snapshot

```text
GitLab (this repo): Phase A complete for connector settings/workspace prep
Mantis:             Phase A not started
GitHub Sync:        Shipped (reference)
```

**Suggested next steps**

1. GitLab: add operator-facing **git auth readiness checks** (host credential helper / SSH) to reduce clone failures.
2. GitLab: add optional project-level UI actions (unarchive / reconnect diagnostics).
3. Mantis: scaffold package + API spike.
