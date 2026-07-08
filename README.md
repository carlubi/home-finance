# Mis Finanzas

App web (responsive móvil/escritorio) de finanzas personales y gastos compartidos con análisis asistido por IA.

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

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests de lógica financiera (Vitest)
npm run build      # build de producción
```

Variables en `.env.local` (ya configuradas para el proyecto `dsnvugbgpmzhwpivydir`):

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
SUPABASE_SECRET_KEY=…            # solo servidor (invitaciones, notificaciones)
NEXT_PUBLIC_SITE_URL=…           # URL pública para enlaces de invitación (opcional en local)
```

## Despliegue del backend (pendiente de credenciales)

Requiere iniciar sesión en el CLI de Supabase una vez:

```bash
npx supabase login
npx supabase link --project-ref dsnvugbgpmzhwpivydir

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
