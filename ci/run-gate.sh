#!/usr/bin/env bash
# Arm the tasteskill finish gate for this build, run it, log it, and propagate
# its verdict as the exit code.
#
#   SKILL_DIR=.ci-skill PAGE=index.html bash ci/run-gate.sh
#   SKILL_DIR=.ci-skill PAGE=dist/index.html ROOT=dist KIND=software \
#     CATEGORY="a code review tool" PRIMARY="Start a free trial" bash ci/run-gate.sh
#
# Exit codes come from gate.mjs:
#   0  GATE: PASS
#   1  GATE: FAIL / GATE: OPEN / GATE: QUICK
#   2  GATE: ERROR
#   3  GATE: SETUP
#
# A fresh CI checkout has no .taste-skill/build.json, so --start arms a new
# build. If it somehow does not arm, we fail loudly: an unarmed run prints
# "GATE: OFF" and exits 0, which would silently pass CI.

set -euo pipefail

SKILL_DIR="${SKILL_DIR:?set SKILL_DIR to the fetched skill folder}"
PAGE="${PAGE:-index.html}"
ROOT="${ROOT:-}"
KIND="${KIND:-}"
CATEGORY="${CATEGORY:-}"
PRIMARY="${PRIMARY:-}"
ROUNDS="${ROUNDS:-3}"

GATE="$SKILL_DIR/scripts/gate.mjs"
test -f "$GATE" || { echo "gate.mjs not found at $GATE" >&2; exit 2; }

ARGS=( "$PAGE" )
[[ -n "$ROOT"     ]] && ARGS+=( --root "$ROOT" )
[[ -n "$KIND"     ]] && ARGS+=( --kind "$KIND" )
[[ -n "$CATEGORY" ]] && ARGS+=( --category "$CATEGORY" )
[[ -n "$PRIMARY"  ]] && ARGS+=( --primary "$PRIMARY" )

echo "== arm =="
node "$GATE" --start "${ARGS[@]}" --rounds "$ROUNDS"

# An unarmed build is the one silent-pass failure mode; refuse it.
if [[ ! -f .taste-skill/build.json ]]; then
  echo "gate: build was not armed (.taste-skill/build.json missing)" >&2
  echo "GATE: ERROR (build not armed in CI)" >&2
  exit 2
fi

echo "== run =="
set +e
node "$GATE" "${ARGS[@]}" 2>&1 | tee gate.log
code=${PIPESTATUS[0]}
set -e

echo "== verdict =="
grep -E '^GATE:' gate.log | tail -1 || true
exit "$code"
