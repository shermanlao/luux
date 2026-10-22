#!/bin/bash
# Pull LUUX and restart production services.
# Run on the VPS as root: /usr/local/sbin/luux-deploy [branch-or-sha]
set -euo pipefail

APP=/var/www/luux
TARGET="${1:-main}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo /usr/local/sbin/luux-deploy"
  exit 1
fi

if ! [[ "$TARGET" =~ ^[0-9A-Za-z][0-9A-Za-z._/-]*$ ]] || [[ "$TARGET" == *..* ]]; then
  echo "Invalid git ref: ${TARGET}"
  exit 1
fi

export GIT_SSH_COMMAND="ssh -i ${APP}/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

cd "$APP"
git config --global --add safe.directory "$APP" >/dev/null 2>&1 || true

if [[ "$TARGET" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  echo "==> fetching and checking out ${TARGET}"
  git fetch origin --prune
  git checkout -f "$TARGET"
  git reset --hard "$TARGET"
else
  echo "==> fetching ${TARGET}"
  git fetch origin "$TARGET"
  git checkout "$TARGET"
  git reset --hard "origin/${TARGET}"
fi

if [ -f "$APP/scripts/luux-deploy.sh" ]; then
  install -m 755 "$APP/scripts/luux-deploy.sh" /usr/local/sbin/luux-deploy
fi

echo "==> installing and building API"
cd "$APP/backend-server"
npm install
npx tsc

echo "==> installing and building site"
cd "$APP/frontend"
npm install
node -e "const v=require('./node_modules/next/package.json').version.split('.').map(Number); if(!(v[0]>15||(v[0]===15&&v[1]>5)||(v[0]===15&&v[1]===5&&v[2]>=27))){console.error('next '+v.join('.')+' is below 15.5.27'); process.exit(1)}"
npx next build

echo "==> restarting services"
systemctl restart luux-api luux-web
echo "LUUX deploy complete."
