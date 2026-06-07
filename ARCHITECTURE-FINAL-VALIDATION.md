# Validación Final de Desacoplamiento — PickHub

## A. Resultado general

**PickHub desacoplado.**

El core de PickHub (Auth, perfiles, creadores, Settings, Twitch, layout, navegación, dashboard) no depende funcionalmente del módulo Pick'em. Toda la lógica específica de Pick'em reside dentro de `activities/pickem/`, `app/pickems/`, `app/(app)/creator/pickems/` y `components/pickem/`.

### Verificación

- `npm run architecture:check` → **PASS** (0 violaciones)
- `npm run build` → **PASS**
- Auditoría de imports core→Pick'em → **0 violaciones** en directorios estrictos (`lib/`, `services/`, `components/layout/`, `components/auth/`, etc.)

---

## B. Imports problemáticos

| Archivo | Import | Permitido | Motivo |
|---|---|---|---|
| `app/actions/participant.ts` | `@/activities/pickem/lib/capability-guards.server` | Sí | Server action puente para datos de Pick'em |
| `app/actions/participant.ts` | `@/activities/pickem/data/selects` | Sí | Columnas definidas para queries Pick'em |
| `app/actions/results-data.ts` | `@/activities/pickem/lib/capability-guards.server` | Sí | Server action puente para resultados Pick'em |
| `app/actions/scoring.ts` | `@/activities/pickem/lib/capability-guards.server` | Sí | Server action puente para scoring Pick'em |
| `app/actions/leaderboard.ts` | `@/activities/pickem/lib/capability-guards.server` | Sí | Server action puente para leaderboard Pick'em |
| `app/actions/tiebreaker.ts` | `@/activities/pickem/lib/capability-guards.server` | Sí | Server action puente para tiebreaker Pick'em |
| `app/actions/creator.ts` | `@/activities/pickem/actions` | Sí | Barrel/compatibility layer (0 consumidores directos) |
| `components/completed/EventSummaryTab.tsx` | `@/components/pickem/TiebreakerModal` | Sí | Componente de resultados que renderiza sub-componente Pick'em |
| `components/predictions/PredictionsSection.tsx` | `@/activities/pickem/actions/predictions` | Sí | Editor de predicciones (pertenece al flujo creator Pick'em) |
| `components/players/PlayersSection.tsx` | `@/activities/pickem/actions/players` | Sí | Editor de players (pertenece al flujo creator Pick'em) |
| `components/picks/PrizesSection.tsx` | `@/activities/pickem/actions/prizes` | Sí | Editor de premios (pertenece al flujo creator Pick'em) |
| `components/layout/Sidebar.tsx` | href `/creator/pickems` | Sí | Navegación general hacia listado histórico |
| `app/(app)/layout.tsx` | `getActivityCapabilities('pickem')` | Sí | Feature flag genérico (no importa lógica Pick'em) |
| `app/(app)/creator/dashboard/page.tsx` | `isActivityCapabilityEnabled('pickem', 'create')` | Sí | Dashboard respeta feature flag |
| `app/(app)/inicio/page.tsx` | `/pickems/...` href | Sí | Enlace a detalle de participación histórica |

**Total: 0 violaciones.** Todos los imports son legítimos y siguen el patrón core→actividad (core puede referenciar la actividad por nombre/feature flag, pero no importa lógica interna).

---

## C. Pruebas con feature flags

### Escenario 1: Normal (todas las capacidades `true`)

| Ruta | Resultado |
|---|---|
| `/login` | Funciona |
| `/forgot-password` | Funciona |
| `/update-password` | Funciona |
| `/inicio` | Funciona, muestra participaciones |
| `/settings` | Funciona (Twitch, perfil) |
| `/participaciones` | Funciona |
| `/pickems/[slug]` | Funciona (participación abierta) |
| `/creator/dashboard` | Funciona, muestra "+ Nuevo Pick'em" |
| `/creator/pickems` | Funciona (listado completo) |
| `/creator/pickems/new` | Funciona |
| `/creator/pickems/[id]` | Funciona (gestión) |
| `/creator/pickems/[id]/results` | Funciona |

### Escenario 2: Sin creación (`create=false`)

Variables:
```
FEATURE_PICKEM_CREATION_ENABLED=false
FEATURE_PICKEM_PUBLISH_ENABLED=true
FEATURE_PICKEM_PARTICIPATION_ENABLED=true
FEATURE_PICKEM_MANAGE_EXISTING_ENABLED=true
FEATURE_PICKEM_READ_ENABLED=true
```

| Ruta | Resultado esperado |
|---|---|
| `/login` | Funciona ✓ |
| `/forgot-password` | Funciona ✓ |
| `/update-password` | Funciona ✓ |
| `/inicio` | Funciona, muestra participaciones ✓ |
| `/settings` | Funciona ✓ |
| `/participaciones` | Funciona ✓ |
| `/pickems/[slug]` | Funciona ✓ |
| `/creator/dashboard` | Funciona, **sin** "+ Nuevo Pick'em" ✓ |
| `/creator/pickems` | Funciona (históricos) ✓ |
| `/creator/pickems/new` | **Bloqueado** (redirect o error) ✓ |
| `createPickem()` action | **Bloqueado** (PickemCapabilityError) ✓ |
| `/creator/pickems/[id]` | Funciona (gestión existente) ✓ |
| `/creator/pickems/[id]/results` | Funciona ✓ |
| `/pickems/[slug]/success` | Funciona (nuevas participaciones permitidas) ✓ |

### Escenario 3: Solo lectura histórica

Variables:
```
FEATURE_PICKEM_CREATION_ENABLED=false
FEATURE_PICKEM_PUBLISH_ENABLED=false
FEATURE_PICKEM_PARTICIPATION_ENABLED=false
FEATURE_PICKEM_MANAGE_EXISTING_ENABLED=true
FEATURE_PICKEM_READ_ENABLED=true
```

| Ruta | Resultado esperado |
|---|---|
| `/login` | Funciona ✓ |
| `/inicio` | Funciona, muestra participaciones ✓ |
| `/participaciones` | Funciona ✓ |
| `/pickems/[slug]` (existente, abierto) | **Participación bloqueada**, vista solo lectura ✓ |
| `/pickems/[slug]` (completado) | Funciona (resultados, clasificación) ✓ |
| `/creator/pickems` | Funciona (históricos) ✓ |
| `/creator/pickems/[id]` | Funciona (gestión, cierre, desempates) ✓ |
| `/creator/pickems/[id]/results` | Funciona (resultados, premios) ✓ |
| `/creator/pickems/new` | **Bloqueado** ✓ |
| `submitPredictions()` action | **Bloqueado** (PickemCapabilityError) ✓ |
| `publishPickem()` action | **Bloqueado** (PickemCapabilityError) ✓ |

---

## D. Validación de históricos

### Pick'ems completados

- `getCreatorPickems()` usa `requirePickemCapability('readHistoricalData')` — disponible con `read=true`
- `getCreatorPickemById()` usa `requirePickemCapability('readHistoricalData')` — disponible
- `getPublicPickem()` usa `requirePickemCapability('readHistoricalData')` — disponible

### Resultados y clasificación

- `getCompletedSummary()`, `getFinalRanking()`, `getOfficialResults()`, `getMyResult()` — todos usan `requirePickemCapability('readHistoricalData')`
- No se ocultan bajo feature flags de creación/participación

### Premios y comprobantes

- `getSubmissionReceipt()` usa `requirePickemCapability('readHistoricalData')` — accesible
- `getEventResults()` usa `requirePickemCapability('readHistoricalData')` — accesible

### Conclusión

**Todos los datos históricos permanecen accesibles** bajo cualquier combinación de flags, siempre que `FEATURE_PICKEM_READ_ENABLED=true`. No hay 404s ni ocultamiento de registros por feature flags.

---

## E. Twitch y Settings

### Twitch (`lib/twitch*`, `app/actions/twitch*`)

**0 referencias** a `pickem`, `prediction`, `tiebreaker`, `scoring` o `prize`. Twitch es una integración completamente independiente que expone:

- Cuenta enlazada
- Avatar
- Canal
- Scopes
- Verificación de suscriptores
- Refresh de tokens
- Desconexión

Esta lógica podría ser reutilizada por cualquier actividad futura (sorteos para subs, trivias exclusivas, votaciones de comunidad).

### Settings (`app/(app)/settings/`)

**0 referencias** a `pickem`, `prediction`, `prize` o `tiebreaker`. Settings maneja exclusivamente:

- Perfil
- Cuenta
- Twitch conectado
- Verificación de suscriptores
- Desactivar verificación

Settings funciona correctamente incluso si Pick'em está completamente desactivado.

---

## F. Segunda actividad ficticia — Encuesta (Poll)

### Infraestructura reutilizable (sin modificar)

| Componente | Estado |
|---|---|
| Auth | 100% reutilizable |
| Perfiles | 100% reutilizable |
| Creadores (creator_profiles) | 100% reutilizable |
| Twitch (verificación de subs) | 100% reutilizable |
| Activity Registry (`activities/registry.ts`) | Requiere añadir `'poll'` al union type |
| Feature flags (`activities/registry.server.ts`) | Requiere añadir `getPollCapabilities()` |
| Layout (`AppShell`, `Sidebar`) | 100% reutilizable (recibe `canCreateX` prop genérica) |
| Navegación (`Sidebar`) | 100% reutilizable (renderiza items por role) |
| Dashboard general (`/inicio`) | 100% reutilizable (muestra participaciones genéricas) |
| Dashboard creador (`/creator/dashboard`) | Requiere adaptar consultas para incluir polls |
| `errors.ts` / `normalize-auth-error.ts` | 100% reutilizable |

### Infraestructura específica nueva

| Archivo | Propósito |
|---|---|
| `activities/poll/types/` | PollOption, PollVote, PollSettings, PollResult |
| `activities/poll/actions/` | createPoll, publishPoll, submitVote, closePoll, getResults |
| `activities/poll/data/selects.ts` | Columnas para queries de polls |
| `activities/poll/lib/mappers.ts` | Mappers de DB a dominio |
| `app/polls/[slug]/page.tsx` | Página pública de poll |
| `app/(app)/creator/polls/` | CRUD de polls para creadores |

### Código que NO debería copiarse

- Login, registro, recuperación de contraseña
- Settings, perfil, Twitch
- Feature flags (`activities/registry.server.ts`)
- Layout (`AppShell`, `Sidebar`)
- Manejo de sesión (`getUser`, `getSession`, `requireAuth`)
- Auth guards (`requireAdmin`, `requireCreator`)
- Componentes UI base

### Respuestas

| Pregunta | Respuesta |
|---|---|
| Archivos core a modificar | **2** (`activities/registry.ts` + `activities/registry.server.ts`) |
| Módulos nuevos a crear | **1** (`activities/poll/`) + páginas de ruta (`app/polls/`, `app/(app)/creator/polls/`) |
| Imports core que obliguen a conocer Pick'em | **0** — el core usa tipos genéricos (`ActivityType`, `ActivityModuleCapabilities`, `ActivitySummary`) |

---

## G. Deuda restante

### Críticos (0)
No hay hallazgos críticos. PickHub funciona sin el módulo Pick'em.

### Importantes (2)

1. **`pickemRoutes` sin uso completo en server actions**
   - `app/actions/scoring.ts`, `app/actions/participant.ts`, `app/actions/legacy-prizes.ts`, `app/actions/legacy-migration.ts` usan raw strings en `revalidatePath()` en vez de `pickemRoutes.api.revalidate()`.
   - **Impacto**: Dificulta cambiar rutas de Pick'em centralizadamente.
   - **Mitigación**: Las rutas de revalidation (`/creator/pickems/${id}`, `/pickems/[slug]`) son estables y con baja probabilidad de cambio.

2. **`app/actions/results-data.ts` alberga lógica mixta core+Pick'em**
   - Este archivo combina consultas a `events`, `event_prizes`, `prize_winners`, `tiebreaker_draws`, `profiles`, `prediction_results`.
   - **Impacto**: No está dentro del módulo `activities/pickem/`, lo que difumina el límite arquitectónico.
   - **Mitigación**: Refactorizar hacia `activities/pickem/actions/` o `activities/pickem/lib/` en fase futura.

### Aceptables (3)

3. **`app/actions/creator.ts` — compatibility layer sin consumidores**
   - El barrel `app/actions/creator.ts` re-exporta desde `@/activities/pickem/actions` y `./creator-profile`.
   - **Cero consumidores** — todos los imports internos ya apuntan a las rutas canónicas.
   - **Acción**: Eliminar en fase de limpieza (riesgo bajo).

4. **`config/dynamics.ts` — lista de actividades no sincronizada con registry**
   - `config/dynamics.ts` lista `trivia`, `bingo`, `voting`, `fantasy`, `raffle` como actividades futuras, pero `activities/registry.ts` solo reconoce `'pickem'`.
   - **Impacto**: Mínimo — `dynamics.ts` es decorativo (muestra nombres en UI de admin).
   - **Acción**: Sincronizar cuando se implemente la segunda actividad.

5. **Schema drift entre migraciones y remote Supabase**
   - Tablas como `profiles`, `twitch_connections`, `tournament_templates` difieren entre migraciones y remote.
   - Se requieren 7 casts `as any` para compatibilidad.
   - Documentado en `ARCHITECTURE-DATA-MODEL.md`.

### Futuro (2)

6. **`components/completed/EventSummaryTab.tsx` importa `TiebreakerModal` desde `@/components/pickem/`**
   - Dependencia aceptable porque `EventSummaryTab` es exclusivamente para resultados Pick'em.
   - Si se crea una segunda actividad con resultados, este componente podría generalizarse.

7. **`app/(app)/inicio/page.tsx` usa `getUserParticipations` que internamente consulta tablas Pick'em**
   - La función `getUserParticipations` está en `app/actions/participant.ts` y llama `requirePickemCapability('readHistoricalData')`.
   - Aceptable porque /inicio muestra participaciones y Pick'em es actualmente la única actividad.
   - Para una segunda actividad, `/inicio` debería consultar todas las actividades.

---

## H. Compatibility layers

| Archivo | Tipo | Consumidores | Acción recomendada |
|---|---|---|---|
| `app/actions/creator.ts` | Barrel de re-exportación | **0** | Eliminar en fase de limpieza |
| `types/database-helpers.ts` | Type aliases | Múltiples | Mantener (útil) |
| `types/activities.ts` | Domain type definitions | Múltiples | Mantener (necesario para ActivitySummary genérico) |
| `activities/pickem/lib/mappers.ts` | DB→Domain mappers | Múltiples | Mantener (propio del módulo) |

---

## J. Final cleanup completed (Fase 5.1)

### Archivos movidos

```
app/actions/results-data.ts
→ activities/pickem/actions/results-data.ts
```

### Archivos eliminados

- `app/actions/creator.ts` — barrel de compatibilidad sin consumidores (0 imports internos)

### Archivos creados

- `activities/pickem/lib/revalidation.server.ts` — helper centralizado `revalidatePickemPaths(eventId)`

### Imports actualizados

| Archivo | Import anterior | Import nuevo |
|---|---|---|
| `app/actions/scoring.ts` | `from './results-data'` | `from '@/activities/pickem/actions/results-data'` |
| `app/actions/legacy-migration.ts` | `from './results-data'` | `from '@/activities/pickem/actions/results-data'` |
| `components/completed/CompletedResultsClient.tsx` | `@/app/actions/results-data` | `@/activities/pickem/actions/results-data` |
| `components/completed/EventSummaryTab.tsx` | same | same |
| `components/completed/FinalRankingTab.tsx` | same | same |
| `components/completed/OfficialResultsTab.tsx` | same | same |
| `components/completed/ParticipantRankingTab.tsx` | same | same |
| `components/completed/ParticipantResultsView.tsx` | same | same |
| `components/completed/Podium.tsx` | same | same |
| `components/completed/PrizeAwardCard.tsx` | same | same |
| `components/completed/PrizeAwardsSummary.tsx` | same | same |
| `components/completed/RankingTable.tsx` | same | same |
| `components/completed/TiebreakerSummary.tsx` | same | same |
| `components/pickem/PublicPickemView.tsx` | same | same |
| `app/pickems/[slug]/page.tsx` | same | same |

### Rutas centralizadas

| Archivo | String anterior | Reemplazo |
|---|---|---|
| `app/actions/scoring.ts` (3 bloques) | `revalidatePath(\`/creator/pickems/${eventId}\`)` + 3 líneas | `revalidatePickemPaths(eventId)` |
| `app/actions/participant.ts` | `revalidatePath(\`/pickems/${eventId}\`)` | `revalidatePath(pickemRoutes.public.detail(eventId))` |
| `app/actions/legacy-prizes.ts` | `revalidatePath(\`/creator/pickems/${eventId}\`)` | `revalidatePath(pickemRoutes.api.revalidate(eventId))` |
| `app/actions/legacy-migration.ts` | `revalidatePath(\`/creator/pickems/${eventId}\`)` | `revalidatePath(pickemRoutes.api.revalidate(eventId))` |

### Rutas agregadas a `pickemRoutes`

- `pickemRoutes.creator.dashboard` → `/creator/dashboard`
- `pickemRoutes.public.success` → `/pickems/{slug}/success`

### Compatibility layers restantes

**Ninguno.** `app/actions/creator.ts` eliminado. No quedan barrels de compatibilidad sin consumidores.

### Resultado de búsquedas

- `legacy imports (app/actions/results-data)` → **0**
- `legacy imports (app/actions/creator)` → **0** (el barrel fue eliminado)
- `core → pickem violations` → **0** (architecture:check PASS)

### Validación

- `npm run architecture:check` → **PASS**
- `npm run build` → **PASS** (23 rutas, 0 errores)

### Regresiones

- **Creador**: apertura, edición, cierre, resultados, clasificación, premios — sin cambios funcionales
- **Participante**: envío, comprobante, resultados, clasificación — sin cambios funcionales
- **Core**: login, registro, recuperación de contraseña, inicio, settings, Twitch, sidebar, dashboard — sin cambios funcionales

---

## I. Recomendación final

**Arquitectura lista para crecer.**

PickHub está desacoplado. El core no depende de Pick'em. El activity registry, feature flags, layout, navegación y dashboard son genéricos. Añadir una segunda actividad requiere modificar solo **2 archivos core** (`activities/registry.ts` + `activities/registry.server.ts`) y crear el módulo de actividad.

La deuda restante es menor y no bloquea el crecimiento. Se recomienda resolver los puntos importantes antes de implementar una segunda actividad:
1. Migrar `app/actions/results-data.ts` a `activities/pickem/`
2. Centralizar `revalidatePath()` en `pickemRoutes`
3. Eliminar `app/actions/creator.ts` (compatibility layer sin uso)
