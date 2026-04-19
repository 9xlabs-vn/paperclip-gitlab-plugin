# Operator install (Stage 06 — Deploy)

## Build

From a clone of **this** repository (this package, not the Paperclip app monorepo):

```bash
cd paperclip-gitlab-plugin
pnpm install
pnpm build
```

`prepack` / `prepublishOnly` also run `build` and checks; see `package.json` scripts.

## Local / dev path

Install into the Paperclip host from the **absolute** path to this package on the machine where the **server** runs:

```bash
pnpm paperclipai plugin install /absolute/path/to/paperclip-gitlab-plugin
```

(With `PAPERCLIP_API_URL` and admin auth set; see Paperclip CLI docs.)

Or HTTP API (example):

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/absolute/path/to/paperclip-gitlab-plugin","isLocalPath":true}'
```

## Configuration

After install, open **Instance → Settings → Plugins** and the **GitLab Connector** settings page:

- **GitLab base URL** — include scheme; use your self-managed hostname when applicable.
- **GitLab token** — stored as a company secret; the instance config holds a secret ref the worker resolves.

## Production

Prefer installing the **npm package** `@9xlabs/paperclip-gitlab-plugin@<version>` (or a private registry mirror) on the host so the server does not need a git clone of this repo on disk.

## Operate

For day-2 operations (rotate token, troubleshoot 401/403), use your org’s runbook or the docs under `docs/` in this repository.
