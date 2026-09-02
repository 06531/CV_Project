'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Shot {
  src: string;
  caption?: string;
}

export default function Gallery({
  desktop,
  mobile,
  wide = false,
}: {
  desktop: Shot[];
  mobile: Shot[];
  /**
   * The shots are explainer boards rather than screenshots. A board is about
   * 2.5:1, so in the 16/10 tile the whole lower third is empty — `object-cover`
   * cannot fix that, since anything wider than the tile is cropped at the sides
   * instead. Give those a tile of their own shape.
   */
  wide?: boolean;
}) {
  const t = useTranslations('portfolio');
  const hasToggle = mobile.length > 0 && desktop.length > 0;
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>(
    desktop.length > 0 ? 'desktop' : 'mobile',
  );
  const shots = viewport === 'desktop' && desktop.length > 0 ? desktop : mobile;
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + shots.length) % shots.length)),
    [shots.length],
  );

  useEffect(() => {
    if (open === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close, step]);

  // Horizontal swipe moves between shots on touch devices.
  const touchStartX = useRef(0);
  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.changedTouches[0].clientX;
  }
  function onTouchEnd(event: React.TouchEvent) {
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1);
  }

  return (
    <>
      {hasToggle && (
        <div className="mb-4 inline-flex rounded-md border border-line p-0.5">
          {(['desktop', 'mobile'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewport(key)}
              aria-pressed={viewport === key}
              className={`tap-target rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                viewport === key ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}

      <ul
        className={`grid gap-4 ${
          viewport === 'mobile' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2'
        }`}
      >
        {shots.map((shot, index) => (
          <li key={shot.src}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              data-spotlight
              className="group relative block w-full overflow-hidden rounded-lg border border-line bg-surface text-left transition-colors hover:border-accent"
            >
              <div
                className={`relative overflow-hidden bg-surface-2 ${
                  viewport === 'mobile' ? 'aspect-9/16' : wide ? 'aspect-[2.56/1]' : 'aspect-16/10'
                }`}
              >
                <Image
                  src={shot.src}
                  alt={shot.caption ?? ''}
                  fill
                  sizes={viewport === 'mobile' ? '(min-width: 640px) 16rem, 45vw' : '(min-width: 640px) 32rem, 90vw'}
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              {shot.caption && (
                <p className="border-t border-line p-3 text-xs leading-relaxed text-muted">
                  {shot.caption}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between gap-3 p-4 text-white/80">
            <span className="font-mono text-xs">
              {t('lightbox.counter', { current: open + 1, total: shots.length })}
            </span>
            <button
              type="button"
              aria-label={t('lightbox.close')}
              onClick={close}
              className="tap-target grid size-9 place-items-center rounded-md border border-white/20 hover:border-white/60"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-2 pb-4">
            <button
              type="button"
              aria-label={t('lightbox.previous')}
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
              className="absolute left-2 z-10 grid size-10 place-items-center rounded-full bg-black/50 text-white/80 hover:text-white"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>

            <div
              className="relative h-full w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={shots[open].src}
                alt={shots[open].caption ?? ''}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <button
              type="button"
              aria-label={t('lightbox.next')}
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
              className="absolute right-2 z-10 grid size-10 place-items-center rounded-full bg-black/50 text-white/80 hover:text-white"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>

          {shots[open].caption && (
            <p className="px-6 pb-6 text-center text-sm text-white/70">{shots[open].caption}</p>
          )}
        </div>
      )}
    </>
  );
}
