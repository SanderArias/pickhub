# Creator Dashboard Performance

## Tiempo inicial (antes de optimizar)

Causa raíz de los 5+ segundos: **N+1 en detección de desempates y acciones pendientes**.

### Consultas iniciales por carga

| # | Consulta | Tipo | Tiempo estimado |
|---|---|---|---|
| 1 | `events` (all by creator) | directa | 50-200ms |
| 2 | `submissions` count (total) | directa | 50-200ms |
| 3-N | Por cada evento `completed`: `submissions.count('scored')` | N+1 | 50-200ms c/u |
| 3+N | Por cada evento `completed`: `tiebreaker_draws.select` | N+1 | 50-200ms c/u |
| 3+2N | Por cada evento `completed`: `submissions.select('total_score')` | N+1 + duplicada | 50-200ms c/u |
| 3+3N | Por cada evento `completed`: `submissions.select('total_score, participant_id')` | N+1 (duplicada) | 50-200ms c/u |
| 3+4N | Por cada evento `completed`: `event_participants.select` | N+1 | 50-200ms c/u |
| 4+N | Por cada evento `open`: `submissions.count` | N+1 | 50-200ms c/u |
| Final | `submissions` + `profiles` (actividad) | directa + batch | 100-300ms |

**Total para un creador con 5 eventos completados + 3 abiertos**: ~20-25 consultas secuenciales.

### Cuello de botella principal

El loop de detección de desempates (líneas 47-99 originales) ejecutaba **hasta 5 consultas por evento completado, secuencialmente, con una consulta duplicada** (`submissions.select('total_score')` se hacía dos veces).

Además, el loop de acciones pendientes (líneas 143-183 originales) ejecutaba **1 consulta por evento abierto** para verificar si tenía submissions.

## Cambios implementados

### 1. Eliminación de N+1 — detección de desempates

**Antes**: loop `for (const e of safeEvents)` con consultas individuales por evento.
**Después**: 2 consultas batch que reemplazan N×5 consultas:
- `tiebreaker_draws.select('event_id, profile_id').in('event_id', completedEventIds)`
- `submissions.select('event_id, total_score, participant_id').in('event_id', completedEventIds).eq('status', 'scored')`

### 2. Eliminación de N+1 — acciones pendientes

**Antes**: 1 consulta por evento `open` para contar submissions.
**Después**: 1 consulta batch `submissions.select('event_id').in('event_id', openEventIds)`.

### 3. Eliminación de consulta duplicada

**Antes**: `submissions.select('total_score')` y luego `submissions.select('total_score, participant_id')` — misma data, dos viajes.
**Después**: Una sola consulta `submissions.select('event_id, total_score, participant_id')`.

### 4. Batch de participantes

**Antes**: 1 consulta `event_participants` por evento completado con ties.
**Después**: 1 consulta batch para todos los `participant_id`s involucrados.

### 5. Paralelización

Todas las consultas dependientes de `eventIds` ahora se ejecutan en `Promise.all`:
- Total submissions count
- Recent activity
- Tiebreaker draws
- Scores data
- Open event submission counts

### 6. Instrumentación añadida

Se agregaron labels `[performance:creator-dashboard:*]` en `lib/perf.ts`:
- `profile`
- `client`
- `events`
- `parallel-batch`
- `metrics`
- `tiebreakers`
- `metrics-def`
- `attention`
- `activity-enrich`
- `total`

### 7. Render progresivo

No se modificó — el `loading.tsx` existente (`CreatorDashboardSkeleton`) ya proporciona feedback inmediato.

## Tiempo después de optimizar

| Bloque | Antes (estimado) | Después (estimado) | Consultas |
|---|---|---|---|
| Profile (memoized) | ~100ms | ~100ms | 0-1 (cache) |
| Events query | ~100ms | ~100ms | 1 |
| Parallel batch | ~400-3000ms (N+1) | ~200-400ms | 5 (paralelas) |
| Transform + render | ~100ms | ~100ms | 0 |
| **Total** | **~700-3500ms** | **~400-700ms** | **6 consultas** |

### Consultas finales por carga

| # | Consulta | Tipo |
|---|---|---|
| 1 | `events` by creator_id | directa |
| 2 | `submissions` count (total) | directa, paralela |
| 3 | `submissions` + joins (actividad) | batch, paralela |
| 4 | `tiebreaker_draws` | batch, paralela |
| 5 | `submissions` (scored, tiebreaker data) | batch, paralela |
| 6 | `submissions` (open events) | batch, paralela |
| 7 | `profiles` (activity names) | batch condicional |
| 8 | `event_participants` (tiebreaker mapping) | batch condicional |

**Total**: 6-8 consultas, todas paralelizadas (excepto events que debe ir primero). Sin N+1. Sin duplicación.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `app/(app)/creator/dashboard/page.tsx` | Reescritura: N+1 → batch, secuencial → paralelo, duplicación eliminada, instrumentación añadida |

## Validaciones

- Creador sin Pick'ems: el `eventIds` está vacío → todas las consultas batch se resuelven inmediatamente como arrays vacíos.
- Creador con pocos Pick'ems: sin N+1, rendimiento lineal.
- Creador con muchos Pick'ems: número de consultas constante (6-8), independiente de cantidad de eventos.
- Usuario estándar: redirigido en el check de rol, no ejecuta consultas de dashboard.
- Build: `npm run build` exitoso.

## Migraciones

No se generaron migraciones. Las optimizaciones se lograron sin cambios en BD.
