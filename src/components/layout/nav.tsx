"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartPie,
  ChevronRight,
  FileText,
  HousePlus,
  LayoutDashboard,
  Menu,
  PiggyBank,
  Package,
  Receipt,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = { href: string; label: string; icon: LucideIcon; mobileLabel?: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Arquitectura de navegación (principios de Linear):
 * - Lo transversal arriba (Inicio), luego los ámbitos de trabajo como grupos
 *   con etiqueta pequeña: lo personal, lo de la familia y lo compartido con
 *   otras personas. Dentro de cada grupo, de más a menos frecuente.
 * - Etiquetas en lenguaje llano y cortas: el grupo ya da el contexto
 *   («Familia › Gastos»), igual que «Equipo › Issues» en Linear.
 * - Configuración, siempre abajo y en el mismo sitio.
 */
const homeItem: NavItem = { href: "/", label: "Inicio", icon: LayoutDashboard };

const groups: NavGroup[] = [
  {
    id: "personal",
    label: "Personal",
    items: [
      { href: "/gastos-personales", label: "Gastos", icon: Wallet, mobileLabel: "Personal" },
      { href: "/presupuestos", label: "Presupuestos y objetivos", icon: PiggyBank },
      { href: "/informes", label: "Informes", icon: FileText },
    ],
  },
  {
    id: "familia",
    label: "Familia",
    items: [
      { href: "/familia", label: "Gastos", icon: Receipt, mobileLabel: "Familia" },
      { href: "/menus", label: "Menús", icon: CalendarDays },
      { href: "/stockalert", label: "Despensa", icon: Package },
      { href: "/hipoteca", label: "Hipoteca", icon: HousePlus },
      { href: "/global", label: "Visión global", icon: ChartPie },
    ],
  },
  {
    id: "compartidos",
    label: "Con otras personas",
    items: [{ href: "/compartidos", label: "Gastos compartidos", icon: Users }],
  },
];

const settingsItem: NavItem = { href: "/ajustes", label: "Configuración", icon: Settings };

/** Rutas fuera del menú que también merecen título en la cabecera. */
const extraSections = [
  { href: "/importar", label: "Importar movimientos", group: "Personal" },
  { href: "/perfil", label: "Perfil", group: null },
  { href: "/design-system", label: "Design system", group: null },
];

const allEntries = [
  { ...homeItem, group: null as string | null },
  ...groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label as string | null }))),
  { ...settingsItem, group: null as string | null },
  ...extraSections,
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const COLLAPSED_KEY = "nav-collapsed-groups";

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, label, icon: Icon } = item;
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium tracking-[-0.078px] text-text-secondary transition-fast outline-none hover:bg-bg-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent",
        active && "bg-bg-tertiary text-text-primary dark:bg-bg-quaternary"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 text-text-tertiary transition-fast group-hover:text-text-secondary",
          active && "text-accent group-hover:text-accent"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarGroup({
  group,
  pathname,
  collapsed,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const containsActive = group.items.some((item) => isActive(pathname, item.href));
  const open = !collapsed || containsActive;
  return (
    <div className="grid gap-px">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-text-tertiary transition-fast outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-accent"
      >
        {group.label}
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3 opacity-0 transition-[transform,opacity] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
            open && "rotate-90"
          )}
        />
      </button>
      {open && group.items.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada solo en el cliente
      if (Array.isArray(stored)) setCollapsed(stored.filter((value) => typeof value === "string"));
    } catch {
      // Preferencia corrupta: se ignora y se muestran todos los grupos.
    }
  }, []);

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border-primary bg-bg-primary md:flex md:flex-col">
      <div className="flex h-12 items-center px-4">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <BrandLogo size="sm" />
        </Link>
      </div>
      <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2">
        <SidebarLink item={homeItem} pathname={pathname} />
        {groups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            pathname={pathname}
            collapsed={collapsed.includes(group.id)}
            onToggle={() => toggle(group.id)}
          />
        ))}
        <div className="mt-auto">
          <SidebarLink item={settingsItem} pathname={pathname} />
        </div>
      </nav>
    </aside>
  );
}

/** Ruta de la sección actual en la cabecera: «Grupo › Página». */
export function CurrentSection() {
  const pathname = usePathname();
  const match =
    allEntries
      .filter((entry) => isActive(pathname, entry.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
  if (!match) return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium tracking-[-0.078px]">
      {match.group && (
        <>
          <span className="hidden text-text-tertiary sm:inline">{match.group}</span>
          <ChevronRight aria-hidden className="hidden size-3 text-text-tertiary sm:inline" />
        </>
      )}
      <span className="truncate text-text-primary">{match.label}</span>
    </span>
  );
}

/** Barra inferior móvil: lo más frecuente a un toque; el resto, en «Más». */
const mobileItems: NavItem[] = [
  homeItem,
  groups[0].items[0],
  groups[1].items[0],
  groups[1].items[1],
];

export function BottomNav() {
  const pathname = usePathname();
  const moreActive =
    !mobileItems.some((item) => isActive(pathname, item.href)) &&
    [...groups.flatMap((group) => group.items), settingsItem].some((item) => isActive(pathname, item.href));

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-primary bg-bg-primary/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {mobileItems.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-2xs font-medium text-text-tertiary transition-fast outline-none focus-visible:bg-bg-tertiary",
              active && "text-text-primary"
            )}
          >
            <Icon className={cn("size-5", active && "text-accent")} />
            {item.mobileLabel ?? item.label}
          </Link>
        );
      })}
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              className={cn(
                "h-auto min-h-14 flex-1 flex-col gap-1 rounded-none px-1 py-1.5 text-2xs text-text-tertiary hover:bg-transparent",
                moreActive && "text-text-primary"
              )}
            />
          }
        >
          <Menu className={cn("size-5", moreActive && "text-accent")} />
          Más
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto rounded-t-lg px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-2 pb-1"><SheetTitle>Ir a</SheetTitle></SheetHeader>
          <div className="grid gap-4">
            {groups.map((group) => (
              <div key={group.id} className="grid gap-px">
                <p className="px-3 pb-1 text-xs font-medium text-text-tertiary">{group.label}</p>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SheetClose
                      key={item.href}
                      nativeButton={false}
                      render={
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-text-secondary transition-fast active:bg-bg-tertiary",
                            active && "bg-bg-tertiary text-text-primary"
                          )}
                        />
                      }
                    >
                      <Icon className={cn("size-4 text-text-tertiary", active && "text-accent")} />
                      {item.label}
                    </SheetClose>
                  );
                })}
              </div>
            ))}
            <div className="grid gap-px border-t border-border-primary pt-3">
              <SheetClose
                nativeButton={false}
                render={
                  <Link
                    href={settingsItem.href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-text-secondary transition-fast active:bg-bg-tertiary",
                      isActive(pathname, settingsItem.href) && "bg-bg-tertiary text-text-primary"
                    )}
                  />
                }
              >
                <Settings className="size-4 text-text-tertiary" />
                {settingsItem.label}
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
