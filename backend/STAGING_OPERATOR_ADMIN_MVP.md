# Operator Admin MVP — validación reproducible en staging

Este procedimiento es exclusivo de staging. No despliega en producción, no activa pagos,
no ejecuta reembolsos y no elimina pedidos ni datos.

## 0. Estado de seguridad inicial

Antes de cualquier despliegue, guardar una captura de la configuración del servicio de
staging y confirmar exactamente:

```text
APP_ENV=staging
PAYPAL_MODE=sandbox
OPERATOR_WRITES_ENABLED=false
OPERATOR_ORDER_CREATE_ENABLED=false
OPERATOR_EMAIL_SEND_ENABLED=false
AW26_PRODUCT_WRITE_ENABLED=false
AW26_PUBLISH_ENABLED=false
PRINTFUL_MOCKUP_GENERATION_ENABLED=false
```

No continuar si el host Woo no es exactamente `https://pruebasv2.lockcityclothes.com`,
si `APP_ENV` no es `staging` o si PayPal no está en `sandbox`.

## 1. Validación local del bridge

Desde la raíz del repositorio:

```powershell
php -l wordpress/lock-city-operator-bridge/lock-city-operator-bridge.php
phpcs --standard=phpcs.xml.dist
```

Resultado esperado en ambos casos: salida limpia y código 0.

Controles que deben conservarse:

- las rutas WordPress requieren `current_user_can( 'manage_woocommerce' )`;
- el request de pedido solo admite `operation_id`, `status`, `line_items`, `billing`,
  `shipping` y `shipping_method`;
- cada línea solo admite `product_id`, `variation_id` y `quantity`;
- no existen entradas para `set_paid`, `transaction_id`, precio, total, refund o delete;
- Woo resuelve producto, variación, stock, precio, envío, impuestos y total;
- el email solo admite `operation_id` y un ID de plantilla allowlisted;
- destinatario, asunto y HTML los resuelve la plantilla Woo del pedido;
- `add_option()` reserva atómicamente cada `operation_id` mediante el índice único
  `wp_options.option_name`; un fallo después de reservar queda `OPERATION_UNCERTAIN`
  y no puede crear una segunda entidad.

## 2. Migración 004

La migración es aditiva y no elimina tablas. Aplicarla una sola vez contra la base de
datos del Operator de staging:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/supabase/migrations/004_operator_admin_mvp.sql
```

Si staging usa Supabase SQL Editor, pegar el contenido completo de
`backend/supabase/migrations/004_operator_admin_mvp.sql`, seleccionar únicamente el
proyecto de staging y ejecutar una vez.

Verificación read-only:

```sql
select to_regclass('public.operator_sessions') as sessions,
       to_regclass('public.operator_login_attempts') as login_attempts,
       to_regclass('public.operator_audit_events') as audit_events;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'operator_sessions', 'operator_login_attempts', 'operator_audit_events'
  )
order by c.relname;

select has_table_privilege('anon', 'public.operator_audit_events', 'select')
       as anon_can_read,
       has_table_privilege('authenticated', 'public.operator_audit_events', 'select')
       as authenticated_can_read;
```

Esperado: tres tablas presentes, RLS `true`, y ambas lecturas públicas `false`.

## 3. Variables de staging

Configurar solo en el servicio Operator de staging. Los valores secretos no deben
copiarse en tickets, logs ni este repositorio.

| Variable | Requisito |
|---|---|
| `APP_ENV` | `staging` |
| `DATABASE_URL` | conexión secreta de la DB de staging |
| `WC_REST_URL` | `https://pruebasv2.lockcityclothes.com` |
| `WC_REST_CONSUMER_KEY` | secreto; clave de un usuario staging con `manage_woocommerce` |
| `WC_REST_CONSUMER_SECRET` | secreto |
| `PAYPAL_MODE` | `sandbox` |
| `OPERATOR_API_TOKEN` | secreto existente, mínimo 32 caracteres |
| `OPERATOR_ADMIN_EMAIL` | login único del operador de staging |
| `OPERATOR_ADMIN_PASSWORD_HASH` | bcrypt; nunca contraseña en claro |
| `OPERATOR_SESSION_SECRET` | secreto aleatorio, mínimo 32 bytes |
| `OPERATOR_SESSION_TTL_SECONDS` | `28800`; usar temporalmente `300` solo en prueba de expiración |
| `OPERATOR_ALLOWED_ORIGIN` | origen HTTPS exacto del Admin de staging, sin path |
| `OPERATOR_WRITES_ENABLED` | `false` |
| `OPERATOR_ORDER_CREATE_ENABLED` | `false` inicialmente y al final |
| `OPERATOR_EMAIL_SEND_ENABLED` | `false` inicialmente y al final |
| `AW26_PRODUCT_WRITE_ENABLED` | `false` |
| `AW26_PUBLISH_ENABLED` | `false` |
| `PRINTFUL_MOCKUP_GENERATION_ENABLED` | `false` |
| `PORT` | valor administrado por el proveedor, si aplica |

