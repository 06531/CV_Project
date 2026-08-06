// Structure of the CV. Every piece of prose lives in messages/{locale}.json and
// is looked up by the ids below — this file only holds what never gets
// translated: dates, tech stacks, image paths and links.

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
    period: '10/2025 – Now',
    current: true,
    projects: [
      {
        id: 'smc',
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
    notes: ['multiAgent', 'promptEngineering', 'headlessAutomation'],
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

export type ProjectSlug = 'schedule' | 'otto' | 'kiosk' | 'startie';

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
  links?: { label: string; href: string }[];
  /** Feature the desktop/mobile switcher (only useful when both exist). */
  viewportToggle?: boolean;
  /** Number of highlight bullets in `portfolio.projects.<slug>.highlights`. */
  featured?: boolean;
}

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
        src: `/portfolio/schedule/desktop-${name}.jpg`,
        viewport: 'desktop' as const,
        captionId: name,
      })),
      ...scheduleShots.map((name) => ({
        src: `/portfolio/schedule/mobile-${name}.jpg`,
        viewport: 'mobile' as const,
        captionId: name,
      })),
    ],
  },
  {
    slug: 'otto',
    period: '06/2023 – 09/2025',
    tech: ['JSP', 'Java', 'Eclipse', 'Tomcat', 'MySQL', 'JasperReports', 'XSL-FO', 'Cron jobs'],
    images: [{ src: '/portfolio/otto-1.jpg' }, { src: '/portfolio/otto-2.jpg' }],
    links: [{ label: 'tds3.tradelinksig.com', href: 'https://tds3.tradelinksig.com/scm-sms/home.do' }],
  },
  {
    slug: 'kiosk',
    period: '06/2023 – 09/2025',
    tech: ['React Native', 'Java', 'Socket.io', 'MySQL'],
    images: [{ src: '/portfolio/kiosk-1.jpg' }],
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
      { src: '/portfolio/startie-1.jpg' },
      { src: '/portfolio/startie-2.jpg' },
      { src: '/portfolio/startie-3.jpg' },
      { src: '/portfolio/startie-4.jpg' },
    ],
    links: [
      { label: 'ems.s7yr0.com', href: 'https://ems.s7yr0.com' },
      { label: 'api.s7yr0.com', href: 'https://api.s7yr0.com' },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
