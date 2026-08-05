import type { Metadata } from 'next';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Reveal from '@/components/Reveal';
import TechChips from '@/components/TechChips';
import WorldStage from '@/components/WorldStage';
import { PROJECTS } from '@/data/cv';
import { INTRO_WORLD } from '@/data/world';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: PageProps<'/[locale]/portfolio'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('portfolioTitle') };
}

export default async function PortfolioPage({ params }: PageProps<'/[locale]/portfolio'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('portfolio');

  return (
    <div className="py-10 sm:py-14">
      {/* Crawlers and screen readers get the page's identity up front, rather
          than after several screens of cinematic. */}
      <h1 className="sr-only">{t('heading')}</h1>
      <p className="sr-only">{t('subheading')}</p>
      <a href="#projects" className="sr-only focus:not-sr-only">
        {t('world.skip')}
      </a>

      <WorldStage scenes={INTRO_WORLD} seenKey="cv-world-intro" mode="auto" skipTo="#projects" />

      <div id="projects" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t('backToCv')}
        </Link>

        <p aria-hidden className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          {t('heading')}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{t('subheading')}</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PROJECTS.map((project, index) => {
          const p = (key: string) => t(`projects.${project.slug}.${key}`);
          const cover = project.images[0];

          return (
            <Reveal key={project.slug} delay={index * 60} className={project.featured ? 'md:col-span-2' : ''}>
              <Link
                href={`/portfolio/${project.slug}`}
                className={`group grid h-full overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-accent ${
                  project.featured ? 'md:grid-cols-2' : ''
                }`}
              >
                <div
                  className={`relative overflow-hidden border-line bg-surface-2 ${
                    project.featured
                      ? 'h-52 border-b sm:h-64 md:h-full md:border-b-0 md:border-r'
                      : 'h-52 border-b'
                  }`}
                >
                  <Image
                    src={cover.src}
                    alt=""
                    fill
                    sizes={project.featured ? '(min-width: 768px) 30rem, 100vw' : '(min-width: 768px) 30rem, 100vw'}
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                    priority={index === 0}
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-accent">{project.period}</span>
                    {project.featured && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                        {t('featured')}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight group-hover:text-accent">
                    {p('name')}
                  </h2>
                  <p className="text-xs text-muted">{p('role')}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                    {p('summary')}
                  </p>

                  <div className="mt-4">
                    <TechChips items={project.tech.slice(0, 6)} />
                  </div>

                  <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs text-accent">
                    {t('viewCaseStudy')}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
        </div>
      </div>
    </div>
  );
}
