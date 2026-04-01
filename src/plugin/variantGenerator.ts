export interface VariantCombination {
  variant: string;
  state: string;
  theme: string;
  size?: string;
}

export function generateVariantCombinations(
  variants: string[],
  states: string[],
  themes: string[],
  sizes?: string[]
): VariantCombination[] {
  const safeVariants = variants.length > 0 ? variants : ['Default'];
  const safeStates = states.length > 0 ? states : ['Default'];
  const safeThemes = themes.length > 0 ? themes : ['Light'];
  const combinations: VariantCombination[] = [];

  for (const theme of safeThemes) {
    for (const variant of safeVariants) {
      for (const state of safeStates) {
        if (sizes && sizes.length > 0) {
          for (const size of sizes) {
            combinations.push({ variant, state, theme, size });
          }
        } else {
          combinations.push({ variant, state, theme });
        }
      }
    }
  }

  return combinations;
}