No se necesita un token Printful para estas pruebas.

## 4. Instalar el bridge en WordPress staging

Crear un ZIP que contenga la carpeta `lock-city-operator-bridge` y únicamente sus
archivos. Instalarlo en `pruebasv2.lockcityclothes.com`, no en producción.

Con WP-CLI en staging:

```bash
wp plugin install /ruta/lock-city-operator-bridge.zip --force --activate
wp plugin get lock-city-operator-bridge --fields=name,status,version
wp user has-cap <usuario-asociado-a-la-clave-REST> manage_woocommerce
```

Esperado: plugin activo, versión `0.1.0`, capacidad presente. Una llamada autenticada
a `wc/v3/lock-city/operator/email-templates` debe devolver 200. Un usuario sin esa
capacidad debe recibir 401/403.

## 5. Preparar el cliente de validación

En una terminal local segura:

```powershell
$env:OPERATOR_STAGING_URL='https://<operator-staging-host>'
$env:OPERATOR_ALLOWED_ORIGIN='https://<admin-staging-origin>'
$env:OPERATOR_ADMIN_EMAIL='<operator-staging-email>'
```

La contraseña se solicita sin eco. El script no imprime cookies, credenciales,
direcciones, emails ni teléfonos.

Primero confirmar cierre total:

```powershell
python backend/staging_operator_admin_validation.py safe-state
```

## 6. Pruebas de autenticación

Ejecutar secuencialmente:

```powershell
python backend/staging_operator_admin_validation.py auth
```

Esto valida login incorrecto, login correcto, cookie de sesión, `/auth/me`, Origin
incorrecto, CSRF ausente, logout, sesión revocada y eventos de auditoría de login.

Para expiración, cambiar temporalmente en staging:

```text
OPERATOR_SESSION_TTL_SECONDS=300
```

Redeploy del Operator staging y ejecutar:

```powershell
python backend/staging_operator_admin_validation.py expiry --ttl-seconds 300
```

Restaurar inmediatamente `OPERATOR_SESSION_TTL_SECONDS=28800` y redeploy.

Probar rate limiting al final de la tanda de auth para no bloquear otras pruebas:

```powershell
python backend/staging_operator_admin_validation.py rate-limit
```

Esperado: cinco `401` y el sexto intento `429`. Esperar al siguiente minuto antes de
volver a iniciar sesión.

## 7. Descubrir los IDs reales de email

Con `OPERATOR_EMAIL_SEND_ENABLED=false`:

```powershell
python backend/staging_operator_admin_validation.py templates
```

La respuesta viene de `WC()->mailer()->get_emails()` en el WordPress staging activo.
Registrar los tres IDs devueltos y su `enabled`. No usar nombres inferidos, etiquetas
visuales ni IDs de otro entorno. Si no devuelve exactamente tres plantillas allowlisted,
detener la prueba de email.

## 8. Preflight de pedido

Usar un producto y variación exclusivos de staging. El candidato histórico es producto
`3834`, variación `3835`, pero se debe confirmar en vivo antes de crear el request:

1. producto publicado y variación hija exacta;
2. stock suficiente para cantidad 1;
3. precio efectivo leído de Woo, nunca enviado por el cliente;
4. dirección de staging válida y sin datos reales;
5. ID exacto de una tarifa devuelta por el preflight/quote de staging.

Guardar el JSON en una ubicación temporal segura fuera del repositorio:

