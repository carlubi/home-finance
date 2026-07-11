"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  withText = true,
}: {
  className?: string;
  withText?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/icon.png?v=2"
        alt="Logo de Mis Finanzas"
        width={40}
        height={40}
        priority
        className="size-10 shrink-0 rounded-xl object-contain"
      />
      {withText && (
        <span className="brand-gradient whitespace-nowrap text-lg leading-none font-bold">
          Mis Finanzas
        </span>
      )}
    </span>
  );
}
