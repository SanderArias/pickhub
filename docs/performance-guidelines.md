# Guía de Performance para PickHub

## 1. Propósito

Esta guía establece las reglas obligatorias para el desarrollo de PickHub. Su objetivo es evitar que la aplicación vuelva a acumular consultas duplicadas, waterfalls evitables, N+1, payloads innecesarios, conteos en JavaScript, creación repetida de clientes Supabase, bloqueos completos del render, caché insegura, índices ausentes, RPCs excesivamente amplias y componentes cliente innecesarios.

**Aplica a:** páginas, layouts, Server Components, Client Components, Server Actions, helpers de datos, consultas Supabase, RPCs, políticas RLS, migraciones y componentes globales (sidebar, navbar, providers).

**Cuándo consultarla:** antes de crear una página nueva, antes de agregar una consulta Supabase, antes de crear una RPC, antes de agregar estado a un componente global, y en toda revisión de código.

---

## 2. Principios generales

| Principio | Explicación |
|-----------|-------------|
| Medir antes de optimizar | No asumir cuellos de botella. Usar `perf` de `lib/perf.ts` en desarrollo. |
| Reducir viajes antes de agregar caché | Primero eliminar consultas redundantes; luego evaluar caché. |
| Consultar solo lo necesario | Cada columna y cada relación debe tener un uso confirmado en la UI. |
| No repetir datos ya disponibles | Si el layout ya cargó el perfil, los hijos no deben volver a consultarlo. |
| Procesar agregaciones cerca de la BD | Los conteos, sumas y agrupaciones deben hacerse en PostgreSQL, no en JavaScript. |
| No bloquear toda la UI por datos secundarios | Badges, actividad e indicadores complementarios deben cargarse sin retrasar el contenido principal. |
| La seguridad no debe sacrificarse por performance | RLS siempre activa. No usar service role como atajo. |

**Regla general:** No implementar una optimización solo porque parece más sofisticada. Si dos consultas simples, paralelas y pequeñas ofrecen buen rendimiento, no hace falta una RPC.

---

## 3. Presupuesto de consultas por pantalla

| Tipo de página | Consultas máximas (servidor + cliente) |
|----------------|----------------------------------------|
| Simple | 1–3 consultas principales |
| Media | 3–6 consultas principales |
| Compleja | 6–8 consultas justificadas |
| Más de 8 | Requiere auditoría antes de aprobarse |

**Reglas:**
- Incluir consultas de layouts, sidebar, navbar, providers y componentes cliente en el conteo.
- Una consulta por cada card de una lista es un problema, aunque se ejecute en paralelo.
- Las cifras son guías, no una razón para mezclar dominios sin sentido.
- Todo componente global con datos secundarios debe justificar su coste.

---

## 4. Prohibición de N+1

**Regla:** No ejecutar consultas Supabase dentro de bucles o por cada elemento de una lista.

**Incorrecto:**
```ts
const rows = await Promise.all(
  events.map(async (event) => {
    return supabase.from('ranking').select('*').eq('event_id', event.id);
  }),
);
```

`Promise.all` no elimina el N+1; solo ejecuta las N consultas en paralelo. Siguen siendo N viajes.

**Correcto:** usar una de estas alternativas:
- consulta por lote con `.in(...)`
- relación embebida de PostgREST
- agregado embebido (embedded aggregate)
- RPC específica con join
- consulta única con join

**Ejemplo real (PickHub):**
```ts
// En lugar de descargar todas las filas y contar en JS:
const { data } = await supabase
  .from('prediction_answers')
  .select('submission_id')
  .in('submission_id', ids);

// Usar embedded aggregate (PostgREST):
const { data } = await supabase
  .from('submissions')
  .select('id, answer_count:prediction_answers(count)')
  .in('id', ids);
```

**Regla adicional:** Toda lista que pueda crecer (5 o 500 elementos) debe conservar una cantidad estable de consultas.

---

## 5. Consultas secuenciales y paralelización

