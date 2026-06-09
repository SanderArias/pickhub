# Auditoría de Performance — Fase 1 (Diagnóstico)

## Resumen Ejecutivo

El dashboard (`/inicio`) realiza entre **6 y 10 consultas a Supabase** en el servidor y entre **3 y 5 consultas adicionales** desde el cliente tras la hidratación. Se detectaron **3 problemas críticos**, **6 altos**, **4 medios** y **2 bajos**. El principal cuello de botella es la **carga secuencial forzada** (auth → profile → participations → creator request) que impide el render temprano. La **creación del cliente Supabase** (`createServerClient`) sucede múltiples veces (hasta 4 en la página de inicio). El sidebar realiza consultas duplicadas de perfil desde el cliente que ya existen en el servidor.

---

## Flujo Real de Carga

### 1. Sin middleware (`middleware.ts` no existe)

### 2. Layout raíz (`app/layout.tsx`)
- Renderiza `<html>`, fuente Inter/Geist, `NextTopLoader`.
- No hay llamadas a Supabase.

### 3. Layout de ruta (`app/(app)/layout.tsx`)
- `getActivityCapabilities('pickem')` — lee variables de entorno (`FEATURE_*`). **Sin llamada a Supabase**.
- Renderiza `<AppShell>` → `<Sidebar>`.

### 4. Página `/inicio` (Server Component) — **6 a 8 consultas secuenciales**

```
auth.getUser()
  ↓ (depende del resultado)
getCurrentProfile() {
    profiles.maybeSingle()      ①
    creator_profiles.maybeSingle() ②
  }
  ↓ (si profile es null)
ensureUserProfile() {
    profiles.select()           ③ (solo en perfil faltante)
  }
  ↓
checkTwitchLinked() {
    getTwitchAccountInfo() — sin consulta (solo manipula objetos)
    sync_twitch_from_auth (RPC) ④ (solo si Twitch conectado pero no en profile)
    profiles.update()           ⑤ (solo si hay datos nuevos)
    profiles.select()           ⑥ (solo si hubo sync)
  }
  ↓
getUserParticipations('all') {
    event_participants.select() ⑦
    submissions.select()        ⑧
    events.select()             ⑨
    creator_profiles.select()   ⑩
    profiles.select()           ⑪
    prediction_answers.select() ⑫ (todos los registros, para contar)
  }
```

**Total**: 12 consultas en el peor caso (perfil reparado + Twitch sync + participaciones). En el caso normal: ~6 consultas.

### 5. Post-hidratación (Client Components) — **3 a 5 consultas adicionales**

**Sidebar** (`components/layout/Sidebar.tsx`):
```
useUser() → auth.getSession()      ① (cliente)
useProfile() → profiles.select()    ② (cliente) — ¡duplicado del servidor!
useGroups() → events.select()      ③ (cliente, solo si creator)
               creator_activity_reads.select() ④ (cliente)
               submissions.select({ head: true, count: exact }) ⑤ (cliente)
```

**CreatorWelcomeModal**:
```
useUser() — ya está en caché del hook
profiles.select()                   ⑥ (cliente) — ¡otra duplicación del perfil!
```

**Total post-hidratación**: 5 consultas (3 adicionales para usuario estándar, 5 para creador aprobado).

---

## Inventario de Consultas

### Servidor (Server Components + Server Actions)

