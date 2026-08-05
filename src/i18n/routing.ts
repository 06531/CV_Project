import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-HK'],
  defaultLocale: 'en',
  // Everyone lands on English, whatever their browser asks for. This is a CV:
  // the reader is as likely to be an overseas recruiter on a Chinese-configured
  // machine as the reverse, and the switcher is in the header either way.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