**Regla:** Primero obtener la dependencia común. Luego paralelizar operaciones independientes.

**Incorrecto:**
```ts
const profile = await getCurrentProfile(user.id);
const participations = await getUserParticipations(user.id);
// Ambas solo dependen de user.id, no entre sí.
```

**Correcto:**
```ts
const [profile, participations] = await Promise.all([
  getCurrentProfile(user),
  getUserParticipations('all', user),
]);
```

**Patrón real en PickHub** (`app/(app)/inicio/page.tsx:22-26`):
```ts
let [profile, participations] = await Promise.all([
  getCurrentProfile(user),
  getUserParticipations('all', user),
]);
```

**Excepciones:** No paralelizar cuando una consulta depende del resultado de otra (ej: necesitas los IDs de un conjunto para filtrar el siguiente).

**Reglas:**
- No crear decenas de consultas paralelas (satura la BD).
- No usar `Promise.all` para ocultar un N+1.
- Mantener manejo de errores comprensible.
- Medir antes y después.

---

## 6. Reutilización de autenticación, perfil y rol

**Regla:** No llamar `getUser()` o `getCurrentProfile()` más de una vez por request.

**Estrategia implementada:**
1. `createServerClient` memoizado con `cache()` de React en `services/supabase/server.ts`.
2. `getUser` memoizado con `cache()` en `app/actions/auth.ts`.
3. `getCurrentProfile` memoizado con `cache()` en `lib/auth.ts`.
4. El layout autenticado (`app/(app)/layout.tsx`) carga el perfil y lo pasa como `initialProfile` a `AppShell` → `Sidebar` → `CreatorWelcomeModal`.

**Incorrecto:**
```ts
// Sidebar.tsx (antes de la optimización)
const profile = useProfile(user); // consulta Supabase desde el cliente
// CreatorWelcomeModal.tsx
const profile = useProfile(user); // otra consulta idéntica
```

**Correcto:**
```ts
// Layout pasa el perfil como prop
<Sidebar initialProfile={profile}>

// Sidebar usa el prop directamente (useState lazy initializer)
const [profile] = useState(() => toProfileData(initialProfile));

// CreatorWelcomeModal determina apertura desde el prop
const [open] = useState(() => checkWelcomeCondition(initialProfile));
```

**Diferencia entre memoización por request y caché persistente:**
- `React.cache()` memoiza dentro del mismo render/server action. No comparte entre usuarios ni entre requests.
- Caché persistente (Redis, CDN, etc.) almacena datos entre requests y requiere invalidación explícita.

**Reglas:**
- No almacenar usuarios o perfiles en variables globales.
- No confiar en datos del cliente para autorización (siempre validar en servidor).

---

## 7. Creación y reutilización del cliente Supabase

**Regla:** Crear el cliente Supabase una vez por operación orquestada. No crearlo múltiples veces en la misma request.

**Patrón real:**
```ts
// services/supabase/server.ts
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, { cookies: { ... } });
});
```

**Cuándo pasar el cliente a helpers internos:**
```ts
// Opcional: cuando varios helpers lo necesitan en la misma operación
async function loadDashboard() {
  const supabase = await createClient();
  const profile = await getProfileWithClient(supabase, user.id);
  const participations = await getParticipationsWithClient(supabase, user.id);
}
```

**Prohibiciones:**
- No serializar el cliente Supabase.
- No pasarlo a Client Components.
- No almacenar cookies globalmente.
- No mezclar cliente de navegador y servidor.
- No crear un singleton global con contexto de cookies.

---

## 8. Selección explícita de columnas

**Regla:** No usar `.select('*')` en código de producción.

**Incorrecto:**
```ts
supabase.from('events').select('*');
```

**Correcto:**
```ts
supabase.from('events').select('id, title, status, starts_at, ends_at');
```

**Para relaciones:**
- Pedir solo campos utilizados.
- No traer perfiles completos para mostrar solo avatar y nombre.
- No traer premios completos para mostrar solo un estado.
- No traer respuestas completas para calcular una cantidad.

