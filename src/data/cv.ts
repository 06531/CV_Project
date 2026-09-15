// Structure of the CV. Every piece of prose lives in messages/{locale}.json and
// is looked up by the ids below — this file only holds what never gets
// translated: dates, tech stacks, image paths and links.

import { PORTFOLIO_VERSION } from '@/data/asset-versions';
import { BOARD_SHOT_WORLDS, PROJECT_WORLDS } from '@/data/world';

/**
 * A portfolio image path with a fingerprint of the shipped screenshots on it.
 *
 * Without one, replacing a picture does not replace what anybody sees: the URL
 * is the cache key for Next's optimiser, for Vercel's edge and for the reader's
 * browser, and it says nothing about which version of the file it means. That
 * cost us a re-render which masked a private address off a page and then went
 * on serving the old picture regardless — for four hours by default, and
 * separately per format, so the JPEG came back correct while the AVIF actually
 * on screen did not.
 *
 * `npm run assets:version` regenerates the token; `next.config.ts` has to
 * declare the same one under `images.localPatterns`.
 */
const assetSrc = (src: string) => `${src}?v=${PORTFOLIO_VERSION}`;

export const PROFILE = {
  name: 'Kevin Wu',
  phone: '+852 66812652',
  phoneHref: 'tel:+85266812652',
  email: 'hi06531@gmail.com',
  location: 'Hong Kong',
  pdf: '/api/cv/download',
} as const;

export const SECTIONS = ['about', 'experience', 'skills', 'education'] as const;
export type SectionId = (typeof SECTIONS)[number];

/** A named piece of work inside a role (or the role's only project). */
export interface RoleProject {
  /** i18n id under `experience.roles.<roleId>.projects.<id>` */
  id: string;
  tech: string[];
  /** Links to the matching portfolio entry when there is one. */
  portfolio?: ProjectSlug;
}

export interface Role {
  /** i18n id under `experience.roles` */
  id: string;
  period: string;
  current?: boolean;
  projects: RoleProject[];
}

export const EXPERIENCE: Role[] = [
  {
    id: 'schedule',
    period: '2026',
    projects: [
      {
        id: 'main',
        portfolio: 'schedule',
        tech: [
          'React',
          'TypeScript',
          'Express',
          'PostgreSQL',
          'i18n (3 languages)',
          'JWT',
          'Google OAuth (SSO)',
          'Stripe',
          'Leaflet / OpenStreetMap',
        ],
      },
    ],
  },
  {
    id: 'cti',
    period: '10/2025 – 09/2026',
    projects: [
      {
        id: 'smc',
        portfolio: 'smc',
        tech: ['Vue.js', 'Node.js', 'Microsoft SQL Server', 'WebSockets'],
      },
      {
        id: 'serverIntegration',
        tech: ['Golang', 'MSSQL'],
      },
    ],
  },
  {
    id: 'tradelink',
    period: '06/2023 – 09/2025',
    projects: [
      {
        id: 'otto',
        portfolio: 'otto',
        tech: ['JSP', 'Java', 'Eclipse', 'Tomcat', 'MySQL', 'JasperReports', 'XSL-FO', 'Cron jobs'],
      },
      {
        id: 'kiosk',
        portfolio: 'kiosk',
        tech: ['React Native', 'Java', 'Socket.io', 'MySQL'],
      },
    ],
  },
];

export interface SkillGroup {
  /** i18n id under `skills.groups` */
  id: string;
  items: string[];
  /** Sub-bullets shown under the group, e.g. what the AI tooling covers. */
  notes?: string[];
}

export const SKILLS: SkillGroup[] = [
  {
    id: 'frontend',
    items: [
      'HTML5',
      'CSS3',
      'SCSS',
      'Tailwind',
      'TypeScript',
      'JavaScript',
      'Vue.js',
      'React (Next.js)',
      'Redux',
      'Recoil',
      'AJAX',
      'i18n',
      'OAuth 2',
    ],
  },
  {
    id: 'backend',
    items: ['Node.js', 'Express', 'Nest.js', 'MikroORM', 'Knex', 'Java', 'Golang'],
  },
  {
    id: 'database',
    items: ['MySQL', 'MSSQL', 'PostgreSQL'],
  },
  {
    id: 'devops',
    items: ['GitHub', 'AWS (EC2, S3, Route 53, IAM)', 'Docker', 'cronjob', 'Jenkins'],
  },
  {
    id: 'ai',
    items: ['Claude Code'],
    notes: ['multiAgent', 'promptEngineering', 'headlessAutomation', 'monitoringLoops'],
  },
  {
    id: 'others',
    items: [
      'Git',
      'RESTful API',
      'ERD drafting',
      'Socket IO',
      'XSL-FO',
      'JasperReports',
      'Tomcat',
      'AI Chatbot Trainer',
    ],
  },
  {
    id: 'languages',
    items: ['Cantonese', 'English'],
  },
];

export const EDUCATION = [{ id: 'tecky', period: '12/2022 – 04/2023' }] as const;

export type ProjectSlug = 'schedule' | 'smc' | 'otto' | 'kiosk' | 'startie';

export interface ProjectImage {
  src: string;
  /** Screenshot viewport; only the schedule platform has both. */
  viewport?: 'desktop' | 'mobile';
  /** i18n id under `portfolio.projects.<slug>.shots` */
  captionId?: string;
}

