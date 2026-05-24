# CONTEXTO DEL PROYECTO: "Shareable"

@DESIGN.md
@AGENTS.md

## 1. Visión General del Proyecto
Shareable es una plataforma web (MVP) diseñada para facilitar el préstamo y alquiler de herramientas y objetos de uso ocasional entre vecinos. El objetivo es reducir el consumismo y fomentar la economía circular.
**Nota de despliegue MVP:** El lanzamiento inicial estará geolocalizado y limitado al barrio de Sanchinarro (Madrid). El GPS del usuario definirá su ubicación y cargará artículos cercanos. El uso de la plataforma es 100% gratuito (sin comisiones).

## 2. Lógica de Negocio y Reglas de la Plataforma

### 2.1. Gestión de Usuarios y Confianza
- **Registro:** Exclusivamente mediante correo electrónico y contraseña para el MVP (la verificación telefónica por SMS/WhatsApp queda para la v2).
- **Perfil:** Nombre, foto de perfil, biografía breve y valoración promedio (estrellas).
- **Moderación:** Prohibición estricta de subir: mascotas, vehículos a motor, armas, drogas o contenido ilegal.
- **Resolución de Conflictos:** Se implementará un botón de "Reportar problema" en las transacciones activas. Esto alertará al administrador y podrá suspender cuentas.

### 2.2. Transacciones Económicas (Fianzas y Alquiler)
- **Cero pasarelas de pago:** Todo el intercambio de dinero (ya sea el precio del alquiler diario o la fianza de seguridad) se realizará de forma externa a la app, en persona (Efectivo o Bizum) en el momento del intercambio. La app solo actúa como tablón de anuncios y coordinador.

### 2.3. Logística y Flujo de Préstamo (El "Doble Check")
No hay límite de tiempo predefinido por la app; los usuarios lo acuerdan a través del chat integrado. El ciclo de vida de un préstamo sigue estos estados estrictos, requiriendo confirmación de ambas partes:
1. **Solicitud:** Usuario A solicita objeto a Usuario B. B acepta por chat.
2. **Entrega (Inicio del préstamo):**
   - El dueño pulsa: "Objeto entregado".
   - El receptor pulsa: "Objeto recibido".
   - *Estado cambia a: En Curso.*
3. **Devolución (Fin del préstamo):**
   - El receptor pulsa: "Objeto devuelto al dueño".
   - El dueño pulsa: "Objeto recibido de vuelta".
   - *Estado cambia a: Finalizado.*

## 3. Stack Tecnológico Principal
- **Frontend:** Next.js (App Router), React, TypeScript.
- **Estilos:** Tailwind CSS, Shadcn/ui.
- **Base de Datos:** PostgreSQL.
- **Mapas:** Leaflet + react-leaflet + **CartoDB Voyager** tiles (no Mapbox, no OpenStreetMap estándar).

## 4. Esquema de Base de Datos Base (PostgreSQL)

### Tabla: `users`
- `id` (uuid, PK)
- `email` (varchar, unique)
- `full_name` (varchar)
- `avatar_url` (text)
- `status` (varchar: 'active', 'suspended')
- `created_at` (timestamp)

### Tabla: `items`
- `id` (uuid, PK)
- `owner_id` (uuid, FK a users.id)
- `title` (varchar)
- `description` (text)
- `category` (varchar)
- `price_per_day` (numeric, 0 si es gratis)
- `deposit_amount` (numeric, fianza)
- `image_url` (text)
- `latitude` (float) - *Para el MVP, ubicación aproximada del usuario.*
- `longitude` (float)
- `is_active` (boolean, default: true)

### Tabla: `requests` (Controla el flujo del "Doble Check")
- `id` (uuid, PK)
- `item_id` (uuid, FK a items.id)
- `borrower_id` (uuid, FK a users.id)
- `status` (varchar: 'pending', 'accepted', 'rejected', 'handed_over_by_owner', 'received_by_borrower', 'in_progress', 'returned_by_borrower', 'received_back_by_owner', 'completed')
- `created_at` (timestamp)

