/**
 * Espaciado de Linear (base 8px con saltos irregulares).
 *
 * Nota de implementación: en Tailwind v4 la escala numérica de espaciado
 * también dimensiona iconos y cajas (size-4, w-6…), así que NO se
 * sobreescribe globalmente: redefinir `4` como 11px encogería todos los
 * iconos. Usa la escala por defecto de Tailwind (4px) eligiendo los pasos
 * que coinciden con Linear: 1=4px, 2=8px, 4=16px, 6=24px, 8=32px,
 * 10=40px, 12=48px, 16=64px, 20=80px; y gap-[11px] solo donde el ritmo
 * de 11px aporte (listas densas).
 */
export const spacing = {
  px: "1px",
  0: "0",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "11px",
  3.5: "14px",
  4: "11px",
  5: "13px",
  6: "16px",
  7: "18px",
  8: "24px",
  9: "28px",
  10: "32px",
  11: "36px",
  12: "40px",
  14: "48px",
  16: "64px",
  20: "80px",
} as const;
