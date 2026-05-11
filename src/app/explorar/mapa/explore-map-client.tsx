"use client";

import dynamic from "next/dynamic";

// react-leaflet toca `window` al evaluar el módulo, así que el dynamic
// import con ssr:false vive en un Client Component (no se permite ssr:false
// dentro de un Server Component en Next 16).
export const ExploreMap = dynamic(
  () => import("./explore-map").then((m) => m.ExploreMap),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-[70vh] animate-pulse rounded-2xl bg-muted" />
      </div>
    ),
  },
);
