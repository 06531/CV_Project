// Renders the portfolio pages of CV.pdf (p.3-9) into JPEGs under public/portfolio/.
//
// macOS has no poppler/pdftotext by default, but PDFKit is built in — so we
// drive it through JXA (osascript -l JavaScript) instead of pulling a PDF
// rasteriser into the dependency tree. Pages are rendered at 2x for retina and
// written straight out as JPEG (a 2x PNG of an A4 page is ~1MB).
//
// Also copies CV.pdf to public/cv/ so the download route can serve it.
//
// Usage: node scripts/render-pdf-pages.mjs [--force]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdf = path.join(root, 'CV.pdf');
const outDir = path.join(root, 'public', 'portfolio');
const force = process.argv.includes('--force');

// PDF page number (1-based) -> output basename.
const PAGES = {
  3: 'otto-1',
  4: 'otto-2',
  5: 'kiosk-1',
  6: 'startie-1',
  7: 'startie-2',
  8: 'startie-3',
  9: 'startie-4',
};

const SCALE = 2;
const JPEG_QUALITY = 0.82;

const jxa = `
ObjC.import('Foundation');
ObjC.import('Quartz');
ObjC.import('AppKit');

function run(argv) {
  var src = argv[0], dest = argv[1], pageIndex = parseInt(argv[2], 10);
  var scale = parseFloat(argv[3]), quality = parseFloat(argv[4]);

  var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(src));
  if (!doc.js) throw new Error('cannot open ' + src);
  var page = doc.pageAtIndex(pageIndex);
  var box = page.boundsForBox($.kPDFDisplayBoxMediaBox);
  var size = $.NSMakeSize(box.size.width * scale, box.size.height * scale);

  var image = page.thumbnailOfSizeForBox(size, $.kPDFDisplayBoxMediaBox);
  var rep = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
  var props = $.NSDictionary.dictionaryWithObjectForKey(
    $.NSNumber.numberWithDouble(quality),
    $.NSImageCompressionFactor
  );
  var data = rep.representationUsingTypeProperties($.NSBitmapImageFileTypeJPEG, props);
  if (!data.writeToFileAtomically($(dest), true)) throw new Error('write failed: ' + dest);

  return Math.round(size.width) + 'x' + Math.round(size.height);
}
`;

function render(pageNumber, name) {
  const dest = path.join(outDir, `${name}.jpg`);
  if (!force && existsSync(dest)) {
    console.log(`  skip   ${name}.jpg (exists)`);
    return;
  }
  const dims = execFileSync(
    'osascript',
    ['-l', 'JavaScript', '-e', jxa, pdf, dest, String(pageNumber - 1), String(SCALE), String(JPEG_QUALITY)],
    { encoding: 'utf8' },
  ).trim();
  console.log(`  render p.${pageNumber} -> ${name}.jpg (${dims})`);
}

if (!existsSync(pdf)) {
  console.error(`CV.pdf not found at ${pdf}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
console.log('Rendering portfolio pages from CV.pdf …');
for (const [page, name] of Object.entries(PAGES)) render(Number(page), name);

const pdfCopy = path.join(root, 'public', 'cv', 'Kevin_Wu_CV.pdf');
mkdirSync(path.dirname(pdfCopy), { recursive: true });
copyFileSync(pdf, pdfCopy);
console.log('  copy   CV.pdf -> public/cv/Kevin_Wu_CV.pdf');
