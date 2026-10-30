"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  FileText,
  Home,
  HousePlus,
  Menu,
  PiggyBank,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const items = [
  { href: "/", label: "Gastos personales", icon: UserRound },
  { href: "/familia", label: "Gastos unidad familiar", icon: Home },
  { href: "/global", label: "Visión global", icon: ChartPie },
  { href: "/hipoteca", label: "Hipoteca", icon: HousePlus },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/informes", label: "Informes", icon: FileText },
  { href: "/compartidos", label: "Compartidos", icon: Users },
  { href: "/ajustes", label: "Personaliza", icon: Settings },
];

const primaryItems = items.slice(0, 4);
const secondaryItems = items.slice(4, 7);
const settingsItem = items[7];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SidebarLink({ item, pathname }: { item: (typeof items)[number]; pathname: string }) {
  const { href, label, icon: Icon } = item;
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:pl-4 hover:text-accent-foreground",
        active && "bg-primary/10 pl-4 font-semibold text-primary"
      )}
    >
      <Icon
        className={cn(
          "size-4 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110",
          active && "scale-110"
        )}
      />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="hover-wiggle flex h-14 items-center border-b px-4">
        <BrandLogo className="h-10" />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 p-2">
        {primaryItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
        <div role="separator" className="mx-3 my-2 border-t border-sidebar-border" />
        {secondaryItems.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} />)}
        <div className="mt-auto pt-2">
          <div role="separator" className="mx-3 mb-2 border-t border-sidebar-border" />
          <SidebarLink item={settingsItem} pathname={pathname} />
        </div>
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileItems = primaryItems;
  const moreItems = [...secondaryItems, settingsItem];
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {mobileItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors",
              active && "font-semibold text-primary"
            )}
          >
            <span
              className={cn(
                "rounded-full px-3 py-0.5 transition-all duration-200",
                active && "-translate-y-0.5 bg-primary/12"
              )}
            >
              <Icon className="size-5" />
            </span>
            {href === "/" ? "Personal" : label.replace("Gastos unidad ", "")}
          </Link>
        );
      })}
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" className="h-auto min-h-14 flex-1 flex-col gap-0.5 rounded-none px-1 py-1.5 text-[10px]" />}>
          <span className={cn("rounded-full px-3 py-0.5", moreActive && "bg-primary/12 text-primary")}><Menu className="size-5" /></span>
          Más
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>Más opciones</SheetTitle></SheetHeader>
          <div className="grid gap-2">
            {secondaryItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors active:bg-accent", isActive(pathname, href) && "bg-primary/10 text-primary")}>
                <Icon className="size-5" />{label}
              </Link>
            ))}
            <div role="separator" className="border-t border-border" />
            <Link href={settingsItem.href} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors active:bg-accent", isActive(pathname, settingsItem.href) && "bg-primary/10 text-primary")}>
              <Settings className="size-5" />{settingsItem.label}
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
