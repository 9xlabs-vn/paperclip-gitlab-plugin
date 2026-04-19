# @9xlabs/paperclip-gitlab-plugin

GitLab connector plugin for [Paperclip](https://github.com/paperclipai/paperclip).

**This repository** is the 9xLabs–maintained home for the package (source, release, docs). The Paperclip **core** app and monorepo are upstream and are **not** developed here—install this plugin into any compatible Paperclip instance via npm or a local path.

This plugin helps operators:

- connect a Paperclip instance to GitLab with API token validation,
- map Paperclip projects to GitLab repositories,
- store per-repository default branches,
- expose GitLab merge request tools to agents.

## What this plugin includes

- Worker + UI entrypoints (`src/worker.ts`, `src/ui/index.tsx`)
- GitLab settings page (token, mapping, branch)
- Project/repository binding helpers
- Agent tools:
  - `ping_gitlab`
  - `get_git_access_info`
  - `list_merge_requests`
  - `create_merge_request`

## Requirements

- Paperclip runtime with plugin support
- GitLab Personal Access Token (API scope)
- For private git clone in managed workspace: host git auth must be configured (SSH key or credential helper).  
  Connector token is for GitLab API calls, not automatic git clone auth injection.

## Development

Clone this repo (not the full Paperclip monorepo). Dependencies resolve from the public npm registry (`@paperclipai/plugin-sdk`, etc.).

```bash
pnpm install
pnpm dev
pnpm dev:ui
pnpm test
```

Useful commands:

```bash
pnpm typecheck
pnpm build
pnpm build:rollup
```

## Install into local Paperclip

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/absolute/path/to/paperclip-gitlab-plugin","isLocalPath":true}'
```

Or from the CLI (with `PAPERCLIP_API_URL` pointing at your instance):

`pnpm paperclipai plugin install /absolute/path/to/paperclip-gitlab-plugin`

## Configuration flow

1. Open Paperclip -> Settings -> Plugins -> GitLab Connector
2. Set `gitlabBaseUrl`
3. Validate and save `gitlabTokenRef` (stored as secret ref)
4. Add repository mappings (GitLab path -> Paperclip project)
5. Save settings to apply bindings/workspaces/default branch data

## Documentation

Project docs are under [`docs/`](./docs/README.md):

- planning/status: [`docs/01-planning/roadmap-and-status.md`](./docs/01-planning/roadmap-and-status.md)
- design parity: [`docs/02-design/github-to-gitlab-parity.md`](./docs/02-design/github-to-gitlab-parity.md)
- contracts: [`docs/03-integrate/paperclip-and-gitlab-contracts.md`](./docs/03-integrate/paperclip-and-gitlab-contracts.md)

The [`docs/sdlc/`](./docs/sdlc/README.md) folder is a bundled methodology reference.

## npm release

Package: `@9xlabs/paperclip-gitlab-plugin`

Workflow: `.github/workflows/release-npm.yml`

- Trigger: GitHub Release `published` or manual `workflow_dispatch`
- Required repo secret: `NPM_TOKEN`
- Publish command:

```bash
pnpm publish --no-git-checks --access public --registry https://registry.npmjs.org/
```

Prepublish validation:

```bash
pnpm prepublishOnly
```

Which runs:

```bash
pnpm typecheck && pnpm test && pnpm build
```
