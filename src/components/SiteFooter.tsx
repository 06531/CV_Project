'use client';

import { useTranslations } from 'next-intl';
import { PROFILE } from '@/data/cv';
import { usePathname } from '@/i18n/navigation';

export default function SiteFooter() {
  const t = useTranslations('footer');
  // The CV page carries a fixed action bar at the bottom of the phone viewport.
  // Without room reserved for it, it sits on top of this footer.
  const underActionBar = usePathname() === '/';

  return (
    <footer className="no-print border-t border-line">
      <div
        className={`mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          underActionBar ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8' : 'pb-8'
        }`}
      >
        <p className="font-mono">
          © {new Date().getFullYear()} {PROFILE.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t('builtWith')}</span>
          <a href={PROFILE.pdf} className="text-accent underline-offset-4 hover:underline">
            {t('sourcePdf')}
          </a>
        </p>
      </div>
    </footer>
  );
}