export interface Project {
  slug: ProjectSlug;
  period: string;
  /** i18n id under `portfolio.projects.<slug>.role` */
  tech: string[];
  images: ProjectImage[];
  /**
   * A public URL a reader can go and look at, which only the schedule platform
   * has: it is mine and it is deployed. OTTO and the kiosks belong to a former
   * employer and are not mine to point strangers at, and both of Startie's
   * deployments have since been taken down, so the links that used to sit on
   * those three resolved to nothing at all.
   */
  links?: { label: string; href: string }[];
  /** Feature the desktop/mobile switcher (only useful when both exist). */
  viewportToggle?: boolean;
  /**
   * The images are explainer boards cut from the scroll-world rather than
   * screenshots. A board is about 2.5:1, so the gallery gives it a tile of that
   * shape; in the default 16/10 one the whole lower third is empty, and
   * `object-cover` cannot recover it — anything wider than the tile gets
   * cropped at the sides instead.
   */
  boardShots?: boolean;
  /** Span both columns on the index, with a badge. */
  featured?: boolean;
}

/**
 * The gallery of a project that has no screenshots: one tile per scene of its
 * scroll-world, cut from the board that scene ends on.
 *
 * Derived rather than listed, so a fourth scene cannot leave a fourth picture
 * on disk that nothing shows. `scripts/encode-world-clips.mjs` writes the files
 * from the same two lists.
 */
const boardGallery = (slug: (typeof BOARD_SHOT_WORLDS)[number]) => ({
  boardShots: true as const,
  images: (PROJECT_WORLDS[slug] ?? []).map((_, i) => ({
    src: assetSrc(`/portfolio/${slug}-${i + 1}.jpg`),
  })),
});

const scheduleShots = [
  'directory',
  'company-calendar',
  'student-booking',
  'teacher-overview',
  'teacher-courses',
  'teacher-calendar',
  'teacher-staff',
  'teacher-qr',
  'platform',
];

export const PROJECTS: Project[] = [
  {
    slug: 'schedule',
    period: '2026',
    featured: true,
    viewportToggle: true,
    tech: [
      'React 18',
      'Vite',
      'TypeScript (strict)',
      'Express',
      'PostgreSQL',
      'JWT + bcrypt',
      'Google OAuth SSO',
      'Stripe',
      'i18next (3 languages)',
      'Leaflet / OpenStreetMap',
      'Playwright',
      'Capacitor-ready',
    ],
    images: [
      ...scheduleShots.map((name) => ({
        src: assetSrc(`/portfolio/schedule/desktop-${name}.jpg`),
        viewport: 'desktop' as const,
        captionId: name,
      })),
      ...scheduleShots.map((name) => ({
        src: assetSrc(`/portfolio/schedule/mobile-${name}.jpg`),
        viewport: 'mobile' as const,
        captionId: name,
      })),
    ],
    // A running deployment, not the production tenancy: the schools and the
    // enrolments on it are seeded test data, which is what makes it safe to
    // hand a stranger.
    links: [
      {
        label: 'schedule-project-testing.vercel.app',
        href: 'https://schedule-project-testing.vercel.app',
      },
    ],
  },
  {
    slug: 'smc',
    period: '10/2025 – 09/2026',
    tech: ['Vue.js', 'Node.js', 'WebSockets', 'Microsoft SQL Server', 'Golang', 'Genesys Cloud'],
    // Not screenshots. A live client contact centre is not something to film,
    // so these are the closing frames of the three explainers — the same boards
    // the scroll-world ends each scene on, and the only pictures this project
    // has. They are cropped to the board (scene.css reserves the bottom 32vh
    // for the scroll-world's copy, and nothing lays copy over them here) and
    // written into public/portfolio/ so they version with the rest of the
    // gallery.
    ...boardGallery('smc'),
  },
  {
    slug: 'otto',
    period: '06/2023 – 09/2025',
    tech: ['JSP', 'Java', 'Eclipse', 'Tomcat', 'MySQL', 'JasperReports', 'XSL-FO', 'Cron jobs'],
    // Boards, like SMC's, and for the same reason — see BOARD_SHOT_WORLDS.
    // These two tiles used to be pages 3 and 4 of the long-form CV, which are
    // mostly screenshots of the running platform: a former employer's system,
    // with a customer's shipments in it. `render-pdf-pages.mjs` no longer cuts
    // them, so there is nothing left to serve them from either.
    ...boardGallery('otto'),
  },
  {
    slug: 'kiosk',
    period: '06/2023 – 09/2025',
    tech: ['React Native', 'Java', 'Socket.io', 'MySQL'],
    images: [{ src: assetSrc('/portfolio/kiosk-1.jpg') }],
  },
  {
    slug: 'startie',
    period: 'Client project',
    // The back end and the infrastructure were missing here — the CV's own
    // architecture diagram (page 9, `/portfolio/startie-4.jpg`) names all of
    // them, and "RESTful API" was standing in for the lot.
    tech: [
      'Next.js (React)',
      'Recoil',
      'immer',
      'MUI',
      'react-hook-form',
      'ckeditor5-react',
      'react-timezone-select',
      'i18next (zh / en)',
      'NestJS',
      'MikroORM',
      'PostgreSQL',
      'JWT',
      'Stripe Checkout',
      'AWS S3',
      'Vercel',
    ],
    images: [
      { src: assetSrc('/portfolio/startie-1.jpg') },
      { src: assetSrc('/portfolio/startie-2.jpg') },
      { src: assetSrc('/portfolio/startie-3.jpg') },
      { src: assetSrc('/portfolio/startie-4.jpg') },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