### Tabla: `reports` (Sistema de reportes)
- `id` (uuid, PK)
- `request_id` (uuid, FK a requests.id)
- `reporter_id` (uuid, FK a users.id)
- `reason` (text)
- `is_resolved` (boolean, default: false)

### Tabla: `messages` (Chat integrado)
- `id` (uuid, PK)
- `request_id` (uuid, FK a requests.id)
- `sender_id` (uuid, FK a users.id)
- `content` (text)


## 5. Infraestructura y Despliegue (DevOps)
- **Servidor Destino:** VPS en **Hostinger** (plan KVM 2), **Ubuntu 24.04 LTS**. Node.js + PostgreSQL + PostGIS se instalan en la misma máquina.
- **Base de Datos:** PostgreSQL se alojará e instalará directamente en el VPS (junto con la extensión PostGIS).
- **Estrategia de Despliegue:** La aplicación Next.js se compilará para producción (`npm run build`) y se mantendrá en ejecución con **PM2**. Reverse proxy **Nginx** + **Certbot** (HTTPS).
- **Regla para Claude:** No asumas el uso de Vercel, Supabase Cloud u otros servicios serverless propietarios. Toda la arquitectura debe estar pensada para alojarse de forma independiente en un servidor Linux. Asegúrate de documentar bien las variables de entorno (`.env`) y los comandos de despliegue para este entorno.

## 6. Guía de Estilo y Reglas para el Asistente de Código (CLAUDE.md Rules)

- **Foco absoluto en el MVP:** Sigue estrictamente la regla del pago manual y el doble check de entrega. No implementes integraciones con Stripe, PayPal ni lógicas de reserva con calendarios complejos.
- **TypeScript & Next.js:** Usa Server Components donde sea posible. Tipa todas las interfaces de base de datos.
- **Privacidad Geométrica:** En las respuestas de la API hacia el cliente, nunca envíes las coordenadas exactas para llenar el mapa; añade un ligero factor de aleatoriedad (ruido espacial) para proteger las direcciones reales de los vecinos de Sanchinarro.

## 8. Rol del Asistente: Senior Code Reviewer
Cuando se te pida revisar código, analizar un bug o sugerir mejoras, asume estrictamente el rol de un **Staff Software Engineer**. Aplica las siguientes reglas en tus respuestas:

- **Rigor técnico:** No apruebes código mediocre. Señala vulnerabilidades, ineficiencias (como N+1 queries en Prisma o malos renderizados en React) y violaciones de Clean Code.
- **Formato de Revisión:** Antes de modificar el código directamente, genera un informe estructurado explicando qué falla, por qué es un problema y presenta la solución óptima.
- **Alineación con el MVP:** Todas tus sugerencias de refactorización deben respetar la arquitectura self-hosted (Debian + PM2) y las reglas de negocio descritas en este documento (ej. nada de pasarelas de pago, Leaflet sobre Mapbox).
- **Proactividad:** Si ves que un cambio impacta otras partes del sistema (ej. el flujo de "Doble Check"), adviértelo proactivamente.

---

## 7. Estado actual de la implementación (vivo)

Esta sección refleja lo que **ya está construido** y dónde el código diverge del plan original. Manténla actualizada al cerrar cada capa.

**MVP cerrado** (capas 1-6 + Marketplace Inverso + Cierre del MVP F1-F6). Lo que queda en "Tareas pendientes" es scope de v2.

