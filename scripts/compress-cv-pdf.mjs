// Produces the copy of the CV the site serves, from the master at the repo
// root. `CV.pdf` is never modified — it is also what `render-pdf-pages.mjs`
// renders the portfolio stills from, so it stays at full quality.
//
// Why there is anything to gain: 91% of the master is embedded images, and 172
// of its 180 images are FlateDecode — lossless screenshots pasted in from the
// design tool. Re-encoding those as JPEG is where the 60% goes. The page text
// is vector and is not touched: the extracted text layer of the output is
// byte-identical to the master's.
//
// macOS's built-in Quartz "Reduce File Size" filter cannot do this — applied
// through PDFKit it rewrites the file without re-encoding anything, and comes
// out slightly larger than it went in. Hence Ghostscript.
//
// Usage: node scripts/compress-cv-pdf.mjs [--check]

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'CV.pdf');
const OUT = path.join(root, 'public', 'cv', 'Kevin_Wu_CV.pdf');

/**
 * 200 dpi at JPEG quality 85. Checked against the master at 150 dpi render,
 * magnified: the screenshots soften a shade, the type does not move. Going to
 * 150/80 saves another 0.3MB and starts to show on the denser pages — this is
 * a document people print.
 */
const DPI = 200;
const JPEG_Q = 85;

const mb = (f) => (statSync(f).size / 1024 / 1024).toFixed(2);

try {
  execFileSync('gs', ['--version'], { stdio: 'pipe' });
} catch {
  console.error('ghostscript not found. Install it with `brew install ghostscript`, then retry.');
  process.exit(1);
}

if (!existsSync(SRC)) {
  console.error(`missing ${path.relative(root, SRC)}`);
  process.exit(1);
}

if (process.argv.includes('--check')) {
  console.log(`master ${mb(SRC)} MB → served ${existsSync(OUT) ? `${mb(OUT)} MB` : 'missing'}`);
  process.exit(0);
}

const before = mb(SRC);

execFileSync('gs', [
  '-sDEVICE=pdfwrite',
  '-dCompatibilityLevel=1.7',
  '-dNOPAUSE', '-dQUIET', '-dBATCH',
  // The same logo and rule appear on every page; store them once.
  '-dDetectDuplicateImages=true',
  // Force JPEG rather than letting Ghostscript decide per image — left on
  // auto it keeps the lossless ones lossless, which is the whole problem.
  '-dAutoFilterColorImages=false', '-dColorImageFilter=/DCTEncode',
  '-dAutoFilterGrayImages=false', '-dGrayImageFilter=/DCTEncode',
  '-dDownsampleColorImages=true', `-dColorImageResolution=${DPI}`,
  '-dDownsampleGrayImages=true', `-dGrayImageResolution=${DPI}`,
  `-dJPEGQ=${JPEG_Q}`,
  `-sOutputFile=${OUT}`,
  SRC,
]);

console.log(`  cv      ${path.relative(root, OUT)} — ${before} MB → ${mb(OUT)} MB (${DPI} dpi, q${JPEG_Q})`);
