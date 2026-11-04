# Home Brain

App web para organizar las finanzas personales y familiares, los gastos compartidos y los menús de casa.

- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui + Recharts
- **Backend**: Supabase (Postgres + RLS, Auth, Storage, Edge Functions)
- **IA**: API de OpenAI (`gpt-4.1`, salidas estructuradas) desde Edge Functions

## Funcionalidades

- Onboarding con perfil financiero (objetivo, hábitos, ingresos/gastos fijos, inversiones)
- Registro de gastos e ingresos con categorías, adjuntos y presupuestos por categoría
- Dashboard mensual (ahorro, % ahorro, comparativa) y visión global anual con gráficos exportables a PNG
- Grupos de gastos compartidos: invitaciones por email, reparto automático, cálculo y simplificación de deudas, pagos totales/parciales con notificaciones
- Importación de extractos (PDF, CSV, Excel, imagen) con extracción por IA y vista previa editable — nada se guarda sin confirmar
- Lectura de tickets con IA en gastos compartidos
- Informe financiero mensual generado por IA (descargable en PDF y Word)
- Exportación de movimientos y resúmenes a CSV/Excel

## Instalación en el escritorio

Abre la app publicada por HTTPS en Chrome, Edge o Safari en Mac y pulsa
**Instalar app** en la parte superior. Si el navegador ofrece instalación directa,
confírmala. En caso contrario, el botón muestra cómo añadirla desde el menú del
navegador. La app instalada se abre en su propia ventana y usa la misma cuenta y
los mismos datos que la web; requiere conexión para consultar y guardar datos.

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests de lógica financiera (Vitest)
npm run build      # build de producción
```

Variables en `.env.local` (ya configuradas para el proyecto):

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
SUPABASE_SECRET_KEY=…            # solo servidor (invitaciones, notificaciones)
NEXT_PUBLIC_SITE_URL=…           # URL pública para enlaces de auth/invitación
```

## Despliegue del backend (pendiente de credenciales)

Requiere iniciar sesión en el CLI de Supabase una vez:

```bash

# 1. Aplicar el esquema (tablas, RLS, vistas, buckets, seeds)
npx supabase db push

# 2. Clave de la API de OpenAI para las funciones de IA
npx supabase secrets set OPEN_AI_API_KEY=sk-proj-…

# 3. Desplegar las Edge Functions
npx supabase functions deploy import-document
npx supabase functions deploy parse-receipt
npx supabase functions deploy monthly-report
```

## Estructura

```
supabase/migrations/   esquema completo: tablas, RLS, vistas, storage, seeds
supabase/functions/    import-document · parse-receipt · monthly-report (Deno + OpenAI)
src/app/(auth)/        login, registro, recuperación
src/app/onboarding/    wizard inicial
src/app/(app)/         dashboard, visión global, compartidos, importar, informes, ajustes
src/lib/finance.ts     lógica financiera pura (reparto, simplificación de deudas) + tests
```

## Seguridad

- RLS en todas las tablas: los datos personales solo son visibles por su dueño; los invitados de un grupo solo ven las tablas de gastos compartidos de su grupo.
- Buckets de Storage privados con policies por carpeta (`documents/{user_id}/…`, `receipts/{group_id}/…`).
- La IA nunca escribe en las tablas finales: todo pasa por staging + confirmación del usuario.
- Confirmación explícita antes de cualquier borrado.

# StockAlert en la despensa

La ruta `/stockalert` integra el inventario de caducidades en la sesión de esta app.
Antes de usarla, aplica la migración `supabase/migrations/20261103222158_stockalert_products.sql`
al proyecto Supabase de home-finance. Para analizar fotos, configura `OPENAI_API_KEY`
como secreto del servidor de Next.js; las altas manuales no necesitan esa clave.
Los productos de la instalación original de StockAlert viven en otro proyecto
Supabase y no se migran automáticamente.

### Avisos de caducidad

Home Brain comprueba la Despensa cada día a las 07:00 UTC mediante el cron de
Vercel. Para cada producto activo avisa a su propietario cuando quedan 10 días,
3 días y el día de caducidad. El aviso aparece en la campana de la app y se
envía por correo. No se envía a otros miembros de la unidad familiar.

Configura estas variables **solo en el servidor** del proyecto de Vercel:

- `CRON_SECRET`: cadena aleatoria larga para autorizar la tarea programada.
- `RESEND_API_KEY`: clave de Resend con permiso para enviar correos.
- `RESEND_FROM_EMAIL`: remitente de un dominio verificado en Resend, por ejemplo
  `Home Brain <avisos@tudominio.es>`.

El cron se activa con el despliegue de producción. Los avisos por correo no se
envían hasta que Resend y estas variables estén configurados. Para comprobar
una ejecución sin esperar al día siguiente, llama a
`GET /api/cron/stockalert-expiry` con `Authorization: Bearer <CRON_SECRET>`.
