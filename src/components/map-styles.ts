// Importa los estilos de Leaflet una sola vez en cliente.
// (En App Router, importar el .css desde un Client Component es válido.)
import "leaflet/dist/leaflet.css";
// Overrides Shareable: popup, controls, marker custom.
import "./map-styles.css";

import L from "leaflet";

// Workaround conocido de Leaflet con bundlers: las URLs por defecto de los
// iconos del marker se resuelven mal y salen rotas. Forzamos las URLs del CDN.
// @ts-expect-error — propiedad privada usada por leaflet para construir iconos.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Tile layer recomendado: CartoDB Voyager. Cálido, casa con la paleta `#FFFBF1`
// del proyecto. Mismas reglas de uso que OSM (atribución obligatoria).
export const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
export const TILE_SUBDOMAINS = ["a", "b", "c", "d"];
export const TILE_MAX_ZOOM = 19;

// DivIcon para los markers del listado: círculo coral con el precio dentro
// (o "Gratis" en verde salvia). Más expresivo que el pin azul por defecto y
// permite leer el precio de un vistazo sin abrir el popup.
export function priceMarker(label: string, free: boolean): L.DivIcon {
  return L.divIcon({
    className: "", // anulamos el className por defecto de Leaflet
    html: `<div class="shareable-marker${free ? " shareable-marker--free" : ""}">${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18], // centrado en el punto
    popupAnchor: [0, -18], // popup sale justo encima
  });
}
