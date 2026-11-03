/**
 * Tokens de color de Linear.
 * Runtime: src/app/globals.css (variables CSS). Este archivo es el espejo
 * tipado para documentación, tests y usos fuera de CSS (PDF, PNG…).
 * Si cambias un valor aquí, cámbialo también en globals.css.
 */
export const colors = {
  dark: {
    backgrounds: {
      primary: "#08090a", // página
      secondary: "#1c1c1f", // cards, paneles
      tertiary: "#232326", // elementos anidados
      quaternary: "#28282c", // muy anidados
    },
    text: {
      primary: "#f7f8f8",
      secondary: "#8a8f98",
      tertiary: "#62666d",
    },
    borders: {
      primary: "rgba(255, 255, 255, 0.06)",
      secondary: "rgba(255, 255, 255, 0.08)",
    },
    accent: { default: "#825cde", hover: "#8d6be7", light: "#a38af2" }, // lila de la marca
    status: {
      green: "#4cb782",
      blue: "#4ea7fc",
      red: "#eb5757",
      orange: "#fc7840",
      yellow: "#f2c94c",
    },
  },
  light: {
    backgrounds: {
      primary: "#fbfbfc",
      secondary: "#ffffff",
      tertiary: "#f3f3f5",
      quaternary: "#ebebee",
    },
    text: {
      primary: "#1b1c1f",
      secondary: "#62666d",
      tertiary: "#8a8f98",
    },
    borders: {
      primary: "rgba(0, 0, 0, 0.08)",
      secondary: "rgba(0, 0, 0, 0.13)",
    },
    accent: { default: "#7545d7", hover: "#6d3bcd", light: "#8d6be7" },
    status: {
      green: "#1f8a5a",
      blue: "#1a73c8",
      red: "#d93f3f",
      orange: "#c9541c",
      yellow: "#a87b06",
    },
  },
} as const;

export type ColorTheme = keyof typeof colors;
