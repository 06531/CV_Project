import type { Metadata } from 'next';
import { PROFILE } from '@/data/cv';
import { routing } from '@/i18n/routing';

/**
 * Absolute origin. Metadata, the sitemap and the OG image all need one — none
 * of them can be expressed with a relative URL.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in the deployment. Vercel's own
 * `VERCEL_PROJECT_PRODUCTION_URL` stands in so a fresh deploy is already
 * correct before that variable exists; locally it falls back to the dev server.
 */
const configured =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);

export const SITE_URL = (configured || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Everything about a page that is derived from its URL: canonical, hreflang,
 * and the card a link to it unfurls into.
 *
 * Next merges metadata down the tree, and a field the page does not declare is
 * *inherited whole* from the layout above it. `alternates` and `openGraph` used
 * to live only in the locale layout, so `/portfolio` and all four case studies
 * shipped `<link rel="canonical" href=".../en">` — which tells Google they are
 * duplicates of the CV and takes them out of the index — and unfurled on Slack
 * or LinkedIn as the CV's own title and URL.
 *
 * So every page that owns a URL builds its metadata here, the layout included:
 * one definition, and a new page that forgets to call it has no title either,
 * which is the kind of omission that gets noticed.
 *
 * `path` is locale-less and leading-slashed — '' for the CV itself,
 * '/portfolio/otto' for a case study.
 */
export function pageMetadata({
  locale,
  path = '',
  title,
  description,
}: {
  locale: string;
  path?: string;
  title: string;
  description: string;
}): Metadata {
  const url = `/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
    },
    openGraph: {
      type: 'profile',
      siteName: PROFILE.name,
      locale: locale.replace('-', '_'),
      title,
      description,
      url,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}
