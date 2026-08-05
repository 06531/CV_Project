'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const t = useTranslations('nav');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server can't know the stored theme, so render the icon only after
  // hydration — otherwise the first paint flashes the wrong one.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={t('theme')}
      title={t('theme')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="tap-target grid size-9 place-items-center rounded-md border border-line text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )
      ) : (
        <span className="size-4" />
      )}
    </button>
  );
}
