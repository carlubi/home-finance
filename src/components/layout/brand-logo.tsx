"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { box: "size-5", text: "text-[13px] tracking-[-0.078px]" },
  md: { box: "size-7", text: "text-sm" },
  lg: { box: "size-10", text: "text-lg" },
} as const;

/** Marca «Prisma»: un tejado sólido y su reflejo. */
function PrismMark({ fill }: { fill: string }) {
  return (
    <>
      <path d="M256 140 370 246H142Z" fill={fill} stroke={fill} strokeWidth="22" strokeLinejoin="round" />
      <g opacity=".38">
        <path d="M142 272h228L256 378Z" fill={fill} stroke={fill} strokeWidth="22" strokeLinejoin="round" />
      </g>
    </>
  );
}

/**
 * Icono de la app en SVG (nítido a cualquier tamaño). Se adapta al tema:
 * en oscuro, el icono principal (casi negro con brillo lila); en claro, la
 * variante lila. Mismas fuentes que public/brand/icon-*.svg.
 */
export function BrandMark({
  className,
  title,
  variant = "auto",
}: {
  className?: string;
  title?: string;
  /** auto: según el tema · dark: siempre el icono oscuro (el de la app instalada) */
  variant?: "auto" | "dark";
}) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 512 512" className={cn("absolute inset-0 size-full dark:hidden", variant === "dark" && "hidden")}>
        <defs>
          <linearGradient id={`${id}lg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8f6ef2" />
            <stop offset="1" stopColor="#6538cc" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="116" fill={`url(#${id}lg)`} />
        <PrismMark fill="#fff" />
      </svg>
      <svg viewBox="0 0 512 512" className={cn("absolute inset-0 hidden size-full dark:block", variant === "dark" && "block")}>
        <defs>
          <radialGradient id={`${id}glow`} cx=".5" cy="0" r=".9">
            <stop offset="0" stopColor="#7545d7" stopOpacity=".55" />
            <stop offset=".6" stopColor="#7545d7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}mg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#d9cffd" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="116" fill="#0d0d10" />
        <rect width="512" height="512" rx="116" fill={`url(#${id}glow)`} />
        <rect x="4" y="4" width="504" height="504" rx="112" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="8" />
        <PrismMark fill={`url(#${id}mg)`} />
      </svg>
    </span>
  );
}

/** Logotipo: icono + nombre en texto primario. */
export function BrandLogo({
  className,
  withText = true,
  size = "md",
}: {
  className?: string;
  withText?: boolean;
  size?: keyof typeof sizes;
}) {
  const s = sizes[size];
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={s.box} title={withText ? undefined : "Home Brain"} />
      {withText && (
        <span className={cn("whitespace-nowrap font-semibold text-text-primary", s.text)}>
          Home Brain
        </span>
      )}
    </span>
  );
}
