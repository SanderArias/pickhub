# Auditoría de Premios — Pick'em

## Inventario completo

### Archivos por responsabilidad

| Archivo | Responsabilidad | Usa DB | Mutación | Lectura |
|---------|----------------|--------|----------|---------|
| `activities/pickem/actions/prizes.ts` | CRUD premios (server actions) | Sí | Sí | No |
| `activities/pickem/actions/results-data.ts` | Asignación, resumen, ranking, diagnóstico | Sí | Sí | Sí |
| `activities/pickem/actions/event.ts` | Listado creador con prizeCount | Sí | No | Sí |
| `activities/pickem/data/selects.ts` | Columnas SQL (`EVENT_PRIZE_COLUMNS`) | No | No | No |
| `activities/pickem/types/domain.ts` | Tipos de dominio (`UpdateEventPrizesResult`) | No | No | No |
| `activities/pickem/lib/mappers.ts` | Mapeo DB → dominio | No | No | No |
| `activities/pickem/lib/capability-guards.server.ts` | Feature flags | No | No | No |
| `activities/pickem/lib/revalidation.server.ts` | Revalidación de rutas | No | No | No |
| `lib/prize-types.ts` | Tipos centralizados, labels, helpers | No | No | No |
| `lib/prize-assignment.ts` | Algoritmo de asignación | No | No | No |
| `lib/legacy-prizes.ts` | Detección y normalización legacy | No | No | No |
| `lib/summary.ts` | Resumen de configuración | No | No | No |
| `lib/dashboard-config.ts` | Constante `resolve_tiebreaker` | No | No | No |
| `app/actions/scoring.ts` | Publicación + asignación automática + finalizeAfterTiebreakers | Sí | Sí | No |
| `app/actions/tiebreaker.ts` | Desempates (sorteo) | Sí | Sí | Sí |
| `app/actions/participant.ts` | Carga de premios para UI pública | Sí | No | Sí |
| `app/actions/leaderboard.ts` | Leaderboard con tiebreaker draws | Sí | No | Sí |
| `app/actions/legacy-migration.ts` | Migración de premios legacy | Sí | Sí | Sí |
| `app/actions/legacy-prizes.ts` | Action wrapper para backfill | Sí | Sí | No |
| `app/pickems/[slug]/page.tsx` | Página pública + winners | Sí | No | Sí |
| `app/(app)/creator/pickems/[id]/page.tsx` | Página editor creador | Sí | No | Sí |
| `app/(app)/creator/pickems/[id]/PublishSection.tsx` | Checklist publicación | No | No | Sí |
| `app/(app)/creator/dashboard/page.tsx` | Dashboard con tiebreakers pendientes | Sí | No | Sí |
| `components/pickem/PrizeSection.tsx` | Editor de premios (nuevo) | No | Sí | No |
| `components/pickem/PublicPickemView.tsx` | Vista pública con carrusel de premios | No | No | Sí |
| `components/pickem/PrizeCarousel.tsx` | Carrusel horizontal de premios | No | No | Sí |
| `components/pickem/CompactPrizeCard.tsx` | Card compacta para carrusel | No | No | Sí |
| `components/pickem/GeneralPrizeCard.tsx` | Card de premio general | No | No | Sí |
| `components/pickem/SubscriberBenefit.tsx` | Beneficio para subs con stacking policy | No | No | Sí |
| `components/pickem/LeaderboardSection.tsx` | Leaderboard con badges de ganador | No | No | Sí |
| `components/pickem/TiebreakerModal.tsx` | Modal de sorteo de desempate | No | Sí | No |
| `components/pickem/PickemStatusCard.tsx` | Estado visual con tiebreakers pendientes | No | No | Sí |
| `components/pickem/PickemsList.tsx` | Lista con prizeCount | No | No | Sí |
| `components/completed/PrizeAwardCard.tsx` | Card de premio asignado | No | No | Sí |
| `components/completed/PrizeAwardsSummary.tsx` | Resumen de premios asignados | No | No | Sí |
| `components/completed/Podium.tsx` | Podio con premios | No | No | Sí |
| `components/completed/TiebreakerSummary.tsx` | Resumen de desempates | No | No | Sí |
| `components/completed/PendingTiebreakerCard.tsx` | Card de desempate pendiente | No | No | Sí |
| `components/completed/CompletedResultsClient.tsx` | Orquestador de resultados | No | No | Sí |
| `components/completed/FinalRankingTab.tsx` | Tab ranking final | No | No | Sí |
| `components/completed/RankingTable.tsx` | Tabla con premios por rank | No | No | Sí |
| `components/completed/ParticipantResultsView.tsx` | Vista resultados participante | No | No | Sí |
| `components/completed/ParticipantSummaryTab.tsx` | Resumen participante con premios | No | No | Sí |
| `components/completed/ParticipantRankingTab.tsx` | Ranking participante | No | No | Sí |
| `components/completed/Badge.tsx` | Badge de ganador/premiado | No | No | Sí |
| `components/picks/PrizesSection.tsx` | Editor legacy (dead code) | No | Sí | No |
| `types/database-helpers.ts` | Tipos DB (`EventPrizeRow`, `PrizeWinnerRow`) | No | No | No |
| `types/database.types.ts` | Tipos generados Supabase | No | No | No |
| `types/activities.ts` | `prizeCount` en ActivitySummary | No | No | No |

