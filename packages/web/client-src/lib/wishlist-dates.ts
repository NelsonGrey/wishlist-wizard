/** Computes the next occurrence of a wishlist's occasion given its recurrence rule. */
export function getNextOccurrenceDate(
  occasionDate: Date | null,
  recurrence: string | null | undefined,
  now: Date = new Date()
): Date | null {
  if (!occasionDate || !recurrence || recurrence === 'none') return null;
  const next = new Date(occasionDate);

  if (recurrence === 'yearly') {
    next.setFullYear(now.getFullYear());
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    return next;
  }

  if (recurrence === 'monthly') {
    next.setFullYear(now.getFullYear(), now.getMonth());
    if (next < now) next.setMonth(now.getMonth() + 1);
    return next;
  }

  return next;
}

/** Parses a wishlist's occasionDate into a valid Date, or null if absent/invalid. */
export function parseOccasionDate(occasionDate: unknown): Date | null {
  if (!occasionDate) return null;
  const parsed = new Date(occasionDate as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
