import type { AppTheme } from "@hope/shared";

export const palette = {
  light: {
    bg: "#f7f4ef",
    panel: "#ffffff",
    panelMuted: "#efeae2",
    text: "#1a1a1a",
    muted: "#6b6560",
    border: "#ddd5c8",
    accent: "#2f5d50",
    danger: "#b42318",
  },
  dark: {
    bg: "#121412",
    panel: "#1c1f1c",
    panelMuted: "#262a26",
    text: "#f2efe8",
    muted: "#a39e95",
    border: "#343834",
    accent: "#7eb8a4",
    danger: "#f97066",
  },
} as const;

export type ThemeColors = (typeof palette)[AppTheme];

export function colorsFor(theme: AppTheme): ThemeColors {
  return palette[theme];
}
