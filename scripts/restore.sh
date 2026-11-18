#!/usr/bin/env bash
# Restaure une sauvegarde faite par scripts/backup.sh (base, puis PDF s'ils
# sont dans l'archive).
#
#   ./scripts/backup.sh                       # l'état actuel, d'abord
#   ./scripts/restore.sh backups/<horodatage>/titi-<horodatage>.tar
set -euo pipefail

FICHIER="${1:?Usage : restore.sh <titi-AAAAMMJJ-HHMMSS.tar>}"
DB_CONTAINER="${TITI_DB_CONTAINER:-titi-postgres}"
APP_CONTAINER="${TITI_APP_CONTAINER:-titi-app}"
[ -s "$FICHIER" ] || { echo "Archive introuvable ou vide : $FICHIER" >&2; exit 1; }
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
tar xf "$FICHIER" -C "$TRAVAIL"

echo "Base : restauration dans $DB_CONTAINER…" >&2
# --clean --if-exists dans le dump : les tables sont remplacées, pas doublées.
gzip -dc "$TRAVAIL/base.sql.gz" \
  | docker exec -i "$DB_CONTAINER" sh -c 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null

if [ -f "$TRAVAIL/fichiers.tar" ]; then
  echo "PDF : restauration dans $APP_CONTAINER:/data/files…" >&2
  docker exec -i "$APP_CONTAINER" tar xf - -C /data/files < "$TRAVAIL/fichiers.tar"
fi
echo "✓ Restauré." >&2
