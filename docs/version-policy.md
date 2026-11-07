> November 2026 security revision: advisory-driven FastAPI, Starlette, multipart, pytest and pip updates are pinned and regression-tested. Cryptography is added for encrypted administrator MFA. See launch-audit.md for current results; older test counts below are historical.

> Current design: the latest clean-editorial revision removes the animated-world presentation while preserving content, functionality and exact dependency locks. See `docs/quiet-redesign.md` (or `quiet-redesign.md` within this docs folder). Earlier animation details below describe the prior stage.

# Locked runtime and dependency policy

This change pins the versions already installed and tested; it does not upgrade the existing application dependencies.

| Component | Locked version | Verification |
| --- | --- | --- |
| Node.js | 22.20.0 | Local build/runtime |
| npm | 11.6.2 | Local installation and lockfile |
| Python | 3.12.10 | Local API and tests |
| pip | 26.2.0 | Included in Python environment lock |
| Next.js / React / React DOM | Exact versions in frontend/package.json | Build and TypeScript |
| Motion, TypeScript, Tailwind, Playwright and all frontend tools | Exact installed versions in package.json and package-lock.json | Lock consistency and compilation; browser suite not executed |
| FastAPI, SQLAlchemy, Alembic, Pydantic and all Python transitives | Exact installed versions in backend/requirements.lock | 13 API tests and pip check |
| PostgreSQL | 17.6, Alpine 3.22, immutable image digest | Registry manifest verified; execution not tested here |
| Node and Python container bases | Exact runtime tags plus immutable digests | Registry manifests verified; Docker build not tested here |

`runtime-lock.json` is the machine-readable runtime/image record. `.nvmrc`, `.node-version`, `.python-version`, npm engine enforcement and Python project metadata agree with it. Dockerfiles install npm 11.6.2 and pip 26.2.0 explicitly. Container base tags cannot drift because they include SHA-256 digests.

Use `npm ci`, not an unconstrained dependency update. The complete Python environment is installed with `python -m pip install -r backend/requirements.txt`, which includes `requirements.lock`. The frozen environment explicitly installs the standard server components without floating platform extras. The Windows-tested environment is not represented as a Linux integration test; run container/PostgreSQL checks before deployment.

Run `.venv/Scripts/python scripts/check-versions.py` before checks. A mismatch fails rather than silently updating. Unused Three.js and Anime.js dependencies were removed during project cleanup. Motion and CSS power the active UI and scroll animation; remaining dependency versions stay pinned.

## Manual updates only

1. Create a local Git branch and record the intended change.
2. Read release/security notes and select exact versions; never use `latest`, `^`, `~` or unversioned container tags.
3. Update direct constraints, resolve and inspect transitive lockfile changes, and refresh image digests deliberately.
4. Run version consistency, pip compatibility, TypeScript, production build, all API tests, PostgreSQL migrations, browser journeys, accessibility and desktop/mobile motion review.
5. Test a database restore and deployment rollback when schema or runtime changes are involved.
6. Commit source and lockfiles together only after compatibility/regression checks. Retain the previous production build and database recovery point.

Local version control is used for the repository and locks; no remote push or public deployment is part of this task. Tooling not installed here (Docker Engine/Compose) must be validated and recorded in the deployment environment before production sign-off.