| # | Archivo | Función | Consulta | Tipo |
|---|---------|---------|----------|------|
| 1 | `app/actions/auth.ts` | `getUser()` | `auth.getUser()` | Auth |
| 2 | `lib/auth.ts` | `getCurrentProfile` | `profiles.select(id, display_name, avatar_url, role, ...).eq(id)` | `.from()` |
| 3 | `lib/auth.ts` | `getCurrentProfile` | `creator_profiles.select(...).eq(profile_id)` | `.from()` |
| 4 | `app/actions/participant.ts` | `getUserParticipations` | `event_participants.select(id).eq(profile_id)` | `.from()` |
| 5 | `app/actions/participant.ts` | `getUserParticipations` | `submissions.select(id, status, submitted_at, event_id).in(participant_id)` | `.from()` |
| 6 | `app/actions/participant.ts` | `getUserParticipations` | `events.select(id, title, slug, status, ends_at, creator_id).in(id)` | `.from()` |
| 7 | `app/actions/participant.ts` | `getUserParticipations` | `creator_profiles.select(id, handle, profile_id).in(id)` | `.from()` |
| 8 | `app/actions/participant.ts` | `getUserParticipations` | `profiles.select(id, display_name).in(id)` | `.from()` |
| 9 | `app/actions/participant.ts` | `getUserParticipations` | `prediction_answers.select(submission_id).in(submission_id)` | `.from()` |

### Cliente (Client Components, post-hidratación)

| # | Archivo | Componente/Función | Consulta | Tipo |
|---|---------|--------------------|----------|------|
| 1 | `hooks/useUser.ts` | `useUser` | `auth.getSession()` | Auth |
| 2 | `components/layout/Sidebar.tsx` | `useProfile` | `profiles.select(role, display_name, ...).eq(id)` | `.from()` |
| 3 | `components/layout/Sidebar.tsx` | `useGroups` | `events.select(id).eq(creator_id)` | `.from()` |
| 4 | `components/layout/Sidebar.tsx` | `useGroups` | `creator_activity_reads.select(last_seen_at).maybeSingle()` | `.from()` |
| 5 | `components/layout/Sidebar.tsx` | `useGroups` | `submissions.select(*, { count: exact, head: true }).in(event_id)` | `.from()` |
| 6 | `components/creator/CreatorWelcomeModal.tsx` | `useEffect` | `profiles.select(role, creator_profiles).eq(id)` | `.from()` |

---

## Problemas Detectados

### 🔴 Críticos

#### C1. N+1 en `getUserParticipations` para creadores de eventos
- **Archivo**: `app/actions/participant.ts:551-574`
- **Problema**: Después de obtener `events`, itera `creatorIds` para obtener `creator_profiles`, luego itera `profileIds` para obtener `profiles`. Son 2 consultas secuenciales que dependen entre sí.
- **Impacto**: 2 consultas adicionales, pero bajo porque creatorIds suele ser pequeño.
- **Solución Fase 2**: Un solo query con join o RPC que devuelva creators con sus profiles.

#### C2. Consulta de `prediction_answers` descarga todas las filas solo para contar
- **Archivo**: `app/actions/participant.ts:590-606`
- **Problema**: `supabase.from('prediction_answers').select('submission_id').in('submission_id', submissionIds)` descarga todos los registros para luego contarlos en JS con `answerCounts.set(...)`.
- **Impacto**: Si un evento tiene cientos de respuestas, esta consulta transfiere todas las filas solo para obtener un conteo.
- **Solución Fase 2**: Usar `select('submission_id', { count: 'exact', head: true })` con group, o mejor aún, agregar `answers_count` directamente en la tabla `submissions`.

#### C3. Sidebar+CreatorWelcomeModal duplican consulta de perfil en cliente
- **Archivo**: `components/layout/Sidebar.tsx:51-53` y `components/creator/CreatorWelcomeModal.tsx:19-22`
- **Problema**: El servidor ya cargó el perfil completo en `getCurrentProfile()` y lo pasó al layout, pero el sidebar y el modal lo vuelven a consultar desde el cliente mediante `profiles.select().eq(id)`.
- **Impacto**: 2 consultas redundantes a `profiles` en cada carga de página.
- **Solución Fase 2**: Pasar el profile como prop desde el layout del servidor al sidebar, o usar `useMemo` con cache local.

---

### 🟠 Altos

