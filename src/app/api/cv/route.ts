import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILLS } from '@/data/cv';
import { routing } from '@/i18n/routing';

/**
 * The whole CV as JSON, in the requested locale — the structure from
 * `data/cv.ts` merged with the translated prose from `messages/`.
 *
 * GET /api/cv?locale=en|zh-HK
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('locale');
  const locale = routing.locales.includes(requested as never)
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;

  const t = await getTranslations({ locale, namespace: 'experience' });
  const skills = await getTranslations({ locale, namespace: 'skills' });
  const education = await getTranslations({ locale, namespace: 'education' });
  const portfolio = await getTranslations({ locale, namespace: 'portfolio' });
  const hero = await getTranslations({ locale, namespace: 'hero' });
  const about = await getTranslations({ locale, namespace: 'about' });

  const body = {
    locale,
    profile: {
      ...PROFILE,
      title: hero('title'),
      about: about('body'),
    },
    experience: EXPERIENCE.map((role) => ({
      id: role.id,
      period: role.period,
      current: role.current ?? false,
      company: t(`roles.${role.id}.company`),
      role: t(`roles.${role.id}.role`),
      projects: role.projects.map((project) => ({
        id: project.id,
        name: t(`roles.${role.id}.projects.${project.id}.name`),
        description: t(`roles.${role.id}.projects.${project.id}.description`),
        tech: project.tech,
        bullets: t.raw(`roles.${role.id}.projects.${project.id}.bullets`),
        portfolio: project.portfolio ?? null,
      })),
    })),
    skills: SKILLS.map((group) => ({
      id: group.id,
      name: skills(`groups.${group.id}`),
      items: group.items,
      notes: group.notes?.map((note) => skills(`notes.${note}`)) ?? [],
    })),
    education: EDUCATION.map((item) => ({
      id: item.id,
      period: item.period,
      school: education(`items.${item.id}.school`),
      award: education(`items.${item.id}.award`),
      body: education(`items.${item.id}.body`),
    })),
    projects: PROJECTS.map((project) => ({
      slug: project.slug,
      period: project.period,
      name: portfolio(`projects.${project.slug}.name`),
      role: portfolio(`projects.${project.slug}.role`),
      summary: portfolio(`projects.${project.slug}.summary`),
      highlights: portfolio.raw(`projects.${project.slug}.highlights`),
      tech: project.tech,
      images: project.images.map((image) => image.src),
      links: project.links ?? [],
    })),
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
