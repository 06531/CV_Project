import { useTranslations } from 'next-intl';
import Reveal from '@/components/Reveal';
import Section from '@/components/Section';
import { SKILLS } from '@/data/cv';

export default function SkillsSection() {
  const t = useTranslations('skills');

  return (
    <Section id="skills" title={t('heading')}>
      <div className="grid gap-4 sm:grid-cols-2">
        {SKILLS.map((group, index) => (
          <Reveal key={group.id} delay={index * 40}>
            <div className="print-avoid-break h-full rounded-lg border border-line bg-surface p-4 sm:p-5">
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {t(`groups.${group.id}`)}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded border border-line bg-surface-2 px-2 py-1 text-xs text-ink"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              {group.notes && (
                <ul className="mt-3 space-y-1.5">
                  {group.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-xs leading-relaxed text-muted">
                      <span aria-hidden className="font-mono text-accent">
                        ›
                      </span>
                      {t(`notes.${note}`)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
