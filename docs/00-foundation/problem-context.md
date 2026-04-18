# Problem context (Stage 00 — Foundation)

**WHY** this plugin exists within the Paperclip ecosystem.

## Problem

Teams outsource **tickets** (e.g. MantisBT) and **code** (GitLab) while using **Paperclip** for companies, projects, agents, and workspaces. They need a **GitLab connector** that uses the GitLab HTTP API (merge requests, pipelines, etc.) without pretending `git` on disk is the same concern as API tokens.

## Scope boundaries

- **In scope**: GitLab REST `/api/v4`, secret refs, agent tools, optional UI surfaces — see monorepo product plan.
- **Out of scope (v1)**: Full parity with `paperclip-github-plugin`; replacing GitLab/Mantis as system of record unless the org migrates.

## Authoritative references

| Topic | Location |
|-------|-----------|
| Split plugin design (Mantis + GitLab) | Monorepo `doc/plans/2026-04-18-mantis-and-gitlab-connector-plugins.md` |
| Plugin runtime contract | Monorepo `doc/plugins/PLUGIN_SPEC.md` |
| Authoring / install | Monorepo `doc/plugins/PLUGIN_AUTHORING_GUIDE.md` |

## Related work

- **GitHub Sync** (`paperclip-github-plugin`): pattern reference only — not an API clone target.
- **Mantis connector** (`paperclip-mantis-plugin`): planned separate package; coordinates via Paperclip issues/metadata per plan.

## Next stage

Requirements and backlog: [`../01-planning/roadmap-and-status.md`](../01-planning/roadmap-and-status.md).
