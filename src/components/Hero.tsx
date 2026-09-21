import { ArrowRight, Download, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PROFILE } from '@/data/cv';
import { Link } from '@/i18n/navigation';

export default function Hero() {
  const t = useTranslations('hero');

  return (
    <div className="pt-10 pb-4 sm:pt-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{t('title')}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        {PROFILE.name}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        {t('tagline')}
      </p>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-muted">
        <li className="flex items-center gap-2">
          <Mail className="size-3.5 text-accent" aria-hidden />
          <a href={`mailto:${PROFILE.email}`} className="hover:text-ink">
            {PROFILE.email}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="size-3.5 text-accent" aria-hidden />
          <a href={PROFILE.phoneHref} className="hover:text-ink">
            {PROFILE.phone}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Globe className="size-3.5 text-accent" aria-hidden />
          <a href={PROFILE.websiteHref} className="hover:text-ink">
            {PROFILE.website}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="size-3.5 text-accent" aria-hidden />
          {t('locationValue')}
        </li>
      </ul>

      <div className="no-print mt-8 flex flex-wrap gap-3">
        <a
          href={PROFILE.pdf}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          <Download className="size-4" aria-hidden />
          {t('downloadCv')}
        </a>
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {t('viewPortfolio')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
