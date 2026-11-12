/**
 * One clock for a render, that moves on its own.
 *
 * Two reasons this is a hook rather than `new Date()` inline:
 *
 * 1. ONE VALUE PER RENDER. Tiles sorted by one `now` and coloured by another would
 *    disagree about which plant is thirstiest. The native app took the same care.
 *
 * 2. A BROWSER TAB OUTLIVES A PHONE SCREEN. An app is re-entered; a tab is left open for
 *    days. Without a tick, a garden opened on Monday still shows Monday's thirst on
 *    Thursday — the single most plausible way this grid could quietly start lying.
 *    A minute is far finer than the day-level arithmetic needs, and costs one cheap
 *    re-render.
 */

import * as React from 'react';

const TICK_MS = 60_000;

export function useNow(): Date {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    // A tab that was in the background may have had its timers throttled to a crawl, so
    // re-read the clock the moment it comes back rather than waiting for the next tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return now;
}
