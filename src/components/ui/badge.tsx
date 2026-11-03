import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge de Linear: pill discreta. Los estados usan el patrón
 * color/10 de fondo + color de texto + color/20 de borde.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 text-xs font-medium whitespace-nowrap transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-accent/20 bg-accent/10 text-accent",
        secondary: "border-border-primary bg-bg-tertiary text-text-primary",
        neutral: "border-border-primary bg-bg-secondary text-text-secondary",
        outline: "border-border-secondary bg-transparent text-text-secondary",
        success: "border-green/20 bg-green/10 text-green",
        info: "border-blue/20 bg-blue/10 text-blue",
        warning: "border-orange/20 bg-orange/10 text-orange",
        destructive: "border-red/20 bg-red/10 text-red",
        ghost: "border-transparent text-text-secondary [a]:hover:bg-bg-tertiary",
        link: "border-transparent text-accent underline-offset-4 [a]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type BadgeProps = useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>

function Badge({ className, variant = "default", render, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