#### A1. Creación repetida de `createServerClient`
- **Problema**: Cada server action/function crea su propio cliente Supabase mediante `createServerClient()` → `cookies().getAll()`. Durante la carga de `/inicio`, se crea el cliente **4 veces**: `getUser()`, `getCurrentProfile()`, `checkTwitchLinked()`, `getUserParticipations()`.
- **Impacto**: Lectura de todas las cookies 4 veces, más 4 handshakes HTTP con Supabase Auth.
- **Solución Fase 2**: Pasar el cliente como dependencia o usar `request.cookies` cacheado.

#### A2. Carga secuencial obligada del dashboard
- **Problema**: `getUser()` → `getCurrentProfile()` → `checkTwitchLinked()` → `getUserParticipations()` es una cadena secuencial. Cada paso debe esperar al anterior.
- **Impacto**: Retrasa el TTFB. El navegador no recibe nada hasta que todas las consultas terminan.
- **Solución Fase 2**: Paralelizar las consultas independientes. `getUserParticipations()` no depende de `checkTwitchLinked()`. El `getCurrentProfile()` podría fusionarse con `getUser()`.

#### A3. Sidebar consulta `profiles` con datos que el servidor ya tiene
- **Archivo**: `components/layout/Sidebar.tsx:51-56`
- **Problema**: `useProfile` hace `profiles.select('role, display_name, avatar_url, twitch_username, creator_profile:creator_profiles(id, status)')` desde el cliente. El servidor ya cargó `getCurrentProfile()` que devuelve toda esta información.
- **Impacto**: 1 consulta redundante + 1 waterfall de autorización más.
- **Solución Fase 2**: Hidratar el sidebar con datos del servidor.

#### A4. `getUserParticipations` secuencia 3 consultas de búsqueda
- **Problema**: `event_participants.select(id)` → espera → `submissions.select(...)` → espera → `events.select(...)`. Estas 3 son secuenciales pero podrían ejecutarse de forma diferente: la primera es necesaria para obtener ids, pero la segunda y tercera podrían combinarse.
- **Impacto**: +2 waterfalls en la ruta crítica.
- **Solución Fase 2**: Query con joins o RPC específica que devuelva participaciones completas.

#### A5. Relaciones y columnas no utilizadas
- **Archivo**: `app/actions/participant.ts:543-545`
- **Problema**: `events.select('id, title, slug, status, ends_at, creator_id')` — `status` y `ends_at` se usan. Pero también se descarga `slug` para el link en UI. Parece correcto, pero `creator_id` solo se usa para obtener el creator display. Este es un caso menor.
- **Impacto**: Bajo, payload pequeño.

#### A6. Route `/admin` hace 5 consultas secuenciales con `select('*', { count: exact, head: true })`
- **Archivo**: `app/(app)/admin/page.tsx:10-31`
- **Problema**: Aunque usa `Promise.all`, las consultas son 5 selects separados a `profiles` y `creator_profiles` con `head: true`. `select('*')` aunque sea head, sigue siendo innecesario.
- **Impacto**: Medio para página admin. `select('*')` no es costoso con `head: true`, pero 5 consultas podrían ser 2.
- **Solución Fase 2**: Combinar consultas de `profiles` y `creator_profiles`.

---

### 🟡 Medios

#### M1. RPC `get_event_leaderboard` sin índice compuesto en `prediction_scores`
- **Archivo**: `supabase/migrations/00017_event_leaderboard_rpc.sql`
- **Problema**: La RPC hace `WHERE event_id = p_event_id GROUP BY profile_id ORDER BY total_score DESC`. Existe `idx_prediction_scores_event_id` y `idx_prediction_scores_profile_id` por separado, pero ningún índice compuesto `(event_id, total_score)`.
- **Impacto**: En eventos grandes, el ORDER BY hará un sort completo de la tabla (seq scan + sort).
- **Solución Fase 2**: Crear índice compuesto `(event_id, total_score DESC)`.