**Checklist:**
- [ ] ¿Cada columna retornada se usa?
- [ ] ¿Cada relación retornada se renderiza?
- [ ] ¿Los datos necesitan llegar al cliente?

---

## 9. Conteos y agregaciones

**Regla:** Los conteos deben realizarse en la base de datos, no en JavaScript.

**Incorrecto:**
```ts
const { data } = await supabase.from('prediction_answers').select('id');
const count = data.length;
```

**Correcto (conteo simple con `head: true`):**
```ts
const { count } = await supabase
  .from('submissions')
  .select('id', { count: 'exact', head: true })
  .in('event_id', eventIds);
```

**Correcto (conteo por grupo con embedded aggregate — patrón real PickHub):**
```ts
const { data: counts } = await supabase
  .from('submissions')
  .select('id, answer_count:prediction_answers(count)')
  .in('id', submissionIds);
```

**Alternativas disponibles (por orden de preferencia):**
1. `select('id', { count: 'exact', head: true })` — conteo total sin filas.
2. Embedded aggregate — conteo por grupo sin filas.
3. RPC específica — cuando se necesita lógica compleja.
4. Vista SQL — para agregaciones reutilizables.

**Regla:** No transferir N filas cuando la UI solo necesita un número.

---

## 10. Cuándo usar una RPC

**Usar una RPC cuando:**
- varias operaciones siempre se ejecutan juntas y no pueden simplificarse con queries paralelas.
- hay agregaciones o joins complejos.
- la lógica debe ser atómica (todo o nada).
- se requiere validación centralizada (SECURITY DEFINER).
- PostgREST no expresa bien la consulta.

**No usar una RPC cuando:**
- una consulta directa es suficiente.
- solo se busca abstraer una consulta simple.
- dos consultas pequeñas pueden ejecutarse en paralelo.
- la función devolvería un payload excesivo para varias pantallas.
- se intenta crear una "RPC universal".

**Caso real en PickHub:** Se evaluó crear una RPC general de dashboard y se descartó. Después de las optimizaciones directas (caché, paralelización, embedded aggregates, props), las ~6 consultas restantes no justificaban una RPC adicional.

**Preferir RPCs específicas:**
- `get_pickem_prize_awards(p_event_id)` — solo premios.
- `get_admin_users(p_page, p_page_size, p_search)` — solo admin.
- Eventual: `get_sidebar_activity_badge()` — si se necesita, solo el badge.

**Evitar:**
- `get_everything_for_app()`
- `get_full_dashboard_and_all_related_data()`

---

## 11. Seguridad de RPCs

### SECURITY INVOKER (preferida)
Usar cuando la función puede operar bajo los permisos y RLS del usuario que la invoca.

### SECURITY DEFINER (solo cuando sea necesario)
Toda función SECURITY DEFINER debe:
- Validar `auth.uid()` al inicio.
- Verificar rol, ownership o permiso explícito.
- Usar schemas explícitos (`set search_path = public`).
- No confiar en IDs manipulables (usar `auth.uid()` en vez de un parámetro `p_user_id`).
- Devolver únicamente datos que el usuario esté autorizado a ver.
- REVOKE ALL FROM public, anon, authenticated; GRANT EXECUTE solo a roles requeridos.

**Incorrecto:**
```sql
create function get_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
  select to_jsonb(...) from profiles where id = p_user_id;
$$;
```

**Correcto:**
```sql
create function get_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  return (select to_jsonb(...) from profiles where id = auth.uid());
end;
$$;
revoke all on function get_my_data from public, anon;
grant execute on function get_my_data to authenticated;
```

**Recalque:** Una RPC no sustituye la autorización. No desactivar RLS para mejorar performance.

---

## 12. Políticas RLS y performance

**Regla:** RLS debe conservarse siempre. No desactivarla por razones de performance.

