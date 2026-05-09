# syntax=docker/dockerfile:1.7
# ============================================================
# STAGE 1 : Dépendances
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

# ============================================================
# STAGE 2 : Build
# ============================================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Génère le client Prisma + build Next.js en mode standalone
RUN npx prisma generate
RUN npm run build

# ============================================================
# STAGE 3 : Runner (image finale)
# ============================================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copie du build standalone (inclut node_modules nécessaires)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma : on a besoin du schéma + du moteur pour les migrations runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# Modules requis par le seed (qui s'exécute hors du bundle standalone)
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Script d'entrée : applique les migrations puis démarre Next
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Préparer le dossier de stockage (sera monté en volume)
RUN mkdir -p /data/files && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