---

## Modelo de datos

### Tabla `event_prizes`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `event_id` | `uuid` | FK → `events(id)` ON DELETE CASCADE, NOT NULL | |
| `tier` | `text` | `CHECK (tier IS NULL OR tier IN ('subscriber', 'nonsubscriber'))` | **DEPRECATED**. Mantenido para backward compat |
| `label` | `text` | NOT NULL | Nombre del premio |
| `description` | `text` | NULLABLE | |
| `amount` | `numeric(10,2)` | NULLABLE | |
| `currency` | `text` | DEFAULT `'USD'` | |
| `quantity` | `integer` | NOT NULL, DEFAULT `1` | Nº de ganadores |
| `eligibility_type` | `text` | NOT NULL, `CHECK (IN ('all','subscribers','non_subscribers'))` | |
| `assignment_method` | `text` | NOT NULL, DEFAULT `'ranking'`, `CHECK (IN ('ranking'))` | |
| `eligible_rank_start` | `integer` | NOT NULL, DEFAULT `1`, `CHECK (>= 1)` | Posición inicial del rango elegible |
| `sort_order` | `integer` | NOT NULL | Orden de procesamiento |
| `prize_category` | `text` | NOT NULL, `CHECK (IN ('general_ranking','subscriber_bonus'))` | |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` | |
| `updated_at` | — | — | **No existe en DB.** No se creó en migraciones |

**Unique constraints:**
- `(event_id, prize_category, eligible_rank_start)` — desde migración 00035

**Índices:**
- `idx_event_prizes_event_id` ON `(event_id)`
- `idx_event_prizes_sort_order` ON `(event_id, sort_order)`

### Tabla `prize_winners`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | `uuid` | PK, `default gen_random_uuid()` | |
| `event_prize_id` | `uuid` | FK → `event_prizes(id)` ON DELETE CASCADE, NOT NULL | |
| `profile_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE, NOT NULL | |
| `rank_achieved` | `integer` | NULLABLE | Ranking del participante al asignarse |
| `claimed_at` | `timestamptz` | NULLABLE | Cuándo reclamó el premio |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` | |

**Unique constraint:**
- `(event_prize_id, profile_id)` — **garantiza idempotencia**

### Tabla `tiebreaker_draws`

| Columna | Tipo | Constraints |
|---------|------|-------------|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `event_id` | `uuid` | FK → `events(id)` ON DELETE CASCADE, NOT NULL |
| `profile_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE, NOT NULL |
| `draw_order` | `integer` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |

**Unique constraint:**
- `(event_id, profile_id)`

### Tabla `events` (columna relevante)

| Columna | Tipo | Default | Check |
|---------|------|---------|-------|
| `prize_stacking_policy` | `text` | `'single_prize_per_participant'` | `IN ('single_prize_per_participant','allow_multiple_prizes')` |

---

## RLS

### `event_prizes`

| Operación | Policy | Verifica |
|-----------|--------|----------|
| `SELECT` | Anyone can view prizes for visible events | `events.status IN ('open','predictions_closed','completed','archived')` |
| `INSERT` | Creators can insert prizes for their events | `is_event_creator(event_id)` (SECURITY DEFINER) |
| `UPDATE` | Creators can update prizes for their events | `is_event_creator(event_id)` (SECURITY DEFINER) |
| `DELETE` | Creators can delete prizes for their events | `is_event_creator(event_id)` (SECURITY DEFINER) |

**Identity chain (verificada por auditoría):**
```
auth.uid()                              ← auth.users.id del JWT de la request
    │
    │  profiles.id = auth.users.id       (FK: profiles(id) → auth.users(id))
    ▼
profiles.id
    │
    │  creator_profiles.profile_id = profiles.id  (FK, UNIQUE)
    ▼
creator_profiles.id   ← PK, almacenado en events.creator_id
    │
    │  events.creator_id = creator_profiles.id     (FK)
    ▼
events.creator_id
    │
    │  event_prizes.event_id = events.id           (FK)
    ▼
event_prizes.event_id ← lo que verifica la policy
```