**Al crear políticas:**
- Indexar las columnas usadas en los filtros de las políticas.
- Evitar subconsultas costosas por fila (ej: `auth.uid() IN (SELECT ...)` en tablas grandes).
- Reutilizar helpers de autorización existentes como `can_manage_pickem(event_id)`.
- No duplicar la misma validación en múltiples políticas de la misma tabla.
- Revisar el plan de ejecución (`EXPLAIN ANALYZE`) cuando la tabla crezca.

**Política correcta (ejemplo de PickHub):**
```sql
create policy "Anyone can read prize settings"
  on public.pickem_prize_settings for select
  using (true);
```

**Política con helper reutilizado:**
```sql
create policy "Creator can manage prize settings"
  on public.pickem_prize_settings for insert
  with check (public.can_manage_pickem(event_id));
```

**Prohibido:**
- Usar service role como sustituto de una política correcta.
- Hacer `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.

---

## 13. Índices

**Cuándo considerar un índice:**
- Filtros frecuentes (`WHERE col = ?`).
- Joins (`JOIN tabla ON col = ?`).
- Ordenamientos (`ORDER BY col DESC`).
- Combinaciones de filtro y orden.
- Restricciones únicas.
- Claves foráneas relevantes.

**Ejemplo real de PickHub** (`supabase/migrations/00059_add_prediction_scores_event_score_index.sql`):
```sql
create index if not exists idx_prediction_scores_event_score
  on public.prediction_scores (event_id, total_score desc);
```

**Por qué el orden importa:** Primero se filtra por `event_id` (alta selectividad), luego se ordena por `total_score DESC`. Con este orden de columnas, PostgreSQL puede devolver las filas ya ordenadas sin un Sort node adicional.

**Reglas:**
- Verificar índices existentes antes de crear uno nuevo (evitar duplicados).
- No indexar todas las columnas de una tabla.
- Considerar el coste de escritura (INSERT/UPDATE con índices adicionales es más lento).
- Justificar índices compuestos con las consultas que benefician.
- Usar `EXPLAIN ANALYZE` para validar.
- **OpenCode nunca ejecuta ni aplica migraciones.** Solo genera o modifica los archivos. El usuario las aplica manualmente.

---

## 14. Server Components y Client Components

**Regla:** Los componentes deben ser Server Components por defecto. Usar `'use client'` solo cuando sea estrictamente necesario.

**Justificaciones válidas para `'use client'`:**
- Interacción del usuario (onClick, onChange, onSubmit).
- Estado local (useState, useReducer).
- Efectos (useEffect, useLayoutEffect).
- APIs del navegador (localStorage, window, document).
- Librerías que requieren contexto de navegador.

**Patrón correcto:**
```tsx
// page.tsx — Server Component (carga datos)
export default async function Page() {
  const data = await loadData();
  return <ResultsTable data={data} />;
}

