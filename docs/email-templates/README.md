# Plantillas de correo — PickHub Auth

## Ubicación en Supabase Dashboard

```
Authentication → Emails → Email Templates
```

## Plantillas y archivos

| Supabase template | Archivo | Asunto | ¿Usa `{{ .ConfirmationURL }}`? |
|---|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirma tu cuenta de PickHub | ✅ — PKCE |
| Reset password | `reset-password.html` | Restablece tu contraseña de PickHub | ❌ — `{{ .RedirectTo }}` |
| Magic link | `magic-link.html` | Tu enlace para entrar a PickHub | ✅ — PKCE |
| Invite user | `invite-user.html` | Te invitaron a PickHub | ✅ — PKCE |
| Change email address | `change-email.html` | Confirma tu nuevo correo de PickHub | ✅ — PKCE |
| Reauthentication | `reauthentication.html` | Código de seguridad de PickHub | ❌ — `{{ .Token }}` |

## Variables disponibles en Supabase

| Variable | Descripción | Plantillas |
|---|---|---|
| `{{ .ConfirmationURL }}` | URL completa de confirmación (PKCE) | confirm-signup, magic-link, invite-user, change-email |
| `{{ .RedirectTo }}` | `redirectTo` pasado por el server action (respeta el origen real) | reset-password |
| `{{ .TokenHash }}` | Token hasheado para OTP | reset-password |
| `{{ .Token }}` | Token raw (código de un solo uso) | reauthentication |
| `{{ .SiteURL }}` | Site URL fija configurada en Supabase Dashboard | todas menos reset-password |
| `{{ .Email }}` | Correo del usuario | todas |
| `{{ .NewEmail }}` | Nuevo correo (cambio de email) | change-email |
| `{{ .Data }}` | Metadata del usuario (opcional) | todas |

## Flujo de autenticación real

### Confirmación de cuenta (`confirm-signup`)

El proyecto usa `emailRedirectTo` personalizado en `signUpWithEmail` (app/actions/auth.ts:133):
```
{origin}/login?confirmed=1&next={next}
```

`{{ .ConfirmationURL }}` apunta al endpoint de verificación de Supabase. Tras confirmar, Supabase redirige al usuario a `{origin}/login?confirmed=1`. La sesión **no** se intercambia automáticamente — el usuario debe iniciar sesión después de confirmar.

**URL generada por la plantilla:**
```
{{ .ConfirmationURL }}

→ Supabase /auth/v1/verify?token=...&type=signup&redirect_to={origin}/login?confirmed=1&next=...
```

### Recuperación de contraseña (`reset-password`)

Ruta personalizada que NO usa `{{ .ConfirmationURL }}` ni `{{ .SiteURL }}`. Usa `{{ .RedirectTo }}` para respetar el origen real del navegador que inició el flujo.

`resetPasswordForEmail()` (app/actions/auth.ts) construye el `redirectTo` con el host real de la request:

```
redirectTo = {origin}/auth/confirm?next=/update-password
```

La plantilla añade los parámetros del token:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery
```

**Resultado localhost:**
```
http://localhost:3000/auth/confirm?next=/update-password&token_hash=xxx&type=recovery
```

**Resultado producción:**
```
https://pickhubapp.com/auth/confirm?next=/update-password&token_hash=xxx&type=recovery
```

**Flujo:**
1. Usuario hace clic en el enlace del correo
2. Llega a `GET /auth/confirm?next=/update-password&token_hash=xxx&type=recovery` (el orden de params no importa)
3. `verifyOtp()` intercambia el token por una sesión de recuperación
4. Redirige a `/update-password` (las cookies de sesión se escriben en la respuesta de redirect)
5. La página detecta `getUser()` exitoso y muestra el formulario
6. `updatePassword()` → `updateUser({ password })` → `signOut()` → muestra confirmación
7. Usuario hace clic en "Ir a iniciar sesión" → `/login` sin sesión activa

`resetPasswordForEmail` (app/actions/auth.ts:170) también pasa `redirectTo: "${appUrl}/update-password"` como respaldo.

### Magic link (`magic-link`)

Flujo PKCE estándar de Supabase. `{{ .ConfirmationURL }}` contiene el enlace que pasa por el endpoint de verificación de Supabase y finalmente redirige a `SITE_URL`.

**Nota:** PickHub actualmente **no** tiene una función `signInWithOtp` en `app/actions/auth.ts`. La plantilla existe por completitud — si se habilita el magic link en el futuro, `{{ .ConfirmationURL }}` funcionará sin cambios.

### Invitación (`invite-user`)

Flujo PKCE estándar de Supabase. `{{ .ConfirmationURL }}` contiene el enlace de invitación generado por el dashboard de Supabase o `supabase.auth.admin.inviteUserByEmail()`.

### Cambio de correo (`change-email`)

Flujo PKCE estándar. `{{ .ConfirmationURL }}` contiene el enlace de confirmación. `{{ .NewEmail }}` muestra el nuevo correo en el HTML.

### Reautenticación (`reauthentication`)

NO usa enlace. Muestra `{{ .Token }}` como código de un solo uso de 6 dígitos. El usuario ingresa el código directamente en la interfaz de PickHub para operaciones sensibles (cambio de contraseña, desvinculación de cuenta).

## Configuración externa requerida

### Supabase Auth Settings

| Configuración | Valor |
|---|---|
| Site URL | `https://pickhubapp.com` |
| Redirect URLs | `https://pickhubapp.com/**` |
| Redirect URLs (dev) | `http://localhost:3000/**` |
| Sender name | PickHub |
| Sender email | noreply@pickhubapp.com |

