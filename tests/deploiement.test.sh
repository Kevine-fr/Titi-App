#!/usr/bin/env bash
# Les conteneurs que le déploiement attend ou interroge doivent exister.
# Le 18/11, l'attente visait « app_titi » (inexistant) : le déploiement
# échouait après 180 s alors que titi-app tournait et répondait.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
WF="$RACINE/.github/workflows/deploy.yml"
COMPOSE="$RACINE/docker-compose.prod.yml"
# Conteneurs fournis par le dépôt Infrastructure.
EXTERNES="nginx"

connus="$(grep -oE 'container_name:[[:space:]]*[A-Za-z0-9_.-]+' "$COMPOSE" | awk '{print $2}') $EXTERNES"
vises="$(grep -oE 'docker (inspect|logs|exec) .*' "$WF" \
  | sed -E 's/ -f "[^"]*"//; s/ --tail [0-9]+//' \
  | awk '{print $3}' | sort -u)"

echec=0
for c in $vises; do
  if ! grep -qw -- "$c" <<<"$connus"; then
    echo "✗ deploy.yml vise « $c », absent de docker-compose.prod.yml" >&2
    echec=1
  fi
done
[ -n "$vises" ] || { echo "✗ aucun conteneur trouvé dans deploy.yml" >&2; exit 1; }
[ "$echec" = 0 ] && echo "✓ déploiement : conteneurs visés connus ($(echo $vises))"
exit "$echec"
