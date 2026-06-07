# Activities Module — Architecture Boundaries

## Layer Rules

```
Core (auth, profiles, settings, layout)  →  NO imports from activities/
Activity Platform (registry, shared types)  →  imports Core only
Pick'em Module  →  imports Core + Activity Platform
Twitch Integration  →  imports Core only (NOT Pick'em)
```

## Concrete Rules

1. **Core no importa Pick'em.** Auth, perfiles, settings, layout general, y admin no deben importar de `activities/pickem/` ni `components/pickem/`.

2. **Pick'em puede importar Core.** Auth, perfiles, supabase client, Twitch utilities son dependencias legítimas.

3. **Twitch es integración global.** `lib/twitch.ts`, `lib/twitch-api.ts`, `lib/twitch-crypto.ts` no deben tener dependencias de Pick'em.

4. **Resultados, scoring, desempates y comprobantes pertenecen a Pick'em.** No mover estos conceptos a la capa general de actividades hasta que exista un segundo tipo de actividad.

5. **Desactivar creación no elimina acceso histórico.** Los flags de capacidad (`create`, `participate`, `manageExisting`, `readHistoricalData`) controlan features sin destructividad.

6. **Database Row types no son modelos de dominio.** Los tipos generados (`database.types.ts`) reflejan el esquema de Supabase; los tipos de dominio (`types/activities.ts`, `activities/pickem/types/`) son la representación de la aplicación y deben usarse en componentes y páginas.

7. **Nuevas queries deben evitar SELECT *.** Usar listas de columnas explícitas definidas en `activities/pickem/data/selects.ts`.

8. **Nuevas rutas Pick'em deben añadirse a `pickemRoutes`.** Centralizadas en `activities/pickem/routes.ts`.

## Status Mapping

| DB Status | Domain Phase | Description |
|-----------|-------------|-------------|
| `draft` | `draft` | Being created |
| `open` | `active` | Accepting participants |
| `predictions_closed` | `active` | Submissions closed |
| `completed` | `completed` | Results published |
| `archived` | `archived` | Hidden from active views |

## File Responsibilities

| Directory | Purpose |
|-----------|---------|
| `activities/pickem/actions/` | Server actions (event CRUD, players, predictions, prizes, publishing) |
| `activities/pickem/data/` | Column select constants, data access patterns |
| `activities/pickem/lib/` | Business logic, validation, capability guards |
| `activities/pickem/routes.ts` | Centralized route helpers |
| `activities/pickem/types/` | Domain types (PickemEvent, PickemSettings, etc.) |
| `app/actions/` | Mixed — some are general (auth, admin) some are pickem-specific (scoring, results, participant) |
| `app/actions/scoring.ts` | Belongs to Pick'em — to be moved in future phase |
| `app/actions/results-data.ts` | Belongs to Pick'em — to be moved in future phase |
| `app/actions/tiebreaker.ts` | Belongs to Pick'em — to be moved in future phase |
