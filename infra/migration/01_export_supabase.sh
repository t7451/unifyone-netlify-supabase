#!/usr/bin/env bash
# 01_export_supabase.sh — dump legacy Supabase auth.users + public schema data.
#
# Produces:
#   exports/auth_users.csv          (id, email, created_at, raw_user_meta_data)
#   exports/app_data.sql            (public schema data-only, INSERT form)
#   exports/manifest.json           (timestamps + row counts)
#
# Refuses to run without SUPABASE_DB_URL. Safe to re-run — each run overwrites
# the previous export. DRY_RUN is ignored here (pg_dump is read-only).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env if present (without leaking into parent shell).
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required — copy .env.example to .env and fill it in}"

EXPORT_DIR="${SCRIPT_DIR}/exports"
mkdir -p "$EXPORT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

echo "==> Supabase export starting at $TIMESTAMP"
echo "    Export dir: $EXPORT_DIR"
echo

# 1. auth.users CSV (selected columns only — we never want password hashes
#    or encrypted_password in the dump).
AUTH_CSV="$EXPORT_DIR/auth_users.csv"
echo "==> Exporting auth.users → $AUTH_CSV"
psql "$SUPABASE_DB_URL" --no-psqlrc --quiet --command "\
copy (
  select
    id,
    email,
    created_at,
    coalesce(raw_user_meta_data, '{}'::jsonb) as raw_user_meta_data
  from auth.users
  where email is not null
  order by created_at asc
) to stdout with csv header" > "$AUTH_CSV"

AUTH_ROWS=$(($(wc -l < "$AUTH_CSV") - 1))
echo "    $AUTH_ROWS users exported"
echo

# 2. public schema data dump (data-only, INSERTs, no owner/acl).
#    Schema itself is defined in apps/unifyone — we only need row data here.
APP_SQL="$EXPORT_DIR/app_data.sql"
echo "==> Dumping public schema data → $APP_SQL"

PG_DUMP_ARGS=(
  --schema=public
  --data-only
  --no-owner
  --no-acl
  --inserts
  --column-inserts
  --quote-all-identifiers
)

# Allow callers to narrow to specific tables via SUPABASE_EXPORT_TABLES.
if [[ -n "${SUPABASE_EXPORT_TABLES:-}" ]]; then
  IFS=',' read -ra TABLES <<<"$SUPABASE_EXPORT_TABLES"
  for t in "${TABLES[@]}"; do
    PG_DUMP_ARGS+=(--table="public.$(echo "$t" | xargs)")
  done
  echo "    Filtered to tables: ${SUPABASE_EXPORT_TABLES}"
fi

pg_dump "$SUPABASE_DB_URL" "${PG_DUMP_ARGS[@]}" > "$APP_SQL"
APP_SIZE_BYTES=$(stat -c%s "$APP_SQL" 2>/dev/null || stat -f%z "$APP_SQL")
APP_INSERTS=$(grep -c "^INSERT INTO" "$APP_SQL" || true)
echo "    $(printf "%'d" "$APP_INSERTS" 2>/dev/null || echo "$APP_INSERTS") INSERT statements, $APP_SIZE_BYTES bytes"
echo

# 3. Manifest for downstream audit/import scripts.
MANIFEST="$EXPORT_DIR/manifest.json"
cat > "$MANIFEST" <<EOF
{
  "exported_at": "$TIMESTAMP",
  "supabase_project_ref": "${SUPABASE_PROJECT_REF:-unknown}",
  "auth_users_csv": "auth_users.csv",
  "auth_users_row_count": $AUTH_ROWS,
  "app_data_sql": "app_data.sql",
  "app_data_insert_count": $APP_INSERTS,
  "app_data_size_bytes": $APP_SIZE_BYTES
}
EOF
echo "==> Manifest written → $MANIFEST"
echo
echo "==> Export complete. Next: pnpm 02:audit"
