import { Download, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PROFILE } from '@/data/cv';

/** Sticky contact card for wide screens — the hero scrolls away, this doesn't. */
export default function ProfileAside() {
  const t = useTranslations('hero');
  const initials = PROFILE.name
    .split(' ')
    .map((part) => part[0])
    .join('');

  return (
    <div data-spotlight className="sticky top-24 rounded-lg border border-line bg-surface p-5">
      <div className="grid size-14 place-items-center rounded-md bg-accent-soft font-mono text-lg font-semibold text-accent">
        {initials}
      </div>
      <p className="mt-4 font-semibold tracking-tight">{PROFILE.name}</p>
      <p className="font-mono text-xs text-muted">{t('title')}</p>

      <dl className="mt-5 space-y-3 text-xs">
        <div className="flex items-start gap-2">
          <dt className="sr-only">{t('email')}</dt>
          <Mail className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
          <dd className="break-all">
            <a href={`mailto:${PROFILE.email}`} className="text-muted hover:text-accent">
              {PROFILE.email}
            </a>
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">{t('phone')}</dt>
          <Phone className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
          <dd>
            <a href={PROFILE.phoneHref} className="text-muted hover:text-accent">
              {PROFILE.phone}
            </a>
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">{t('location')}</dt>
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
          <dd className="text-muted">{t('locationValue')}</dd>
        </div>
      </dl>

      <a
        href={PROFILE.pdf}
        className="no-print mt-5 flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
      >
        <Download className="size-3.5" aria-hidden />
        {t('downloadCv')}
      </a>
    </div>
  );
}
