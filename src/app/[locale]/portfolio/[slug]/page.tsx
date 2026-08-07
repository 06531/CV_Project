import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Gallery, { type Shot } from '@/components/Gallery';
import TechChips from '@/components/TechChips';
import WorldStage from '@/components/WorldStage';
import { getProject, PROJECTS } from '@/data/cv';
import { PROJECT_WORLDS } from '@/data/world';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PROJECTS.map((project) => ({ locale, slug: project.slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/portfolio/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!getProject(slug)) return {};
  const t = await getTranslations({ locale, namespace: 'portfolio' });
  return { title: `${t(`projects.${slug}.name`)} — Kevin Wu` };
}

export default async function ProjectPage({ params }: PageProps<'/[locale]/portfolio/[slug]'>) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = getProject(slug);
  if (!project) notFound();

  const t = await getTranslations('portfolio');
  const p = (key: string) => t(`projects.${project.slug}.${key}`);
  const highlights = t.raw(`projects.${project.slug}.highlights`) as string[];
  const shots = t.raw(`projects.${project.slug}.shots`) as Record<string, string>;
  const note = t.has(`projects.${project.slug}.note`) ? p('note') : null;

  const toShot = (image: (typeof project.images)[number]): Shot => ({
    src: image.src,
    caption: image.captionId ? shots[image.captionId] : undefined,
  });
  const desktop = project.images.filter((i) => i.viewport !== 'mobile').map(toShot);
  const mobile = project.images.filter((i) => i.viewport === 'mobile').map(toShot);

  return (
    <div className="py-10 sm:py-14">
      {/* Crawlers and screen readers get the project's identity up front,
          rather than after several screens of cinematic. */}
      <h1 className="sr-only">{p('name')}</h1>
      <a href="#case" className="sr-only focus:not-sr-only">
        {t('world.skip')}
      </a>

      <WorldStage scenes={PROJECT_WORLDS[project.slug]} mode="auto" skipTo="#case" />

      <div id="case" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6">
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('backToPortfolio')}
      </Link>

      <header className="mt-6">
        <p className="font-mono text-xs text-accent">{project.period}</p>
        <p aria-hidden className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {p('name')}
        </p>
        <p className="mt-1 text-sm text-muted">{p('role')}</p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          {p('summary')}
        </p>
        {note && (
          <p className="mt-4 inline-block rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
            {note}
          </p>
        )}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section>
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
            {t('highlights')}
          </h2>
          <ul className="mt-4 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-8 lg:pt-0">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
              {t('techStack')}
            </h2>
            <div className="mt-4">
              <TechChips items={project.tech} />
            </div>
          </div>

          {project.links && (
            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {t('links')}
              </h2>
              <ul className="mt-4 space-y-2">
                {project.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-accent"
                    >
                      {link.label}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-14">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-accent">
          {t('screens')}
        </h2>
        <Gallery desktop={desktop} mobile={mobile} />
      </section>
      </div>
    </div>
  );
}
