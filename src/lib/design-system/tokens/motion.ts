/**
 * Movimiento de Linear. Runtime: utilidades transition-fast (150ms) y
 * transition-base (200ms) en globals.css. Solo animan color, opacidad y
 * sombra: nunca `transition: all` ni movimiento en hover.
 */
export const duration = {
  fast: "100ms",
  base: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

export const easing = {
  out: "cubic-bezier(0, 0, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