// ResultsTable.tsx — Client Component (solo interacción)
'use client';
export function ResultsTable({ data }) {
  const [sort, setSort] = useState('asc');
  return <table>...</table>;
}
```

**Incorrecto:**
```tsx
'use client'; // innecesario: no hay interacción, estado ni efectos
export default async function Page() {
  const data = await loadData();
  return <div>{data}</div>;
}
```

**Reglas adicionales:**
- No convertir una página completa en Client Component porque un botón necesita estado.
- Separar en Server Component (datos) + Client Component pequeño (interacción).
- No enviar al cliente: filas completas no utilizadas, permisos internos, datos privados innecesarios.

---

## 15. Render progresivo, loading y Suspense

**Regla:** Toda ruta importante debe ofrecer feedback inmediato durante la navegación.

**Buenas prácticas:**
- Usar `loading.tsx` para cada segmento de ruta (Next.js muestra automáticamente el loading del layout padre).
- Preferir skeletons que representen la estructura final de la página.
- Evitar un spinner genérico como única respuesta de carga.
- Usar `Suspense` para datos secundarios (badges, actividad, indicadores complementarios).
- No fragmentar la página en decenas de Suspense boundaries pequeños.
- Usar `useLinkStatus` de `next/link` en los nav links para mostrar estado `pending` inmediato (indicador lateral + pulso) con prioridad sobre `active`.

**Clasificación de datos:**

| Tipo | Ejemplos | Debe |
|------|----------|------|
| Críticos | Perfil, participaciones, contenido principal | Bloquear el render hasta tenerlos |
| Secundarios | Badge de actividad, contadores, sugerencias | Cargar con Suspense, no bloquear |

**Regla:** Los datos secundarios no deben bloquear los críticos.

---

## 16. Componentes globales

Sidebar, navbar, layouts y providers afectan todas las rutas.

**Antes de agregarles una consulta:**
1. Medir el coste (número de consultas, payload, latencia).
2. Comprobar si aplica a todos los roles o solo a algunos.
3. Si aplica solo a ciertos roles, agregar un guard antes de consultar.
4. Evaluar si el dato puede entregarse desde el layout (como prop).
5. Reducir payload al mínimo necesario.
6. Evaluar render independiente con Suspense si no es crítico.

**Regla:** Una funcionalidad pequeña en el sidebar no debe agregar varias consultas bloqueantes a todas las páginas.

**Ejemplo real — Sidebar badge (PickHub):**
```ts
// Solo se ejecuta para creadores aprobados
if (!profile || !(profile.role === 'creator' && profile.creator_status === 'approved')) return;

// Consultas paralelizadas + head: true para conteos
const [{ data: events }, { data: readMarker }] = await Promise.all([
  supabase.from('events').select('id').eq('creator_id', creatorProfileId),
  supabase.from('creator_activity_reads').select('last_seen_at').maybeSingle(),
]);
const { count } = await supabase
  .from('submissions')
  .select('id', { count: 'exact', head: true })
  .in('event_id', eventIds);
```

---

## 17. Caché

**Orden obligatorio antes de considerar caché:**
1. Eliminar duplicación de consultas.
2. Eliminar N+1.
3. Reducir payload (selects explícitos, head: true).
4. Paralelizar operaciones independientes.
5. Optimizar SQL e índices.
6. Mejorar render progresivo (Suspense, loading).
7. Solo entonces evaluar caché.

**Clasificación de datos para caché:**

| Tipo | Ejemplos | ¿Caché? |
|------|----------|---------|
| Públicos y estables | Branding, reglas, configuraciones públicas, plantillas | Sí, candidatos naturales |
| Privados por usuario | Predicciones, ranking personal, premios, perfil | Sí, pero con clave por usuario |
| Sensibles al estado | Resultados, estado del evento, desempates, asignaciones | Solo con invalidación precisa |

**Prohibiciones:**
- Clave compartida para datos privados de diferentes usuarios.
- Caché global de perfiles.
- Caché sin invalidación después de mutaciones.
- Mezclar mecanismos de caché sin revisar la configuración de Next.js.

---

## 18. Instrumentación y medición

**Uso de `lib/perf.ts`:**
```ts
import { perf } from '@/lib/perf';

perf.start('[performance:dashboard:auth]');
// ... operación a medir ...
perf.end('[performance:dashboard:auth]');

