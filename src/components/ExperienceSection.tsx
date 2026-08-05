import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Reveal from '@/components/Reveal';
import Section from '@/components/Section';
import TechChips from '@/components/TechChips';
import { EXPERIENCE } from '@/data/cv';
import { Link } from '@/i18n/navigation';

export default function ExperienceSection() {
  const t = useTranslations('experience');

  return (
    <Section id="experience" title={t('heading')}>
      <ol className="relative border-l border-line pl-6 sm:pl-8">
        {EXPERIENCE.map((role, index) => {
          const r = (key: string) => t(`roles.${role.id}.${key}`);

          return (
            <li key={role.id} className="relative pb-10 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[calc(1.5rem+5px)] top-1.5 size-2.5 rounded-full border-2 border-accent bg-bg sm:-left-[calc(2rem+5px)]"
              />
              <Reveal delay={index * 60}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-xs text-accent">{role.period}</p>
                  {role.current && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                      {t('current')}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{r('company')}</h3>
                <p className="text-sm text-muted">{r('role')}</p>

                <div className="mt-5 space-y-5">
                  {role.projects.map((project) => {
                    const p = (key: string) => t(`roles.${role.id}.projects.${project.id}.${key}`);
                    const bullets = t.raw(
                      `roles.${role.id}.projects.${project.id}.bullets`,
                    ) as string[];

                    return (
                      <article
                        key={project.id}
                        data-spotlight
                        className="print-avoid-break relative rounded-lg border border-line bg-surface p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="font-semibold tracking-tight">{p('name')}</h4>
                          {project.portfolio && (
                            <Link
                              href={`/portfolio/${project.portfolio}`}
                              className="no-print inline-flex shrink-0 items-center gap-1 font-mono text-xs text-accent hover:underline"
                            >
                              {t('viewProject')}
                              <ArrowUpRight className="size-3.5" aria-hidden />
                            </Link>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{p('description')}</p>

                        <div className="mt-3">
                          <TechChips items={project.tech} />
                        </div>

                        <ul className="mt-4 space-y-2">
                          {bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-2.5 text-sm leading-relaxed">
                              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
