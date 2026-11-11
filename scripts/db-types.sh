#!/bin/sh
# Regenerates src/data/database.types.ts from the local database (`supabase start` first).
#
#   npm run db:types          rewrite the file
#   npm run db:types:check    only check it is up to date (a local check, see docs/RELEASING.md)
#
# The output goes through Prettier so the file looks the same on every machine.
set -eu

cd "$(dirname "$0")/.."
target=src/data/database.types.ts
generated=$(mktemp)
trap 'rm -f "$generated" "$generated.fmt"' EXIT

{
  echo '// Generated from the local database by `npm run db:types`. Do not edit by hand:'
  echo '// change a migration in supabase/migrations, then run the command again.'
  echo
  supabase gen types typescript --local --schema public
} > "$generated"
npx prettier --parser typescript --single-quote --print-width 120 < "$generated" > "$generated.fmt"
mv "$generated.fmt" "$generated"

if [ "${1:-}" = "--check" ]; then
  if ! diff -u "$target" "$generated"; then
    echo
    echo "$target does not match the migrations."
    echo "Run 'supabase start' and 'npm run db:types', then commit the result."
    exit 1
  fi
  echo "$target is up to date."
else
  cp "$generated" "$target"
  echo "Wrote $target."
fi
