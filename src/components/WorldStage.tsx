'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';
import ScrollWorld from '@/components/ScrollWorld';
import type { WorldScene } from '@/data/world';

interface Props {
  scenes?: WorldScene[];
  /** Distinct per deck, so watching the intro doesn't skip a case study's. */
  seenKey: string;
}

/**
 * Plays a scroll-world once per session. After it has been watched (or
 * skipped) the page opens straight on its own content, with a small control to
 * play it again.
 */
export default function WorldStage({ scenes, seenKey }: Props) {
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
  if (show) return <ScrollWorld scenes={scenes} seenKey={seenKey} />;

  return (
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
      className="tap-target mb-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <Play className="size-3.5" aria-hidden />
      {t('replay')}
    </button>
  );
}