### Stack real
- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** estricto, `src/` con alias `@/*`.
- **Tailwind CSS v4**: la paleta vive en `src/app/globals.css` dentro de `:root` y `@theme inline` — **no hay `tailwind.config.ts`** (Tailwind v4 ya no lo usa para temas). Hay bloque `@media (prefers-reduced-motion: reduce)` que deshabilita todas las animaciones/transiciones.
- **shadcn/ui** sobre **Base UI** (no Radix). Triggers usan la prop `render={...}` en lugar de `asChild`. Para que un `Link` se vea como `Button` se usa `cn(buttonVariants({...}), "...")`.
- **Prisma 6** + **PostgreSQL 18** local. Esquema en `prisma/schema.prisma`. Cliente singleton en `src/lib/prisma.ts`.
- **Auth.js v4** (`next-auth@4`) con **Prisma Adapter** + `CredentialsProvider`. Sesiones **JWT** (Auth.js no soporta DB sessions con credentials). Hash con `bcryptjs` (cost 12) + DUMMY_HASH para timing constante. `NEXTAUTH_SECRET` falla en prod si no está definido. Helper `auth = cache(() => getServerSession(...))` en `src/lib/auth.ts`. El callback `jwt()` verifica `user.status` en BD — sesiones de usuarios suspendidos se matan en caliente.
- **Mapas:** **Leaflet + react-leaflet + CartoDB Voyager** tiles (no Mapbox, no OpenStreetMap estándar). Búsqueda de direcciones proxiada en `src/app/api/geocode/route.ts` (no fetch directo a Nominatim desde el browser — bloquearía `User-Agent`). Marcadores de precio con `DivIcon` coral/sage. CSS de Leaflet rebranded en `src/components/map-styles.css`.
- **PostGIS** habilitado (`CREATE EXTENSION postgis`). Las consultas de cercanía usan `ST_DWithin` / `ST_Distance` con `geography(Point, 4326)` construido al vuelo desde `latitude`/`longitude` (no hay columna `geography` aún). **Todas las raw queries usan `Prisma.sql` template literals** — no `$queryRawUnsafe`.
- **Imágenes:** `sharp` (resize 1600px + webp q82 + strip EXIF + `limitInputPixels: 24_000_000` anti pixel-bomb) + `file-type` (magic bytes). Upload rate-limit en memoria. Almacenamiento en disco fuera de `/public`, servido por Route Handler con guard anti-traversal y `Cache-Control: immutable`. Carpeta configurable por env `UPLOAD_DIR`.
- **Jitter geográfico:** `src/lib/geo.ts` — `jitterCoord(id, lat, lng)` determinístico via SHA-256(id + axis + `JITTER_SEED`). Reemplaza `Math.random()` que era reversible por averaging de múltiples requests.
- **Chat:** **SWR** con polling 3s (`refreshWhenHidden: false`, `revalidateOnFocus: true`) + Server Actions para envío. Sin WebSockets ni SSE — coherente con PM2 single-process.
- **date-fns** con `locale={es}` para fechas en UI.
- **Zod** para validación en todas las rutas API y Server Actions. Todos los errores se muestran completos: `issues.map(i => i.message).join(" · ")` (no solo el primero).

### Diferencias respecto a §3 y §4 (modelo de datos final)
- **Mapas:** Leaflet en lugar de Mapbox GL JS.
- **`users`** extendido para Auth.js y v2 del producto, conservando los nombres de columna originales via `@map`:
  - `password_hash` (TEXT) — bcrypt.
  - `email_verified` (TIMESTAMP, NULL) — Auth.js.
  - `bio` (VARCHAR 280) — perfil público (F6).
  - `role` (enum `UserRole`: `user`/`admin`) — gestiona acceso a `/admin/*` (F4).
  - `name` mapea a `full_name`, `image` mapea a `avatar_url` (Auth.js naming sobre columnas originales).
- Tablas adicionales del adaptador Auth.js: `accounts`, `sessions`, `verification_tokens`.
- **`items`** ha **perdido** la columna `image_url`. Ahora la portada y galería viven en una tabla aparte `item_images` (`itemId`, `url`, `position` 0..3, unique `(itemId, position)`).
- **`requests`** tiene además `start_date` y `end_date` (`DATE`, nullable) — calendario simple de react-day-picker. **Mantener simple**, §6 prohíbe calendarios complejos.
- **`messages`** y **`reports`** llevan `created_at` (TIMESTAMP) — imprescindible para ordenar el chat e indexar el backoffice. Estaba ausente del esquema §4 original.
- **Tablas nuevas:**
  - `wanted_items` + `wanted_item_matches` — Marketplace Inverso "Se busca", con match bidireccional síncrono en BD usando PostGIS.
  - `user_ratings` — valoraciones 1-5 con comment opcional. Unique `(request_id, rater_user_id)` para una valoración por participante. AVG calculado en lectura.
