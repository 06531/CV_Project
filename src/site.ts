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
