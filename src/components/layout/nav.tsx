"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  FileText,
  Home,
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
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/informes", label: "Informes", icon: FileText },
  { href: "/compartidos", label: "Compartidos", icon: Users },
  { href: "/ajustes", label: "Personaliza", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="hover-wiggle flex h-14 items-center border-b px-4">
        <BrandLogo className="h-10" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
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
        })}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileItems = items.filter((item) => ["/", "/familia", "/global", "/presupuestos"].includes(item.href));
  const moreItems = items.filter((item) => ["/informes", "/compartidos", "/ajustes"].includes(item.href));
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
            {href === "/" ? "Personal" : href === "/presupuestos" ? "Presup." : label.replace("Gastos unidad ", "")}
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
            {moreItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors active:bg-accent", isActive(pathname, href) && "bg-primary/10 text-primary")}>
                <Icon className="size-5" />{label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
