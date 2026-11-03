/** Tokens tipográficos de Linear. Runtime: escala --text-* en globals.css. */
export const fontFamily = {
  sans: '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

export const fontFeatureSettings = '"cv01", "ss03"';

export const fontWeight = {
  regular: 400,
  medium: 510,
  semibold: 538,
} as const;

type TypeStyle = {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: number;
  /** Clase de Tailwind que produce este estilo con la configuración actual. */
  className: string;
};

export const typeScale = {
  displayXl: { fontSize: "64px", lineHeight: "72px", letterSpacing: "-1.408px", fontWeight: 538, className: "text-6xl font-semibold" },
  displayLg: { fontSize: "48px", lineHeight: "56px", letterSpacing: "-1.056px", fontWeight: 538, className: "text-5xl font-semibold" },
  displayMd: { fontSize: "36px", lineHeight: "44px", letterSpacing: "-0.792px", fontWeight: 538, className: "text-4xl font-semibold" },
  headingXl: { fontSize: "30px", lineHeight: "38px", letterSpacing: "-0.66px", fontWeight: 538, className: "text-3xl font-semibold" },
  headingLg: { fontSize: "24px", lineHeight: "32px", letterSpacing: "-0.288px", fontWeight: 510, className: "text-2xl font-medium" },
  headingMd: { fontSize: "18px", lineHeight: "24px", letterSpacing: "-0.144px", fontWeight: 510, className: "text-lg font-medium" },
  headingSm: { fontSize: "16px", lineHeight: "24px", letterSpacing: "-0.096px", fontWeight: 510, className: "text-base font-medium" },
  bodyLg: { fontSize: "16px", lineHeight: "24px", letterSpacing: "-0.096px", fontWeight: 400, className: "text-base" },
  bodyBase: { fontSize: "14px", lineHeight: "20px", letterSpacing: "-0.084px", fontWeight: 400, className: "text-sm" },
  buttonMd: { fontSize: "14px", lineHeight: "20px", letterSpacing: "-0.084px", fontWeight: 510, className: "text-sm font-medium" },
  buttonSm: { fontSize: "13px", lineHeight: "18px", letterSpacing: "-0.078px", fontWeight: 510, className: "text-[13px] font-medium" },
  captionMd: { fontSize: "13px", lineHeight: "18px", letterSpacing: "-0.078px", fontWeight: 400, className: "text-[13px]" },
  captionBase: { fontSize: "12px", lineHeight: "16px", letterSpacing: "-0.072px", fontWeight: 400, className: "text-xs" },
  captionSm: { fontSize: "11px", lineHeight: "14px", letterSpacing: "-0.066px", fontWeight: 400, className: "text-2xs" },
} as const satisfies Record<string, TypeStyle>;
