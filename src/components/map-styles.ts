// Importa los estilos de Leaflet una sola vez en cliente.
// (En App Router, importar el .css desde un Client Component es válido.)
import "leaflet/dist/leaflet.css";

// Workaround conocido de Leaflet con bundlers: las URLs por defecto de los
// iconos del marker se resuelven mal y salen rotas. Forzamos las URLs del CDN.
import L from "leaflet";

// @ts-expect-error — propiedad privada usada por leaflet para construir iconos.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
