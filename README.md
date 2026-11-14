# taste-gate CI

Runs the `design-taste-frontend` (tasteskill 2.5.1) finish gate in GitHub Actions,
pinned to skill commit `f6b7657`, in real Chrome at 1440/390 + the checker's 320 pass.

- `.github/workflows/taste-gate.yml` — workflow (push to main, or manual dispatch)
- `ci/run-gate.sh` — arms `.taste-skill/build.json` then runs `gate.mjs`
- `index.html` — **intentionally bad sample page** (proves the pipeline fails correctly)

First run is expected to end with `GATE: FAIL` and a red check: that is the pipeline
working. Replace `index.html` with the real page afterwards.
