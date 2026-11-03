"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-green" />
        ),
        info: (
          <InfoIcon className="size-4 text-blue" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-orange" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-red" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-text-secondary" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--bg-secondary)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-secondary)",
          "--border-radius": "8px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !text-[13px] !tracking-[-0.078px] !shadow-lg",
          description: "!text-text-secondary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
