'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LABELS: Record<string, string> = { en: 'EN', 'zh-HK': '繁' };

export default function LocaleSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    startTransition(() => {
      // `pathname` is locale-stripped but keeps the resolved dynamic segments
      // (e.g. /portfolio/schedule), so switching stays on the same page.
      router.replace(pathname, { locale: next as never });
    });
  }

  return (
    <div
      role="group"
      aria-label={t('language')}
      className="flex items-center gap-0.5 rounded-md border border-line p-0.5"
      data-pending={pending || undefined}
    >
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-current={code === locale ? 'true' : undefined}
          className={`tap-target rounded px-2 py-1 font-mono text-xs transition-colors ${
            code === locale
              ? 'bg-accent-soft text-accent'
              : 'text-muted hover:text-ink'
          }`}
        >
          {LABELS[code] ?? code}
        </button>
      ))}
    </div>
  );
}
