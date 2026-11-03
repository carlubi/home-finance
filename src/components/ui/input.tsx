import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Campo de texto de Linear. Capa 3 (bg-tertiary) para distinguirse dentro
 * de cards y diálogos. 16px en móvil para evitar el zoom de iOS.
 */
const inputClassName =
  "w-full min-w-0 rounded-md border border-border-secondary bg-bg-tertiary px-2.5 text-base text-text-primary transition-fast outline-none placeholder:text-text-tertiary focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red aria-invalid:ring-1 aria-invalid:ring-red/40 md:text-sm"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        inputClassName,
        "h-11 py-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary md:h-8",
        className
      )}
      {...props}
    />
  )
}

export { Input, inputClassName }
