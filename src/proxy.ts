// Next.js 16 renamed `middleware` to `proxy`; next-intl's locale negotiator is
// the same function, just exported under the new name.
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and anything with a file extension
  // (public/ assets), so the locale rewrite never touches the CV PDF or images.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
