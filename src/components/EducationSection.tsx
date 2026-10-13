import { GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Reveal from '@/components/Reveal';
import Section from '@/components/Section';
import { EDUCATION } from '@/data/cv';

export default function EducationSection() {
  const t = useTranslations('education');

  return (
    <Section id="education" title={t('heading')}>
      <div className="space-y-4">
        {EDUCATION.map((item) => (
          <Reveal key={item.id}>
            <div
              data-spotlight
              className="print-avoid-break relative flex gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5"
            >
              <GraduationCap className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="font-mono text-xs text-accent">{item.period}</p>
                <h3 className="mt-1 font-semibold tracking-tight">
                  {t(`items.${item.id}.school`)}
                </h3>
                <p className="mt-1 text-sm font-medium text-ink">
                  {t(`items.${item.id}.award`)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(`items.${item.id}.body`)}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