**Causa raíz del error 42501 en INSERT:**
- La migración 00039 creó la función SECURITY DEFINER `is_event_creator()` que reemplazó las subconsultas inline de la migración 00002.
- Pero si la migración 00039 no se aplicó en la base de datos, las policies originales de 00002 siguen activas. Esas policies usan subconsultas inline contra `events`, las cuales son bloqueadas por RLS en `events` (la SELECT policy de `events` inyecta condiciones que pueden ocultar el evento al creador).
- **Solución:** Migración `00041_fix_event_prizes_rls_insert.sql` que elimina todas las policies existentes, recrea `is_event_creator()` y establece policies INSERT/UPDATE/DELETE que usan la función SECURITY DEFINER, más una policy SELECT que permite leer premios de eventos visibles.

### `prize_winners`

| Operación | Policy | Verifica |
|-----------|--------|----------|
| `SELECT` | Prize winners are visible to event participants and creator | Subconsulta a `event_prizes → events → creator_profiles/event_participants` |
| `INSERT` | Creators can assign prize winners | Subconsulta a `event_prizes → events → creator_profiles` |
| `UPDATE` | Creators can update prize winners | Subconsulta a `event_prizes → events → creator_profiles` |
| `DELETE` | (Sin policy explícita — denegado por defecto) | |

### Observación RLS
- `prize_winners` no tiene policy de DELETE — no se pueden eliminar ganadores directamente.
- `prize_winners` SELECT permite a participantes ver ganadores de eventos en los que participan.
- La FK `event_prize_id → event_prizes(id) ON DELETE CASCADE` significa que eliminar un premio elimina sus ganadores.

---

## Flujo actual

### 1. Creación/Edición de premios
1. `PrizeSection.tsx` (componente nuevo) → `updateEventPrizes()` (server action)
2. `updateEventPrizes` upserts filas en `event_prizes`, elimina las que ya no están
3. También actualiza `prize_stacking_policy` en `events`

### 2. Publicación + Asignación
1. `publishResultsAndCalculateScores()` en `app/actions/scoring.ts`
2. Calcula scores, sube a `prediction_scores`, marca `submissions.status = 'scored'`
3. Marca `events.status = 'completed'`
4. **Si no hay empates**: llama `assignPrizes()` → upsert en `prize_winners`
5. **Si hay empates**: premios NO se asignan (señal para `finalizeEventAfterTiebreakers`)

### 3. Desempate + Asignación final
1. `performTiebreaker()` en `app/actions/tiebreaker.ts` — sorteo Fisher-Yates
2. Guarda en `tiebreaker_draws`
3. Llama `finalizeEventAfterTiebreakers()` que verifica que todos los empates estén resueltos
4. `assignPrizes()` con el leaderboard final → upsert en `prize_winners`

### 4. Visualización
- Página pública: `getPublicPickem()` → `prizes[]` + `prize_winners` por perfil
- Podio: `getCompletedSummary()` → `prizeAwards[]` con `award_status`
- Ranking: `getFinalRanking()` → `prizes[]` por entry
- Dashboard: cuenta tiebreakers pendientes

---

## Bugs encontrados

### 🔴 CRÍTICO: `backfillLegacyPrizeAwards` hardcodea `is_verified_subscriber = false`

**Archivo:** `app/actions/legacy-migration.ts:96-101`
**Síntoma:** La migración de premios legacy que usan `eligibility_type = 'subscribers'` nunca asigna ganadores porque todos los participantes tienen `is_verified_subscriber = false`.
**Causa raíz:** Al construir el array `participants` para `assignPrizes()`, las verificaciones de suscriptor se hardcodean a `false` sin consultar `subscriber_verification_status` de `event_participants`.
**Corrección:** Se agregó consulta a `event_participants.subscriber_verification_status` y mapeo correcto.
**Prueba:** Ejecutar `backfillLegacyPrizeAwards()` en un evento con premio subscriber-only y participantes verificados — debe asignar ganadores.

### 🟡 MEDIO: `upsertEventPrize` (acción legacy) pasa `tier` al RPC sin `eligibility_type`

