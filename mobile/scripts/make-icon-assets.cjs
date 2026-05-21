// Build icon-foreground.png + icon-background.png so @capacitor/assets
// can generate proper Android adaptive icons from the mine logo.
//
// Output:
//   mobile/assets/icon-foreground.png  — logo on transparent, 1024×1024,
//     inset to roughly the safe zone (66% of canvas)
//   mobile/assets/icon-background.png  — flat #0b1020, 1024×1024
//
// Run:  node scripts/make-icon-assets.cjs

const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'icon-only.png');
const FG = path.join(ROOT, 'assets', 'icon-foreground.png');
const BG = path.join(ROOT, 'assets', 'icon-background.png');

const CANVAS = 1024;
const INNER = 700; // ~68% of canvas, fits inside the adaptive safe-zone circle

(async () => {
  // Background: solid app theme color
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 11, g: 16, b: 32, alpha: 1 },
    },
  })
    .png()
    .toFile(BG);
  console.log(`Wrote ${BG}`);

  // Foreground: logo, contained inside INNER×INNER, centered on transparent
  const inset = (CANVAS - INNER) / 2;
  const logo = await sharp(SRC)
    .resize(INNER, INNER, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, top: Math.round(inset), left: Math.round(inset) }])
    .png()
    .toFile(FG);
  console.log(`Wrote ${FG}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
