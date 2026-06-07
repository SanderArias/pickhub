# Auditoría Arquitectónica — PickHub

> Fecha: 2026-06-07
> Objetivo: Verificar que PickHub es una plataforma de actividades y no una aplicación monolítica centrada en Pick'em.

---

## A. Estado actual

### Lo que está bien desacoplado

| Capa | Archivos | Notas |
|------|----------|-------|
| **Auth** | `lib/auth.ts`, `app/actions/auth.ts`, `hooks/useUser.ts` | Sin imports de Pick'em. `getCurrentProfile()`, `requireAuth()`, `requireCreator()`, `requireAdmin()` son funciones genéricas. |
| **Perfiles** | `lib/getDisplayUser.ts`, `lib/getProfileAvatarUrl.ts`, `lib/getTwitchAccountInfo.ts` | Sin imports de Pick'em. Operan sobre `profiles` y `auth.users`. |
| **Settings** | `app/(app)/settings/page.tsx`, `TwitchConnectionCard.tsx` | Sin imports de Pick'em. Solo Twitch, perfil, cuenta. |
| **Admin** | `app/(app)/admin/*` | Sin imports de Pick'em. Gestiona creadores, actividades, templates. |
| **UI primitives** | `components/ui/*` | Sin imports de Pick'em. Botones, cards, inputs, etc. |
| **Auth UI** | `components/auth/*` | Sin imports de Pick'em. `TwitchLoginButton`, `LoginForm`, etc. |
| **Brand** | `components/brand/*` | Sin imports de Pick'em. |
| **Services** | `services/*` | Sin imports de Pick'em. Solo crea clientes Supabase. |
| **Types** | `types/dynamics.ts` | Define `DynamicType` con 6 tipos incluyendo `'pickem'` — desacoplado en concepto. |
| **Config** | `config/dynamics.ts` | Registry `DYNAMICS` con 6 definiciones, independiente del módulo Pick'em. |
| **Dynamics skeleton** | `components/dynamics/*`, `features/dynamics/*` | Stubs por tipo de actividad, sin dependencias de Pick'em. |

### Lo que depende de Pick'em (desde fuera del módulo)

| Archivo | Dependencia | Tipo de problema |
|---------|-------------|------------------|
| `components/layout/Sidebar.tsx` | Importa `CreatorWelcomeModal` de `@/components/pickem/` | **Inversión de dependencia**: un componente de layout general importa un modal de Pick'em |
| `components/completed/EventSummaryTab.tsx` | Importa `TiebreakerModal` de `@/components/pickem/` | **Inversión de dependencia**: vista de resultados importa componente Pick'em |
| `app/(app)/inicio/page.tsx` | Importa `getUserParticipations` de `@/app/actions/participant` (devuelve datos de `events` + `submissions`) | **Acoplamiento de datos**: la página de inicio lee tabla de eventos y asume estructura Pick'em |
| `app/(app)/participaciones/page.tsx` | Idem | Idem |
| `components/completed/*.tsx` (7+ archivos) | Importan tipos de `@/app/actions/tiebreaker`, `@/app/actions/leaderboard`, `@/app/actions/participant`, `@/app/actions/results-data` | **Tipos dispersos**: los tipos de datos de actividad completada no están centralizados |
| `components/picks/PrizesSection.tsx` | Importa `upsertEventPrize`, `deleteEventPrize` de `@/app/actions/creator` | **Acción mezclada**: las acciones de premios viven en `creator.ts` que también maneja creación de eventos |
| `components/players/PlayersSection.tsx` | Importa `createEventPlayer`, `deleteEventPlayer`, `updateEventPlayerCountry` de `@/app/actions/creator` | **Acción mezclada**: ídem |
| `components/predictions/PredictionsSection.tsx` | Importa `createPredictionQuestion` etc. de `@/app/actions/creator` | **Acción mezclada**: ídem |

### Lo que es reutilizable