```json
{
  "status": "on-hold",
  "line_items": [
    {"product_id": 3834, "variation_id": 3835, "quantity": 1}
  ],
  "billing": {
    "first_name": "<TEST>", "last_name": "<TEST>", "company": "",
    "address_1": "<STAGING TEST ADDRESS>", "address_2": "",
    "city": "<TEST>", "state": "<VALID CODE>", "postcode": "<TEST>",
    "country": "<ISO2>", "email": "<STAGING INBOX>", "phone": "<TEST>"
  },
  "shipping": {
    "first_name": "<TEST>", "last_name": "<TEST>", "company": "",
    "address_1": "<STAGING TEST ADDRESS>", "address_2": "",
    "city": "<TEST>", "state": "<VALID CODE>", "postcode": "<TEST>",
    "country": "<ISO2>"
  },
  "shipping_method": "<EXACT STAGING RATE ID>",
  "reason": "Operator Admin MVP staging validation",
  "idempotency_key": "operator-admin-staging-order-004-unique"
}
```

No agregar precio, subtotal, impuestos, total, pago o transaction ID.

## 9. Una creación idempotente

1. Cambiar solo `OPERATOR_ORDER_CREATE_ENABLED=true` en el Operator staging.
2. Redeploy de staging y confirmar que email sigue `false` y los demás flags siguen
   cerrados.
3. Ejecutar exactamente una vez el comando siguiente; el script realiza la creación,
   el replay idéntico, el conflicto controlado y el read-after-write:

```powershell
python backend/staging_operator_admin_validation.py order --request <ruta-segura/order.json>
```

El replay exacto debe devolver el mismo `order_id` con `replayed=true` y no crear otro
pedido. El mismo idempotency key con payload distinto debe devolver 409. El pedido debe
estar `pending` u `on-hold`, sin método/transacción de pago y sin captura.

4. Inmediatamente cambiar `OPERATOR_ORDER_CREATE_ENABLED=false`, redeploy staging y
   ejecutar `safe-state`. Si el primer request termina en estado incierto, no reintentar
   con otra clave: investigar el `operation_id` y Woo antes de continuar.

## 10. Un email transaccional allowlisted

Crear un JSON temporal usando uno de los IDs devueltos por el paso 7:

```json
{
  "template": "<EXACT LIVE TEMPLATE ID>",
  "reason": "Operator Admin MVP staging email validation",
  "idempotency_key": "operator-admin-staging-email-004-unique"
}
```

1. Confirmar que el pedido tiene un inbox de staging y que el destinatario del request
   no existe: siempre se toma de `order->get_billing_email()`.
2. Cambiar solo `OPERATOR_EMAIL_SEND_ENABLED=true` y redeploy staging.
3. Ejecutar:

```powershell
python backend/staging_operator_admin_validation.py email `
  --order-id <STAGING_ORDER_ID> --request <ruta-segura/email.json>
```

El script verifica plantilla instalada/habilitada, envío único, replay sin segundo envío
y audit event `verified`.

4. Cambiar inmediatamente `OPERATOR_EMAIL_SEND_ENABLED=false`, redeploy staging y
   ejecutar `safe-state`.

## 11. Auditoría sanitizada y cierre

Consultar sin seleccionar payloads de direcciones o secretos:

```sql
select operation_id, actor_id, action, entity_type, entity_id, state,
       http_status, error_code, created_at, updated_at
from public.operator_audit_events
where created_at >= now() - interval '2 hours'
order by created_at;
```

Esperado como mínimo: eventos `auth.login`, `auth.logout`, `order.create` y
`order.email`; las operaciones comerciales deben terminar `verified`. Confirmar que no
hay email, teléfono, dirección, cookies, tokens, claves Woo ni credenciales en los logs.

Última comprobación obligatoria:

```powershell
python backend/staging_operator_admin_validation.py safe-state
```

Debe mostrar `false` para `writes_enabled`, `order_create_enabled`,
`email_send_enabled`, `aw26_product_writes_enabled` y `aw26_publish_enabled`.

## Criterio de parada

Detener sin reintentar mutaciones si aparece un timeout, 5xx, `OPERATION_UNCERTAIN`,
un segundo order ID, una plantilla inesperada, un total no calculado por Woo, una
transacción de pago o cualquier host distinto de staging.
