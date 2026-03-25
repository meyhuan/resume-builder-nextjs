import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const projectRoot = process.cwd();
const brandSvgPath = path.join(projectRoot, 'public', 'brand', 'brand-logo.svg');
const publicDir = path.join(projectRoot, 'public');
const iconSizes = [16, 32, 180, 192, 512];

function createOgSvg() {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="120" y1="40" x2="1040" y2="590" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F5F3FF" />
        <stop offset="0.5" stop-color="#FFFFFF" />
        <stop offset="1" stop-color="#ECFDF5" />
      </linearGradient>
      <linearGradient id="card" x1="260" y1="120" x2="510" y2="370" gradientUnits="userSpaceOnUse">
        <stop stop-color="#7C3AED" />
        <stop offset="1" stop-color="#E879F9" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" rx="36" fill="url(#bg)" />
    <circle cx="1030" cy="110" r="120" fill="#EDE9FE" />
    <circle cx="140" cy="560" r="150" fill="#DCFCE7" />
    <rect x="120" y="110" width="150" height="150" rx="36" fill="url(#card)" />
    <rect x="153" y="139" width="75" height="94" rx="14" fill="white" fill-opacity="0.96" />
    <rect x="166" y="164" width="38" height="7" rx="3.5" fill="url(#card)" fill-opacity="0.45" />
    <rect x="166" y="183" width="48" height="7" rx="3.5" fill="url(#card)" fill-opacity="0.3" />
    <rect x="166" y="202" width="28" height="7" rx="3.5" fill="url(#card)" fill-opacity="0.2" />
    <circle cx="236" cy="214" r="29" fill="#059669" />
    <path d="M223 214L231.5 222.5L249 206" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
    <text x="320" y="195" fill="#0F172A" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="700">AI Resume Pass</text>
    <text x="320" y="275" fill="#334155" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="500">Free AI resume builder for ATS-friendly resumes, smart writing help,</text>
    <text x="320" y="322" fill="#334155" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="500">beautiful templates, and one-click PDF export.</text>
    <rect x="320" y="384" width="248" height="58" rx="29" fill="#7C3AED" />
    <text x="360" y="422" fill="white" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700">100% Free • No Watermarks</text>
    <text x="320" y="492" fill="#64748B" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="500">www.airesumepass.com</text>
  </svg>`;
}

async function generateIcon(svgBuffer, size, outputPath) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(svgBuffer).resize(size, size).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(outputPath);
}

async function main() {
  await mkdir(path.join(publicDir, 'brand'), { recursive: true });
  const svgBuffer = await sharp(brandSvgPath).resize(512, 512).png().toBuffer();
  for (const size of iconSizes) {
    const outputName = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
    const outputPath = path.join(publicDir, outputName);
    await generateIcon(svgBuffer, size, outputPath);
  }
  const favicon16Path = path.join(publicDir, 'favicon-16x16.png');
  const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
  const icoBuffer = await pngToIco([favicon16Path, favicon32Path]);
  await writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
  const ogBuffer = await sharp(Buffer.from(createOgSvg())).png().toBuffer();
  await writeFile(path.join(publicDir, 'og-image.png'), ogBuffer);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
