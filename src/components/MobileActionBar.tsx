import { Download, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PROFILE } from '@/data/cv';

/** Always-reachable contact actions on phones, where the hero scrolls away. */
export default function MobileActionBar() {
  const t = useTranslations('hero');

  return (
    <div
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex gap-2 px-4 py-3">
        <a
          href={PROFILE.pdf}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-bg"
        >
          <Download className="size-4" aria-hidden />
          {t('downloadCv')}
        </a>
        <a
          href={`mailto:${PROFILE.email}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm font-medium text-ink"
        >
          <Mail className="size-4" aria-hidden />
          {t('email')}
        </a>
      </div>
    </div>
  );
}
