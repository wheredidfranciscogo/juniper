/**
 * Time-of-day + last-watered phrasing helpers used by the Today screen.
 * Lives here (not inside the screen) so the date math is unit-testable
 * with a fake clock.
 */

/** "Good morning" / "Good afternoon" / "Good evening" / "Late night" based on the hour. */
export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}

/**
 * Human-friendly "Last watered ..." sentence.
 *   0 (or future)  -> "Last watered today."
 *   1              -> "Last watered yesterday."
 *   2..6           -> "Last watered <weekday>." (relative to `now`)
 *   >= 7           -> "Last watered N days ago."
 */
export function lastWateredLabel(daysSinceWater: number, now: Date = new Date()): string {
  if (daysSinceWater <= 0) return 'Last watered today.';
  if (daysSinceWater === 1) return 'Last watered yesterday.';
  if (daysSinceWater < 7) {
    const when = new Date(now);
    when.setDate(when.getDate() - daysSinceWater);
    return `Last watered ${when.toLocaleDateString('en-GB', { weekday: 'long' })}.`;
  }
  return `Last watered ${daysSinceWater} days ago.`;
}
