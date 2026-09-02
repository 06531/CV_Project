'use client';

import { ArrowDown, ChevronsDown, Play, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, smooth } from '@/components/world/easing';
import SceneCopy from '@/components/world/SceneCopy';
import { WorldAnnounce, WorldControl, WorldScrim } from '@/components/world/WorldChrome';
import type { WorldScene } from '@/data/world';

interface Props {
  scenes: WorldScene[];
  /** Where Skip sends the reader. */
  skipTo: string;
}

/**
 * The projector for every deck on the site: one screen tall, starts on its own,
 * and hands the page over when it is done. The index opener and the case
 * studies are both played this way — a reader who has landed on either has not
 * asked to operate anything, and dragging a film by the scrollbar put several
 * screens between them and the page they came for.
 *
 * It plays on every arrival. Nothing is remembered between visits: the film is
 * one screen, skippable, and over in seconds, so gating it behind a button
 * would cost a returning reader more than watching it again does.
 */
export default function AutoWorld({ scenes, skipTo }: Props) {
  const t = useTranslations('portfolio.world');
  const sectionRef = useRef<HTMLElement>(null);
  const holderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  /** Set by the engine below, so Replay can rewind a closure it does not own. */
  const restartRef = useRef<(() => void) | null>(null);

  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  /** Autoplay refused — offer a button rather than a frozen poster. */
  const [blocked, setBlocked] = useState(false);
  const [done, setDone] = useState(false);

  const skip = useCallback(() => {
    const target = document.querySelector(skipTo);
    const section = sectionRef.current;
    const top = target
      ? window.scrollY + target.getBoundingClientRect().top - 72
      : section
        ? section.offsetTop + section.offsetHeight
        : 0;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [skipTo]);

  const replay = useCallback(() => {
    restartRef.current?.();
  }, []);

  // Both a mount-time read and a live one: a reader who turns motion down mid
  // session gets the stills, and one who turns it back up gets the film.
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = (event: MediaQueryListEvent) => setReduced(event.matches);
    motionQuery.addEventListener('change', sync);
    return () => motionQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Checked here and not just off `reduced` state so that no <video> is ever
    // constructed for a reader who asked for less motion — a flag flipped in an
    // effect would arrive one render too late to stop the first clip playing.
    if (motionQuery.matches) {
      setReduced(true);
      return;
    }

    // An effect re-run means the film starts over, so the state that lives out
    // here has to start over with it — otherwise scene 1 plays under a Replay
    // button left behind by the previous run.
    setDone(false);
    setProgress(0);

    const small = window.matchMedia('(max-width: 860px)').matches;
    const total = scenes.length;
    let current = 0;
    let cancelled = false;
    /** The section is in view. A clip is only ever started while this is true. */
    let onScreen = true;

    const clearBlocked = () => {
      if (!cancelled) setBlocked(false);
    };

    /**
     * Autoplay refusal and "we paused it ourselves" arrive down the same
     * channel. Per spec a `play()` still pending when something calls `pause()`
     * rejects with AbortError — and the observer below pauses on every scroll
     * out — so treating every rejection as a refusal paints a Play button over
     * a film that is running perfectly well.
     */
    const onPlayRejected = (err: unknown) => {
      if (cancelled) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setBlocked(true);
    };

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
      // Give the next clip a head start so the cut is not a black gap.
      const next = videos[i + 1];
      if (next) next.preload = 'auto';
      // Cued but not started: off screen a playing video is just heat, and the
      // observer below starts it the moment the section comes back.
      if (!onScreen) return;
      void video.play().then(clearBlocked).catch(onPlayRejected);
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
    }

    videos.forEach((video) => {
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('ended', onEnded);
    });

    // Off screen, a playing video is just heat.
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        const video = videos[current];
        if (!video) return;
        if (entry.isIntersecting) {
          if (video.ended) return;
          // Same handlers as `play()`: this is the path back from a scroll-out,
          // and it used to swallow its result, leaving `blocked` set from the
          // AbortError its own pause had caused.
          void video.play().then(clearBlocked).catch(onPlayRejected);
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

    /** Back to the top of the deck — the one path a rerun takes, so Replay
     *  cannot reset half the state and leave the rest at the end of the film.
     *  The last scene's copy is deliberately *held* at full opacity when the
     *  film stops, so it has to be cleared by hand; otherwise it sits over the
     *  opening beat all through the rerun. */
    restartRef.current = () => {
      for (const copy of copyRefs.current) {
        if (!copy) continue;
        copy.style.opacity = '0';
        copy.style.pointerEvents = 'none';
      }
      setDone(false);
      setProgress(0);
      play(0);
    };

    play(0);

    return () => {
      cancelled = true;
      restartRef.current = null;
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
  }, [scenes, skip, reduced]);

  // The film carried two thirds of its own copy: only the scene being played is
  // on screen at all, so with the projector switched off the deck used to
  // collapse to scene one and the rest of the explanation — the part a case
  // study is actually for — became unreachable. Lay it out as stills instead,
  // whole, in order, and let the page scroll as normal.
  if (reduced) return <StaticDeck scenes={scenes} />;

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

      <WorldScrim />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="relative mx-auto h-[34svh] max-w-6xl px-4 sm:px-6">
          {scenes.map((scene, i) => (
            <SceneCopy
              key={scene.id}
              scene={scene}
              variant="film"
              ref={(el) => {
                copyRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>

      {/* How much of the film is left, right under the site header. A real
          progressbar rather than decoration: with the scene count gone this is
          the only readout a low-vision reader who is not on a screen reader
          has left. */}
      <div
        role="progressbar"
        aria-label={t('label')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="absolute inset-x-0 top-0 z-40 h-0.5 bg-line/50"
      >
        <div
          className="h-full bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <WorldAnnounce scenes={scenes} active={active} />

      {/* One control, and it always says what it does: Skip while the film is
          running, Replay once it has stopped — "skip" past something already
          over is a button with nothing left to skip. The scene count used to
          sit beside it, but "1 / 3" read as pagination the reader had to
          operate; the bar across the top carries it instead. */}
      <WorldControl
        label={done ? t('replay') : t('skip')}
        icon={done ? RotateCcw : ArrowDown}
        onClick={done ? replay : skip}
      />

      {/* Autoplay can be refused — Low Power Mode, Save-Data, a strict setting.
          Give them the button rather than a still frame that never moves.
          Not once the film is over: there the control top-right is the only
          right answer, and a second button saying the same word in the middle
          of the screen would do something different from the one beside it.
          "Play", not "Replay" — when autoplay is refused nothing has run yet. */}
      {blocked && !done && (
        <button
          type="button"
          onClick={() => {
            const video = videoRefs.current[active];
            void video?.play().then(() => setBlocked(false)).catch(() => {});
          }}
          className="absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-line bg-surface/90 px-4 py-2.5 font-mono text-xs text-ink backdrop-blur-sm"
        >
          <Play className="size-4" aria-hidden />
          {t('play')}
        </button>
      )}

      {done && (
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

/**
 * The same deck with the projector off: every scene's still and every scene's
 * words, stacked in order, scrolled like any other page. No full-bleed screen
 * either — a picture the height of the viewport is a wall to scroll past when
 * nothing on it is going to move.
 */
function StaticDeck({ scenes }: { scenes: WorldScene[] }) {
  const t = useTranslations('portfolio.world');

  // It carries its own bottom margin: the film it stands in for is a full
  // screen tall and the case study simply follows it, which with stills in
  // place would butt the last paragraph up against the back link.
  return (
    <section aria-label={t('label')} className="mx-auto mb-12 max-w-6xl px-4 sm:mb-16 sm:px-6">
      <ol className="space-y-10 sm:space-y-14">
        {scenes.map((scene) => (
          <li key={scene.id}>
            <Image
              src={scene.still}
              alt=""
              width={1920}
              height={1080}
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="w-full rounded-lg border border-line bg-surface-2"
            />
            <SceneCopy scene={scene} variant="static" />
          </li>
        ))}
      </ol>
    </section>
  );
}
