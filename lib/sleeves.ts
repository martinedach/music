/** Sleeve colourways for songs without cover art, cycled by position. */
export const SLEEVES = [
  { bg: "var(--mustard)", ink: "var(--walnut-900)" },
  { bg: "var(--burnt)", ink: "var(--cream)" },
  { bg: "var(--cream-2)", ink: "var(--walnut-800)" },
  { bg: "var(--walnut-600)", ink: "var(--cream)" },
] as const;

export function sleeveColours(index: number) {
  return SLEEVES[((index % SLEEVES.length) + SLEEVES.length) % SLEEVES.length];
}
