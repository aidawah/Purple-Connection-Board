// src/lib/theme/themes.ts

export type ThemeKey =
  | "summer"
  | "spring"
  | "fall"
  | "winter"
  | "christmas"
  | "thanksgiving"
  | "easter"
  | "stpatricks"
  | "halloween"
  | "valentines"
  | "july4th";

export type Theme = {
  key: ThemeKey;
  name: string;
  colors: {
    brand: string;   // accent color used for rings, highlights
    bg: string;      // page background color (under the image)
    card: string;    // card background
    text: string;    // card text
    ring: string;    // selection ring / glow (rgba recommended)
    border: string;  // borders / separators
  };
  assets?: {
    background?: string; // path under /static, e.g. "/images/themes/summer-bg.svg"
  };
};

export const THEMES: Record<ThemeKey, Theme> = {
  summer: {
    key: "summer",
    name: "Summer",
    colors: {
      brand: "#fbbf24",
      bg: "#fef9c3",
      card: "#fde68a",
      text: "#713f12",
      ring: "rgba(251,191,36,0.65)",
      border: "#f59e0b",
    },
    assets: { background: "/themes/summer-bg.svg" },
  },
  spring: {
    key: "spring",
    name: "Spring",
    colors: {
      brand: "#22c55e",
      bg: "#ecfdf5",
      card: "#d1fae5",
      text: "#064e3b",
      ring: "rgba(34,197,94,0.65)",
      border: "#10b981",
    },
    assets: { background: "/themes/spring-bg.svg" },
  },
  fall: {
    key: "fall",
    name: "Fall",
    colors: {
      brand: "#d97706",
      bg: "#fffbeb",
      card: "#fef3c7",
      text: "#78350f",
      ring: "rgba(217,119,6,0.65)",
      border: "#f59e0b",
    },
    assets: { background: "/themes/fall-bg.svg" },
  },
  winter: {
    key: "winter",
    name: "Winter",
    colors: {
      brand: "#3b82f6",
      bg: "#f0f9ff",
      card: "#e0f2fe",
      text: "#1e3a8a",
      ring: "rgba(59,130,246,0.65)",
      border: "#2563eb",
    },
    assets: { background: "/themes/winter-bg.svg" },
  },
  christmas: {
    key: "christmas",
    name: "Christmas",
    colors: {
      brand: "#dc2626",
      bg: "#fef2f2",
      card: "#fee2e2",
      text: "#14532d",
      ring: "rgba(220,38,38,0.65)",
      border: "#15803d",
    },
    assets: { background: "/themes/christmas-bg.svg" },
  },
  thanksgiving: {
    key: "thanksgiving",
    name: "Thanksgiving",
    colors: {
      brand: "#92400e",
      bg: "#fffbeb",
      card: "#fef3c7",
      text: "#78350f",
      ring: "rgba(146,64,14,0.65)",
      border: "#d97706",
    },
    assets: { background: "/themes/thanksgiving-bg.svg" },
  },
  easter: {
    key: "easter",
    name: "Easter",
    colors: {
      brand: "#a855f7",
      bg: "#faf5ff",
      card: "#f3e8ff",
      text: "#4c1d95",
      ring: "rgba(168,85,247,0.65)",
      border: "#9333ea",
    },
    assets: { background: "/themes/easter-bg.svg" },
  },
  stpatricks: {
    key: "stpatricks",
    name: "St. Patrick's Day",
    colors: {
      brand: "#16a34a",
      bg: "#f0fdf4",
      card: "#dcfce7",
      text: "#064e3b",
      ring: "rgba(22,163,74,0.65)",
      border: "#15803d",
    },
    assets: { background: "/themes/stpatricks-bg.svg" },
  },
  halloween: {
    key: "halloween",
    name: "Halloween",
    colors: {
      brand: "#f97316",
      bg: "#1c1917",
      card: "#292524",
      text: "#fef3c7",
      ring: "rgba(249,115,22,0.65)",
      border: "#ea580c",
    },
    assets: { background: "/themes/halloween-bg.svg" },
  },
  valentines: {
    key: "valentines",
    name: "Valentine's Day",
    colors: {
      brand: "#e11d48",
      bg: "#fff1f2",
      card: "#ffe4e6",
      text: "#881337",
      ring: "rgba(225,29,72,0.65)",
      border: "#be123c",
    },
    assets: { background: "/themes/valentines-bg.svg" },
  },
  july4th: {
    key: "july4th",
    name: "Fourth of July",
    colors: {
      brand: "#1d4ed8",
      bg: "#eff6ff",
      card: "#dbeafe",
      text: "#991b1b",
      ring: "rgba(29,78,216,0.65)",
      border: "#dc2626",
    },
    assets: { background: "/themes/july4th-bg.svg" },
  },
};

// handy exports
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
export const DEFAULT_THEME: Theme = THEMES.spring;

export function getTheme(key?: ThemeKey): Theme {
  return (key && THEMES[key]) || DEFAULT_THEME;
}
