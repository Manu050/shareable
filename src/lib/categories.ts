export const ITEM_CATEGORIES = [
  "Herramientas",
  "Cocina",
  "Jardín",
  "Deporte",
  "Tecnología",
  "Hogar",
  "Bricolaje",
  "Otros",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

// Coordenadas por defecto: Sanchinarro (Madrid).
export const DEFAULT_LATITUDE = 40.49;
export const DEFAULT_LONGITUDE = -3.66;
