#!/usr/bin/env bash
# Sauvegarde de Titi : la base Postgres (métadonnées) ET les PDF du volume.
#
#   ./scripts/backup.sh                    -> backups/<horodatage>/titi-<horodatage>.tar
#   BACKUP_DIR=/srv/sauvegardes ./scripts/backup.sh
#   BACKUP_FICHIERS=0 ./scripts/backup.sh  -> la base seule (les PDF pèsent lourd)
#
# Contrat commun aux dépôts du VPS (le dépôt Infrastructure envoie les
# sauvegardes sur MinIO) : un seul fichier écrit, son chemin en DERNIÈRE ligne
# de la sortie standard, les messages sur la sortie d'erreur.
#
# La base seule ne suffit pas : elle ne contient que les noms et les clés des
# PDF, le contenu est sur le volume /data/files. Restaurer l'une sans l'autre
# donne des pages « Fichier disque manquant » (410).
set -euo pipefail

DB_CONTAINER="${TITI_DB_CONTAINER:-titi-postgres}"
APP_CONTAINER="${TITI_APP_CONTAINER:-titi-app}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$RACINE/backups/$STAMP}"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
mkdir -p "$DEST"
FICHIER="$DEST/titi-$STAMP.tar"

echo "Base : pg_dump depuis $DB_CONTAINER…" >&2
# Les identifiants sont ceux du conteneur lui-même : rien à recopier ici.
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  | gzip > "$TRAVAIL/base.sql.gz"
if [ "$(gzip -dc "$TRAVAIL/base.sql.gz" | head -c 1 | wc -c)" -eq 0 ]; then
  echo "Échec : dump de la base vide." >&2
  exit 1
fi

if [ "${BACKUP_FICHIERS:-1}" != "0" ]; then
  echo "PDF : archive de /data/files depuis $APP_CONTAINER…" >&2
  docker exec "$APP_CONTAINER" tar cf - -C /data/files . > "$TRAVAIL/fichiers.tar"
fi

tar cf "$FICHIER.part" -C "$TRAVAIL" .
mv "$FICHIER.part" "$FICHIER"
echo "✓ $(du -h "$FICHIER" | cut -f1)" >&2
echo "$FICHIER"
