function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function partitionDayIndexes(
  dayCount: number,
  workerIndex: number,
  totalWorkers: number,
): number[] {
  const allIndexes = [...Array(dayCount).keys()];
  const ownSlice = allIndexes.filter((i) => i % totalWorkers === workerIndex);
  return shuffle(ownSlice.length > 0 ? ownSlice : allIndexes);
}
