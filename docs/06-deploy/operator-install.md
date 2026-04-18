# Operator install (Stage 06 — Deploy)

## Local / dev path

Build the plugin, then install into the Paperclip host from the **absolute** package path:

```bash
pnpm --filter paperclip-gitlab-plugin build
pnpm paperclipai plugin install /absolute/path/to/paperclip/plugins/paperclip-gitlab-plugin
```

Or HTTP API (example):

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/absolute/path/to/paperclip/plugins/paperclip-gitlab-plugin","isLocalPath":true}'
```

The host may watch local-path plugins and reload workers after rebuilds — see monorepo `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`.

## Configuration

After install, open **instance plugin settings** for `paperclip-gitlab-plugin`:

- **GitLab base URL** — include scheme; use your self-managed hostname when applicable.
- **GitLab token secret reference** — Paperclip secret ref pointing to a PAT or bot token with API access appropriate for your workflows.

## Production

Prefer publishing an **npm package** (or private registry tarball) and installing by package name/version rather than cloning this repo on the server.

Host deployment topics (Docker, secrets, storage): monorepo `docs/deploy/` (Paperclip product docs).

## Operate

For day-2 operations (rotate token, troubleshoot 401/403), keep runbook notes beside this doc or link your org’s internal ops wiki.
