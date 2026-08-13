// Regenerates the "Sangam" wordmark path data used in assets/icon-only.svg,
// assets/icon-foreground.svg, and assets/splash.svg. Font: Yatra One
// (Google Fonts, SIL Open Font License), vendored at assets/fonts/ — an
// Indian travel-signage-style display face that fits the app's theme.
//
// Usage: node scripts/gen-wordmark.cjs [canvasSize] [targetWidthRatio]
//   node scripts/gen-wordmark.cjs 1024 0.62   # for the app icon
//   node scripts/gen-wordmark.cjs 2732 0.5    # for the splash screen
// Paste the printed path data into the relevant SVG's <path d="..."> and
// rerun `npx capacitor-assets generate --android`.
const opentype = require("opentype.js");
const fs = require("fs");
const path = require("path");

const TEXT = "Sangam";
const FONT_PATH = path.join(__dirname, "..", "assets", "fonts", "YatraOne-Regular.ttf");

function centeredPathData(font, text, canvasSize, targetWidthRatio) {
  const targetWidth = canvasSize * targetWidthRatio;

  // First pass at an arbitrary size to learn the glyph aspect ratio.
  const probe = font.getPath(text, 0, 0, 300);
  const probeBox = probe.getBoundingBox();
  const probeWidth = probeBox.x2 - probeBox.x1;
  const finalFontSize = (300 * targetWidth) / probeWidth;

  // Second pass at the real size, then re-center using its own bbox.
  const sized = font.getPath(text, 0, 0, finalFontSize);
  const box = sized.getBoundingBox();
  const cx = canvasSize / 2 - (box.x1 + box.x2) / 2;
  const cy = canvasSize / 2 - (box.y1 + box.y2) / 2;

  const finalPath = font.getPath(text, cx, cy, finalFontSize);
  return finalPath.toPathData(2);
}

const buf = fs.readFileSync(FONT_PATH);
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const font = opentype.parse(arrayBuffer);

const canvasSize = Number(process.argv[2] || 1024);
const ratio = Number(process.argv[3] || 0.62);
console.log(centeredPathData(font, TEXT, canvasSize, ratio));
