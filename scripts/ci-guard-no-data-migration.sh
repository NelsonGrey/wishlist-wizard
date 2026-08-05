#!/usr/bin/env bash
set -euo pipefail

# Enforce environment promotion policy:
# - Allowed: setup/config promotion (rules, indexes, functions, hosting, schema)
# - Forbidden: Firestore live data migration between environments

WORKFLOW_FILE=".github/workflows/master-pipeline.yml"

if [[ ! -f "$WORKFLOW_FILE" ]]; then
  echo "❌ Policy guard error: missing workflow file: $WORKFLOW_FILE"
  exit 1
fi

# Block direct data migration commands in CI workflow.
# These commands move live document data and must never run in pipeline promotion.
FORBIDDEN_PATTERNS=(
  "firestore:import"
  "firestore:export"
  "gcloud firestore export"
  "gcloud firestore import"
)

violations=0
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -Eqi "$pattern" "$WORKFLOW_FILE"; then
    echo "❌ Policy violation: '$pattern' found in $WORKFLOW_FILE"
    violations=1
  fi
done

if [[ "$violations" -ne 0 ]]; then
  echo "❌ Blocked by policy: setup/config can be promoted, but live environment data migration is prohibited."
  exit 1
fi

echo "✅ Policy guard passed: no Firestore data migration commands found in CI workflow."
