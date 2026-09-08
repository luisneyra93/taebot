#!/usr/bin/env bash
# Actualiza y republica TAEBot en la Raspberry.
# Uso (en la Raspberry):  ./deploy/deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# shellcheck source=deploy/node-env.sh
. deploy/node-env.sh

echo "==> Descargando cambios de git"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --prune origin
git reset --hard "origin/${BRANCH}"

echo "==> Instalando dependencias"
npm ci

echo "==> Compilando"
npm run build

if systemctl list-unit-files | grep -q '^taebot.service'; then
  echo "==> Reiniciando servicio taebot"
  sudo systemctl restart taebot
  sleep 3
  systemctl --no-pager --lines=10 status taebot || true
else
  echo "!! El servicio taebot no existe todavia. Corre primero: ./deploy/setup-pi.sh"
fi

echo "==> Listo"
