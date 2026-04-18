# GitLab Connector

Link GitLab projects to Paperclip and expose GitLab REST API agent tools.

## Documentation

Docs follow **SDLC stage folders** under **[`docs/`](./docs/README.md)** (`00-foundation` … `06-deploy`): roadmap, parity vs GitHub Sync, contracts, build/test/deploy.

The **[`docs/sdlc/`](./docs/sdlc/README.md)** tree is the bundled **SDLC methodology reference** (playbooks, roles, templates); use alongside the stage folders above.

Paperclip plugin authoring and specs remain in the monorepo under `doc/plugins/` (`PLUGIN_SPEC.md`, `PLUGIN_AUTHORING_GUIDE.md`).

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```



## Install Into Paperclip

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/Users/norashing/Documents/Work/paperclip/plugins/paperclip-gitlab-plugin","isLocalPath":true}'
```

## Build Options

- `pnpm build` uses esbuild presets from `@paperclipai/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.

## npm release workflow

This repo includes `.github/workflows/release-npm.yml` to publish to npm.

- Trigger: GitHub Release `published` (or manual `workflow_dispatch`)
- Required secret: `NPM_TOKEN` (npm automation token with publish access)
- Publish target: `@9xlabs/paperclip-gitlab-plugin`
- Publish command in CI: `pnpm publish --no-git-checks --access public`

Before publishing, CI runs:

```bash
pnpm prepublishOnly
```

Which validates:

```bash
pnpm typecheck && pnpm test && pnpm build
```
