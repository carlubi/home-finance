"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-fast outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary aria-invalid:ring-2 aria-invalid:ring-red/30 data-[size=default]:h-[18px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-checked:bg-accent data-unchecked:bg-bg-quaternary data-unchecked:border-border-secondary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-150 ease-out group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-2.5 group-data-[size=default]/switch:data-checked:translate-x-[15px] group-data-[size=sm]/switch:data-checked:translate-x-[11px] data-unchecked:translate-x-px dark:data-unchecked:bg-text-secondary motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
