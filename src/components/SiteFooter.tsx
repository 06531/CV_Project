import { useTranslations } from 'next-intl';
import { PROFILE } from '@/data/cv';

export default function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
