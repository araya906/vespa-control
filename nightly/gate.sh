#!/usr/bin/env bash
# Push gate for nightly runs.
#   bash nightly/gate.sh --preflight        run checks only, record the rollback anchor
#   bash nightly/gate.sh "<one-line summary>"  run checks; if all pass, commit and push to main
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
LOG=logs/runs.tsv
[ -f "$LOG" ] || printf "date\tbase_commit\tstatus\tsummary\n" > "$LOG"
now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

if node nightly/check.mjs > logs/last_checks.txt 2>&1; then status=PASS; else status=FAIL; fi
cat logs/last_checks.txt

if [ "${1:-}" = "--preflight" ]; then
  printf "%s\t%s\tPREFLIGHT_%s\t-\n" "$(now)" "$(git rev-parse --short HEAD)" "$status" >> "$LOG"
  [ "$status" = PASS ] && exit 0 || exit 2
fi

msg="${1:?usage: gate.sh \"summary\"}"
if [ "$status" != PASS ]; then
  printf "%s\t%s\tFAIL\t%s\n" "$(now)" "$(git rev-parse --short HEAD)" "$msg" >> "$LOG"
  echo "Gate FAILED: nothing committed. Fix the failing checks or roll back to the preflight anchor." >&2
  exit 1
fi

printf "%s\t%s\tPASS\t%s\n" "$(now)" "$(git rev-parse --short HEAD)" "$msg" >> "$LOG"
git add -A
commit_msg="$msg"
[ -n "${VC_TRAILER:-}" ] && commit_msg="$(printf "%s\n\n%s" "$msg" "$VC_TRAILER")"
git commit -q -m "$commit_msg"
git push origin HEAD:main
echo "Pushed $(git rev-parse --short HEAD)"
