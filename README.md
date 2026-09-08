# TAEBot

Dashboard y bots de venta de tiempo aire (NestJS + frontend estatico en `public/`).

- API: `src/` (NestJS, controladores en `src/bots` y `src/dashboard`)
- UI: `public/` (servida por `ServeStaticModule` en la raiz `/`)
- Puerto por defecto: `3100`

## Configuracion

```bash
cp .env.example .env   # y completa las credenciales
npm install
```

Variables (`.env`):

| Variable | Descripcion |
| --- | --- |
| `TAE_API_BASE` | URL base del backend TAE |
| `BOT1_USERNAME` / `BOT1_PASSWORD` | Credenciales del bot 1 |
| `BOT2_USERNAME` / `BOT2_PASSWORD` | Credenciales del bot 2 |
| `PORT` | Puerto del dashboard (default 3100) |

`.env` **no** se sube a git.

## Desarrollo

```bash
npm run start:dev     # watch mode
npm run build         # compila a dist/
npm run start:prod    # node dist/main
npm run lint
npm test
```

## Despliegue en la Raspberry (LuisDev)

La carpeta del proyecto en la Raspberry es un clon de este repo, asi que publicar =
`git push` desde donde sea + `deploy.sh` en la Raspberry.

| | |
| --- | --- |
| Host | `luisdev-1` (Tailscale) / `192.168.1.232` (LAN) |
| Ruta | `/opt/LuisDev/Backends/TaeBot` |
| Servicio | `taebot.service` (systemd) |
| Puerto | `3100` (dailyfood usa 3002) |
| Node | fnm, `~/.local/share/fnm/node-versions/v22.23.2` |

### Instalacion inicial (una sola vez)

```bash
git clone https://github.com/luisneyra93/taebot.git /opt/LuisDev/Backends/TaeBot
cd /opt/LuisDev/Backends/TaeBot
cp .env.example .env      # edita con las credenciales reales
./deploy/setup-pi.sh      # pide sudo para instalar el servicio
```

### Publicar cambios

Desde cualquier maquina:

```bash
git push origin main
```

En la Raspberry:

```bash
cd /opt/LuisDev/Backends/TaeBot && ./deploy/deploy.sh
```

`deploy.sh` hace `git fetch` + `reset --hard` al branch actual, `npm ci`, `npm run build`
y reinicia el servicio.

### Operacion del servicio

```bash
sudo systemctl status taebot
sudo systemctl restart taebot
journalctl -u taebot -f          # logs en vivo
```

El dashboard queda en `http://luisdev-1:3100` (desde la tailnet) o
`http://192.168.1.232:3100` (desde la LAN).

> Nota: la app no tiene autenticacion propia. Dentro de la tailnet solo la ven tus
> dispositivos. Si se expone a internet (Tailscale Funnel o Nginx Proxy Manager),
> hay que ponerle auth adelante.
