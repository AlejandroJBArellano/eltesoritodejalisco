export interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  darkBg: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Rosa",
    primary: "#FFB7CE",
    secondary: "#FFD1DC",
    darkBg: "#121212",
  },
  {
    name: "Warm Amber",
    primary: "#F2A104",
    secondary: "#D95204",
    darkBg: "#14100E",
  },
  {
    name: "Esmeralda",
    primary: "#10B981",
    secondary: "#047857",
    darkBg: "#0B0F12",
  },
  {
    name: "Classic Steakhouse",
    primary: "#EF4444",
    secondary: "#B91C1C",
    darkBg: "#110D0D",
  },
  {
    name: "Electric Neon",
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    darkBg: "#0B0C10",
  },
];

export function getContrastColor(hex: string): string {
  if (!hex || hex.length < 7) return "#f5f5f5";
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  // Perceived luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#121212" : "#f5f5f5";
}