- **Enums Postgres** (`UserStatus`, `UserRole`, `RequestStatus`, `WantedItemStatus`) en lugar de `varchar` libre. El listado completo de estados de §2.3 está en `RequestStatus`.

### Mapa de rutas implementadas
| Ruta | Tipo | Función |
|---|---|---|
| `/` | Server | Hero con detección de sesión |
| `/auth/login`, `/auth/register` | Client | Form NextAuth + auto-login al registrar. `LoginForm` en Suspense (usa `useSearchParams`) |
| `/api/register` | POST | Crea usuario con bcrypt. try/catch P2002 → 201 (no email enumeration). Rate-limit 5/h por IP |
| `/api/auth/[...nextauth]` | NextAuth | Sesiones |
| `/perfil` | Server (protegida) | Perfil propio editable (nombre, bio, avatar) |
| `/usuarios/[id]` y `/usuarios/me` | Server | Perfil público: avatar, bio, AVG rating, items, reviews |
| `/publicar` | Server (protegida) | Form con galería (hasta 4 imgs) + `AddressPicker` |
| `/api/items` | POST | Crea Item con `ownerId`, persiste galería, ejecuta match contra `wanted_items` |
| `/api/geocode` | GET | Proxy server-side de Nominatim. User-Agent TOS, 6h cache, rate-limit por IP |
| `/explorar` | Server + `loading.tsx` | Grid con buscador full-text (tsvector/GIN) + categoría. `take: 60`. Skeleton en carga |
| `/explorar/mapa` | Client (dynamic) | Mapa CartoDB Voyager + priceMarker DivIcon + filtro radio (PostGIS) + popups rebranded |
| `/api/items/nearby` | GET | `ST_DWithin` con jitter determinístico (SHA-256). `Prisma.sql` parametrizado. Cover via subquery |
| `/items/[id]` | Server | Detalle con galería conmutable + panel de reserva con calendario. Fechas como `YYYY-MM-DD` (TZ fix) |
| `/api/requests` | POST | Crea Request `pending`. Bloquea reservar lo propio. |
| `/api/requests/[id]` | PATCH | Solo el dueño: `accept` / `reject` |
| `/api/requests/[id]/messages` | GET | Lista mensajes (ordenados ASC) si el caller participa |
| `/requests/[id]/chat` | Server (protegida) | Hilo de chat con polling SWR 3s |
| `/dashboard` | Server + `loading.tsx` | Mis alquileres + Mis solicitudes + Doble Check (CAS atómico) + Chat + Reportar + Rating. Skeleton en carga |
| `/se-busca` | Server | Muro público de peticiones con filtro por categoría |
| `/se-busca/nuevo` | Server (protegida) | Form Wanted con `AddressPicker`, radio configurable, expira a 30 días |
| `/se-busca/[id]` | Server | Detalle de petición + matches (solo para el requester), marca `seen_at` |
| `/api/wanted-items` | POST/GET | Crear (match retroactivo) / listar público con jitter determinístico. `Prisma.sql` parametrizado |
| `/api/wanted-items/[id]` | PATCH | Solo el requester: `fulfill` / `cancel` / `extend` (+30 días) |
| `/api/reports` | POST | Reportar problema en transacción activa |
| `/api/uploads` | POST | Subida multipart: 5 MB max, magic-bytes, sharp + pixel-bomb guard + rate-limit + CSRF check |
| `/uploads/[...path]` | GET | Servidor estático de uploads (streaming + Cache immutable) |
| `/mensajes` | Server + `loading.tsx` | Lista de DMs. `Promise.all([convs, unreadRows])`. Skeleton en carga |
| `/mensajes/[id]` | Client | DM room. read-then-mark (fix race mark-as-read) |
| `/admin` (layout) | Server | Guard por `users.role='admin'` con `notFound()` si no |
| `/admin/reports` | Server | Listado con Resolver/Reabrir + Suspender/Reactivar al otro participante |

