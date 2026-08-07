'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';
import AutoWorld from '@/components/AutoWorld';
import ScrollWorld from '@/components/ScrollWorld';
import type { WorldScene } from '@/data/world';

/**
 * The two modes do not take the same arguments, and saying so in the type is
 * the point: `seenKey` used to be required of both, so a case study went on
 * passing one long after anything read it, and the next reader of this file
 * would reasonably conclude 'auto' was still gated on it.
 *
 * 'scrub' — the reader drives it by scrolling, and the film is as long as the
 * track. The index gets this: it is the deck about how the work is made, and a
 * reader who has landed on a list of projects is already scrolling.
 *
 * 'auto' — one screen, plays itself. A case study gets this, because arriving
 * there is a request for that project in particular, and three screens of
 * scroll standing between the reader and the thing they asked for is a toll
 * rather than an introduction.
 */
type Props =
  | {
      scenes?: WorldScene[];
      mode: 'auto';
      /** Selector Skip jumps to. */
      skipTo: string;
      seenKey?: never;
    }
  | {
      scenes?: WorldScene[];
      mode?: 'scrub';
      /** Distinct per deck, so watching the intro doesn't skip a case study's. */
      seenKey: string;
      /** 'scrub' skips past its own section, so there is nothing to aim at. */
      skipTo?: never;
    };

export default function WorldStage(props: Props) {
  if (!props.scenes?.length) return null;
  return props.mode === 'auto' ? (
    <AutoWorld scenes={props.scenes} skipTo={props.skipTo} />
  ) : (
    <ScrubStage scenes={props.scenes} seenKey={props.seenKey} />
  );
}

/**
 * A scrub deck, shown once per session. It is several screens of scroll, and
 * making a reader drag through it again to reach the list underneath is a toll
 * — so once watched it collapses to a small control to play it again.
 *
 * The gate lives down here rather than in `WorldStage` because it is the scrub
 * half's business alone: an auto deck is one screen, plays itself and has
 * Skip, so a stale "seen" flag bought nothing and cost the reader a case study
 * that opened on a dead button instead of its film.
 */
function ScrubStage({ scenes, seenKey }: { scenes: WorldScene[]; seenKey: string }) {
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

  if (show) return <ScrollWorld scenes={scenes} seenKey={seenKey} />;

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