| Componente/Concepto | Dónde está | Potencial |
|---------------------|------------|-----------|
| `PageHeader` | `components/ui/PageHeader.tsx` | Genérico |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Genérico |
| `Card`, `SectionCard` | `components/ui/` | Genérico |
| `UserAvatar` | `components/ui/UserAvatar.tsx` | Genérico |
| `EmptyState` | `components/ui/EmptyState.tsx` | Genérico |
| `ActionButton` | `components/ui/ActionButton.tsx` | Genérico |
| `LogoUploader` | `components/pickem/LogoUploader.tsx` | Reutilizable por cualquier actividad |
| `PrizeCarousel` | `components/pickem/PrizeCarousel.tsx` | Reutilizable (no tiene lógica específica de Pick'em) |
| `PickemParticipationHero` | `components/pickem/PickemParticipationHero.tsx` | Renombrable a `ActivityHero` |
| `PickemStatusCard` | `components/pickem/PickemStatusCard.tsx` | Renombrable a `ActivityStatusCard` |
| `SubscriberTwitchEligibilityNotice` | `components/pickem/` | Reutilizable por cualquier actividad que use verificación de subs |

### Lo que representa riesgo

| Riesgo | Descripción | Nivel |
|--------|-------------|-------|
| La tabla `events` tiene columnas específicas de Pick'em (`top_n`, `predictions_close_at`, `predictions_close_timezone`, `scoring_config`) | No se puede reutilizar directamente para otras actividades sin separación | **Alto** |
| Las acciones `app/actions/creator.ts` mezclan CRUD de eventos con CRUD de players, preguntas, predicciones | Si se añade una Trivia, las acciones de trivia no deben vivir en `creator.ts` ni compartir las mismas tablas | **Alto** |
| `lib/status-config.ts` define `EventStatus` como `'predictions_closed'` | Estado específico de Pick'em en una capa general | **Medio** |
| `lib/dashboard-config.ts` incluye `'resolve_tiebreaker'` y `'share_pickem'` | Acciones específicas en configuración general del dashboard | **Medio** |
| `components/completed/` está implementado asumiendo estructura de Pick'em (tiebreakers, predicciones, scoring) | Si se añade una Encuesta, el módulo "completed" no es reutilizable | **Medio** |
| Las rutas `/pickems/` y `/creator/pickems/` están hardcodeadas en toda la app | Migrar requeriría tocar ~20+ archivos | **Medio** |
| La capa `dynamics/` existe solo como esqueleto y no se usa para routing, navegación, ni creación | Potencial desperdiciado — el diseño conceptual existe pero no está conectado | **Bajo** |

---

## B. Mapa de dependencias

```
Core de plataforma
├── lib/auth.ts              → auth, profiles
├── lib/app-url.ts           → sin dependencias
├── lib/constants.ts         → sin dependencias
├── lib/getDisplayUser.ts    → sin dependencias
├── lib/getProfileAvatarUrl.ts → sin dependencias
├── lib/getTwitchAccountInfo.ts → sin dependencias
├── lib/utils.ts             → sin dependencias
├── hooks/useUser.ts         → services/supabase
├── services/supabase/       → sin dependencias de pickem
├── types/notifications.ts   → sin dependencias
├── types/dynamics.ts        → sin dependencias
└── config/dynamics.ts       → types/dynamics

Integraciones
├── lib/twitch.ts            → sin dependencias de pickem
├── lib/twitch-api.ts        → sin dependencias de pickem
├── lib/twitch-crypto.ts     → sin dependencias de pickem
├── app/actions/twitch-status.ts → sin dependencias de pickem
└── app/actions/twitch-sub-verification.ts → sin dependencias de pickem

UI compartida
├── components/ui/*          → sin dependencias de pickem
├── components/auth/*        → sin dependencias de pickem
├── components/brand/*       → sin dependencias de pickem
├── components/layout/Header.tsx → sin dependencias de pickem
├── components/layout/AppShell.tsx → sin dependencias de pickem
└── components/layout/Sidebar.tsx  → IMPORTACIÓN INVERSA: pickem/CreatorWelcomeModal

Módulo Pick'em → Core
├── components/pickem/*      → lib/auth, lib/app-url, lib/status-config, lib/prize-types
├── app/actions/*            → services/supabase, lib/auth
├── app/pickems/[slug]/*     → app/actions/participant, app/actions/auth
└── app/(app)/creator/pickems/* → app/actions/creator, lib/auth

Componentes "completed" (híbridos)
├── components/completed/EventSummaryTab.tsx → IMPORTACIÓN INVERSA: pickem/TiebreakerModal
├── components/completed/PendingTiebreakerCard.tsx → app/actions/tiebreaker
├── components/completed/TiebreakerSummary.tsx → app/actions/results-data
└── (7+ archivos más)          → app/actions/participant, leaderboard, results-data, tiebreaker
```

---

## C. Problemas clasificados

### 🔴 Críticos

1. **CreatorWelcomeModal en Sidebar** (`components/layout/Sidebar.tsx:10`)
   - Un componente de navegación general importa directamente del módulo Pick'em.
   - Impacto: Si se desactiva Pick'em, el Sidebar se rompe en tiempo de compilación.
   - **Solución**: Mover `CreatorWelcomeModal` a `components/shared/` o crearlo como modal genérico activado por el registry de actividades.

2. **La tabla `events` mezcla campos generales y específicos de Pick'em**
   - Columnas como `scoring_config`, `predictions_close_timezone`, `twitch_channel` son específicas.
   - Impacto: Cualquier nueva actividad requeriría columnas propias que no caben en `events`.
   - **Solución**: Separar en `activities` (general) + `pickem_settings` (específico).

3. **`app/actions/creator.ts` es un monolito**
   - Mezcla: creación de perfil creador, CRUD de eventos, CRUD de players, CRUD de preguntas, CRUD de predicciones, gestión de premios.
   - Impacto: Nueva actividad requeriría otro `creator.ts` gigante o extender el existente con condiciones.
   - **Solución**: Separar en módulos: `profiles`, `activities`, `players`, `predictions`, `prizes`.

### 🟡 Importantes

4. **`components/completed/` está acoplado a la estructura de Pick'em**
   - Tipos como `CompletedSummary` incluyen `tiebreakerGroups`, un concepto exclusivo de Pick'em.
   - Impacto: No se puede reutilizar para otras actividades completadas.
   - **Solución**: Hacer que `completed/` sea agnóstico al tipo de actividad; los detalles específicos deben ser inyectados por cada módulo.

5. **`lib/status-config.ts` y `lib/dashboard-config.ts` contienen conceptos de Pick'em**
   - `'predictions_closed'` en estados, `'resolve_tiebreaker'` en acciones del dashboard.
   - Impacto: Otras actividades no pueden usar estos estados/acciones sin heredar nombres de Pick'em.
   - **Solución**: Estados generales separados de específicos; cada módulo aporta sus estados extendidos.

6. **Las rutas están hardcodeadas como `/pickems/` y `/creator/pickems/` en ~20+ archivos**
   - Impacto: Cambiar la estructura de rutas requiere búsqueda manual y actualización en múltiples lugares.
   - **Solución**: Centralizar rutas en constantes (`ROUTES.pickems`, `ROUTES.creatorPickems`, etc.) y evolucionar hacia `/activities/[type]/[id]`.

7. **Los tipos de datos de actividad (`PublicEventData`, `Participation`, `CompletedSummary`, etc.) están dispersos en archivos de acciones**
   - Viven en `app/actions/participant.ts`, `app/actions/results-data.ts`, etc.
   - Impacto: Los componentes de UI deben importar desde acciones de servidor solo para obtener tipos.
   - **Solución**: Centralizar tipos de actividad en `types/activities.ts`.

### 🟢 Mejoras futuras

8. **La capa `dynamics/` no está conectada al routing, navegación, creación, ni dashboard**
   - Existe `types/dynamics.ts`, `config/dynamics.ts`, `components/dynamics/*`, `features/dynamics/*`
   - Pero el flujo real (`app/actions/creator.ts`, `app/(app)/creator/pickems/new/page.tsx`) ignora completamente esta capa.
   - **Solución**: Conectar el registry `DYNAMICS` a la creación de actividades, navegación, y dashboard.

9. **`components/pickem/` contiene componentes reutilizables que deberían estar en una capa compartida**
   - `LogoUploader`, `PrizeCarousel`, `SubscriberTwitchEligibilityNotice`
   - **Solución**: Mover a `components/shared/activity/` o similar.

10. **`getUserParticipations()` en `app/actions/participant.ts` devuelve datos de una sola tabla `events`**
    - Pero el nombre y la ubicación sugieren que debería ser genérico para todas las actividades.
    - **Solución**: Crear `getUserActivityParticipations()` que consulte actividades de cualquier tipo.

---

## D. Plan por fases

### Fase 1 — Límites y nombres (sin cambios funcionales)

**Objetivo**: Definir boundaries claros sin mover código.

1. **Establecer la estructura conceptual de módulos:**
   ```
   core/           → auth, profiles, permissions
   integrations/   → twitch
   activities/     → shared, pickem, (futuras)
   components/ui/  → shared primitives
   ```

2. **Identificar y documentar todo import que cruce boundaries incorrectamente** (ya hecho en secciones A-C).

3. **Renombrar mentalmente:** `Event` → `Activity`, `PickemEvent` → `PickemActivity`.

4. **Mover `CreatorWelcomeModal`** de `components/pickem/` a `components/shared/CreatorWelcomeModal.tsx` (o desacoplarlo del módulo Pick'em). Este es el único cambio de archivo necesario en esta fase.

**Archivos concretos a modificar:**
- `components/layout/Sidebar.tsx` — cambiar import de `@/components/pickem/CreatorWelcomeModal` a `@/components/shared/CreatorWelcomeModal`
- Mover `components/pickem/CreatorWelcomeModal.tsx` a `components/shared/CreatorWelcomeModal.tsx`

### Fase 2 — Integraciones compartidas

**Objetivo**: Twitch como integración global, no atada a Pick'em.

1. **Verificar que `lib/twitch.ts`, `lib/twitch-api.ts`, `lib/twitch-crypto.ts` no tengan dependencias de Pick'em** ✅ (ya están limpias).

2. **Separar `creator_twitch_connections` en un concepto genérico `user_integration_connections`** 
   - No mover datos todavía.
   - Crear una abstracción en `integrations/twitch/` que pueda ser consumida por cualquier actividad.

3. **Mover la verificación de suscriptores a una capa compartida**:
   - `app/actions/twitch-sub-verification.ts` ya está limpia.
   - Pero `SubscriberTwitchEligibilityNotice` está en `components/pickem/` — mover a `components/shared/`.

**Archivos concretos a modificar:**
- Mover `components/pickem/SubscriberTwitchEligibilityNotice.tsx` a `components/shared/`
- Actualizar imports en `PublicPickemView.tsx` y otros consumidores

### Fase 3 — Plataforma de actividades

**Objetivo**: Activar la capa `dynamics/` como plataforma real.

1. **Conectar `config/dynamics.ts` al flujo de creación:**
   - La página `creator/pickems/new/page.tsx` debe leer del registry `DYNAMICS` en lugar de asumir Pick'em.
   - Crear una página genérica `/creator/activities/new?type=pickem` y redirigir desde la actual.

2. **Centralizar tipos de actividad:**
   - Crear `types/activity.ts` con interfaces base:
     ```ts
     type ActivityType = 'pickem' | 'trivia' | 'poll' | 'giveaway';
     type ActivityStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
     interface ActivityBase { id, type, creatorId, title, description, status, visibility, createdAt }
     ```

3. **Crear un `ActivityRegistry` simple:**
   ```ts
   const activityRegistry = {
     pickem: { type: 'pickem', label: "Pick'em", icon: PickemIcon, routes: {...}, capabilities: {...} },
   };
   ```

4. **Normalizar estados:** 
   - Estados generales: `draft`, `open`, `completed`, `cancelled`, `archived`
   - Los específicos (`predictions_closed`, `tiebreaker_pending`) viven solo en el módulo Pick'em.
   - El dashboard general usa estados normalizados.

**Archivos concretos a modificar:**
- Crear `types/activity.ts` (interfaces base)
- Crear `lib/activity-registry.ts` (registry)
- Modificar `app/(app)/creator/pickems/new/page.tsx` para usar registry
- Modificar `lib/status-config.ts` para separar estados generales de específicos

### Fase 4 — Datos

**Objetivo**: Separar tablas generales y específicas.

1. **Crear tabla `activities` con campos verdaderamente generales:**
   ```sql
   CREATE TABLE activities (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     creator_id uuid NOT NULL REFERENCES creator_profiles(id),
     activity_type text NOT NULL CHECK IN ('pickem', 'trivia', 'poll', 'giveaway'),
     title text NOT NULL,
     slug text NOT NULL,
     description text,
     status text NOT NULL DEFAULT 'draft',
     visibility text NOT NULL DEFAULT 'public',
     logo_url text,
     starts_at timestamptz,
     ends_at timestamptz,
     UNIQUE(creator_id, slug)
   );
   ```

2. **Crear tabla `pickem_settings` con campos específicos:**
   ```sql
   CREATE TABLE pickem_settings (
     activity_id uuid PRIMARY KEY REFERENCES activities(id),
     twitch_channel text,
     predictions_close_at timestamptz,
     predictions_close_timezone text DEFAULT 'America/Santo_Domingo',
     scoring_config jsonb DEFAULT '{}',
     prize_stacking_policy text DEFAULT 'single_prize_per_participant'
   );
   ```

3. **Migrar datos de `events` → `activities` + `pickem_settings`** (SQL conceptual):
   ```sql
   INSERT INTO activities (id, creator_id, activity_type, title, slug, description, status, logo_url, starts_at, ends_at, created_at)
   SELECT id, creator_id, 'pickem', title, slug, description, status, logo_url, starts_at, ends_at, created_at FROM events;

   INSERT INTO pickem_settings (activity_id, twitch_channel, predictions_close_timezone, scoring_config, prize_stacking_policy)
   SELECT id, twitch_channel, predictions_close_timezone, scoring_config, prize_stacking_policy FROM events;
   ```

4. **Renombrar tablas hijas:** `event_players` → `pickem_players`, `event_prizes` → `activity_prizes` (genérico), etc.

**Riesgos:**
- `events` tiene 30+ columnas referenciadas en ~15 archivos de acciones.
- Migración requiere mantener vista `events` como compatibilidad hacia atrás.
- `event_participants` referenciado en RLS y funciones.
- Rollback: mantener `events` como tabla activa y migrar datos de vuelta.

### Fase 5 — Desacoplar Pick'em

**Objetivo**: Probar que Pick'em puede desactivarse.

1. **Mover módulo de scoring a `activities/pickem/scoring/`:**
   - `app/actions/scoring.ts`
   - `app/actions/leaderboard.ts`
   - `app/actions/results-data.ts`
   - `app/actions/tiebreaker.ts`

2. **Mover componentes de resultados a `activities/pickem/components/`:**
   - `components/completed/` → dividir en base genérica + específica de Pick'em

3. **Implementar feature flag conceptual:**
   ```ts
   // config/feature-flags.ts
   export const FEATURES = {
     pickem: process.env.NEXT_PUBLIC_FEATURE_PICKEM !== 'false',
   };
   ```

4. **Probar desactivación:**
   - `FEATURE_PICKEM=false` debe ocultar Pick'em del sidebar, rutas, dashboard.
   - Login, settings, perfiles, admin deben funcionar.
   - Datos históricos preservados.

**Archivos concretos a modificar:**
- Crear `config/feature-flags.ts`
- Modificar `components/layout/Sidebar.tsx` para ocultar Pick'em si desactivado
- Modificar `app/(app)/creator/dashboard/page.tsx` para filtrar actividades desactivadas
- Modificar `app/(app)/inicio/page.tsx` para filtrar
- Añadir guard en `app/pickems/[slug]/page.tsx` → 404 si desactivado
- Añadir guard en `app/(app)/creator/pickems/*` → redirect si desactivado

---

## E. Archivos concretos a modificar (por fase)

### Fase 1

| Archivo | Cambio |
|---------|--------|
| `components/pickem/CreatorWelcomeModal.tsx` | Mover a `components/shared/CreatorWelcomeModal.tsx` |
| `components/layout/Sidebar.tsx:10` | `import { CreatorWelcomeModal } from '@/components/shared/CreatorWelcomeModal'` |

### Fase 2

| Archivo | Cambio |
|---------|--------|
| `components/pickem/SubscriberTwitchEligibilityNotice.tsx` | Mover a `components/shared/SubscriberTwitchEligibilityNotice.tsx` |
| `components/pickem/PublicPickemView.tsx` | Actualizar import del componente movido |
| `components/pickem/PrizeSection.tsx` | Actualizar import del componente movido |

### Fase 3

| Archivo | Cambio |
|---------|--------|
| Crear `types/activity.ts` | Interfaces base de actividad |
| Crear `lib/activity-registry.ts` | Registry de módulos |
| `lib/status-config.ts` | Separar estados generales vs específicos |
| `lib/dashboard-config.ts` | Separar acciones generales vs específicas |
| `lib/summary.ts` | Hacer agnóstico al tipo de actividad |
| `config/dynamics.ts` | Conectar al registry (ya existe como base) |

### Fase 4

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/00040_activities_table.sql` | Nueva migración: crear `activities` + `pickem_settings` |
| `app/actions/creator.ts` | Refactorizar: crear actividad base + pickem_settings |
| `app/actions/participant.ts` | Refactorizar: consultar `activities` en lugar de `events` |
| `app/actions/scoring.ts` | Refactorizar: leer de `pickem_settings` |
| `app/actions/results-data.ts` | Refactorizar: compatibilidad con nueva estructura |
| `app/actions/tiebreaker.ts` | Refactorizar: compatibilidad |
| `lib/status-config.ts` | Usar `activity_type` para determinar estados disponibles |

### Fase 5

| Archivo | Cambio |
|--------|--------|
| Crear `config/feature-flags.ts` | Feature flags |
| `components/layout/Sidebar.tsx` | Ocultar Pick'em si desactivado |
| `app/(app)/creator/dashboard/page.tsx` | Filtrar por feature flag |
| `app/(app)/inicio/page.tsx` | Filtrar participaciones |
| `app/pickems/[slug]/page.tsx` | Guard: 404 si desactivado |
| `app/(app)/creator/pickems/*` | Guard: redirect si desactivado |
| `components/activity/ActivityFeed.tsx` | Filtrar por feature flag |

---

## F. Migraciones posibles (solo propuesta — no aplicar)

### Migración 1: `events` → `activities` + `pickem_settings`

**Objetivo:** Separar la tabla monolítica `events` en una tabla base de actividades y una tabla específica de Pick'em.

```sql
-- 1. Crear tabla base
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('pickem', 'trivia', 'poll', 'giveaway')),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  logo_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_public boolean DEFAULT true,
  max_participants integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, slug, activity_type)
);

-- 2. Crear tabla específica de Pick'em
CREATE TABLE pickem_settings (
  activity_id uuid PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  twitch_channel text,
  predictions_close_timezone text DEFAULT 'America/Santo_Domingo',
  prize_stacking_policy text DEFAULT 'single_prize_per_participant',
  scoring_config jsonb DEFAULT '{}'
);

-- 3. Migrar datos existentes
INSERT INTO activities (id, creator_id, activity_type, title, slug, description, status, logo_url, starts_at, ends_at, is_public, max_participants, created_at)
SELECT 
  id, creator_id, 'pickem', title, slug, description, status, 
  logo_url, starts_at, ends_at, is_public, max_participants, created_at
FROM events;

INSERT INTO pickem_settings (activity_id, twitch_channel, predictions_close_timezone, prize_stacking_policy, scoring_config)
SELECT id, twitch_channel, predictions_close_timezone, prize_stacking_policy, scoring_config
FROM events;

-- 4. Crear vista de compatibilidad
CREATE VIEW events AS
SELECT 
  a.id, a.creator_id, a.title, a.slug, a.description, a.status,
  a.logo_url, a.starts_at, a.ends_at, a.is_public, a.max_participants, a.created_at, a.updated_at,
  ps.twitch_channel, ps.predictions_close_timezone, ps.prize_stacking_policy, ps.scoring_config,
  d.id as dynamic_type_id,
  'open' as predictions_close_at, '{}'::jsonb as event_config
FROM activities a
LEFT JOIN pickem_settings ps ON ps.activity_id = a.id
CROSS JOIN LATERAL (SELECT id FROM dynamic_types WHERE slug = 'pickem' LIMIT 1) d
WHERE a.activity_type = 'pickem';
```

**Datos afectados:** Todas las filas de `events` (~100-1000+ filas).

**Riesgos:**
- `events` tiene RLS, policies, y funciones que referencian la tabla directamente.
- La vista `events` debe ser actualizable (INSTEAD OF triggers) si las acciones usan `INSERT/UPDATE/DELETE` contra la tabla.
- `event_participants`, `event_players`, `event_prizes`, `submissions` tienen FK a `events(id)` — deben apuntar a `activities(id)` después de la migración.

**Rollback:**
```sql
DROP VIEW IF EXISTS events;
DROP TABLE IF EXISTS pickem_settings;
DROP TABLE IF EXISTS activities;
-- Los datos originales estaban en events, no se pierden
```

### Migración 2: `event_prizes` → `activity_prizes`

**Objetivo:** Hacer que los premios sean genéricos para cualquier actividad.

```sql
ALTER TABLE event_prizes RENAME TO activity_prizes;
ALTER TABLE activity_prizes RENAME COLUMN event_id TO activity_id;
ALTER TABLE activity_prizes RENAME CONSTRAINT event_prizes_event_id_fkey TO activity_prizes_activity_id_fkey;
```

**Riesgo:** `prize_winners` referencia `event_prizes(id)` — necesita renombrar FK también.

---

## Preguntas de verificación

| Pregunta | Respuesta actual | Acción necesaria |
|----------|-----------------|------------------|
| ¿Podemos desactivar Pick'em sin romper el login? | **Sí** — auth no depende de Pick'em | Nada |
| ¿Podemos desactivar Pick'em sin romper Configuración? | **Sí** — settings no importa Pick'em | Nada |
| ¿La integración con Twitch sigue disponible para otras actividades? | **Sí** — ya está desacoplada | Nada |
| ¿Podemos añadir una Trivia sin copiar toda la infraestructura de Pick'em? | **Parcialmente** — auth, perfiles, Twitch sí serían reutilizables, pero no hay una plataforma de actividades genérica ni sistema de routing extensible | Fase 3 |
| ¿Los perfiles y comunidades existen independientemente del Pick'em? | **Sí** — perfiles son completamente independientes | Nada |
| ¿El dashboard general puede mostrar diferentes tipos de actividades? | **No** — actualmente asume `events` con estructura Pick'em | Fase 3 + Fase 5 |
| ¿Podemos añadir una Encuesta como segunda actividad? | **Con esfuerzo alto** — requeriría copiar/modificar: acciones de creador, tabla de eventos, tipos de estado, completados, dashboard, navegación, rutas | Fase 3 habilitaría esto |
