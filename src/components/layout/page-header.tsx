import { cn } from "@/lib/utils";
import { FinancialPrivacyButton } from "@/components/layout/financial-privacy";

/**
 * Cabecera de página estándar: misma jerarquía y mismo sitio para las
 * acciones en todas las vistas (chrome predecible).
 * - eyebrow: contexto breve (mes, año…), en texto secundario.
 * - title: heading lg (24px / 510 / -0.288px).
 * - actions: siempre a la derecha, alineadas con la base del título.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  children,
  financialPrivacy = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  financialPrivacy?: boolean;
}) {
  return (
    <header className={cn("flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-medium text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>
        )}
        {children}
      </div>
      {(actions || financialPrivacy) && <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">{financialPrivacy && <FinancialPrivacyButton />}{actions}</div>}
    </header>
  );
}

/** Título de sección dentro de una página (heading sm). */
export function SectionTitle({
  children,
  action,
  id,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 id={id} className="text-sm font-medium text-text-primary">{children}</h2>
      {action}
    </div>
  );
}