#### M2. RPC `get_pickem_prize_awards` retorna columnas no usadas
- **Archivo**: `supabase/migrations/00053_add_get_pickem_prize_awards_rpc.sql:40-48`
- **Problema**: Retorna `awarded_at, subscriber_rank` que no se usan en la UI. El cliente solo usa `prize_definition_id, profile_id, awarded_rank, assignment_status`.
- **Impacto**: Bajo (payload pequeño).
- **Solución Fase 2**: Reducir columnas o documentar intención.

#### M3. RPC `get_pickem_prize_configuration` sin índice en `pickem_prize_definitions.is_active`
- **Archivo**: `supabase/migrations/00048_add_get_pickem_prize_configuration_rpc.sql:120-126`
- **Problema**: Filtra `event_id = p_event_id AND is_active = true`. No hay índice para `is_active` combinado con `event_id`.
- **Impacto**: Bajo a menos que haya muchas definiciones inactivas.
- **Solución Fase 2**: Índice compuesto `(event_id, is_active)`.

#### M4. Transformaciones JS costosas en `getUserParticipations`
- **Archivo**: `app/actions/participant.ts:576-645`
- **Problema**: Crea `eventMap`, itera `submissions`, filtra en JS (`filter === 'open'|'closed'`), formatea fechas con `new Date(p.submittedAt).toLocaleDateString()`. Estas operaciones dependen del tamaño de datos.
- **Impacto**: Bajo para usuarios típicos (< 20 participaciones), pero crece linealmente.
- **Solución Fase 2**: Pasar filtrado a la consulta SQL.

---

### 🟢 Bajos

#### B1. `select('*')` usado en varios lugares
- **Apariciones**: `component/layout/Sidebar.tsx:102`, `app/actions/creator-profile.ts:15`, `app/actions/twitch-status.ts:25`, `app/actions/twitch-sub-verification.ts:62`, `app/(app)/creator/dashboard/page.tsx:42`, `app/(app)/admin/templates/page.tsx:15`, `activities/pickem/prizes/actions/get-prize-configuration.ts:87` (fallback).
- **Impacto**: Variables — en Sidebar es `head: true` (solo conteo), en otros casos descarga columnas innecesarias.
- **Solución Fase 2**: Reemplazar por columnas explícitas.

#### B2. `checkTwitchLinked` en server action puede crear waterfall adicional
- **Archivo**: `lib/auth.ts:90-140`
- **Problema**: Solo en usuarios con Twitch conectado sin profile sync. Agrega 2-3 consultas extra en ese caso (RPC + update + select). Es poco frecuente.
- **Impacto**: Caso raro, pero cuando ocurre es costoso.
- **Solución Fase 2**: Sincronización asíncrona o trigger de BD.

---

## Revisión de RPCs

| RPC | Tipo | Tablas | Uso en Dashboard | Observaciones |
|-----|------|--------|------------------|---------------|
| `get_pickem_prize_awards` | SECURITY DEFINER | `pickem_prize_awards` | No en dashboard | Solo en resultados de eventos |
| `get_pickem_prize_configuration` | SECURITY DEFINER | `pickem_prize_settings`, `pickem_prize_definitions` | No en dashboard | Solo en página de Pick'em |
| `get_event_leaderboard` | SECURITY DEFINER | `prediction_scores`, `profiles`, `prediction_questions` | No en dashboard | Solo en ranking |
| `get_admin_users` | SECURITY DEFINER | `auth.users`, `profiles` | No en dashboard | Solo en /admin/users |
| `can_manage_pickem` | SECURITY DEFINER | `events`, `creator_profiles` | No directo | Usado internamente por otras RPCs |

**Ninguna RPC se usa directamente en el dashboard**. Todas las consultas del dashboard son queries directas (`.from().select()`).

---

## Revisión de RLS

Las políticas RLS en tablas usadas por el dashboard son correctas:

