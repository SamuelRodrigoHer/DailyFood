# Sabor & Cesta

Planificador semanal de comidas, recetario y lista de la compra con modo local y sincronización opcional mediante Supabase.

## Desarrollo local

Requisitos: Node.js y npm. Instala dependencias y arranca Next.js:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin variables de Supabase, la aplicación funciona en modo demo y guarda recetas, menú y compra en el almacenamiento local de ese navegador. El inicio de sesión de demo no valida credenciales ni sincroniza datos: sirve únicamente para previsualizar la interfaz. No uses información sensible en este modo.

## Supabase (cuentas y sincronización)

1. Crea un proyecto en Supabase y copia `.env.local.example` a `.env.local`.
2. Rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los valores de **Project Settings → API**.
3. Ejecuta `supabase/schema.sql` en el SQL Editor del proyecto. El script también migra las tablas del esquema anterior.
4. En **Authentication → URL Configuration**, configura la URL local y, al desplegar, la URL pública de la aplicación.
5. Reinicia el servidor. El formulario permite crear cuentas e iniciar sesión con correo y contraseña.

Cada cuenta nueva recibe un hogar privado vacío. Desde «Mi hogar» puede generar una invitación temporal para compartir menú, recetas y lista con otras cuentas. Conviene canjear la invitación antes de añadir datos; el código caduca en 7 días. RLS limita las lecturas y escrituras a los miembros del hogar; conocer un UUID de otra fila no concede acceso. El modo demo local sí incluye recetas y ejemplos iniciales.

Una cuenta solo puede pertenecer a un hogar a la vez. Para evitar perder datos, el código solo permite cambiar desde un hogar todavía vacío; si esa cuenta ya tiene recetas, comidas o artículos, utiliza una cuenta nueva para aceptar la invitación. Al migrar desde el esquema anterior, las filas con `user_id` se asignan al hogar de esa cuenta. Las filas antiguas sin propietario permanecen inaccesibles y deben asignarse manualmente si necesitas conservarlas.

Las variables públicas solo deben contener la URL del proyecto y la clave publicable/anon. Nunca pongas una `service_role` key en el frontend ni en variables `NEXT_PUBLIC_*`.

## Despliegue en Cloudflare Workers

La versión publicada usa un subdominio `workers.dev`, que corresponde a Cloudflare Workers. Cloudflare Pages y Workers tienen flujos de despliegue distintos; la guía vigente para ejecutar Next.js en Workers documenta el adaptador OpenNext.

El despliegue existente se administra desde Cloudflare. Comprueba en **Workers & Pages → Workers Builds** qué repositorio y rama están conectados antes de publicar cambios. Si el Worker está conectado a GitHub, los cambios deben llegar a esa rama para que se genere una nueva versión. El repositorio actual no contiene `wrangler.jsonc` ni scripts `preview`/`deploy`, así que la configuración activa vive en el panel de Cloudflare.

En **Build Variables and secrets**, configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; Next.js necesita ambas durante la compilación. En Supabase, añade la URL `workers.dev` a **Authentication → URL Configuration** como Site URL y URL de redirección.

Para configurar desde cero otro Worker para este proyecto, sigue la [guía oficial de Next.js en Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/). Wrangler puede detectar automáticamente Next.js, pero configura y valida primero el flujo de compilación antes de sustituir el Worker que ya está publicado. El modo demo también funciona sin variables de Supabase y guarda los datos en el navegador.

## PWA

La aplicación incluye un manifiesto, iconos PNG de 192 y 512 px, un icono SVG y un icono Apple Touch para permitir su instalación desde navegadores compatibles cuando se sirve por HTTPS (o en localhost). Después de publicar, comprueba que `/manifest.json`, `/icon-192.png`, `/icon-512.png` y `/apple-touch-icon.png` responden correctamente y que el navegador ofrece «Instalar» o «Añadir a pantalla de inicio».

La instalación no añade sincronización sin conexión: el modo Supabase necesita conexión y el modo demo guarda datos en el navegador. No se ha añadido un service worker ni caché offline.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm start
```