### Server Actions (no son rutas API, se invocan desde Client Components)
- `src/app/dashboard/actions.ts` — Doble Check: `deliverItem`, `confirmReceipt`, `markReturned`, `confirmReturn`.
- `src/app/dashboard/rating-actions.ts` — `submitRating`.
- `src/app/admin/actions.ts` — `resolveReport`, `reopenReport`, `suspendUser`, `reactivateUser`.
- `src/app/perfil/actions.ts` — `updateProfile` (con cleanup del avatar anterior).
- `src/app/requests/[id]/chat/actions.ts` — `createMessage`.

### Estructura de uploads en disco
```
$UPLOAD_DIR/
  ├── items/<uuid>.webp     # 1..4 imágenes por item (`item_images.url`)
  └── avatars/<uuid>.webp   # 0..1 imagen por user (`users.avatar_url`)
```
- En dev: `./uploads/` (gitignored).
- En prod: apuntar `UPLOAD_DIR` a `/var/lib/shareable/uploads`. Hacer backup independiente del directorio.
- El Route Handler `/uploads/[...path]` valida UUID regex y bloquea path traversal.

### Variables de entorno (`.env`)
```
DATABASE_URL="postgresql://postgres:<pwd>@127.0.0.1:5432/shareable?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<crypto.randomBytes(32).toString('base64')>"   # OBLIGATORIO en prod — falla en arranque si falta
UPLOAD_DIR="./uploads"      # En prod: /var/lib/shareable/uploads

# Jitter determinístico de coordenadas (cualquier string aleatorio)
JITTER_SEED="<openssl rand -hex 32>"

# Proxy Nominatim — formato: "AppName/version (contact@email)" — requerido por TOS
GEOCODER_USER_AGENT="shareable/1.0 (arrojomanuel01@gmail.com)"

# Logs Prisma (opcional dev — nunca en prod)
# DEBUG_PRISMA="true"
```
`.env*` está en `.gitignore`. **No commitear.**

### Comandos clave (PowerShell)
```powershell
npm run dev                              # Next dev en :3000 (Turbopack)
npx prisma studio                        # Studio en :5555
npx prisma migrate dev --name <nombre>   # Tras editar schema.prisma
npx prisma generate                      # Regenera el cliente
                                         # En Windows: parar dev antes — el query_engine.dll.node queda bloqueado
```

### Promoción a admin
No hay UI todavía. Para crear un admin:
```sql
UPDATE users SET role='admin' WHERE email='tu@email';
```
O en Prisma Studio: tabla `users` → columna `role` → `admin`. Efecto inmediato (el rol se lee de BD, no del JWT).

### Despliegue — Hostinger KVM 2 / Ubuntu 24.04 LTS
**Plataforma decidida:** Hostinger VPS (KVM 2), Ubuntu 24.04 LTS. No Vercel/Supabase Cloud.

```bash
# 1. Servidor — una sola vez
sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-contrib postgis
sudo -u postgres psql -c "CREATE DATABASE shareable;"
sudo -u postgres psql -d shareable -c "CREATE EXTENSION postgis;"
npm install -g pm2

# 2. App
git clone <repo> /opt/shareable && cd /opt/shareable
npm ci
cp .env.example .env   # rellenar DATABASE_URL, NEXTAUTH_SECRET, JITTER_SEED, GEOCODER_USER_AGENT, SMTP_*
npx prisma migrate deploy
npm run build

# 3. PM2
pm2 start npm --name shareable -- start
pm2 save && pm2 startup

# 4. Nginx + Certbot (HTTPS)
sudo apt install -y nginx certbot python3-certbot-nginx
# configurar server_name en /etc/nginx/sites-available/shareable
sudo certbot --nginx -d tudominio.com

# 5. Cron de limpieza (crontab -e)
0 3 * * * cd /opt/shareable && npx tsx scripts/cleanup-orphans.ts >> /var/log/shareable-cleanup.log 2>&1
```
- **Uploads:** `UPLOAD_DIR=/var/lib/shareable/uploads` — fuera del repo. Backup periódico independiente.
- **BD:** `pg_dump shareable` en cron aparte.
- **Uploads servidos por Next:** el Route Handler `/uploads/[...path]` los lee de disco. Nginx hace proxy_pass a `:3000`, no sirve los archivos directamente.

