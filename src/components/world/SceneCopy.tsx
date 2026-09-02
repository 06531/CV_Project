'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';
import type { WorldScene } from '@/data/world';
import { Link } from '@/i18n/navigation';

/**
 * One scene's words: eyebrow, title, body, and the link to the case study when
 * the scene is about a project.
 *
 * Two places render this — the film and the reduced-motion deck of stills —
 * and they used to render their own copy of it. That is the block most likely
 * to be edited (it is the actual prose layout), and the least likely to be
 * edited in both places at once.
 *
 * The two variants differ only in the ways listed below, and keeping them in
 * one table is the point: over a film the copy is laid over a picture and has
 * to survive being read at a glance, while a still sits in ordinary page flow.
 */
const VARIANTS = {
  /** Over the clip, inside the sticky/full-bleed stage. */
  film: {
    // Positioned by the stage; opacity is driven per frame by the engine, so it
    // starts hidden and must not transition — the engine IS the animation.
    wrapper: 'absolute inset-x-4 bottom-8 opacity-0 transition-none sm:inset-x-6',
    eyebrow: 'font-mono text-xs uppercase tracking-[0.2em] text-accent',
    // Smaller on a phone on purpose: every line here is a line the scene above
    // has to give up.
    title: 'mt-1.5 max-w-2xl text-xl font-bold tracking-tight sm:mt-2 sm:text-4xl',
    body: 'mt-1.5 line-clamp-4 max-w-xl text-[13px] leading-snug text-muted sm:mt-2 sm:line-clamp-none sm:text-base sm:leading-relaxed',
    // Translucent + blurred, because there is a moving picture behind it.
    link: 'bg-surface/80 backdrop-blur-sm',
  },
  /** In normal page flow, under a still. Nothing is going to move. */
  static: {
    wrapper: '',
    eyebrow: 'mt-5 font-mono text-xs uppercase tracking-[0.2em] text-accent',
    title: 'mt-1.5 max-w-2xl text-xl font-bold tracking-tight sm:mt-2 sm:text-3xl',
    // No clamp: this is the only place the explanation exists, so it runs long.
    body: 'mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base',
    link: 'bg-surface',
  },
} as const;

interface Props {
  scene: WorldScene;
  variant: keyof typeof VARIANTS;
  /** The film writes `style.opacity` / `style.transform` on this. */
  ref?: Ref<HTMLDivElement>;
}

export default function SceneCopy({ scene, variant, ref }: Props) {
  const t = useTranslations('portfolio.world');
  const v = VARIANTS[variant];

  return (
    <div ref={ref} className={v.wrapper}>
      <p className={v.eyebrow}>{t(`scenes.${scene.id}.eyebrow`)}</p>
      <h2 className={v.title}>{t(`scenes.${scene.id}.title`)}</h2>
      <p className={v.body}>{t(`scenes.${scene.id}.body`)}</p>
      {scene.project && (
        <Link
          href={`/portfolio/${scene.project}`}
          className={`mt-4 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 font-mono text-xs text-accent transition-colors hover:border-accent ${v.link}`}
        >
          {t('caseStudy')}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
