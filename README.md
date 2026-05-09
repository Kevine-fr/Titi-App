# 📁 Archive — Hébergement de PDFs lourds

Application Next.js auto-hébergée pour publier des PDFs (jusqu'à 1 Go par défaut)
via une interface drag-and-drop admin, et les rendre accessibles en preview inline
sur une URL publique partageable.

## Architecture

```
┌─────────┐     ┌───────────────┐     ┌──────────────┐
│  nginx  │────▶│  Next.js 15   │────▶│ Postgres 16  │
│  :80    │     │  (App Router) │     │ (métadonnées)│
└─────────┘     └───────┬───────┘     └──────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ Volume Docker │
                │ /data/files   │  ← les PDFs (binaire)
                └───────────────┘
```

**Choix techniques clés :**
- Le binaire ne passe **jamais** par Postgres ni par un buffer mémoire — Next.js
  *streame* directement la requête vers le disque (`fs.createWriteStream`).
- nginx est configuré avec `proxy_request_buffering off` et `client_max_body_size 1024M`
  pour ne pas bufferiser les uploads.
- `/api/stream/[id]` supporte les **Range requests** (HTTP 206), donc le viewer PDF
  natif du navigateur charge la première page avant la fin du téléchargement.
- Auth admin via cookie `iron-session` (HttpOnly), bcrypt côté DB, rate-limit nginx
  sur `/api/auth/login`.

## Démarrage

### 1. Pré-requis
- Docker + Docker Compose
- Un VPS avec au moins **1 Go de RAM et 10 Go de disque libre** (ajuste selon le
  volume de PDFs prévu).

### 2. Cloner et configurer
```bash
git clone <ton-repo> archive && cd archive
cp .env.example .env
```

Édite `.env` et **change toutes les valeurs** :

```bash
# Génère un secret de session fort (≥ 32 caractères)
openssl rand -base64 32
```

Mets le résultat dans `SESSION_PASSWORD`. Change aussi `POSTGRES_PASSWORD`,
`ADMIN_EMAIL` et `ADMIN_PASSWORD`.

### 3. Lancer
```bash
docker compose up -d --build
```

Le premier démarrage :
1. Build l'image Next.js (3-5 minutes selon la machine).
2. Démarre Postgres et attend qu'il soit prêt.
3. Applique les migrations Prisma.
4. Crée le compte admin depuis `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
5. Démarre Next.js + nginx.

### 4. Tester
- Public : http://localhost (ou l'IP de ton VPS)
- Admin : http://localhost/admin/login

Connecte-toi avec les credentials de ton `.env`, glisse un PDF, profit.

## Production

### Mettre HTTPS (indispensable)

L'app sert des cookies de session — **ne l'expose jamais en HTTP nu sur Internet**.
Solution rapide avec Caddy en remplacement de nginx :

```yaml
# docker-compose.override.yml
services:
  nginx:
    profiles: [no]    # désactive nginx
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on:
      - app

volumes:
  caddy_data:
```

```caddy
# Caddyfile
ton-domaine.fr {
    reverse_proxy app:3000
    request_body {
        max_size 1GB
    }
}
```

Caddy gère Let's Encrypt automatiquement. Pour rester sur nginx, ajoute Certbot.

### Ajuster la taille max d'upload

Dans `.env` : `MAX_UPLOAD_SIZE_MB=2048` pour passer à 2 Go.
**Aussi** dans `nginx/nginx.conf` : `client_max_body_size 2048M;`. Les deux doivent
matcher, sinon nginx coupera avant que Next.js ne voie la requête.

### Backups

```bash
# Postgres (métadonnées) — petit, rapide
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > db-$(date +%F).sql.gz

# Fichiers (volume Docker)
docker run --rm -v archive_file_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/files-$(date +%F).tar.gz -C /data .
```

À mettre en cron quotidien sur le VPS, et pousser vers du stockage externe
(rclone vers S3/B2, scp vers une autre machine, etc.).

## Ops

### Ajouter un admin
```bash
docker compose exec app node -e "
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  (async () => {
    const p = new PrismaClient();
    await p.adminUser.create({
      data: {
        email: '[email protected]',
        passwordHash: await bcrypt.hash('mot-de-passe-fort', 12),
      },
    });
    console.log('OK');
    process.exit(0);
  })();
"
```

### Voir les logs
```bash
docker compose logs -f app       # next.js
docker compose logs -f nginx     # accès / erreurs proxy
docker compose logs -f db        # postgres
```

### Reset complet (⚠️ supprime tout)
```bash
docker compose down -v
```

## Troubleshooting

| Symptôme | Cause probable | Solution |
|---|---|---|
| `413 Request Entity Too Large` côté nginx | `client_max_body_size` trop bas | Augmente dans `nginx/nginx.conf` ET `MAX_UPLOAD_SIZE_MB` dans `.env` |
| Upload qui timeout vers 5min | `proxy_read_timeout` nginx | Déjà à 600s ; augmente si fichiers > 1 Go sur connexion lente |
| Le PDF ne s'affiche pas inline | Navigateur bloque les iframes / pas de Range | Vérifie console DevTools, normalement `Accept-Ranges: bytes` est servi |
| `prisma migrate deploy` échoue | Postgres pas prêt | Le healthcheck devrait régler ça ; si persistant, `docker compose down && up` |
| `SESSION_PASSWORD doit faire au moins 32 caractères` | Secret trop court | `openssl rand -base64 32` |

## Évolutions possibles

- **Resumable uploads** : remplacer le streaming simple par tus.io ou des chunks
  pour permettre la reprise sur coupure réseau (utile sur 4G mobile).
- **Stockage objet** : si tu dépasses ~50 Go de PDFs ou veux du multi-serveur,
  bascule vers MinIO/S3 (les routes upload/stream sont à réécrire en pré-signed URLs).
- **Liens privés** : ajouter une table `share_links` avec token + expiration, et un
  middleware sur `/api/stream/[id]` qui vérifie le token.
- **Recherche full-text** : Postgres `tsvector` sur `name` + `description`, ou
  pdf-parse pour indexer le contenu.

## Structure
```
.
├── docker-compose.yml      # 3 services : nginx + app + db
├── .env.example            # à copier en .env
├── nginx/
│   └── nginx.conf          # reverse proxy + tuning gros uploads
└── app/                    # Next.js 15 App Router
    ├── Dockerfile          # multi-stage : deps → build → runner standalone
    ├── docker-entrypoint.sh
    ├── prisma/
    │   ├── schema.prisma   # File + AdminUser
    │   ├── migrations/     # SQL initial
    │   └── seed.mjs        # crée l'admin depuis l'env
    └── src/
        ├── app/            # routes (App Router)
        │   ├── page.tsx    # catalogue public
        │   ├── files/[id]/ # viewer PDF
        │   ├── admin/      # login + dashboard
        │   └── api/
        │       ├── auth/login + logout
        │       ├── upload/         # ⚡ streaming POST
        │       ├── files/ + [id]/  # liste + DELETE
        │       └── stream/[id]/    # ⚡ GET avec Range support
        ├── components/
        │   ├── Dropzone.tsx        # XHR + progression réelle
        │   ├── DeleteButton.tsx
        │   └── LogoutButton.tsx
        └── lib/
            ├── prisma.ts   # singleton
            ├── auth.ts     # iron-session helpers
            ├── storage.ts  # chemins disque + UUIDs
            └── format.ts
```