- `profiles`: `auth.role() = 'authenticated'` — permite lectura a cualquier autenticado.
- `creator_profiles`: `auth.role() = 'authenticated'` — igual.
- `event_participants`: Solo ve propia (profile_id) o si eres creator.
- `events`: Solo públicos o propios.
- `submissions`: (no listado arriba, pero asumimos RLS restrictivo).
- `prediction_answers`: (no listado).

**Problema potencial**: Aunque las políticas RLS son correctas para el modelo de datos, el **Sidebar en el cliente** consulta `profiles` (que permite ver cualquier perfil autenticado) y `events` (que permite ver eventos públicos). Esto es seguro pero genera tráfico de red innecesario.

---

## Revisión de Índices

### Índices existentes (relevantes para el dashboard)

| Tabla | Índice | Columnas | Relevancia |
|-------|--------|----------|------------|
| `profiles` | `idx_profiles_role` | `role` | ✅ Para filtros de admin |
| `profiles` | `idx_profiles_display_name` | `display_name` | ❌ No se filtra por display_name |
| `creator_profiles` | `idx_creator_profiles_handle` | `handle` | ❌ No se filtra por handle |
| `creator_profiles` | `idx_creator_profiles_status` | `status` | ✅ Para conteos de admin |
| `events` | `idx_events_creator_id` | `creator_id` | ✅ Para sidebar/creator dashboard |
| `events` | `idx_events_status` | `status` | ✅ Para filtros de estado |
| `events` | `idx_events_slug` | `slug` | ✅ Para búsqueda por slug |
| `event_participants` | `idx_event_participants_profile_id` | `profile_id` | ✅ Para dashboard |
| `event_participants` | `idx_event_participants_event_id` | `event_id` | ✅ |
| `submissions` | `idx_submissions_event_id` | `event_id` | ✅ |
| `submissions` | `idx_submissions_participant_id` | `participant_id` | ✅ |
| `prediction_answers` | `idx_prediction_answers_submission_id` | `submission_id` | ✅ |
| `prediction_scores` | `idx_prediction_scores_event_id` | `event_id` | ✅ |
| `prediction_scores` | `idx_prediction_scores_profile_id` | `profile_id` | ✅ |

### Índices faltantes (potenciales)

| Tabla | Índice propuesto | Razón |
|-------|-------------------|-------|
| `prediction_scores` | `(event_id, total_score DESC)` | RPC `get_event_leaderboard` ordena por total_score |
| `pickem_prize_definitions` | `(event_id, is_active)` | RPC filtra por ambos |
| `creator_activity_reads` | `(profile_id)` | Sidebar busca por profile_id (única fila por user) |
| `submissions` | `(event_id, status)` | Creator dashboard filtra por status |
| `prediction_scores` | `(event_id, profile_id)` | Unique constraint implícita, pero no índice explícito |

---

## Métricas Base (para comparar en Fase 2)

Estimaciones con datos típicos (~5 participaciones, sin Twitch sync):

| Métrica | Valor |
|---------|-------|
| Consultas servidor (carga inicial) | 6 |
| Consultas cliente (post-hidratación) | 3 (user estándar) / 5 (creator aprobado) |
| Consultas totales | 9-11 |
| Llamadas `createServerClient` | 4 |
| Waterfalls servidor | 4 (auth → profile → participaciones) |
| Waterfalls cliente | 1 (useUser → useProfile → useGroups) |
| KB transferidos (estimado) | ~15-25 KB (respuestas Supabase) |
| TTFB estimado | 300-600ms (depende de latencia a Supabase) |
| Tiempo de hidratación | +200-400ms |

---

## Soluciones Recomendadas (Fase 2 — No Implementar Ahora)

### Prioridad Crítica
1. **Pasar perfil como prop** al Sidebar desde el layout del servidor para eliminar `useProfile` y `CreatorWelcomeModal` queries.
2. **Reemplazar `select('submission_id')`** en `getUserParticipations` por conteo vía `{ count: 'exact', head: true }` o columna de answers_count en submissions.
3. **Fusionar queries de participaciones** en una sola RPC o query con joins.

