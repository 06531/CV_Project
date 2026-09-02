import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PointerFx from '@/components/PointerFx';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import ThemeProvider from '@/components/ThemeProvider';
import { PROFILE } from '@/data/cv';
import { routing } from '@/i18n/routing';
import { pageMetadata, SITE_URL } from '@/site';
import '../globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    // Without a base, `openGraph` and the generated OG image resolve to
    // relative URLs, which no scraper follows. This one *is* meant to be
    // inherited — it is the same origin for every page.
    metadataBase: new URL(SITE_URL),
    applicationName: PROFILE.name,
    ...pageMetadata({ locale, title: t('title'), description: t('description') }),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <NextIntlClientProvider>
            <PointerFx />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
