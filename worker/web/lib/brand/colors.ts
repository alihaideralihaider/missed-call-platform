export const saanaColors = {
  navy: "#071E41",
  orange: "#FF5A00",
  softOrange: "#FFF1E8",
  paleOrange: "#FFE4D2",
  ink: "#0B1220",
  muted: "#64748B",
  border: "#E5E7EB",
  background: "#FFFFFF",
  softBackground: "#FFF8F3",
} as const;

export type SaanaColorName = keyof typeof saanaColors;