### v2 — Completado (Mayo 2026)

Todas las tareas v2 están implementadas:

| # | Feature | Archivos clave |
|---|---------|---------------|
| 1 | **Índice GIST** coordenadas items + wanted_items | `prisma/migrations/20260511200000_v2_gist_fulltext/` |
| 2 | **Avatar/role en JWT** — refresh en cada firma JWT | `src/lib/auth.ts` callbacks |
| 3 | **Búsqueda full-text** — tsvector STORED + GIN + plainto_tsquery('spanish') | `src/app/explorar/page.tsx` |
| 4 | **Cron limpieza huérfanos** — 7 días de gracia | `src/lib/cleanup.ts`, `scripts/cleanup-orphans.ts`, `/api/admin/cleanup` |
| 5 | **Edición de items** — PATCH `/api/items/[id]` + `/items/[id]/editar` | `src/app/api/items/[id]/route.ts`, `src/app/items/[id]/editar/` |
| 5 | **Edición de wanted_items** — action `edit` en PATCH + `/se-busca/[id]/editar` | `src/app/api/wanted-items/[id]/route.ts`, `src/app/se-busca/[id]/editar/` |
| 6 | **Admin: /admin/usuarios** — tabla con búsqueda, suspender/reactivar | `src/app/admin/usuarios/` |
| 6 | **Admin: /admin/se-busca** — tabla de peticiones con cancelación | `src/app/admin/se-busca/` |
| 7 | **Galería drag-to-reorder** — @dnd-kit/sortable en ImageUploader | `src/components/image-uploader.tsx` |
| 8 | **Notificaciones email** — nodemailer + SMTP opcional | `src/lib/mailer.ts` |

#### Eventos que generan email
- Nueva solicitud de reserva → dueño
- Solicitud aceptada/rechazada → solicitante
- Nuevo mensaje en chat → el otro participante
- Nuevo match en "Se busca" → requester
- Doble check completo (entrega + devolución) → ambas partes

#### Variables SMTP (opcionales — si no se configuran los emails se omiten silenciosamente)
```
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
```

#### Cron de limpieza
```bash
# Debian crontab — diario a las 3 AM
0 3 * * * cd /opt/shareable && npx tsx scripts/cleanup-orphans.ts >> /var/log/shareable-cleanup.log 2>&1
```

### Seguridad — Capa 3 (Mayo 2026) ✅

Todos los issues aplicados. **No re-sugerir.**

| # | Fix | Archivo(s) |
|---|-----|-----------|
| 1 | Headers HTTP completos (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) + `poweredByHeader: false` | `next.config.ts` |
| 2 | Raw SQL → `Prisma.sql` template literals (no más `$queryRawUnsafe` con concatenación) | `src/app/api/items/nearby/route.ts`, `src/app/api/wanted-items/route.ts` |
| 3 | Jitter determinístico SHA-256(id + axis + JITTER_SEED). `Math.random()` era reversible por averaging | `src/lib/geo.ts` (nuevo) |
| 4 | `limitInputPixels: 24_000_000` en sharp (pixel bomb). Single `writeFile` (elimina double-decode). `checkUploadRate()` en memoria | `src/lib/uploads.ts` |
| 5 | `checkUploadRate(userId)` + `originAllowed(req)` CSRF guard en la ruta de upload | `src/app/api/uploads/route.ts` |
| 6 | `escapeHtml()` para datos de usuario en HTML emails. `safeSubject()` elimina CRLF del asunto | `src/lib/mailer.ts` |
| 7 | try/catch P2002 → devuelve 201 (no email enumeration). Rate-limit 5 registros/h por IP | `src/app/api/register/route.ts` |
| 8 | NEXTAUTH_SECRET fail-loud en prod. DUMMY_HASH para tiempo constante en auth. `jwt()` verifica `user.status` → mata sesiones de suspendidos. `auth = cache(...)` | `src/lib/auth.ts` |
| 9 | Proxy server-side de Nominatim (no fetch directo del browser — bloquearía `User-Agent` requerido por TOS). Rate-limit por IP + 6h cache | `src/app/api/geocode/route.ts` (nuevo) |
| 10 | read-then-mark: lee el último mensaje antes de marcar como leídos (`createdAt: { lte: last.createdAt }`) — fix race condition | `src/app/api/conversations/[id]/messages/route.ts`, `src/app/mensajes/[id]/page.tsx` |
| 11 | Doble Check CAS atómico: `updateMany({ where: { id, status: fromStatus } })`. Previene doble-email en race | `src/app/dashboard/actions.ts` |
| 12 | Anti-hijacking avatar: `prisma.user.findFirst({ where: { image, NOT: { id: userId } } })` — rechaza URL ajena | `src/app/perfil/actions.ts` |
| 13 | `take: 60` en query de /explorar (antes sin límite) | `src/app/explorar/page.tsx` |
| 14 | `AddressPicker` usa `/api/geocode` (proxy), debounce 800ms, sin anti-pattern useEffect — `onChange` directo en `pick()` | `src/components/address-picker.tsx` |
| 15 | `Promise.all([params, auth()])` en páginas con params async + auth | 7 ficheros de página |

