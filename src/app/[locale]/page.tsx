import { getTranslations, setRequestLocale } from 'next-intl/server';
import EducationSection from '@/components/EducationSection';
import ExperienceSection from '@/components/ExperienceSection';
import Hero from '@/components/Hero';
import MobileActionBar from '@/components/MobileActionBar';
import ProfileAside from '@/components/ProfileAside';
import Reveal from '@/components/Reveal';
import Section from '@/components/Section';
import SkillsSection from '@/components/SkillsSection';

export default async function CvPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:pb-16">
      <Hero />

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <aside className="no-print hidden lg:block lg:pt-14">
          <ProfileAside />
        </aside>

        <div>
          <Section id="about" title={t('heading')}>
            <Reveal>
              <p className="max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                {t('body')}
              </p>
            </Reveal>
          </Section>

          <ExperienceSection />
          <SkillsSection />
          <EducationSection />
        </div>
      </div>

      <MobileActionBar />
    </div>
  );
}
