#!/usr/bin/env bash
# Instalacion inicial de TAEBot en la Raspberry (correr una sola vez).
# Uso (en la Raspberry, dentro de la carpeta del repo):  ./deploy/setup-pi.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_USER="$(whoami)"
cd "$APP_DIR"

# shellcheck source=deploy/node-env.sh
. deploy/node-env.sh
echo "==> node $("$NODE_BIN" -v) ($NODE_BIN)"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "!! Se creo .env desde .env.example. Edita $APP_DIR/.env con las credenciales reales"
  echo "   y vuelve a correr este script."
  exit 1
fi

echo "==> Instalando dependencias"
npm ci

echo "==> Compilando"
npm run build

# Si quedo una instancia suelta (arranque manual), matarla para liberar el puerto.
# Cubre tanto "node dist/main.js" como la ruta absoluta.
pkill -f "${APP_DIR}/dist/main.js" 2>/dev/null || true
pkill -f "^${NODE_BIN} dist/main.js$" 2>/dev/null || true

echo "==> Instalando servicio systemd (pide sudo)"
sed -e "s#__USER__#${RUN_USER}#g" \
    -e "s#__APP_DIR__#${APP_DIR}#g" \
    -e "s#__NODE_BIN__#${NODE_BIN}#g" \
    deploy/taebot.service | sudo tee /etc/systemd/system/taebot.service >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable taebot
sudo systemctl restart taebot
sleep 3
systemctl --no-pager --lines=15 status taebot || true

PORT_VAL="$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '\r' || true)"
echo "==> Listo. Dashboard en http://$(hostname):${PORT_VAL:-3100}"