### Rediseño del mapa (Mayo 2026) ✅

**No re-sugerir cambiar tiles, marcadores ni popups — ya están rediseñados.**

- **Tiles:** CartoDB Voyager (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/...`). Calles y edificios con estilo gráfico limpio.
- **Marcadores:** `priceMarker(shortPrice, isFree)` — DivIcon con círculo coral (precio) o verde salvia (gratis). CSS en `src/components/map-styles.css` (`.shareable-marker`).
- **Popups:** Rebranded — `border-radius: 16px`, borde brand `#eddfc4`, sombra suave, botón cierre como píldora blanca. Imagen 16:10, badge categoría, pastilla precio, distancia. Zoom controls rebranded.
- **Archivos nuevos:** `src/components/map-styles.ts` (TILE_URL, TILE_ATTRIBUTION, priceMarker factory), `src/components/map-styles.css`.
- **`prefers-reduced-motion`:** Recenter en Leaflet no anima si el usuario lo prefiere.

### UI/UX Pro Max (Mayo 2026) ✅

**Mejoras aplicadas — no re-sugerir.**

| Mejora | Detalle | Archivos |
|--------|---------|---------|
| `prefers-reduced-motion` | Bloque CSS que deshabilita todas las animaciones. Branch en Recenter de Leaflet | `src/app/globals.css`, `explore-map.tsx` |
| `role="alert"` | Todos los banners de error tienen `role="alert"` para lectores de pantalla | 13 ficheros con `<p>` de error |
| Nav activa | `usePathname()` + `isActive()`. Link activo: `bg-primary/10 text-primary` + `aria-current="page"` | `src/components/navbar.tsx` |
| Skeletons | `loading.tsx` con shimmer para /explorar, /dashboard, /mensajes | 3 ficheros nuevos |
| `tabular-nums` | Clase en todos los spans de precio para alineación columnar | 5 ubicaciones |
| Errores Zod completos | `issues.map(i => i.message).join(" · ")` en lugar de solo el primero | 9 rutas/actions |
| `<Image>` Next.js | `<img>` → `<Image fill sizes="...">` en galerías y avatares | 5 ficheros de UI |

### React Doctor audit (Mayo 2026) ✅

Se auditaron 173 issues reportados por react-doctor. Solo ~38 eran reales (código en esa fecha). **135 rechazados como falsos positivos** (código obsoleto en el snapshot del auditor, patrones no aplicables a Next.js 16 App Router, contradicciones con DESIGN.md). Los 38 reales están aplicados en las secciones anteriores. **No volver a ejecutar react-doctor sobre este repo sin verificar que el auditor tiene el código más reciente.**

### Tareas pendientes (v3)
- **Notificaciones push** (Web Push API / service worker) — requiere HTTPS en producción.
- **Verificación email** al registrarse.
- **Edición in-place de galería** con drag dentro de items ya publicados (hoy solo en el form de edición).
- **Índice de texto completo en wanted_items** (hoy solo en items).
