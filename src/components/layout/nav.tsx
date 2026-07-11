"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  FileText,
  Home,
  Import,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";

const items = [
  { href: "/", label: "Resumen", icon: Home },
  { href: "/global", label: "Visión global", icon: ChartPie },
  { href: "/compartidos", label: "Compartidos", icon: Users },
  { href: "/importar", label: "Importar", icon: Import },
  { href: "/informes", label: "Informes", icon: FileText },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
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
  const mobileItems = items.slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur md:hidden">
      {mobileItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors",
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
