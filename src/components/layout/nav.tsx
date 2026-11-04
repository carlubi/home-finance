"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  PanelLeftOpen,
  Pin,
  PinOff,
  PiggyBank,
  Package,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
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
const DOCKED_COOKIE = "sidebar_docked";

type NavigationDockState = {
  docked: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  setDocked: (docked: boolean) => void;
};

const NavigationDockContext = createContext<NavigationDockState | null>(null);

export function NavigationDockProvider({ children, initialDocked }: { children: React.ReactNode; initialDocked: boolean }) {
  const [docked, setDockedState] = useState(initialDocked);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const closeOnMobile = () => { if (mobile.matches) setOpen(false); };
    mobile.addEventListener("change", closeOnMobile);
    return () => mobile.removeEventListener("change", closeOnMobile);
  }, []);

  function setDocked(next: boolean) {
    setDockedState(next);
    setOpen(false);
    document.cookie = `${DOCKED_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const value = { docked, open, setOpen, setDocked };
  return <NavigationDockContext.Provider value={value}>{children}</NavigationDockContext.Provider>;
}

function useNavigationDock() {
  const value = useContext(NavigationDockContext);
  if (!value) throw new Error("NavigationDockProvider is missing");
  return value;
}

export function SidebarRevealButton() {
  const { docked, setOpen } = useNavigationDock();
  if (docked) return null;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="hidden md:inline-flex"
      title="Mostrar barra lateral"
      aria-label="Mostrar barra lateral"
      onClick={() => setOpen(true)}
    >
      <PanelLeftOpen className="size-4" />
    </Button>
  );
}

function SidebarLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const { href, label, icon: Icon } = item;
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
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
      {open && group.items.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const { docked, open, setOpen, setDocked } = useNavigationDock();

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

  const navigation = (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
        <Link href="/" onClick={() => setOpen(false)} className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <BrandLogo size="sm" />
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-text-tertiary"
            title={docked ? "Desacoplar barra lateral" : "Acoplar barra lateral"}
            aria-label={docked ? "Desacoplar barra lateral" : "Acoplar barra lateral"}
            onClick={() => setDocked(!docked)}
          >
            {docked ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </Button>
          {!docked && (
            <Button variant="ghost" size="icon-sm" className="text-text-tertiary" title="Cerrar barra lateral" aria-label="Cerrar barra lateral" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pt-4 pb-2">
        <SidebarLink item={homeItem} pathname={pathname} onNavigate={() => setOpen(false)} />
        {groups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            pathname={pathname}
            collapsed={collapsed.includes(group.id)}
            onToggle={() => toggle(group.id)}
            onNavigate={() => setOpen(false)}
          />
        ))}
        <div className="mt-auto">
          <SidebarLink item={settingsItem} pathname={pathname} onNavigate={() => setOpen(false)} />
        </div>
      </nav>
    </>
  );

  if (docked) {
    return <aside className="hidden w-60 shrink-0 border-r border-border-primary bg-bg-primary md:flex md:flex-col">{navigation}</aside>;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        showCloseButton={false}
        overlayClassName="bg-black/15 supports-backdrop-filter:backdrop-blur-none"
        className="hidden gap-0 bg-bg-primary p-0 md:flex data-[side=left]:w-60 data-[side=left]:sm:max-w-60"
      >
        <SheetTitle className="sr-only">Navegación principal</SheetTitle>
        {navigation}
      </SheetContent>
    </Sheet>
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
