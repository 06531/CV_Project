'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';
import AutoWorld from '@/components/AutoWorld';
import ScrollWorld from '@/components/ScrollWorld';
import type { WorldScene } from '@/data/world';

interface Props {
  scenes?: WorldScene[];
  /** Distinct per deck, so watching the intro doesn't skip a case study's. */
  seenKey: string;
  /**
   * 'scrub' — the reader drives it by scrolling, and the film is as long as
   * the track. 'auto' — one screen, plays itself.
   *
   * The index gets 'scrub': it is the deck about how the work is made, and a
   * reader who has landed on a list of projects is already scrolling. A case
   * study gets 'auto', because arriving there is a request for that project in
   * particular, and three screens of scroll standing between the reader and the
   * thing they asked for is a toll rather than an introduction.
   */
  mode?: 'scrub' | 'auto';
  /** Selector Skip jumps to, in 'auto' mode. 'scrub' skips past its own section. */
  skipTo?: string;
}

/**
 * Plays a scroll-world once per session. After it has been watched (or
 * skipped) the page opens straight on its own content, with a small control to
 * play it again.
 */
export default function WorldStage({ scenes, seenKey, mode = 'scrub', skipTo = '#projects' }: Props) {
  const t = useTranslations('portfolio.world');
  const [show, setShow] = useState(true);

  // Layout effect so the collapse happens before paint — a visible multi-screen
  // section popping away would shove the whole page.
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(seenKey) === '1') setShow(false);
    } catch {
      /* private mode — just show it */
    }
  }, [seenKey]);

  if (!scenes?.length) return null;
  if (show) {
    return mode === 'auto' ? (
      <AutoWorld scenes={scenes} seenKey={seenKey} skipTo={skipTo} />
    ) : (
      <ScrollWorld scenes={scenes} seenKey={seenKey} />
    );
  }

  // Centred: once the film has collapsed there is nothing else on this row, and
  // a lone control hard against the left edge reads as a layout mistake.
  return (
    <div className="mb-4 flex justify-center">
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem(seenKey);
          } catch {
            /* ignore */
          }
          setShow(true);
        }}
        className="tap-target inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Play className="size-3.5" aria-hidden />
        {t('replay')}
      </button>
    </div>
  );
}
