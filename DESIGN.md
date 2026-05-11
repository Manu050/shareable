# GUÍA DE ESTILOS Y DISEÑO: "Shareable"

## 1. Identidad Visual y "Vibra"
La aplicación tiene un enfoque moderno, limpio y amigable. Al ser una app de barrio, debe transmitir confianza, cercanía y claridad. 
- **Estilo:** Minimalista, mucho espacio en blanco (whitespace), bordes redondeados (`rounded-xl` o `rounded-2xl`).
- **Sombras:** Sombras suaves y difuminadas para dar profundidad a las tarjetas (`shadow-sm` o `shadow-md`), nunca sombras duras.

## 2. Paleta de Colores (Tailwind & Shadcn)
Aplica estos colores configurando el archivo `tailwind.config.ts` y las variables CSS de Shadcn en `globals.css`. La paleta tiene tonos cálidos y acogedores para fomentar la sensación de comunidad.

- **Color Principal (Primary):** `#E36A6A` (Coral Cálido) - *Para los botones principales como "Solicitar", iconos activos y elementos de llamada a la acción.*
- **Color Secundario (Secondary):** `#FFB2B2` (Salmón Suave) - *Para estados "hover" de botones principales, etiquetas de categorías o fondos de botones secundarios.*
- **Acento / Éxito (Accent):** `#739E82` (Verde Salvia) - *Como el resto de la paleta es cálida, este verde suave da un contraste perfecto para indicar "Objeto Disponible", estados de "Completado" o "Entregado".*
- **Fondo Principal (Background):** `#FFFBF1` (Blanco Vainilla) - *Color de fondo de toda la aplicación. Muy relajante para la vista.*
- **Fondo de Tarjetas (Card / Muted Bg):** `#FFF2D0` (Crema) - *Para darle un ligero resalte a las tarjetas de los artículos sobre el fondo principal.*
- **Texto Principal:** `#2C2525` (Carbón Cálido) - *Un tono muy oscuro con un ligerísimo tinte marrón. Sustituye al negro puro para suavizar la lectura.*
- **Texto Secundario (Muted):** `#8B7F7F` (Gris Topo) - *Para las descripciones, fechas, y textos menos importantes.*
- **Peligro / Alerta (Destructive):** `#C94B4B` (Rojo Teja Oscuro) - *Como el Primary ya es rojizo, el color de peligro debe ser más oscuro y serio. Se usa para el botón de "Reportar problema" o "Eliminar".*
## 3. Tipografía
- **Fuente Principal:** [Ej: Inter o Poppins] (Configurada mediante `next/font/google`).
- Los títulos (`h1`, `h2`) deben ser en negrita o semibold (`font-bold`, `font-semibold`) y tracking un poco más ajustado (`tracking-tight`).

## 4. Gestión de Recursos (Assets)
- **Imágenes estáticas:** Todas las imágenes estáticas (logo, ilustraciones por defecto, iconos personalizados) deben guardarse en la carpeta `/public/assets/`.
- **Avatares por defecto:** Si un usuario no sube foto, utiliza un componente visual (como un círculo con sus iniciales usando el Primary Color) en lugar de una imagen genérica vacía.
- **Iconografía:** Usa la librería `lucide-react` (es la que viene por defecto con Shadcn/ui) para mantener la consistencia visual.

## 5. Reglas de UI/UX para Claude
- **Mobile First:** Todo el diseño debe estar pensado primero para pantallas de móvil (Tailwind clases base) y luego expandirse a pantallas más grandes (prefijos `md:`, `lg:`).
- **Feedback Visual:** Todo botón debe tener un estado `:hover` y `:active` o un indicador de carga (spinner) cuando se hace una petición a Supabase/PostgreSQL.
- **Empty States (Estados Vacíos):** Cuando no haya artículos cerca o no haya mensajes en el chat, diseña un estado vacío amigable con un icono de Lucide y un texto animando a la acción (ej. "¡Vaya! No hay herramientas por aquí. Sé el primero en publicar una").