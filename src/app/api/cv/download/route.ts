import { readFile } from 'node:fs/promises';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'public', 'cv', 'Kevin_Wu_CV.pdf');

/**
 * Serves the original PDF as a download rather than an inline preview, so the
 * saved file keeps a sensible name instead of "download.pdf".
 */
export async function GET() {
  try {
    const pdf = await readFile(FILE);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdf.byteLength),
        'Content-Disposition': 'attachment; filename="Kevin_Wu_CV.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('CV PDF not found. Run `npm run assets` first.', { status: 404 });
  }
}
