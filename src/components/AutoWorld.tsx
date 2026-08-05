'use client';

import { ArrowDown, ArrowRight, ChevronsDown, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldScene } from '@/data/world';
import { Link } from '@/i18n/navigation';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};

interface Props {
  scenes: WorldScene[];
  seenKey: string;
  /** Where Skip sends the reader. */
  skipTo: string;
}

/**
 * The same films as `ScrollWorld`, but played rather than scrubbed: one screen
 * tall, starts on its own, and hands the page over when it is done. Used for
 * the portfolio opener, where the reader has not asked for anything yet and
 * should not have to scroll to find out what the page is.
 */
export default function AutoWorld({ scenes, seenKey, skipTo }: Props) {
  const t = useTranslations('portfolio.world');
  const sectionRef = useRef<HTMLElement>(null);
  const holderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  /** Autoplay refused — offer a button rather than a frozen poster. */
  const [blocked, setBlocked] = useState(false);
  const [done, setDone] = useState(false);

  const markSeen = useCallback(() => {
    try {
      sessionStorage.setItem(seenKey, '1');
    } catch {
      /* private mode — they just see it again */
    }
  }, [seenKey]);

  const skip = useCallback(() => {
    markSeen();
    const target = document.querySelector(skipTo);
    const section = sectionRef.current;
    const top = target
      ? window.scrollY + target.getBoundingClientRect().top - 72
      : section
        ? section.offsetTop + section.offsetHeight
        : 0;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [markSeen, skipTo]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      setReduced(true);
      // Nothing moves, so the copy has to be legible from the first paint.
      const copy = copyRefs.current[0];
      if (copy) copy.style.opacity = '1';
      return;
    }

    const small = window.matchMedia('(max-width: 860px)').matches;
    const total = scenes.length;
    let current = 0;
    let cancelled = false;

    const videos = scenes.map((scene, i) => {
      const video = document.createElement('video');
      video.className = 'absolute inset-0 h-full w-full object-cover';
      video.src = small ? scene.clipMobile : scene.clip;
      video.muted = true;
      video.playsInline = true;
      video.preload = i === 0 ? 'auto' : 'metadata';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      holderRefs.current[i]?.appendChild(video);
      videoRefs.current[i] = video;
      return video;
    });

    /** Copy fades in behind the opening beat and leaves before the cut — except
     *  on the last scene, which holds: the film stops there and the words are
     *  the last thing left on screen. */
    function paintCopy(i: number, local: number) {
      const copy = copyRefs.current[i];
      if (!copy) return;
      const out = i === total - 1 ? 1 : smooth((1 - local) / 0.08);
      const value = Math.min(smooth(local / 0.12), out);
      copy.style.opacity = String(value);
      copy.style.transform = `translateY(${((0.5 - local) * 2).toFixed(2)}vh)`;
      copy.style.pointerEvents = value > 0.6 ? 'auto' : 'none';
    }

    function onTime(this: HTMLVideoElement) {
      const i = videos.indexOf(this);
      if (i !== current || !this.duration) return;
      const local = clamp(this.currentTime / this.duration);
      paintCopy(i, local);
      setProgress((i + local) / total);
    }

    function play(i: number) {
      const video = videos[i];
      if (!video || cancelled) return;
      current = i;
      setActive(i);
      video.currentTime = 0;
      void video
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
      // Give the next clip a head start so the cut is not a black gap.
      const next = videos[i + 1];
      if (next) next.preload = 'auto';
    }

    function onEnded(this: HTMLVideoElement) {
      const i = videos.indexOf(this);
      if (i !== current) return;
      if (i + 1 < total) {
        play(i + 1);
        return;
      }
      // Hold the last frame; the page below is the next thing to look at.
      setProgress(1);
      setDone(true);
      markSeen();
    }

    videos.forEach((video) => {
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('ended', onEnded);
    });

    // Off screen, a playing video is just heat.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videos[current];
        if (!video) return;
        if (entry.isIntersecting) {
          if (video.ended) return;
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') skip();
    }
    window.addEventListener('keydown', onKey);

    play(0);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
      videos.forEach((video) => {
        video.removeEventListener('timeupdate', onTime);
        video.removeEventListener('ended', onEnded);
        video.pause();
        video.remove();
      });
      videoRefs.current = [];
    };
  }, [scenes, markSeen, skip]);

  return (
    <section
      ref={sectionRef}
      aria-label={t('label')}
      /* One screen *below the header*: a plain `h-svh` starts under the sticky
         header and so runs 4rem past the bottom of the viewport, taking the
         last lines of the copy with it. */
      className="relative -mt-10 h-[calc(100svh-4rem)] overflow-hidden bg-bg sm:-mt-14"
    >
      {scenes.map((scene, i) => (
        <div
          key={scene.id}
          ref={(el) => {
            holderRefs.current[i] = el;
          }}
          aria-hidden
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 20 : 10 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed
              backdrop behind the clip; next/image's wrapper adds nothing here. */}
          <img src={scene.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[40%] bg-linear-to-t from-bg from-75% via-bg/45 via-92% to-transparent sm:h-[32%] sm:from-66% sm:via-88%" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="relative mx-auto h-[34svh] max-w-6xl px-4 sm:px-6">
          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              ref={(el) => {
                copyRefs.current[i] = el;
              }}
              className="absolute inset-x-4 bottom-8 opacity-0 transition-none sm:inset-x-6"
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                {t(`scenes.${scene.id}.eyebrow`)}
              </p>
              <h2 className="mt-1.5 max-w-2xl text-xl font-bold tracking-tight sm:mt-2 sm:text-4xl">
                {t(`scenes.${scene.id}.title`)}
              </h2>
              <p className="mt-1.5 line-clamp-4 max-w-xl text-[13px] leading-snug text-muted sm:mt-2 sm:line-clamp-none sm:text-base sm:leading-relaxed">
                {t(`scenes.${scene.id}.body`)}
              </p>
              {scene.project && (
                <Link
                  href={`/portfolio/${scene.project}`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface/80 px-3 py-2 font-mono text-xs text-accent backdrop-blur-sm transition-colors hover:border-accent"
                >
                  {t('caseStudy')}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How much of the film is left, right under the site header. */}
      {!reduced && (
        <div aria-hidden className="absolute inset-x-0 top-0 z-40 h-0.5 bg-line/50">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {t('progress', { current: active + 1, total: scenes.length })} ·{' '}
        {t(`scenes.${scenes[active].id}.title`)}
      </p>

      <div className="absolute right-4 top-4 z-40 flex items-center gap-2 sm:right-6 sm:top-6">
        <span className="rounded-full border border-line bg-surface/80 px-2.5 py-1 font-mono text-[11px] text-muted backdrop-blur-sm">
          {t('progress', { current: active + 1, total: scenes.length })}
        </span>
        <button
          type="button"
          onClick={skip}
          className="tap-target inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 font-mono text-[11px] text-ink backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
        >
          {t('skip')}
          <ArrowDown className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* Autoplay can be refused — Low Power Mode, Save-Data, a strict setting.
          Give them the button rather than a still frame that never moves. */}
      {blocked && !reduced && (
        <button
          type="button"
          onClick={() => {
            const video = videoRefs.current[active];
            void video?.play().then(() => setBlocked(false)).catch(() => {});
          }}
          className="absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-line bg-surface/90 px-4 py-2.5 font-mono text-xs text-ink backdrop-blur-sm"
        >
          <Play className="size-4" aria-hidden />
          {t('replay')}
        </button>
      )}

      {(done || reduced) && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-2 z-40 flex justify-center text-muted"
        >
          <ChevronsDown className="size-4 animate-bounce" />
        </div>
      )}
    </section>
  );
}
