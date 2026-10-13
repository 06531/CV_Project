import { ImageResponse } from 'next/og';
import { PROFILE } from '@/data/cv';
import { routing } from '@/i18n/routing';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${PROFILE.name} — Software Developer`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Deliberately Latin-only, in both locales: `next/og`'s bundled face carries no
 * CJK glyphs, and shipping a Chinese webfont just for a share card would cost
 * several megabytes for one image.
 */
export default async function OpengraphImage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b0f14',
          color: '#e6edf3',
          padding: 72,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, fontSize: 30 }}>
          <span style={{ color: '#22d3ee' }}>$</span>
          <span>{PROFILE.name.toLowerCase().replace(' ', '-')}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>{PROFILE.name}</div>
          <div style={{ fontSize: 40, color: '#8b98a9' }}>Software Developer · Hong Kong</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 26, color: '#8b98a9' }}>
          <span style={{ color: '#22d3ee' }}>React · Node.js · Java · Go</span>
          <span>·</span>
          <span>{locale.toUpperCase()}</span>
        </div>
      </div>
    ),
    size,
  );
}
