// Renders the portfolio pages of CV.pdf (p.5-9) into JPEGs under public/portfolio/.
//
// macOS has no poppler/pdftotext by default, but PDFKit is built in — so we
// drive it through JXA (osascript -l JavaScript) instead of pulling a PDF
// rasteriser into the dependency tree. Pages are rendered at 2x for retina and
// written straight out as JPEG (a 2x PNG of an A4 page is ~1MB).
//
// Every URL printed on a page is painted out before it is rasterised. The links
// in this CV are a former employer's internal system and two deployments that
// have since been taken down, and none of them is mine to point strangers at —
// `src/data/cv.ts` stopped listing them, but the addresses were still legible in
// the picture of the page, which is the same thing. Redacting here rather than
// by hand means a re-render cannot quietly bring them back.
//
// The masks are drawn as PDFKit annotations rather than onto the bitmap, for a
// reason worth writing down: JXA hides every ObjC method whose name starts with
// `set`, so `NSGraphicsContext.currentContext = ctx` silently does nothing and
// anything drawn afterwards lands in no context at all. Annotating the page and
// letting PDFKit rasterise the result sidesteps the bridge entirely.
//
// Also copies the CV to public/cv/ so the download route can serve it — but
// from `Kevin_Wu_CV.pdf`, not from the file the stills come out of. The two are
// different documents: `CV.pdf` is the 9-page long form these portfolio pages
// are cut from, and `Kevin_Wu_CV.pdf` is the 2-page one a reader gets when they
// click Download. Copying the wrong one here silently replaces the CV the site
// hands out, which is why it is spelled out rather than reusing `pdf` below.
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

/**
 * PDF page number (1-based) -> output basename, and how much room the URL mask
 * on that page needs beyond the text itself.
 *
 * The padding is what makes an erasure read as deliberate rather than as a
 * rendering fault: on p.9 the links are labels inside the architecture diagram,
 * where reaching too far would clip the node they sit beside.
 *
 * p.3 and p.4 are missing on purpose. They are the OTTO pages, and they are
 * mostly screenshots of the running platform — a former employer's system with
 * a customer's shipments on screen. That project's gallery is drawn boards now
 * (BOARD_SHOT_WORLDS in src/data/world.ts), so these two are not rendered at
 * all rather than rendered and left unused.
 */
const PAGES = {
  5: { name: 'kiosk-1' },
  6: { name: 'startie-1' },
  7: { name: 'startie-2' },
  8: { name: 'startie-3' },
  9: { name: 'startie-4', pad: { left: 2, y: 2 } },
};

/** Pages with no link on them never use this; it keeps the JXA call uniform. */
const DEFAULT_PAD = { left: 2, y: 2 };

const SCALE = 2;
const JPEG_QUALITY = 0.82;

const jxa = `
ObjC.import('Foundation');
ObjC.import('Quartz');
ObjC.import('AppKit');

function run(argv) {
  var src = argv[0], dest = argv[1], pageIndex = parseInt(argv[2], 10);
  var scale = parseFloat(argv[3]), quality = parseFloat(argv[4]);
  var padLeft = parseFloat(argv[5]), padY = parseFloat(argv[6]);

  var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(src));
  if (!doc.js) throw new Error('cannot open ' + src);
  var page = doc.pageAtIndex(pageIndex);
  var box = page.boundsForBox($.kPDFDisplayBoxMediaBox);
  var size = $.NSMakeSize(box.size.width * scale, box.size.height * scale);

  // Paint out every address printed on the page, in page coordinates, before
  // anything is rasterised. findString searches the whole document, so a hit
  // belonging to another page comes back as an empty rect here — skip those
  // rather than stamping a mask at the origin.
  var white = $.NSColor.colorWithCalibratedRedGreenBlueAlpha(1, 1, 1, 1);
  var urls = (ObjC.unwrap(page.string) || '').match(/https?:\\/\\/[^\\s]+/g) || [];
  var masked = 0;
  for (var u = 0; u < urls.length; u++) {
    var hits = doc.findStringWithOptions($(urls[u]), 0);
    for (var k = 0; k < hits.count; k++) {
      var r = hits.objectAtIndex(k).boundsForPage(page);
      if (r.size.width < 1) continue;
      var mask = $.PDFAnnotation.alloc.initWithBoundsForTypeWithProperties(
        $.NSMakeRect(
          r.origin.x - padLeft,
          r.origin.y - padY,
          r.size.width + padLeft + padY,
          r.size.height + padY * 2
        ),
        $.PDFAnnotationSubtypeSquare,
        $()
      );
      // Both, or the square is filled white and outlined in its default black.
      mask.color = white;
      mask.interiorColor = white;
      page.addAnnotation(mask);
      masked++;
    }
  }

  var image = page.thumbnailOfSizeForBox(size, $.kPDFDisplayBoxMediaBox);
  var rep = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
  var props = $.NSDictionary.dictionaryWithObjectForKey(
    $.NSNumber.numberWithDouble(quality),
    $.NSImageCompressionFactor
  );
  var data = rep.representationUsingTypeProperties($.NSBitmapImageFileTypeJPEG, props);
  if (!data.writeToFileAtomically($(dest), true)) throw new Error('write failed: ' + dest);

  return Math.round(size.width) + 'x' + Math.round(size.height) + ' ' + masked;
}
`;

function render(pageNumber, { name, pad = DEFAULT_PAD }) {
  const dest = path.join(outDir, `${name}.jpg`);
  if (!force && existsSync(dest)) {
    console.log(`  skip   ${name}.jpg (exists)`);
    return;
  }
  const out = execFileSync(
    'osascript',
    [
      '-l', 'JavaScript',
      '-e', jxa,
      pdf,
      dest,
      String(pageNumber - 1),
      String(SCALE),
      String(JPEG_QUALITY),
      String(pad.left),
      String(pad.y),
    ],
    { encoding: 'utf8' },
  ).trim();
  const [dims, masked] = out.split(' ');
  console.log(
    `  render p.${pageNumber} -> ${name}.jpg (${dims})` +
      (Number(masked) > 0 ? ` — ${masked} URL${masked === '1' ? '' : 's'} masked` : ''),
  );
}

if (!existsSync(pdf)) {
  console.error(`CV.pdf not found at ${pdf}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
console.log('Rendering portfolio pages from CV.pdf …');
for (const [page, spec] of Object.entries(PAGES)) render(Number(page), spec);

const download = path.join(root, 'Kevin_Wu_CV.pdf');
const pdfCopy = path.join(root, 'public', 'cv', 'Kevin_Wu_CV.pdf');
if (!existsSync(download)) {
  console.error(`Kevin_Wu_CV.pdf not found at ${download} — download copy skipped`);
  process.exit(1);
}
mkdirSync(path.dirname(pdfCopy), { recursive: true });
copyFileSync(download, pdfCopy);
console.log('  copy   Kevin_Wu_CV.pdf -> public/cv/Kevin_Wu_CV.pdf');