perf.mark('[performance:dashboard:total]', 'inicio de carga');
```

**Formato de etiquetas:**
```
[performance:<ruta>:<operación>]
```

**Etiquetas existentes en PickHub:**
- `[performance:dashboard:auth]`
- `[performance:dashboard:profile]`
- `[performance:dashboard:participations]` (registrado como `[performance:dashboard:events]`)
- `[performance:dashboard:sidebar-badge]` (pendiente de agregar)
- `[performance:dashboard:total]`

**Reglas:**
- Solo activo en `NODE_ENV=development`.
- No registrar tokens, cookies, respuestas completas ni datos personales.
- Medir bloques relevantes (no cada línea).
- Comparar antes y después de cada optimización.
- Retirar instrumentación temporal que ya no aporte valor.
- Mantener `lib/perf.ts` como utilidad estándar para nuevas auditorías.

---

## 19. Performance en desarrollo vs. producción

- `npm run dev` no representa exactamente el rendimiento en producción.
- Compilación, Turbopack y caché de desarrollo pueden distorsionar tiempos.
- Validar siempre con `npm run build && npm start`.
- Cuando sea posible, probar en un deployment preview de Vercel.
- Comparar tiempos bajo condiciones similares (misma región, mismo plan de BD).
- No declarar una mejora únicamente porque localmente "se siente más rápido".

---

## 20. Flujo obligatorio para nuevas pantallas

### Paso 1: Definir datos
Listar exactamente qué necesita la UI (columnas, relaciones, conteos).

### Paso 2: Diseñar consultas
- Número de consultas.
- Dependencias entre ellas.
- Relaciones embebidas vs. joins vs. RPC.
- Conteos: server-side siempre.

### Paso 3: Revisar seguridad
- RLS aplicada a cada tabla consultada.
- Validación de ownership/rol en server actions.
- RPC: SECURITY INVOKER vs. DEFINER según necesidad.

### Paso 4: Revisar performance
- Ausencia de N+1 (ninguna consulta dentro de un bucle).
- Selects explícitos (sin `select('*')`).
- Consultas independientes paralelizadas.
- Cliente Supabase reutilizado.
- Perfil y auth cargados una sola vez.

### Paso 5: Diseñar loading
- Contenido crítico vs. secundario.
- Skeleton con dimensiones estables.
- Suspense boundaries para datos secundarios.

### Paso 6: Validar
```
npm run build
```
Revisar consultas reales con la instrumentación de `lib/perf.ts`.

---

## 21. Flujo obligatorio para nuevas consultas

Antes de agregar una consulta Supabase, responder:

1. ¿Ya existe esta información en el layout, el perfil o un helper memoizado?
2. ¿Se está llamando esta consulta más de una vez en el mismo request?
3. ¿Puede ejecutarse en paralelo con otra consulta independiente?
4. ¿Está dentro de un bucle (`map`, `for...of`, `forEach`)?
5. ¿Selecciona más columnas de las necesarias?
6. ¿Solo necesito un conteo? (usar `head: true` o embedded aggregate)
7. ¿La consulta necesita llegar al cliente o puede quedarse en el servidor?
8. ¿RLS protege correctamente el acceso?
9. ¿Existe un índice adecuado para los filtros y ordenamientos?
10. ¿La consulta bloquea contenido crítico o puede ser secundaria?

Si alguna respuesta revela un problema, corregirlo antes de considerar terminada la funcionalidad.

---

## 22. Checklist obligatorio antes de merge

### Consultas
- [ ] No hay consultas dentro de bucles (N+1).
- [ ] No hay consultas duplicadas de usuario, perfil o rol.
- [ ] Las operaciones independientes están paralelizadas.
- [ ] No se usa `.select('*')`.
- [ ] Los conteos se realizan en la base de datos (head:true o embedded aggregate).
- [ ] No se descargan relaciones completas innecesarias.
- [ ] Los componentes globales no agregan consultas injustificadas.

### Arquitectura
- [ ] Server Components por defecto; `'use client'` solo donde es necesario.
- [ ] No se serializan datos innecesarios al cliente.
- [ ] No existe un cliente Supabase global inseguro.
- [ ] No se agregó una RPC sin justificación (ver sección 10).
- [ ] `createClient`, `getUser`, `getCurrentProfile` están memoizados o se reutilizan.

### Seguridad
- [ ] RLS permanece activa en todas las tablas consultadas.
- [ ] No se usa service role en componentes cliente.
- [ ] Las RPCs SECURITY DEFINER validan autorización explícita.
- [ ] No se aceptan IDs de usuario manipulables cuando puede usarse `auth.uid()`.
- [ ] No se ampliaron permisos generales (`GRANT` excesivo).

### UX
- [ ] La ruta tiene feedback de carga (loading.tsx o Suspense).
- [ ] Los datos secundarios no bloquean toda la pantalla.
- [ ] Los skeletons mantienen dimensiones estables (sin layout shift).
- [ ] No existen saltos de layout evitables.

### Base de datos
- [ ] Los filtros y joins frecuentes tienen índices justificados.
- [ ] No se agregaron índices duplicados.
- [ ] Las migraciones solo fueron generadas (no aplicadas por OpenCode).

### Calidad
- [ ] La instrumentación (`lib/perf.ts`) no expone datos sensibles.
- [ ] Se comparó antes y después cuando hubo optimización.
- [ ] `npm run build` finaliza correctamente.
- [ ] La documentación relevante fue actualizada.

---

## 23. Señales de alerta (revisión obligatoria)

Estos patrones deben detener una revisión hasta que se resuelvan:

```txt
.map(async () => supabase...)          → N+1
for...of con await + supabase          → N+1
.select("*")                            → payload innecesario
data.length para contar filas           → conteo en JS
getCurrentProfile() en 3+ componentes  → perfil duplicado
getUser() en layout + página + acción   → auth duplicado
auth.getUser() en Server Action         → usar getUser() memoizado
tres o más consultas en un badge        → consolidar o paralelizar
página completa con "use client"        → separar Server + Client
RPC que retorna toda la info del usuario → RPC demasiado amplia
SECURITY DEFINER sin auth.uid()         → inseguro
caché privada sin clave por usuario     → datos mezclados
componente global consultando datos     → debe justificarse
que no todos ven
```

Cuando aparezca una señal de alerta, la tarea debe revisarse antes de considerarse completa.

---

## 24. Objetivos orientativos

| Métrica | Objetivo |
|---------|----------|
| Página simple | 1–3 consultas |
| Página media | 3–6 consultas |
| Página compleja | 6–8 consultas justificadas |
| Consultas por lista | Cantidad estable (no proporcional a N elementos) |
| Perfil / autenticación | 1 carga reutilizada por request |
| Feedback visual | Inmediato (loading.tsx o skeleton) |

**Nota:** La latencia real depende de región, red, volumen de datos, plan de base de datos, complejidad SQL y entorno de ejecución. Estos objetivos son guías, no garantías rígidas.

---

## 25. Lecciones específicas de la optimización del dashboard

1. **No fue necesaria una RPC general.** Embedded aggregates + paralelización + memoización + props redujeron las consultas de ~9-11 a ~6-8 sin crear una RPC.
2. **Tres consultas eliminadas:** 2 de perfil duplicado (sidebar + modal) y 1 de prediction_answers (reemplazada por embedded aggregate).
3. **Perfil y participaciones se paralelizaron:** Antes eran secuenciales (auth → profile → participaciones), ahora auth → {profile ∥ participaciones}.
4. **Badge del sidebar optimizado:** Queries paralelizadas, `head: true`, guard por rol. Sin bloqueo del contenido principal.
5. **Los conteos no deben descargar filas:** `prediction_answers` descargaba N filas para contar en JS. Ahora se usa embedded aggregate de PostgREST.
6. **Un índice compuesto fue suficiente:** `(event_id, total_score desc)` en `prediction_scores` evita un sort completo en el leaderboard RPC.
7. **Reducir de ~9-11 a ~6-8 consultas fue suficiente** sin rehacer toda la arquitectura.

**Conclusión:** La solución más pequeña que elimina el cuello de botella suele ser preferible.

---

## 26. Plantilla para futuras tareas (copiar en prompts)

```
## Validación de performance

Antes de terminar:

- Cuenta las consultas de la nueva ruta.
- Confirma que no existe N+1.
- Confirma que no hay consultas duplicadas.
- Usa selects explícitos.
- Realiza conteos en la base de datos.
- Paraleliza operaciones independientes.
- Reutiliza auth y perfil por request.
- Mantén datos secundarios fuera del bloqueo principal.
- Revisa RLS e índices.
- Ejecuta npm run build.
```
