/** Small random helpers for the dev-only dummy-data generators. */

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Random integer in [min, max], inclusive. */
export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
