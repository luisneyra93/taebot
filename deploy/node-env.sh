# Resuelve el binario de node instalado con fnm (la Raspberry no lo tiene en el PATH
# de las sesiones no interactivas). Deja NODE_BIN y ajusta el PATH.
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  NODE_BIN="$(ls -d "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node 2>/dev/null | sort -V | tail -1)"
fi

if [ -z "${NODE_BIN:-}" ] || [ ! -x "$NODE_BIN" ]; then
  echo "!! No se encontro node. Instalalo con fnm o apt y vuelve a intentar." >&2
  exit 1
fi

export NODE_BIN
export PATH="$(dirname "$NODE_BIN"):$PATH"
