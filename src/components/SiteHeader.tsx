'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { PROFILE, SECTIONS } from '@/data/cv';
import { Link, usePathname } from '@/i18n/navigation';

export default function SiteHeader() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const onCv = pathname === '/';
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Scroll-spy: highlight the section currently nearest the top of the viewport.
  useEffect(() => {
    if (!onCv) return;
    const targets = SECTIONS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onCv]);

  const sectionLinks = SECTIONS.map((id) => ({ id, href: `/#${id}`, label: t(id) }));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2 font-mono text-sm">
          <span className="text-accent">$</span>
          <span className="font-semibold tracking-tight text-ink group-hover:text-accent">
            {PROFILE.name.toLowerCase().replace(' ', '-')}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {onCv &&
            sectionLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                aria-current={active === link.id ? 'true' : undefined}
                className={`rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
                  active === link.id ? 'text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {link.label}
              </a>
            ))}
          <Link
            href="/portfolio"
            className={`rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
              pathname.startsWith('/portfolio') ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            {t('portfolio')}
          </Link>
          {!onCv && (
            <Link
              href="/"
              className="rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wide text-muted transition-colors hover:text-ink"
            >
              {t('cv')}
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? t('close') : t('menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="tap-target grid size-9 place-items-center rounded-md border border-line text-muted transition-colors hover:border-accent hover:text-accent md:hidden"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-surface md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {onCv &&
              sectionLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-line/60 py-3 font-mono text-sm text-muted"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            <li>
              <Link href="/portfolio" className="block border-b border-line/60 py-3 font-mono text-sm text-muted">
                {t('portfolio')}
              </Link>
            </li>
            {!onCv && (
              <li>
                <Link href="/" className="block py-3 font-mono text-sm text-muted">
                  {t('cv')}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
