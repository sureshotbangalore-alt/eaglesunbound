# Locked runtime and dependency policy

Everything is pinned. Nothing is upgraded automatically.

| Component | Locked version | Where |
| --- | --- | --- |
| Node.js | 22.20.0 | `runtime-lock.json`, `.node-version`, `.nvmrc` (engines allow 22.x) |
| npm | 11.6.2 | `runtime-lock.json`, `packageManager` |
| All packages (backend, frontend, tooling) | Exact versions, no `^` or `~` | each `package.json` and the single root `package-lock.json` |

Run `node scripts/check-versions.mjs` to fail on drift (floating ranges, `package.json` vs lockfile mismatch, wrong runtime). Run `node scripts/security-audit.mjs` and `npm audit` to check for known advisories.

## Manual updates only

1. Create a branch and note the intended change.
2. Read release and security notes and choose exact versions; never `latest`, `^` or `~`.
3. `npm install --save-exact <pkg>@<version> --workspace <backend|frontend>`, then run `npm run typecheck`, `npm test`, `npm run build` and the browser tests.
4. Commit `package.json` and `package-lock.json` together.
