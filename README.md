# Shareable

> Hyperlocal platform for lending and renting everyday tools and objects between neighbors.
> Built to reduce consumption and foster circular economy at the neighborhood scale.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL 18 + PostGIS · Prisma 6 · Auth.js v4 · Tailwind v4 · shadcn/ui (Base UI) · Leaflet · self-hosted on a VPS

---

## Why this project

Most "sharing economy" apps for physical objects fail because the friction of coordinating exceeds the cost of just buying the item. Shareable's bet is that **hyperlocal scope (a single neighborhood), zero fees, and a strict two-party handover protocol** can make occasional lending viable where global marketplaces can't.

The MVP is geofenced to **Sanchinarro (Madrid)**. The platform takes no cut: it's a coordination layer, not a payment processor.

## What's interesting technically

This isn't a CRUD tutorial. A few things I'd point recruiters at:

- **Deterministic geographic jitter.** Public coordinates on the map are perturbed with `SHA-256(itemId + axis + JITTER_SEED)` instead of `Math.random()`. Random jitter is reversible by averaging across requests — deterministic jitter is not. See [`src/lib/geo.ts`](src/lib/geo.ts).
- **Atomic state machine for the "Double Check" handover.** The lending lifecycle uses optimistic concurrency: `updateMany({ where: { id, status: fromStatus } })`. Without this, two simultaneous "object delivered" clicks could double-fire emails and corrupt state.
- **PostGIS proximity search** with `ST_DWithin` and `geography(Point, 4326)` built on the fly, all through parameterized `Prisma.sql` template literals — no `$queryRawUnsafe`, no SQL injection surface.
- **Image upload hardened against pixel bombs.** `sharp` with `limitInputPixels: 24_000_000`, magic-byte verification via `file-type`, EXIF stripped, persistent rate-limit in DB, files stored **outside** `/public` and served through a guarded Route Handler with anti–path-traversal.
- **Security headers shipped by default**: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, `poweredByHeader: false`.
- **No email enumeration** on registration: P2002 collisions return 201 + 5/h IP rate-limit.
- **Suspended-user sessions die in flight**: the `jwt()` callback re-reads `user.status` from the DB on every refresh.
- **Self-hosted by design.** No Vercel, no Supabase Cloud. Runs on a single Ubuntu VPS with PM2 + Nginx + Certbot. Postgres lives on the same machine.

Full architecture and security log lives in [`CLAUDE.md`](CLAUDE.md).

## Features

- Email + password auth (Auth.js, JWT sessions, bcrypt cost 12 + DUMMY_HASH for constant-time)
- Publish items with up to 4 images per listing (drag-to-reorder)
- Map view with CartoDB Voyager tiles, price markers as `DivIcon`, radius filter
- Full-text search (tsvector STORED + GIN, `plainto_tsquery('spanish')`)
- Reservation flow with calendar (`react-day-picker`)
- "Double Check" handover protocol: 4 state transitions, both parties must confirm
- Integrated chat per reservation (SWR polling with `?since=` delta — no WebSockets, coherent with single-process PM2)
- Direct messages (DMs) between users
- "Wanted" reverse marketplace: post what you need, bidirectional matching via PostGIS
- 1–5 star ratings, profile pages with averages
- Admin panel: reports, users, wanted items
- Transactional emails via nodemailer (optional SMTP)
- Cron-driven cleanup of orphan uploads with 7-day grace

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router (Turbopack), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (theme in `globals.css`, no `tailwind.config.ts`) |
| UI primitives | shadcn/ui on Base UI |
| Database | PostgreSQL 18 + PostGIS |
| ORM | Prisma 6 |
| Auth | Auth.js v4 + Prisma Adapter, JWT sessions |
| Maps | Leaflet + react-leaflet + CartoDB Voyager tiles |
| Images | sharp + file-type |
| Validation | Zod (every API route and Server Action) |
| Mail | nodemailer (optional) |
| Hosting | Ubuntu VPS · PM2 · Nginx · Certbot |

## Local setup

Requirements: Node 20+, PostgreSQL 18 with PostGIS, OpenSSL (for secrets).

```bash
git clone https://github.com/Manu050/shareable.git
cd shareable
npm install
cp .env.example .env  # fill in DATABASE_URL, NEXTAUTH_SECRET, JITTER_SEED, GEOCODER_USER_AGENT

# In your Postgres instance, once:
#   CREATE DATABASE shareable;
#   \c shareable
#   CREATE EXTENSION postgis;

npx prisma migrate deploy
npm run dev
```

App at http://localhost:3000 · Prisma Studio with `npx prisma studio` at :5555.

## Production deployment (Ubuntu 24.04 LTS VPS)

```bash
sudo apt install -y nodejs npm postgresql postgresql-contrib postgis nginx certbot python3-certbot-nginx
sudo -u postgres psql -c "CREATE DATABASE shareable;"
sudo -u postgres psql -d shareable -c "CREATE EXTENSION postgis;"
npm install -g pm2

git clone https://github.com/Manu050/shareable.git /opt/shareable
cd /opt/shareable && npm ci
cp .env.example .env  # fill in real values, set UPLOAD_DIR=/var/lib/shareable/uploads
npx prisma migrate deploy
npm run build
pm2 start npm --name shareable -- start
pm2 save && pm2 startup

sudo certbot --nginx -d your.domain
```

Daily orphan cleanup via cron:

```
0 3 * * * cd /opt/shareable && npx tsx scripts/cleanup-orphans.ts >> /var/log/shareable-cleanup.log 2>&1
```

## Project status

- **v1 MVP** — closed (auth, items, requests with Double Check, chat, reports).
- **v2** — closed (reverse marketplace, DMs, admin panel, full-text search, drag-to-reorder galleries, email notifications, persistent rate-limits, observability for mail failures).
- **v3 (not started)** — web push notifications, email verification at signup, full-text on `wanted_items`.

## License

MIT — see [LICENSE](LICENSE).

## Author

**Manuel Arrojo** — [arrojomanuel01@gmail.com](mailto:arrojomanuel01@gmail.com)
Final-year project for a Software Engineering itinerary. Built solo.
