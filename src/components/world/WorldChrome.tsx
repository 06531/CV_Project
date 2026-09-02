'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WorldScene } from '@/data/world';

/**
 * The furniture both scroll-world engines put around the film. None of it is
 * decoration — each piece is load-bearing for either legibility or a11y, and
 * each was duplicated verbatim between the two engines.
 */

/**
 * Bottom scrim: solid exactly where the words are, gone by the time it reaches
 * the picture. It used to run far higher, which turned the lower third of every
 * scene into fog.
 */
export function WorldScrim() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[40%] bg-linear-to-t from-bg from-75% via-bg/45 via-92% to-transparent sm:h-[32%] sm:from-66% sm:via-88%" />
  );
}

/**
 * Announce the scene change without moving focus.
 *
 * This is also where the "1 / 3" count lives now. It was removed from the
 * visible controls because it read as pagination the reader had to operate —
 * but a screen reader has nothing else to say how far through the deck it is.
 */
export function WorldAnnounce({ scenes, active }: { scenes: WorldScene[]; active: number }) {
  const t = useTranslations('portfolio.world');
  return (
    <p className="sr-only" aria-live="polite">
      {t('progress', { current: active + 1, total: scenes.length })} ·{' '}
      {t(`scenes.${scenes[active].id}.title`)}
    </p>
  );
}

/**
 * The one control in the corner of the stage. Always says what it does — Skip
 * while there is something left, Replay once the film has stopped.
 */
export function WorldControl({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <div className="absolute right-4 top-4 z-40 sm:right-6 sm:top-6">
      <button
        type="button"
        onClick={onClick}
        className="tap-target inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 font-mono text-[11px] text-ink backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
