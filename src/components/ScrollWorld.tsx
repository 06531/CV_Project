'use client';

import { ArrowDown, ArrowRight, ChevronsDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WORLD_CROSSFADE, WORLD_OUTRO_VH, worldHeightVh, type WorldScene } from '@/data/world';
import { Link } from '@/i18n/navigation';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
/** Monotone remap: settle mid-scene, move quicker near the seams. f(0)=0, f(1)=1. */
const lingerEase = (x: number, l: number) => {
  const c = x - 0.5;
  return (1 - l) * x + l * (4 * c * c * c + 0.5);
};

interface SceneState {
  el: HTMLDivElement | null;
  video: HTMLVideoElement | null;
  copy: HTMLDivElement | null;
  /** Scroll offsets in px, recomputed on layout. */
  start: number;
  end: number;
  /** Clip time, 0..1 — `cur` chases `target` so fast flicks stay smooth. */
  cur: number;
  target: number;
  loading: boolean;
  ready: boolean;
  visible: boolean;
}

const blankScene = (): SceneState => ({
  el: null,
  video: null,
  copy: null,
  start: 0,
  end: 0,
  cur: 0,
  target: 0,
  loading: false,
  ready: false,
  visible: false,
});

interface Props {
  scenes: WorldScene[];
  /** sessionStorage flag, so a watched deck does not replay on every visit. */
  seenKey: string;
}

