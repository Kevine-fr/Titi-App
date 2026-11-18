#!/bin/sh
set -e

# Build DATABASE_URL avec credentials URL-encodés.
# Sans ça, les caractères spéciaux (/ + = générés par base64, ou @ : etc.)
# cassent le parser d'URL de Prisma ("invalid port number").
PGUSER_ENC=$(node -e "console.log(encodeURIComponent(process.env.POSTGRES_USER))")
PGPASS_ENC=$(node -e "console.log(encodeURIComponent(process.env.POSTGRES_PASSWORD))")
# Hôte : le nom du conteneur, unique sur la machine. « db » ne l'est pas :
# titi-app est aussi sur le réseau partagé « web », où Tea et Messagerie ont
# chacun un service « db », et Docker répondait l'un ou l'autre au hasard.
DB_HOST="${POSTGRES_HOST:-titi-postgres}"
export DATABASE_URL="postgresql://${PGUSER_ENC}:${PGPASS_ENC}@${DB_HOST}:5432/${POSTGRES_DB}"

echo "→ Application des migrations Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "→ Seed de l'admin (si nécessaire)..."
node ./prisma/seed.mjs || echo "Seed ignoré (déjà fait ou erreur non bloquante)"

echo "→ Démarrage de Next.js..."
exec "$@"