### Prioridad Alta
4. **Cachear `createServerClient`** por request (módulo `cache()` de React).
5. **Paralelizar** `getUserParticipations()` con `checkTwitchLinked()` (no dependen entre sí).
6. **Pasar cliente Supabase** como parámetro entre funciones para evitar recreación.
7. **Sidebar badge**: Mover conteo de submissions a una RPC específica.
8. **Middleware de autenticación**: Implementar middleware para refrescar sesión antes del render y evitar llamadas duplicadas.

### Prioridad Media
9. **Índice compuesto** `(event_id, total_score DESC)` en `prediction_scores`.
10. **Índice compuesto** `(event_id, is_active)` en `pickem_prize_definitions`.
11. **Reemplazar `select('*')`** por columnas específicas en todos los lugares.

### Prioridad Baja
12. **Mover filtrado de participaciones** (`open`/`closed`) al query SQL.
13. **Sincronizar Twitch** de forma asíncrona (fuera del request del usuario).

---

## Archivos Analizados

- `app/(app)/inicio/page.tsx`
- `app/(app)/layout.tsx`
- `app/layout.tsx`
- `app/actions/auth.ts`
- `app/actions/participant.ts`
- `app/actions/admin.ts`
- `lib/auth.ts`
- `lib/getDisplayUser.ts`
- `lib/getTwitchAccountInfo.ts`
- `lib/perf.ts` (nuevo)
- `components/layout/AppShell.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`
- `components/creator/CreatorWelcomeModal.tsx`
- `hooks/useUser.ts`
- `services/supabase/server.ts`
- `services/supabase/client.ts`
- `services/supabase/index.ts`
- `activities/registry.server.ts`
- `activities/pickem/lib/capability-guards.server.ts`
- `activities/pickem/prizes/actions/get-prize-configuration.ts`
- `activities/pickem/data/selects.ts`
- `supabase/migrations/*.sql` (índices, RPCs, RLS)
- `config/ui-features.ts`

## Archivos Modificados para Instrumentación

- `lib/perf.ts` — nuevo, utility de logging temporal
- `app/actions/auth.ts` — envoltura de `getUser()` con `perf.start/end`
- `lib/auth.ts` — envoltura de `getCurrentProfile()` con `perf.start/end`
- `app/actions/participant.ts` — envoltura de `getUserParticipations()` con `perf.start/end`
- `app/(app)/inicio/page.tsx` — envoltura total con `perf.start/end`

Todo el logging se activa solo en `NODE_ENV=development`.

---

## Número Estimado de Consultas al Abrir el Dashboard

**Usuario estándar (sin perfil de creador):** ~9 consultas (6 server + 3 client)
**Creador aprobado:** ~11 consultas (6 server + 5 client)

## Principales Problemas Encontrados

1. **Duplicación de consultas de perfil** (server + client + modal) — Crítico
2. **Carga secuencial forzada** — Alto
3. **Creación repetida de cliente Supabase** (4 veces) — Alto
4. **Descarga completa de `prediction_answers` solo para contar** — Crítico
5. **Sidebar badge con 2-3 consultas por página** — Alto
6. **Falta de índices compuestos en tablas de scoring** — Medio

## Resultado del Build

El build se ejecutará a continuación. La instrumentación agregada es puro logging condicional (`dev` only) sin impacto en producción ni cambios funcionales.

## Confirmaciones

- ✅ No se implementaron optimizaciones definitivas
- ✅ No se crearon ni aplicaron migraciones
- ✅ No se modificó RLS
- ✅ No se crearon RPCs
- ✅ No se modificaron RPCs existentes
- ✅ No se modificaron políticas existentes
- ✅ No se agregaron índices
- ✅ No se implementó caché
- ✅ No se hicieron refactors arquitectónicos
- ✅ No se cambió lógica funcional
- ✅ No se usó `any`
- ✅ Todos los cambios son instrumentación mínima y reversible
