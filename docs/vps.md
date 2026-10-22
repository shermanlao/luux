# Host LUUX beside LEVO

The VPS `187.7.21.12` already runs LEVO. Nginx on port 80/443 is the public front door. LUUX is a **second site**: own folder, own ports, own Postgres database. Do not put files in `/var/www/levo`. Do not run `levo-deploy` for this repo.

## Port map

| Service | Bind | Public |
| --- | --- | --- |
| nginx | `0.0.0.0:80` / `:443` | yes |
| LEVO Next.js | `127.0.0.1:3000` | no |
| LEVO Express | `127.0.0.1:3333` | no |
| 4TECH / other Next.js | `127.0.0.1:3001-3003` | no |
| LUUX Next.js | `127.0.0.1:3004` | no |
| LUUX Express | `127.0.0.1:3334` | no |
| PostgreSQL | `127.0.0.1:5432` | no |

## DNS

Keep Shopify online until a test payment works on this stack. Then at the registrar (or in Shopify domains):

```
A    luuxmart.com        187.7.21.12
A    www.luuxmart.com    187.7.21.12
```

LEVO stays `default_server`. LUUX is chosen by `Host: luuxmart.com`.

## Postgres

```bash
sudo -u postgres psql <<'SQL'
CREATE USER luux WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE luux OWNER luux;
GRANT ALL PRIVILEGES ON DATABASE luux TO luux;
\c luux
GRANT ALL ON SCHEMA public TO luux;
ALTER SCHEMA public OWNER TO luux;
SQL
```

## App files

```bash
sudo mkdir -p /var/www/luux
# clone https://github.com/shermanlao/luux into /var/www/luux (deploy key, not LEVO's key)
```

`/var/www/luux/backend-server/.env`:

```
NODE_ENV=production
PORT=3334
DATABASE_URL=postgres://luux:PASSWORD@127.0.0.1:5432/luux
DB_DIALECT=postgres
SITE_ORIGIN=https://luuxmart.com
ADMIN_EMAIL=admin@luux.local
ADMIN_PASSWORD=change-me
ADMIN_SESSION_SECRET=long-random
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`/etc/luux/next.env`:

```
NODE_ENV=production
PORT=3004
HOSTNAME=127.0.0.1
API_ORIGIN=http://127.0.0.1:3334
SITE_ORIGIN=https://luuxmart.com
NEXT_PUBLIC_SITE_URL=https://luuxmart.com
```

## systemd

`/etc/systemd/system/luux-api.service`:

```
[Unit]
Description=LUUX API
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/var/www/luux/backend-server
EnvironmentFile=/var/www/luux/backend-server/.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/luux-web.service`:

```
[Unit]
Description=LUUX Next.js
After=network.target luux-api.service

[Service]
User=www-data
WorkingDirectory=/var/www/luux/frontend
EnvironmentFile=/etc/luux/next.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3004
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## nginx

`/etc/nginx/sites-available/luux`:

```
server {
    listen 80;
    listen [::]:80;
    server_name luuxmart.com www.luuxmart.com;
    client_max_body_size 32m;

    location /api/stripe/webhook {
        proxy_pass http://127.0.0.1:3334;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -sfn /etc/nginx/sites-available/luux /etc/nginx/sites-enabled/luux
sudo nginx -t
sudo systemctl reload nginx
```

After DNS works:

```bash
sudo certbot --nginx -d luuxmart.com -d www.luuxmart.com
```

## Deploy script

```bash
sudo install -m 755 /var/www/luux/scripts/luux-deploy.sh /usr/local/sbin/luux-deploy
sudo /usr/local/sbin/luux-deploy
```

That script only updates `/var/www/luux`. After the first deploy, run `npm run import:shopify` once on the server (or copy `database.sqlite` / run the importer against Postgres) so product photos exist under `frontend/public/uploads`.

Cancel Shopify only after a test card payment and the storefront look correct on https://luuxmart.com.
