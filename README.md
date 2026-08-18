<p align="center">
  <img src="https://content.umami.is/website/images/umami-logo.png" alt="Umami Logo" width="100">
</p>

<h1 align="center">Umami</h1>

<p align="center">
  <i>Umami is a privacy-first analytics platform. Traffic, campaigns, behavior, conversions, and revenue in one place — no cookies, no surveillance, self-hosted or in the cloud.</i>
</p>

<p align="center">
  <a href="https://github.com/umami-software/umami/releases"><img src="https://img.shields.io/github/release/umami-software/umami.svg" alt="GitHub Release" /></a>
  <a href="https://github.com/umami-software/umami/blob/master/LICENSE"><img src="https://img.shields.io/github/license/umami-software/umami.svg" alt="MIT License" /></a>
  <a href="https://github.com/umami-software/umami/actions"><img src="https://img.shields.io/github/actions/workflow/status/umami-software/umami/ci.yml" alt="Build Status" /></a>
  <a href="https://cloud.umami.is/share/LGazGOecbDtaIwDr/umami.is" style="text-decoration: none;"><img src="https://img.shields.io/badge/Try%20Demo%20Now-Click%20Here-brightgreen" alt="Umami Demo" /></a>
</p>

---

## 🚀 Getting Started

A detailed getting started guide can be found at [umami.is/docs](https://umami.is/docs/).

---

## 🛠 Installing from Source

### Requirements

- A server with Node.js version 18.18+.
- A PostgreSQL database version v12.14+.

### Get the source code and install packages

```bash
git clone https://github.com/umami-software/umami.git
cd umami
pnpm install
```

### Configure Umami

Create an `.env` file with the following:

```bash
DATABASE_URL=connection-url
```

Optional: set `API_URL` to change the base URL used by internal UI API calls.
Relative paths are served under `BASE_PATH`; absolute URLs are proxied through the local `/api` route.
For example, `API_URL=/internal-api` or `API_URL=https://api.example.com/api`.

The connection URL format:

```bash
postgresql://username:mypassword@localhost:5432/mydb
```

### Build the Application

```bash
pnpm run build
```

The build step will create tables in your database if you are installing for the first time. It will also create a login user with username **admin** and password **umami**.

### Start the Application

```bash
pnpm run start
```

By default, this will launch the application on `http://localhost:3000`. You will need to either [proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) requests from your web server or change the [port](https://nextjs.org/docs/api-reference/cli#production) to serve the application directly.

---

## 🐳 Installing with Docker

This fork publishes **`ghcr.io/polyjapan/umami-sso:latest`**. A Docker compose file is included for easy deployment.

Docker image:

```bash
docker pull ghcr.io/polyjapan/umami-sso:latest
```

Docker compose (Runs Umami with a PostgreSQL database):

```bash
docker compose up -d
```

---

## 🔄 Getting Updates

To get the latest features, simply do a pull, install any new dependencies, and rebuild:

```bash
git pull
pnpm install
pnpm build
```

To update the Docker image, simply pull the new images and rebuild:

```bash
docker compose pull
docker compose up --force-recreate -d
```

---

## 🔐 Single Sign-On (OIDC)

This fork adds generic OpenID Connect (OIDC) SSO. The target identity provider is [Zitadel](https://zitadel.com/). When OIDC is configured, a SSO button appears on the login page. Password login remains available unless you also set `DISABLE_LOGIN=true`.

### Configuration

All OIDC variables are optional. SSO is enabled when `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET` are all set. Discovery is loaded from `OIDC_ISSUER/.well-known/openid-configuration`.

```bash
OIDC_ISSUER=https://zitadel.example.com
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
# OIDC_REDIRECT_URI=
# OIDC_SCOPE=openid profile email
# OIDC_ROLES_CLAIM=urn:zitadel:iam:org:project:roles
# OIDC_WRITE_ROLE=write
# OIDC_VIEW_ROLE=view-only
# DISABLE_LOGIN=true
```

If unset, `OIDC_REDIRECT_URI` defaults to `<BASE_URL>/<BASE_PATH>/api/auth/oidc/callback`. `<BASE_URL>` is derived from the incoming request `Host` / `X-Forwarded-*` headers. If you run Umami behind a reverse proxy, either set `OIDC_REDIRECT_URI` explicitly or ensure the proxy forwards `Host` and `X-Forwarded-Proto` correctly.

See `.env.example` for a copy-paste template. The Docker Compose file uses the fork image `ghcr.io/polyjapan/umami-sso:latest` and includes the same OIDC variables and `DISABLE_LOGIN` as comments.

### SSO-only mode

When OIDC is configured **and** `DISABLE_LOGIN=true`:

- The password form on the login page is hidden.
- `POST /api/auth/login` returns **403**.
- Password change and 2FA UI are hidden.

### Auto-provisioning and roles

On first SSO login, a local user is created with a random unusable password. The username is taken from `preferred_username`, then `email`, then `sso-<sub>`.

Roles are read from the Zitadel project-roles claim (`OIDC_ROLES_CLAIM`). The claim is a JSON object whose keys are the role names (Zitadel format):

- The user has the `write` role (`OIDC_WRITE_ROLE`) → Umami role `admin`.
- The user has the `view-only` role (`OIDC_VIEW_ROLE`) → Umami role `view-only`.
- Neither role → login is denied.

Roles are re-synced on every login. Removing a Zitadel role downgrades the user at the next login. The seeded local `admin` account is never modified by this sync.

### Zitadel setup

1. Create a **Web** application using the **authorization code** flow.
2. Register the redirect URI (default: `<BASE_URL>/<BASE_PATH>/api/auth/oidc/callback`).
3. Create project roles `write` and `view-only`. These names are configurable via `OIDC_WRITE_ROLE` / `OIDC_VIEW_ROLE` if you want different names.
4. Enable role assertion in tokens so the `urn:zitadel:iam:org:project:roles` claim is emitted.
5. Assign roles to users.

### Break-glass (local admin)

If SSO is misconfigured and `DISABLE_LOGIN=true` has locked you out:

1. Set `DISABLE_LOGIN` to `false`, or unset it.
2. Restart Umami.
3. Log in with the local admin account (default `admin` / `umami` on a fresh install — change it).
4. Fix the SSO configuration.
5. Re-enable SSO-only mode if desired (`DISABLE_LOGIN=true`).

---

## 🛟 Support

<p align="center">
  <a href="https://github.com/umami-software/umami"><img src="https://img.shields.io/badge/GitHub--blue?style=social&logo=github" alt="GitHub" /></a>
  <a href="https://twitter.com/umami_software"><img src="https://img.shields.io/badge/Twitter--blue?style=social&logo=twitter" alt="Twitter" /></a>
  <a href="https://linkedin.com/company/umami-software"><img src="https://img.shields.io/badge/LinkedIn--blue?style=social&logo=linkedin" alt="LinkedIn" /></a>
  <a href="https://umami.is/discord"><img src="https://img.shields.io/badge/Discord--blue?style=social&logo=discord" alt="Discord" /></a>
</p>

[release-shield]: https://img.shields.io/github/release/umami-software/umami.svg
[releases-url]: https://github.com/umami-software/umami/releases
[license-shield]: https://img.shields.io/github/license/umami-software/umami.svg
[license-url]: https://github.com/umami-software/umami/blob/master/LICENSE
[build-shield]: https://img.shields.io/github/actions/workflow/status/umami-software/umami/ci.yml
[build-url]: https://github.com/umami-software/umami/actions
[github-shield]: https://img.shields.io/badge/GitHub--blue?style=social&logo=github
[github-url]: https://github.com/umami-software/umami
[twitter-shield]: https://img.shields.io/badge/Twitter--blue?style=social&logo=twitter
[twitter-url]: https://twitter.com/umami_software
[linkedin-shield]: https://img.shields.io/badge/LinkedIn--blue?style=social&logo=linkedin
[linkedin-url]: https://linkedin.com/company/umami-software
[discord-shield]: https://img.shields.io/badge/Discord--blue?style=social&logo=discord
[discord-url]: https://discord.com/invite/4dz4zcXYrQ
