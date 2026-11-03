import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Botón del sistema Linear.
 * - Hover: solo cambia color/fondo (sin translate/scale).
 * - Foco: anillo de acento con offset sobre el fondo de página.
 * - React 19 recibe `ref` como prop, así que no hace falta forwardRef.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none transition-fast outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red aria-invalid:ring-2 aria-invalid:ring-red/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Acción principal: acento. Una por vista. */
        default:
          "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent",
        primary:
          "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent",
        accent:
          "bg-accent text-accent-foreground shadow-sm hover:bg-accent-hover active:bg-accent",
        /** Acción neutra con borde: la más habitual en barras de herramientas. */
        outline:
          "border-border-primary bg-bg-secondary text-text-primary linear-shadow-sm hover:border-border-secondary hover:bg-bg-tertiary active:bg-bg-quaternary aria-expanded:bg-bg-tertiary",
        secondary:
          "bg-bg-tertiary text-text-primary hover:bg-bg-quaternary active:bg-bg-quaternary aria-expanded:bg-bg-quaternary",
        ghost:
          "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary active:bg-bg-quaternary aria-expanded:bg-bg-tertiary aria-expanded:text-text-primary",
        destructive:
          "bg-red text-white hover:bg-red/90 active:bg-red focus-visible:ring-red",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[13px] tracking-[-0.078px] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-8 px-3",
        lg: "h-10 px-4 text-[15px] tracking-[-0.09px]",
        icon: "size-8",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>

function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
