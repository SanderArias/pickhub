<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:performance-rules -->
# Performance

Reglas obligatorias para todo el código PickHub. Guía completa en `docs/performance-guidelines.md`.

- **No N+1:** ninguna consulta Supabase dentro de bucles (`map`, `for...of`, `Promise.all` con N queries).
- **No `select('*')`:** siempre columnas explícitas.
- **Auth y perfil se cargan UNA vez por request** (memoizados con `cache()` de React en `services/supabase/server.ts`, `app/actions/auth.ts`, `lib/auth.ts`). No repetir `getUser()`, `getCurrentProfile()` ni `createServerClient()` en la misma request.
- **Sidebar recibe perfil como prop** (`initialProfile`). No consultar perfil desde el cliente.
- **Conteos en la BD:** usar `{ count: 'exact', head: true }` o embedded aggregates de PostgREST. No descargar filas para contar.
- **Server Components por defecto.** `'use client'` solo para interacción, estado, efectos o APIs del navegador.
- **RPCs solo cuando sea necesario:** evaluar primero queries paralelas simples. Preferir RPCs pequeñas y específicas.
- **RLS nunca se debilita por performance.** No desactivar RLS, no usar service role como atajo.
- **OpenCode NO ejecuta ni aplica migraciones.** Solo genera o modifica archivos.
- **`npm run build` obligatorio** antes de terminar cualquier tarea.
<!-- END:performance-rules -->
