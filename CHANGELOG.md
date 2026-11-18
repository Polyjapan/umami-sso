# Chanwe changes

CHANWE's changes to the fork (formerly `CHANGELOG.chanwe.md`). Upstream Umami's are in its releases:
https://github.com/umami-software/umami/releases

## Unreleased

- CHANWE v2 brand copies synced from chanwe-brandbook 2.0.1 (`pnpm brand:sync`): 12 files (v2 wordmark, icons and favicons; generated files only change the brand paths in their comments).

- Brand copies refreshed from kit 1.1.0 (`pnpm brand:sync`): fg-subtle is now #5B6677, new tokens primary-hover, primary-pressed and shell-bar.
- Docs: `docs/es/` and `docs/en/` with `start_here.md`, `data-tree.md` and `guide.md` for CHANWE's layer; this file
  renamed from `CHANGELOG.chanwe.md`.
- `docker/compose.local.yml`: builds the image and runs it locally with a throwaway PostgreSQL and Redis.
- `.env.chanwe.example`: adds `OIDC_VIEW_ROLE`, `DISABLE_LOGIN` and `BASE_PATH`, which the code reads.

## 3.4.1-chanwe.1 - 2026-10-27

- Upstream security fixes, Next.js 16.4.2, React 19.3.1, Node 22.23.4 in the Dockerfile (entry written on 2026-11-03
  from commit d91de4e36).

## 3.4.0-chanwe.2 - 2026-10-17

- Replace utility dots with a hamburger and use the shared authenticated photo/account/roles/access preview with a link to Espacios Cuenta. Preserve desktop navigation.

## 3.4.0-chanwe.1 - 2026-10-17

- Keep the account control visible in the web header; group Help, native theme/language preferences and the existing Espacios sign-out route in one Brandbook utilities menu. Preserve desktop navigation.
- Navigation unit tests pass; full TypeScript checking reports errors in unchanged MCP/2FA files.
