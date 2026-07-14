import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const resourcesDir = path.join(root, "resources");
const iconPath = path.join(resourcesDir, "icon.png");
const splashPath = path.join(resourcesDir, "splash.png");

const BRAND_BG = { r: 10, g: 11, b: 16, alpha: 1 };
const BRAND_PANEL = { r: 18, g: 20, b: 28, alpha: 1 };
const BRAND_ACCENT = { r: 107, g: 140, b: 255, alpha: 1 };

async function renderMark(size) {
  const radius = Math.round(size * 0.22);
  const inset = Math.round(size * 0.0625);
  const letterSize = Math.round(size * 0.42);

  const letterSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="rgb(${BRAND_BG.r},${BRAND_BG.g},${BRAND_BG.b})"/>
      <rect x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}" rx="${Math.round(radius * 0.86)}"
        fill="rgb(${BRAND_PANEL.r},${BRAND_PANEL.g},${BRAND_PANEL.b})"
        stroke="rgba(107,140,255,0.35)" stroke-width="${Math.max(2, Math.round(size * 0.015))}"/>
      <text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,-apple-system,sans-serif" font-size="${letterSize}" font-weight="800"
        fill="rgb(${BRAND_ACCENT.r},${BRAND_ACCENT.g},${BRAND_ACCENT.b})">L</text>
    </svg>
  `;

  return sharp(Buffer.from(letterSvg)).png().toBuffer();
}

await mkdir(resourcesDir, { recursive: true });

const iconBuffer = await renderMark(1024);
await sharp(iconBuffer).toFile(iconPath);

await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: { r: 9, g: 9, b: 11, alpha: 1 },
  },
})
  .composite([
    {
      input: await renderMark(640),
      gravity: "center",
    },
  ])
  .png()
  .toFile(splashPath);

console.log(`Wrote ${iconPath}`);
console.log(`Wrote ${splashPath}`);