export default function ScrollWorld({ scenes, seenKey }: Props) {
  const t = useTranslations('portfolio.world');
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scenesRef = useRef<SceneState[]>([]);
  if (scenesRef.current.length !== scenes.length) {
    scenesRef.current = scenes.map(blankScene);
  }
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  const skip = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    try {
      sessionStorage.setItem(seenKey, '1');
    } catch {
      /* private mode — fine, they just see it again */
    }
    window.scrollTo({ top: section.offsetTop + section.offsetHeight, behavior: 'smooth' });
  }, [seenKey]);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
    const smallQuery = window.matchMedia('(max-width: 860px)');
    const isMobile = () => coarse.matches || smallQuery.matches;
    let reduce = motionQuery.matches;
    setReduced(reduce);

    const states = scenesRef.current;
    const totalScroll = scenes.reduce((sum, s) => sum + s.scroll, 0);
    let vh = window.innerHeight;
    /** Where the stage starts dissolving, and where it is fully gone. */
    let outroStart = 0;
    let outroEnd = 0;
    let ticking = false;
    let raf = 0;
    let currentIndex = -1;
    let marked = false;

    function layout() {
      // Measure the sticky box itself rather than trusting window.innerHeight:
      // the track is sized in `svh`, which on phones is the *small* viewport,
      // and innerHeight is whatever the URL bar leaves right now.
      vh = stage!.offsetHeight || window.innerHeight;
      const top = section!.offsetTop;
      // A sticky child only travels for (track height − its own height); the
      // scenes used to be spread over the full track, which left the last one
      // still at full opacity while the stage was already scrolling away.
      const travel = Math.max(1, section!.offsetHeight - vh);
      const outro = Math.min(WORLD_OUTRO_VH * vh, travel * 0.4);
      const span = Math.max(1, travel - outro);

      let offset = top;
      scenes.forEach((scene, i) => {
        states[i].start = offset;
        offset += (scene.scroll / totalScroll) * span;
        states[i].end = offset;
      });
      outroStart = top + span;
      outroEnd = top + travel;
      read();
    }

    /** Fetch the clip as a Blob: always seekable, no HTTP Range dependency. */
    function loadClip(scene: WorldScene, s: SceneState) {
      if (reduce || s.loading || !s.el) return;
      s.loading = true;
      const url = isMobile() ? scene.clipMobile : scene.clip;
      fetch(url)
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
        .then((blob) => {
          const video = document.createElement('video');
          video.className =
            'absolute inset-0 z-[1] h-full w-full object-cover opacity-0 transition-opacity duration-300';
          video.muted = true;
          video.playsInline = true;
          video.preload = 'auto';
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          video.setAttribute('aria-hidden', 'true');
          video.src = URL.createObjectURL(blob);
          video.addEventListener('loadedmetadata', () => {
            s.ready = true;
            read();
          });
          // iOS keeps a muted-but-never-played video blank, so only hide the
          // poster once a real frame has actually painted.
          video.addEventListener('seeked', () => video.classList.remove('opacity-0'), {
            once: true,
          });
          s.el!.appendChild(video);
          s.video = video;
        })
        .catch(() => {
          s.loading = false;
        });
    }

    function read() {
      const y = window.scrollY;
      const fade = WORLD_CROSSFADE * vh;
      const last = scenes.length - 1;
      let nearest = 0;

      scenes.forEach((scene, i) => {
        const s = states[i];
        if (!s.el) return;

        if (y > s.start - 1.6 * vh && y < s.end + 1.6 * vh) loadClip(scene, s);

        const raw = (y - s.start) / (s.end - s.start);
        const local = clamp(raw);
        s.target = scene.linger ? lingerEase(local, scene.linger) : local;

        // Hold the final scene's last frame through the outro, so the picture
        // dissolves rather than cutting to black.
        let outside = 0;
        if (y < s.start) outside = s.start - y;
        else if (y > s.end) outside = i === last ? 0 : y - s.end;

        const op = smooth(1 - outside / fade);
        s.el.style.opacity = String(op);
        s.el.style.zIndex = String(op > 0.5 ? 20 : 10);
        s.visible = op > 0.001;

        // Ken Burns on the poster while the clip is still loading (and the only
        // motion at all under reduced-motion).
        if (!s.ready) {
          const poster = s.el.querySelector<HTMLElement>('[data-poster]');
          if (poster) {
            poster.style.transform = reduce ? 'none' : `scale(${(1.03 + local * 0.12).toFixed(4)})`;
          }
        }

        if (s.copy) {
          // Ramp in, then hold. A triangular curve peaking only at the exact
          // midpoint leaves the words half-transparent for most of the scene,
          // which reads as washed-out rather than as a fade. The in-ramp runs
          // off the unclamped position so it starts before the scene does and
          // overlaps the outgoing one — otherwise every seam has half a screen
          // of scroll with no legible copy at all.
          const held = Math.min(
            smooth((raw + 0.04) / 0.08),
            i === last ? 1 : smooth((1 - raw) / 0.08),
          );
          const shown = y >= s.start - fade && (i === last || y <= s.end + fade);
          const value = shown ? held : 0;
          s.copy.style.opacity = String(value);
          s.copy.style.transform = reduce ? 'none' : `translateY(${((0.5 - local) * 3).toFixed(2)}vh)`;
          s.copy.style.pointerEvents = value > 0.6 ? 'auto' : 'none';
        }

        if (y >= s.start) nearest = i;
      });

      // The outro: everything — picture, scrim, copy, controls — leaves
      // together, and hands the page back before the sticky lets go.
      const exit = smooth((y - outroStart) / Math.max(1, outroEnd - outroStart));
      stage!.style.opacity = String(1 - exit);
      stage!.style.pointerEvents = exit > 0.5 ? 'none' : '';
      // Scrolled clean through it — don't make them sit through it again on
      // the next visit this session.
      if (exit >= 1 && !marked) {
        marked = true;
        try {
          sessionStorage.setItem(seenKey, '1');
        } catch {
          /* private mode */
        }
      }

      if (nearest !== currentIndex) {
        currentIndex = nearest;
        setActive(nearest);
      }
      ticking = false;
    }

    /** Chase the scroll target, one seek at a time. */
    function tick() {
      const eps = isMobile() ? 0.02 : 0.008;
      for (const s of states) {
        const video = s.video;
        if (!video || !s.ready) continue;
        // Queuing a seek while the decoder is still resolving the last one is
        // what makes fast flicks freeze on phones.
        if (video.seeking) continue;
        if (!s.visible && Math.abs(s.cur - s.target) < 0.002) continue;
        s.cur += (s.target - s.cur) * (reduce ? 1 : 0.18);
        const time = clamp(s.cur, 0, 0.999) * (video.duration || 1);
        if (Math.abs(video.currentTime - time) > eps) {
          try {
            video.currentTime = time;
          } catch {
            /* decoder busy — next frame */
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    }

    let laidOutWidth = window.innerWidth;
    function onResize() {
      // Mobile browsers fire resize whenever the URL bar slides; relaying out
      // there rebuilds the track and yanks the scroll position.
      if (coarse.matches && window.innerWidth === laidOutWidth) return;
      laidOutWidth = window.innerWidth;
      layout();
    }

    function onMotionChange(event: MediaQueryListEvent) {
      reduce = event.matches;
      setReduced(reduce);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const rect = section!.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) skip();
    }

    // iOS won't decode a muted video until the page has seen a gesture.
    function onFirstGesture() {
      for (const s of states) {
        if (!s.video) continue;
        void s.video.play().then(() => s.video?.pause()).catch(() => {});
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', layout);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
    motionQuery.addEventListener('change', onMotionChange);
    layout();
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', layout);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onFirstGesture);
      motionQuery.removeEventListener('change', onMotionChange);
      cancelAnimationFrame(raf);
      for (const s of states) {
        if (!s.video) continue;
        URL.revokeObjectURL(s.video.src);
        s.video.remove();
        s.video = null;
      }
    };
  }, [scenes, seenKey, skip]);

  return (
    <section
      ref={sectionRef}
      aria-label={t('label')}
      style={{ height: `${worldHeightVh(scenes) * 100}svh` }}
      className="relative -mt-10 sm:-mt-14"
    >
      <div ref={stageRef} data-stage className="sticky top-0 h-svh overflow-hidden bg-bg">
        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            ref={(el) => {
              scenesRef.current[i].el = el;
            }}
            aria-hidden
            className="absolute inset-0 opacity-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed
                backdrop that the scrub engine transforms directly; next/image's
                wrapper would fight the Ken Burns transform. */}
            <img
              data-poster
              src={scene.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ))}

        {/* Bottom scrim: solid exactly where the words are, gone by the time it
            reaches the picture. It used to run far higher, which turned the
            lower third of every scene into fog. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[40%] bg-linear-to-t from-bg from-75% via-bg/45 via-92% to-transparent sm:h-[32%] sm:from-66% sm:via-88%" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <div className="relative mx-auto h-[34svh] max-w-6xl px-4 sm:px-6">
            {scenes.map((scene, i) => (
              <div
                key={scene.id}
                ref={(el) => {
                  scenesRef.current[i].copy = el;
                }}
                className="absolute inset-x-4 bottom-8 opacity-0 transition-none sm:inset-x-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {t(`scenes.${scene.id}.eyebrow`)}
                </p>
                {/* Smaller on a phone on purpose: every line here is a line the
                    scene above has to give up. */}
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

        {/* Announce the scene change without moving focus. */}
        <p className="sr-only" aria-live="polite">
          {t('progress', { current: active + 1, total: scenes.length })} ·{' '}
          {t(`scenes.${scenes[active].id}.title`)}
        </p>

        {/* Clear of the site header, which is sticky at z-40 and would
            otherwise swallow both controls. */}
        {/* Skip only — the scroll position already says how far in they are,
            and a "1 / 2" chip beside it read as a control rather than a
            readout. The count survives for screen readers in the live region
            just above. */}
        <div className="absolute right-4 top-20 z-40 sm:right-6">
          <button
            type="button"
            onClick={skip}
            className="tap-target inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 font-mono text-[11px] text-ink backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
          >
            {t('skip')}
            <ArrowDown className="size-3.5" aria-hidden />
          </button>
        </div>

        {!reduced && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-2 z-40 flex justify-center text-muted"
            style={{ opacity: active === 0 ? 1 : 0, transition: 'opacity .3s' }}
          >
            <ChevronsDown className="size-4 animate-bounce" />
          </div>
        )}
      </div>
    </section>
  );
}
