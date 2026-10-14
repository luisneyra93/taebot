# Resuelve el binario de node instalado con fnm (la Raspberry no lo tiene en el PATH
# de las sesiones no interactivas). Deja NODE_BIN y ajusta el PATH.
#
# Ojo: NODE_BIN termina dentro del unit de systemd, asi que tiene que ser una ruta
# estable. En una shell con fnm cargado, "command -v node" devuelve un symlink
# efimero bajo /run/user/<uid>/fnm_multishells/... que muere con la sesion y se
# borra al reiniciar; si esa ruta se cuela en el unit, el servicio queda en bucle
# de reinicio con status=203/EXEC.

# 1) Ruta estable de fnm: la version mas alta instalada.
NODE_BIN="$(ls -d "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node 2>/dev/null | sort -V | tail -1)"

# 2) Si no hay fnm, el node del sistema, resolviendo symlinks.
if [ -z "${NODE_BIN:-}" ] && command -v node >/dev/null 2>&1; then
  NODE_BIN="$(readlink -f "$(command -v node)" 2>/dev/null || command -v node)"
fi

if [ -z "${NODE_BIN:-}" ] || [ ! -x "$NODE_BIN" ]; then
  echo "!! No se encontro node. Instalalo con fnm o apt y vuelve a intentar." >&2
  exit 1
fi

case "$NODE_BIN" in
  /run/*|/tmp/*)
    echo "!! NODE_BIN quedo en una ruta efimera ($NODE_BIN); el servicio no sobreviviria" >&2
    echo "   a un reinicio. Revisa la instalacion de node." >&2
    exit 1
    ;;
esac

export NODE_BIN
export PATH="$(dirname "$NODE_BIN"):$PATH"
