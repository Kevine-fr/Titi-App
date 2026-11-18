#!/usr/bin/env bash
# Épreuve du contrat de sauvegarde, sans Docker : un faux `docker` simule les
# conteneurs (pg_dump/psql/tar) dans un dossier temporaire.
#   bash tests/sauvegarde.test.sh
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/pdf" "$T/base"
cat > "$T/bin/docker" <<'FAUX'
#!/usr/bin/env bash
shift; [ "$1" = "-i" ] && shift; conteneur="$1"; shift
case "$*" in
  *pg_dump*) cat "$FAUX/base/dump.sql" ;;
  *psql*) cat > "$FAUX/base/dump.sql" ;;
  *"tar cf"*) tar cf - -C "$FAUX/pdf" . ;;
  *"tar xf"*) tar xf - -C "$FAUX/pdf" ;;
  *) echo "faux docker : commande inattendue $*" >&2; exit 2 ;;
esac
FAUX
chmod +x "$T/bin/docker"
export PATH="$T/bin:$PATH" FAUX="$T" BACKUP_DIR="$T/sauvegardes"

echo "CREATE TABLE files();" > "$T/base/dump.sql"
echo "%PDF-1.7" > "$T/pdf/123e4567-e89b-12d3-a456-426614174000"

ARCHIVE="$(bash "$RACINE/scripts/backup.sh" 2>/dev/null | tail -n1)"
[ -s "$ARCHIVE" ] || { echo "ÉCHEC : pas d'archive ($ARCHIVE)"; exit 1; }

echo "abîmé" > "$T/base/dump.sql"; rm "$T/pdf/"*
bash "$RACINE/scripts/restore.sh" "$ARCHIVE" 2>/dev/null
grep -q "CREATE TABLE files" "$T/base/dump.sql" || { echo "ÉCHEC : base non restaurée"; exit 1; }
grep -q "%PDF" "$T/pdf/123e4567-e89b-12d3-a456-426614174000" || { echo "ÉCHEC : PDF non restaurés"; exit 1; }

: > "$T/base/dump.sql"
if bash "$RACINE/scripts/backup.sh" >/dev/null 2>&1; then echo "ÉCHEC : un dump vide passe pour une sauvegarde"; exit 1; fi
echo "✓ sauvegarde/restauration : contrat tenu"
