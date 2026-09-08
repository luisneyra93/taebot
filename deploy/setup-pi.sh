#!/usr/bin/env bash
# Instalacion inicial de TAEBot en la Raspberry (correr una sola vez).
# Uso (en la Raspberry, dentro de la carpeta del repo):  ./deploy/setup-pi.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_USER="$(whoami)"
cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "!! Node.js no esta instalado. Instalalo primero, por ejemplo:"
  echo "   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
  exit 1
fi
echo "==> Node $(node -v)"

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

echo "==> Instalando servicio systemd"
sed -e "s#__USER__#${RUN_USER}#g" -e "s#__APP_DIR__#${APP_DIR}#g" \
  deploy/taebot.service | sudo tee /etc/systemd/system/taebot.service >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable taebot
sudo systemctl restart taebot
sleep 2
systemctl --no-pager --lines=15 status taebot || true

PORT_VAL="$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '\r' || true)"
echo "==> Listo. Dashboard en http://$(hostname -I | awk '{print $1}'):${PORT_VAL:-3100}"
