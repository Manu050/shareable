import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a TODA respuesta. Mitigan clickjacking,
// MIME-sniffing, leaks por Referer y restringen permisos del navegador.
// CSP es relativamente laxa para no romper Leaflet/OSM/Nominatim ni los
// avatares + tiles externos; ajusta `connect-src` y `img-src` si añades más
// dominios.
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  // Next inline scripts (hydration) — 'unsafe-inline' es obligado mientras
  // no se use nonce dinámico.
  "'unsafe-inline'",
  // 'unsafe-eval' SOLO en dev: Turbopack lo necesita para hot reload.
  // En prod su ausencia es una capa relevante contra XSS via eval.
  ...(isDev ? ["'unsafe-eval'"] : []),
].join(" ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // HSTS sólo tiene efecto sobre HTTPS — inocuo en localhost.
  // `preload` queda fuera intencionalmente: el MVP corre en un VPS donde el
  // dominio/SSL pueden cambiar; entrar en la lista preload del navegador
  // bloquearía a los usuarios si algo se rompe. Añadirlo cuando el dominio
  // sea definitivo.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      // Tiles del basemap (Carto Voyager + fallback OSM) + iconos de marker
      // del CDN de Leaflet + avatares servidos por nuestro Route Handler.
      "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com",
      "font-src 'self' data:",
      // Conexiones permitidas: nuestra API (relativa) y Nominatim a través de
      // proxy interno (ver `/api/geocode`).
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/uploads/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
