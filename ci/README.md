# Tier 2 — the real gate in GitHub Actions

Runs the skill's actual `gate.mjs` (tasteskill 2.5.1, pinned to
`f6b76575f949707b4e3c37cd86cb44b0b98643e8`) in real Chrome at 1440/390 (plus
the checker's 320 pass), because no Chrome binary exists on the phone.

## Why Actions can host it

The `ubuntu-latest` image ships **Google Chrome 157** at
`/usr/bin/google-chrome` (one of the paths `findChrome()` looks for) and
**Node 22.23.4**, which satisfies the skill's "Node 22+" requirement. The gate
supplies its own local HTTP server and CDP connection, so nothing else is
needed.

## What the repo needs

```
repo/
├─ .github/workflows/taste-gate.yml   # copy of ci/taste-gate.yml
├─ ci/run-gate.sh                     # copy of ci/run-gate.sh
├─ index.html                         # the page under test (or dist/index.html)
└─ assets/…                           # whatever the page loads
```

The skill is **not vendored**: the workflow downloads the pinned tarball each
run (~29 MB, a few seconds). Updating the skill = bumping `SKILL_REF`.

Commit `.taste-skill/waivers.json` if you have legitimate waivers — they are
part of the page's contract. Do **not** commit `.taste-skill/build.json`
(build state) or `shots/` (artifacts): add to `.gitignore`:

```gitignore
.taste-skill/build.json
.taste-skill/gate.json
.taste-skill/gate-blocks.json
.taste-skill/*.tmp
shots/
gate.log
skill.tar.gz
.ci-skill/
```

## Verdicts → exit codes

| Output | Exit | Meaning |
|---|---|---|
| `GATE: PASS` | 0 | clean |
| `GATE: FAIL <n>` | 1 | fixable failures remain |
| `GATE: OPEN <n>` | 1 | rounds used up; ship-or-fix decision |
| `GATE: QUICK` | 1 | quick look, not a finishing run |
| `GATE: ERROR` | 2 | checks could not run (env problem) |
| `GATE: SETUP` | 3 | armed target cannot be checked (bad page/root) |
| `GATE: OFF` | 0 | **no build armed** — script escalates this to exit 2 |

`run-gate.sh` arms with `--start` first and refuses to continue if
`.taste-skill/build.json` is missing, precisely because an unarmed run exits 0
and would silently pass CI.

## Inputs (workflow_dispatch)

- `page` — relative path, default `index.html`
- `root` — built-site root (`dist`, `out`) for pages whose links start at `/`
- `kind` — software / gaming / tech / product / service / place
- `category` — what is sold
- `primary` — the one main action

For a framework project, the workflow runs `npm ci` + `npm run build` when a
`package.json` with a build script exists; arm the built file and pass `--root`.

## Local parity

Pinned ref + fixed widths means the same page should produce the same verdict
locally and in CI. Compare with the on-device Tier 0/1 tools
(`qa/`, `copy-lint.mjs`); if they ever disagree with CI, **CI wins**.

## Reading the verdict without a token

The workflow publishes the gate's final line as a **commit status**
(`context: taste-gate`), so a public repo's result is readable anonymously:

```bash
curl -s https://api.github.com/repos/OWNER/REPO/commits/<sha>/status \
  | jq -r '.statuses[] | "\(.context) \(.state): \(.description)"'
# taste-gate failure: GATE: FAIL 24 (round 1 of 3)
```

That covers the pass/fail verdict and the failure count. Full per-check detail
lives in the job log, which the REST API only serves to authenticated users
(`403 Must have admin rights` on public repos too), and in the uploaded
artifacts. To make the full detail machine-readable without a PAT, add a step
that copies `gate.log` onto an orphan `ci-logs` branch (needs
`permissions: contents: write`); then any run's log is at
`https://raw.githubusercontent.com/OWNER/REPO/ci-logs/ci-gate.log`.