### Resend

- Dominio verificado: `pickhubapp.com`
- SPF, DKIM, DMARC configurados
- From: `PickHub <noreply@pickhubapp.com>`

## Proceso de actualización

1. Editar el archivo HTML en `docs/email-templates/`
2. Verificar sintaxis HTML y variables de Supabase
3. Copiar el contenido al template correspondiente en Supabase Dashboard
4. Guardar
5. Usar "Send test email" en Supabase para cada plantilla
6. Verificar entrega en Resend Logs
7. Probar en Gmail, Outlook y Apple Mail

## Sincronización local con `supabase/config.toml`

Los archivos en `docs/email-templates/` se pueden referenciar desde `supabase/config.toml` para que el entorno local de Supabase (`supabase start`) use las mismas plantillas:

```toml
[auth.email.templates.confirm_signup]
subject = "Confirma tu cuenta de PickHub"
content_path = "../docs/email-templates/confirm-signup.html"

[auth.email.templates.recovery]
subject = "Restablece tu contraseña de PickHub"
content_path = "../docs/email-templates/reset-password.html"

[auth.email.templates.magic_link]
subject = "Tu enlace para entrar a PickHub"
content_path = "../docs/email-templates/magic-link.html"

[auth.email.templates.invite]
subject = "Te invitaron a PickHub"
content_path = "../docs/email-templates/invite-user.html"

[auth.email.templates.change_email]
subject = "Confirma tu nuevo correo de PickHub"
content_path = "../docs/email-templates/change-email.html"

[auth.email.templates.reauthentication]
subject = "Código de seguridad de PickHub"
content_path = "../docs/email-templates/reauthentication.html"
```

> **Importante:** `content_path` en `config.toml` **solo** afecta al entorno local. No modifica el proyecto remoto de Supabase. Las plantillas del proyecto de producción deben copiarse manualmente en el Dashboard.

## Notificaciones de seguridad

Supabase también provee notificaciones de seguridad sin plantilla editable (texto plano). Texto sugerido:

### Contraseña cambiada
> La contraseña de tu cuenta de PickHub fue actualizada. Si no realizaste este cambio, protege tu cuenta inmediatamente.

### Correo cambiado
> El correo asociado a tu cuenta de PickHub fue actualizado.

### Identidad vinculada
> Se vinculó una nueva forma de inicio de sesión a tu cuenta de PickHub.

### Identidad desvinculada
> Se eliminó una forma de inicio de sesión de tu cuenta de PickHub.

## Pruebas recomendadas

- [ ] Registro nuevo → Gmail desktop
- [ ] Registro nuevo → Gmail móvil
- [ ] Registro nuevo → Outlook
- [ ] Recuperación de contraseña → todos los clientes
- [ ] Magic link → todos los clientes
- [ ] Cambio de email → todos los clientes
- [ ] Modo oscuro en todos los clientes
- [ ] El botón es funcional (no redirige a localhost)
- [ ] Las variables se sustituyen correctamente
- [ ] Resend registra entrega exitosa
- [ ] Supabase registra envío en Logs
