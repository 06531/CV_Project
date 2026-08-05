import type { MetadataRoute } from 'next';
import { PROJECTS } from '@/data/cv';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/site';

/** Derived from the same lists the router uses, so a new project or locale
 *  cannot be forgotten here. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/portfolio', ...PROJECTS.map((project) => `/portfolio/${project.slug}`)];

  return paths.map((path) => ({
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.7,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
      ),
    },
  }));
}