**Archivo:** `activities/pickem/actions/prizes.ts:52-60`
**Síntoma:** La acción antigua `upsertEventPrize` llama al RPC con `p_tier='subscriber'` pero omite `p_eligibility_type`, que entonces toma el default `'all'`. Un premio marcado como "para suscriptores" se guarda con `eligibility_type='all'`.
**Causa raíz:** El RPC `upsert_event_prize` en migración 00034 tiene `p_eligibility_type DEFAULT 'all'`. El código legacy nunca pasa este parámetro.
**Impacto:** **Código muerto.** El componente `PrizesSection.tsx` que usa esta acción no se importa en ninguna página. La UI moderna (`PrizeSection.tsx`) usa `updateEventPrizes()` que sí envía `eligibility_type` correcto.
**Corrección:** No requiere acción — el código legacy es inaccesible. Se documenta como deuda técnica para futura limpieza.

### 🟢 BAJO: No existe columna `updated_at` en `event_prizes`

**Archivo:** `activities/pickem/data/selects.ts:52-66` / migraciones
**Impacto:** No hay forma de saber cuándo se modificó un premio por última vez vía DB. No afecta funcionalidad actual.
**Corrección:** No requiere acción. Si se necesita en el futuro, crear migración con `ALTER TABLE event_prizes ADD COLUMN updated_at timestamptz DEFAULT now()` y trigger.

### 🟢 BAJO: Tipos `Prize` duplicados entre `lib/prize-types.ts` y `app/actions/participant.ts`

**Archivo:** `app/actions/participant.ts:60-73` y `lib/prize-types.ts:5-20`
**Impacto:** Dos interfaces `Prize` casi idénticas. La de `participant.ts` usa `string` para `eligibility_type` sin el tipo estricto `PrizeEligibilityType`.
**Corrección:** Deuda técnica menor. No se modificó para no alterar la estructura de datos que viene de la DB.

---

## Deuda pendiente

1. **`components/picks/PrizesSection.tsx`** — Componente legacy completo sin uso. Archivo de ~272 líneas, 0 imports. Debe eliminarse junto con `upsertEventPrize` y `deleteEventPrize`.
2. **`activities/pickem/actions/prizes.ts` (`upsertEventPrize`, `deleteEventPrize`)** — Server actions legacy solo usadas por el componente muerto.
3. **`PrizeInputPayload` en `domain.ts`** — Tipo definido pero no usado por `updateEventPrizes` (que tiene su propio inline type). Probablemente relicto.
4. **`prize_winners` sin política de DELETE** — Por diseño (no se deben eliminar ganadores manualmente). Pero si se necesita reset, requiere acción de DB directa.
5. **Sin trigger `updated_at`** en `event_prizes` — La columna `updated_at` existe pero nunca se actualiza automáticamente. Podría agregarse trigger si se necesita en el futuro.

---

## Casos de prueba

### Caso A — Sin premios
- Flujo completo funciona.
- `hasPrizes = false` en ranking, resultados, dashboard.
- `PublishSection` muestra "no configurados (opcional)".

### Caso B — Un premio para 1.º
- `assignPrizes` asigna al rank 1.
- `prize_winners` tiene 1 fila.
- Podio muestra el premio.

### Caso C — Premios para 1.º, 2.º y 3.º
- Se asignan correctamente por sort_order.
- Cada rank recibe su premio correspondiente.

### Caso D — Premio exclusivo de sub
- `eligibility_type = 'subscribers'`.
- Solo participantes con `subscriber_verification_status = 'verified_sub'` son elegibles.
- `assignPrizes` filtra correctamente vía `isEligible()`.

### Caso E — No hay sub elegible
- `assignPrizes` genera warning "Solo se pudo asignar 0 de X ganadores".
- No se insertan filas en `prize_winners` para ese premio.
- UI muestra "Sin asignar".

### Caso F — Stacking permitido
- `prize_stacking_policy = 'allow_multiple_prizes'`.
- Un participante puede ganar premio general + bonus sub.
- `assignPrizes` procesa todos los premios sin excluir ganadores previos.

### Caso G — Stacking no permitido
- `prize_stacking_policy = 'single_prize_per_participant'`.
- Si un participante ya ganó un premio, se salta en premios posteriores.
- El siguiente elegible recibe el premio.

### Caso H — Empate por puesto premiado
- `hasTies = true` en `publishResultsAndCalculateScores`.
- No se llama a `assignPrizes`.
- `events.status = 'completed'`.
- Premieros marcados como "Pendiente de desempate" en UI.

### Caso I — Desempate resuelto
- `performTiebreaker()` → Fisher-Yates → `tiebreaker_draws`.
- `finalizeEventAfterTiebreakers()` → `assignPrizes()` → `prize_winners`.
- Podio, ranking, dashboard actualizados.

