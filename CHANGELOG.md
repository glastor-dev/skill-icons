# Changelog

## 1.0.1

- Adds this changelog.

## 1.0.0

- Cloudflare Worker that renders combined SVG icons via `/icons`.
- Request hardening: strict validation, limits for `i` length and icon count.
- Caching: `ETag` support with `If-None-Match` → `304`, plus `Cache-Control`.
- `/api/svgs` is protected via `SVGS_API_KEY` (hidden by default).
- Dev workflow with `wrangler dev` and icon watcher; tests/lint/format + CI.
