import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { PORTFOLIO_VERSION } from './src/data/asset-versions';

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory makes Turbopack guess the
  // wrong workspace root, so pin it to this project.
  turbopack: { root: import.meta.dirname },
  images: {
    /**
     * Portfolio images carry a `?v=<hash>` of their own bytes (see
     * `assetSrc` in src/data/cv.ts), and Next 16 refuses to optimise a local
     * src with a query string unless the pattern is declared here.
     *
     * `search` is spelled out rather than omitted: leaving it off allows *any*
     * query string through, so a stranger could ask the optimiser for
     * `otto-1.jpg?x=1`, `?x=2`, … and have it do unbounded work and fill the
     * cache with entries nobody will ever read.
     *
     * Listing anything at all switches off the default "every local path is
     * allowed", so the scroll-world stills need their own line or the
     * reduced-motion deck 400s.
     */
    localPatterns: [
      { pathname: '/portfolio/**', search: `?v=${PORTFOLIO_VERSION}` },
      { pathname: '/world/**', search: '' },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