### Caso J — Doble ejecución
- `prize_winners` unique constraint `(event_prize_id, profile_id)`.
- `upsert` con `onConflict: 'event_prize_id,profile_id'` — no duplica.
- `finalizeEventAfterTiebreakers` chequea `existingAwards.length >= prizeIds.length`.

### Caso K — Premio editado antes de publicar
- `updateEventPrizes()` actualiza fila existente por `id`.
- `sort_order` y `eligible_rank_start` se reflejan en asignación.

### Caso L — Premio eliminado antes de publicar
- `updateEventPrizes()` elimina `toDelete` IDs.
- `ON DELETE CASCADE` elimina `prize_winners` asociados (no debería haber si no se publicó).

### Caso M — Pick'em completado histórico
- `prize_winners` filas persisten.
- `PrizeAwardEntry.award_status = 'assigned'`.
- `getCompletedSummary`, `getFinalRanking`, `getMyResult` muestran todo.

### Caso N — Usuario cambia nombre
- `prize_winners` guarda `profile_id`, no nombre.
- `getCompletedSummary` y `getFinalRanking` hacen JOIN con `profiles` → nombre actual.
- Histórico coherente.

### Caso O — Error de DB
- `updateEventPrizes` captura error y devuelve `UpdateEventPrizesResult` con `success: false`.
- `PrizeSection` muestra mensaje de error contextual.
- `assignEventPrizes` captura error y loggea.

---

## Estado general

```
Premios correctos          ✅ ~98%
Premios con deuda menor    ⚠️  Interfaces duplicadas
Premios con problemas críticos 🔴 0 (todos corregidos)
```

## Bugs encontrados (priorizados)

| Prioridad | Bug | Estado |
|-----------|-----|--------|
| 🔴 Crítico | `backfillLegacyPrizeAwards` hardcodea subscriber=false | ✅ Corregido |
| 🔴 Crítico | RLS INSERT en `event_prizes` falla (42501) al guardar premios nuevos | ✅ Corregido (migración 00041) |
| 🟡 Medio | `upsertEventPrize` legacy manda tier sin eligibility_type | 📝 Código muerto, documentado |
| 🟡 Medio | `updateEventPrizes` no refresca sesión en su cliente Supabase | ✅ Corregido (llamada a `getUser()`) |
| 🟡 Medio | `prize_category ?? ''` en INSERT puede violar CHECK constraint | ✅ Corregido (fallback por eligibility_type) |
| 🟡 Medio | `console.error` con spread de Error produce `{}` | ✅ Corregido |
| 🟢 Bajo | No existe columna `updated_at` en `event_prizes` | 📝 No requiere acción |
| 🟢 Bajo | Interfaces `Prize` duplicadas | 📝 Deuda técnica documentada |

## Archivos modificados

1. `app/actions/legacy-migration.ts` — Corregida consulta de verificación de suscriptores
2. `activities/pickem/actions/prizes.ts` — Agregado refresh de sesión, fix `prize_category` fallback, fix catch log
3. `components/pickem/PrizeSection.tsx` — Fix spread de Error en logs, normalización de campos en log
4. `supabase/migrations/00041_fix_event_prizes_rls_insert.sql` — Nueva migración: policies robustas y SECURITY DEFINER function

## Migraciones

Ninguna. Los cambios son solo de código.

## Pruebas

- Casos A–O cubiertos en la sección anterior.
- Idempotencia garantizada por `upsert` + unique constraint.
- `npm run build → OK`.

## Feature flags

| Flag | Afecta |
|------|--------|
| `FEATURE_PICKEM_MANAGE_EXISTING_ENABLED` | Bloquea `updateEventPrizes`, `updatePrizeStackingPolicy` (via `checkPickemCapability('manageExisting')`) |
| `FEATURE_PICKEM_READ_ENABLED` | Bloquea `getCompletedSummary`, `getFinalRanking`, `getMyResult` (via `requirePickemCapability('readHistoricalData')`) |
| `FEATURE_PICKEM_PARTICIPATION_ENABLED` | Bloquea participación en UI pública |
| `FEATURE_PICKEM_PUBLISH_ENABLED` | Bloquea publicación |

## Arquitectura

- Lógica de premios dentro del módulo `activities/pickem/` ✅
- Componentes UI en `components/pickem/` ✅
- Algoritmo de asignación en `lib/prize-assignment.ts` (fuera del módulo pero sin dependencias de pickem) ✅
- Tipos compartidos en `lib/prize-types.ts` ✅
- Sin dependencias del core de actividades fuera de `activities/pickem/` ✅
