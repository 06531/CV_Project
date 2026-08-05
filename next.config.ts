import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory makes Turbopack guess the
  // wrong workspace root, so pin it to this project.
  turbopack: { root: import.meta.dirname },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
