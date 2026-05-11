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
- **Mapas:** Mapbox GL JS (fijando el centro inicial en Sanchinarro).

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
- **Servidor Destino:** VPS propio con sistema operativo Debian. Node.js ya está instalado en la máquina.
- **Base de Datos:** PostgreSQL se alojará e instalará directamente en este mismo servidor Debian (junto con la extensión PostGIS).
- **Estrategia de Despliegue:** La aplicación Next.js se compilará para producción (`npm run build`) y se mantendrá en ejecución utilizando un gestor de procesos como PM2.
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
- **Tailwind CSS v4**: la paleta vive en `src/app/globals.css` dentro de `:root` y `@theme inline` — **no hay `tailwind.config.ts`** (Tailwind v4 ya no lo usa para temas).
- **shadcn/ui** sobre **Base UI** (no Radix). Triggers usan la prop `render={...}` en lugar de `asChild`. Para que un `Link` se vea como `Button` se usa `cn(buttonVariants({...}), "...")`.
- **Prisma 6** + **PostgreSQL 18** local. Esquema en `prisma/schema.prisma`. Cliente singleton en `src/lib/prisma.ts`.
- **Auth.js v4** (`next-auth@4`) con **Prisma Adapter** + `CredentialsProvider`. Sesiones **JWT** (Auth.js no soporta DB sessions con credentials). Hash con `bcryptjs`. Helper `auth()` en `src/lib/auth.ts`.
- **Mapas:** **Leaflet + react-leaflet + OpenStreetMap** (no Mapbox — evita API key de pago y encaja con el self-host). Búsqueda de direcciones con **Nominatim**.
- **PostGIS** habilitado (`CREATE EXTENSION postgis`). Las consultas de cercanía usan `ST_DWithin` / `ST_Distance` con `geography(Point, 4326)` construido al vuelo desde `latitude`/`longitude` (no hay columna `geography` aún).
- **Imágenes:** `sharp` (resize 1600px + webp q82 + strip EXIF) + `file-type` (magic bytes). Almacenamiento en disco fuera de `/public`, servido por Route Handler con guard anti-traversal y `Cache-Control: immutable`. Carpeta configurable por env `UPLOAD_DIR`.
- **Chat:** **SWR** con polling 3s (`refreshWhenHidden: false`, `revalidateOnFocus: true`) + Server Actions para envío. Sin WebSockets ni SSE — coherente con PM2 single-process.
- **date-fns** con `locale={es}` para fechas en UI.
- **Zod** para validación en todas las rutas API y Server Actions.

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
| `/auth/login`, `/auth/register` | Client | Form NextAuth + auto-login al registrar |
| `/api/register` | POST | Crea usuario con bcrypt |
| `/api/auth/[...nextauth]` | NextAuth | Sesiones |
| `/perfil` | Server (protegida) | Perfil propio editable (nombre, bio, avatar) |
| `/usuarios/[id]` y `/usuarios/me` | Server | Perfil público: avatar, bio, AVG rating, items, reviews |
| `/publicar` | Server (protegida) | Form con galería (hasta 4 imgs) + `AddressPicker` |
| `/api/items` | POST | Crea Item con `ownerId`, persiste galería, ejecuta match contra `wanted_items` |
| `/explorar` | Server | Grid con buscador (texto + categoría) y empty state CTA "Pídelo al barrio" |
| `/explorar/mapa` | Client (dynamic) | Mapa Leaflet + filtro radio (PostGIS) + popups con "Ver detalle" |
| `/api/items/nearby` | GET | `ST_DWithin` con ruido espacial ±~45 m. Devuelve cover via subquery a `item_images` |
| `/items/[id]` | Server | Detalle con galería conmutable + panel de reserva con calendario |
| `/api/requests` | POST | Crea Request `pending`. Bloquea reservar lo propio. |
| `/api/requests/[id]` | PATCH | Solo el dueño: `accept` / `reject` |
| `/api/requests/[id]/messages` | GET | Lista mensajes (ordenados ASC) si el caller participa |
| `/requests/[id]/chat` | Server (protegida) | Hilo de chat con polling SWR 3s |
| `/dashboard` | Server (protegida) | Mis alquileres + Mis solicitudes + Mis peticiones (badge matches) + Doble Check + Chat + Reportar + Rating al completar |
| `/se-busca` | Server | Muro público de peticiones con filtro por categoría |
| `/se-busca/nuevo` | Server (protegida) | Form Wanted con `AddressPicker`, radio configurable, expira a 30 días |
| `/se-busca/[id]` | Server | Detalle de petición + matches (solo para el requester), marca `seen_at` |
| `/api/wanted-items` | POST/GET | Crear (match retroactivo) / listar público con jitter |
| `/api/wanted-items/[id]` | PATCH | Solo el requester: `fulfill` / `cancel` / `extend` (+30 días) |
| `/api/reports` | POST | Reportar problema en transacción activa |
| `/api/uploads` | POST | Subida multipart: 5 MB max, validación magic-bytes, sharp + strip EXIF |
| `/uploads/[...path]` | GET | Servidor estático de uploads (streaming + Cache immutable) |
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
NEXTAUTH_SECRET="<crypto.randomBytes(32).toString('base64')>"
UPLOAD_DIR="./uploads"      # En prod: /var/lib/shareable/uploads
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

### Despliegue (objetivo, aún no automatizado)
Servidor Debian + Node + PostgreSQL+PostGIS + PM2. Pasos:
1. `npm run build`
2. `pm2 start npm --name shareable -- start`
3. Reverse proxy (nginx/caddy) hacia `:3000`. **Servir `/uploads/*` también vía Next** (los archivos no están en el bundle, los lee el Route Handler de disco).
4. Backup periódico de `$UPLOAD_DIR` y `pg_dump` de la BD.
5. **No** asumir Vercel/Supabase Cloud (regla §5).

### Tareas pendientes (v2, fuera del MVP)
- **Notificaciones**: hoy solo badge in-app. Mail/push pendientes (decisión consciente en F5/F6).
- **Búsqueda full-text** en `/explorar` (hoy `ILIKE`, escala bien hasta unos miles de items).
- **Galería con drag-to-reorder** (hoy "Quitar todas + volver a subir").
- **Cron de limpieza** de imágenes huérfanas en disco (uploads sin item asociado tras 7 días).
- **Vista admin** para `wanted_items` y `users` (hoy admin solo gestiona `reports`).
- **Edición de items / wanted_items** desde la UI (hoy se crean y borran, no se editan).
- **Avatar/role en JWT** si llega un caso de uso que justifique el cache (el coste actual de re-lookup es despreciable).
- **Índice GIST** sobre las coordenadas de `items` y `wanted_items` si la BD crece más allá de un barrio.
