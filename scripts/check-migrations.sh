#!/bin/sh
# Checks the migrations a branch adds against the branch it will merge into.
#
#   sh scripts/check-migrations.sh origin/main
#
# Fails when:
#   - a migration that already exists on the base branch was edited, renamed or deleted
#     (it may already be applied to the hosted database; add a new migration instead).
#     One exception: a rename that keeps the file byte-for-byte the same is allowed, so a
#     file can be renamed to the version the hosted database recorded when it was applied.
#   - a new migration's version is not later than every migration on the base branch
#     (the hosted database would skip or reorder it)
#   - a file name is not <14-digit version>_<lowercase_name>.sql
set -eu

base=${1:?usage: check-migrations.sh <base-ref>}
dir=supabase/migrations
failed=0

fail() {
  echo "::error::$1"
  failed=1
}

if ! git rev-parse --verify --quiet "$base^{commit}" > /dev/null; then
  echo "::error::Unknown base branch '$base'. Fetch it first (for example, git fetch origin main)."
  exit 1
fi

# Every migration file name must look like 20261022064812_delete_event.sql.
for file in "$dir"/*.sql; do
  name=$(basename "$file")
  if ! echo "$name" | grep -Eq '^[0-9]{14}_[a-z0-9_]+\.sql$'; then
    fail "$name: name it <14-digit version>_<lowercase_name>.sql (use 'supabase migration new <name>')."
  fi
done

# Two files with the same version would collide in the hosted migration history.
duplicates=$(ls "$dir" | grep -Eo '^[0-9]{14}' | sort | uniq -d)
if [ -n "$duplicates" ]; then
  fail "Two migrations share the version $duplicates."
fi

# Existing migrations are history: changing one does nothing on the hosted database.
# -M100% reports a rename only when the contents are identical (R100); a rename that also
# edits the file shows up as a delete plus an add, and the delete fails here.
changed=$(git diff --name-status -M100% "$base"...HEAD -- "$dir" | grep -v '^A' | grep -v '^R100' || true)
if [ -n "$changed" ]; then
  echo "$changed"
  fail "An existing migration was modified or deleted. Add a new migration instead."
fi

# New migrations must sort after everything already on the base branch.
latest_base=$(git ls-tree --name-only "$base" -- "$dir/" | xargs -n1 basename | grep -Eo '^[0-9]{14}' | sort | tail -n1 || true)
latest_base=${latest_base:-0}
added=$(git diff --name-only --diff-filter=A "$base"...HEAD -- "$dir")
for file in $added; do
  version=$(basename "$file" | grep -Eo '^[0-9]{14}' || true)
  if [ -n "$version" ] && [ "$version" -le "$latest_base" ]; then
    fail "$(basename "$file") is not later than $latest_base, the newest migration on $base. Rename it with a newer timestamp."
  fi
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi
echo "Migrations look good (newest on $base: $latest_base)."
