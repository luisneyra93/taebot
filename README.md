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

## Despliegue en la Raspberry

La carpeta del proyecto en la Raspberry es un clon de este repo, asi que publicar = `git push` desde donde sea + `deploy.sh` en la Raspberry.

### Instalacion inicial (una sola vez)

```bash
git clone https://github.com/luisneyra93/taebot.git ~/taebot
cd ~/taebot
cp .env.example .env      # edita con las credenciales reales
./deploy/setup-pi.sh
```

`setup-pi.sh` instala dependencias, compila y registra el servicio systemd `taebot`
(arranque automatico al encender la Raspberry).

### Publicar cambios

Desde cualquier maquina:

```bash
git push origin main
```

En la Raspberry:

```bash
cd ~/taebot && ./deploy/deploy.sh
```

`deploy.sh` hace `git fetch` + `reset --hard` al branch actual, `npm ci`, `npm run build`
y reinicia el servicio.

### Operacion del servicio

```bash
sudo systemctl status taebot
sudo systemctl restart taebot
journalctl -u taebot -f          # logs en vivo
```

El dashboard queda en `http://<ip-de-la-raspberry>:3100`.

> Nota: la app no tiene autenticacion propia. Si se expone fuera de la red local,
> hay que ponerle un proxy con auth (o un tunel privado tipo Tailscale/Cloudflare Access).
