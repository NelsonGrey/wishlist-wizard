#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const library = resolve(root, 'media-library');
const generated = resolve(library, 'generated');
const source = resolve(library, '_source');
const inventory = resolve(library, '_inventory');

for (const directory of [
  generated,
  resolve(generated, 'profiles'),
  resolve(generated, 'headers'),
  resolve(generated, 'campaigns'),
  resolve(generated, 'thumbnails'),
  source,
  resolve(source, 'review-derived-captures'),
  inventory,
]) mkdirSync(directory, { recursive: true });

const colors = {
  emerald: '#004e36',
  emerald2: '#087a57',
  emerald3: '#0f9f70',
  ivory: '#fffaf0',
  gold: '#fbbf24',
  mint: '#d1fae5',
  slate: '#10231d',
};

const formats = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
  landscape: [1600, 900],
};

const campaigns = [
  {
    id: '01-every-occasion',
    eyebrow: 'WISHLIST WIZARD',
    headline: ['Every occasion,', 'one place.'],
    subhead: 'Create, share, and manage wishlists for the moments that matter.',
    screenshot: '30-home-populated.png',
  },
  {
    id: '02-spot-it-save-it',
    eyebrow: 'CAPTURE IDEAS',
    headline: ['Spot it.', 'Save it.'],
    subhead: 'Snap a photo or paste a product link, then keep the idea where you can find it.',
    screenshot: '15-add-item.png',
  },
  {
    id: '03-make-a-list',
    eyebrow: 'GET ORGANIZED',
    headline: ['Make one list.', 'Then make it yours.'],
    subhead: 'Keep separate wishlists for birthdays, holidays, weddings, and everyday finds.',
    screenshot: '12-create-wishlist.png',
  },
  {
    id: '04-share-the-hint',
    eyebrow: 'BETTER GIFTING',
    headline: ['Share the hint.', 'Skip the guesswork.'],
    subhead: 'Give friends and family a useful place to see what would make you smile.',
    screenshot: '16-wishlist-with-item.png',
  },
  {
    id: '05-watch-the-price',
    eyebrow: 'SHOP ON YOUR TERMS',
    headline: ['The gear you want.', 'The price you want.'],
    subhead: 'Keep price tracking in view for the items you are already watching.',
  },
  {
    id: '06-community-question',
    eyebrow: 'YOUR TURN',
    headline: ['What is at the top', 'of your wishlist?'],
    subhead: 'Tell the Wishlist Wizard community what you are saving for next.',
  },
];

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function logoMark(x, y, size, includeTile = true) {
  const scale = size / 150;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${includeTile ? '<rect width="150" height="150" rx="34" fill="#004e36"/>' : ''}
    <path fill="#fffaf0" d="M75 55c-8-18-18-27-30-27-12 0-20 9-20 20 0 15 13 23 35 32H29c-4 0-7 3-7 7v15h46V80c-21-8-31-18-31-29 0-5 4-9 9-9 8 0 17 10 29 30 13-20 21-30 29-30 5 0 9 4 9 9 0 11-10 21-31 29v22h46V87c0-4-3-7-7-7H90c22-9 35-17 35-32 0-11-8-20-20-20-12 0-22 9-30 27Z"/>
    <path fill="#fffaf0" d="M29 106h39v32H44c-8 0-15-7-15-15v-17Zm53 0h39v17c0 8-7 15-15 15H82v-32Z"/>
    <path fill="#fbbf24" d="M125 10c2 12 7 17 19 19-12 2-17 7-19 19-2-12-7-17-19-19 12-2 17-7 19-19Z"/>
  </g>`;
}

function svgShell(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors.emerald}"/><stop offset=".58" stop-color="${colors.emerald2}"/><stop offset="1" stop-color="${colors.emerald3}"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#ffffff" stop-opacity=".18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#002e20" flood-opacity=".4"/></filter>
  </defs>
  ${body}
</svg>`;
}

function render(svg, target, width, height) {
  const svgPath = `${target}.svg`;
  writeFileSync(svgPath, svg);
  const result = spawnSync('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', target, svgPath], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function dataUri(path) {
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

function wrapWords(value, maxCharacters) {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    if (line && `${line} ${word}`.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function campaignCard(campaign, format, width, height) {
  const landscape = width / height > 1.4;
  const tall = height / width > 1.5;
  const pad = Math.round(width * (landscape ? 0.075 : 0.075));
  const markSize = landscape ? 92 : 96;
  const brandY = pad;
  const eyebrowY = landscape ? 270 : (tall ? 340 : 300);
  const headlineSize = landscape ? 78 : (tall ? 78 : 68);
  const lineGap = headlineSize * 1.05;
  const subSize = landscape ? 31 : 29;
  const headlineWidth = landscape ? width * 0.53 : width - pad * 2;
  const showScreenshot = Boolean(campaign.screenshot);
  let device = '';

  if (showScreenshot) {
    const screenshot = resolve(source, 'review-derived-captures', campaign.screenshot);
    const scale = landscape ? 0.83 : (tall ? 1.42 : 0.92);
    const sw = 334 * scale;
    const sh = 600 * scale;
    const sx = landscape ? width - pad - sw : (width - sw) / 2;
    const sy = landscape ? 115 : (tall ? 875 : 625);
    device = `<g transform="translate(${sx} ${sy}) scale(${scale})" filter="url(#shadow)">
      <rect x="-13" y="-13" width="360" height="640" rx="48" fill="${colors.slate}"/>
      <image x="0" y="0" width="334" height="600" preserveAspectRatio="none" href="${dataUri(screenshot)}"/>
    </g>`;
  }

  const headlineY = eyebrowY + 88;
  const subY = headlineY + campaign.headline.length * lineGap + 42;
  const hideSubhead = !landscape && !tall && showScreenshot;
  const body = `
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${width * .9}" cy="${height * .08}" r="${Math.max(width, height) * .48}" fill="url(#glow)"/>
    <g opacity=".12" fill="none" stroke="#ffffff" stroke-width="3"><circle cx="${width * .88}" cy="${height * .16}" r="${width * .12}"/><circle cx="${width * .88}" cy="${height * .16}" r="${width * .19}"/><circle cx="${width * .88}" cy="${height * .16}" r="${width * .27}"/></g>
    ${logoMark(pad, brandY, markSize, true)}
    <text x="${pad + markSize + 24}" y="${brandY + markSize * .62}" fill="${colors.ivory}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${landscape ? 31 : 30}" font-weight="700">Wishlist Wizard</text>
    <text x="${pad}" y="${eyebrowY}" fill="${colors.mint}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${landscape ? 25 : 24}" font-weight="700" letter-spacing="4">${escapeXml(campaign.eyebrow)}</text>
    ${campaign.headline.map((line, index) => `<text x="${pad}" y="${headlineY + index * lineGap}" fill="#ffffff" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${headlineSize}" font-weight="800">${escapeXml(line)}</text>`).join('\n')}
    ${hideSubhead ? '' : wrapWords(campaign.subhead, landscape ? 48 : 42).map((line, index) => `<text x="${pad}" y="${subY + index * subSize * 1.35}" fill="${colors.mint}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${subSize}" font-weight="500">${escapeXml(line)}</text>`).join('\n')}
    <rect x="${pad}" y="${height - pad - 12}" width="150" height="10" rx="5" fill="${colors.gold}"/>
    <text x="${pad + 180}" y="${height - pad}" fill="${colors.mint}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${landscape ? 24 : 22}" font-weight="600">wishlist-wizard.com</text>
    ${device}
    ${!showScreenshot ? logoMark(width * .60, height * .48, Math.min(width, height) * .35, false) : ''}
  `;
  return svgShell(width, height, body);
}

function headerCard(width, height, type) {
  const safeWidth = type === 'youtube' ? 1235 * (width / 2048) : width * .78;
  const titleSize = type === 'x' ? 72 : 78;
  return svgShell(width, height, `
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${width * .12}" cy="${height * .18}" r="${height * .75}" fill="url(#glow)"/>
    <circle cx="${width * .90}" cy="${height * .82}" r="${height * .9}" fill="url(#glow)"/>
    <g opacity=".12" fill="none" stroke="#fff" stroke-width="4"><circle cx="${width * .86}" cy="${height * .18}" r="${height * .22}"/><circle cx="${width * .86}" cy="${height * .18}" r="${height * .34}"/></g>
    <g transform="translate(${(width-safeWidth)/2} 0)">
      ${logoMark(30, height/2-70, 140, true)}
      <text x="200" y="${height/2-5}" fill="#fff" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${titleSize}" font-weight="800">Wishlist Wizard</text>
      <text x="203" y="${height/2+65}" fill="${colors.mint}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="${type === 'x' ? 31 : 35}" font-weight="500">Every occasion, one place.</text>
    </g>
  `);
}

function thumbnail(headline, eyebrow, number) {
  const [width, height] = [1280, 720];
  return svgShell(width, height, `
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="1100" cy="80" r="460" fill="url(#glow)"/>
    ${logoMark(72, 62, 92, true)}
    <text x="186" y="120" fill="${colors.ivory}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="34" font-weight="700">Wishlist Wizard</text>
    <text x="72" y="285" fill="${colors.mint}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="25" font-weight="700" letter-spacing="4">${escapeXml(eyebrow)}</text>
    ${wrapWords(headline, 26).map((line, index) => `<text x="72" y="${405 + index * 82}" fill="#fff" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="76" font-weight="800">${escapeXml(line)}</text>`).join('\n')}
    <rect x="72" y="620" width="150" height="10" rx="5" fill="${colors.gold}"/>
    <circle cx="1140" cy="570" r="78" fill="${colors.gold}"/><text x="1140" y="596" text-anchor="middle" fill="${colors.slate}" font-family="Helvetica Neue,Helvetica,sans-serif" font-size="72" font-weight="800">${number}</text>
  `);
}

copyFileSync(resolve(root, 'icons/icon-wishlist-wizard.svg'), resolve(source, 'logo-master.svg'));
copyFileSync(resolve(root, 'icons/icon-wishlist-wizard.png'), resolve(source, 'app-icon-master-1024.png'));

for (const campaign of campaigns.filter(({ screenshot }) => screenshot)) {
  const sourceCapture = resolve(root, 'output/testflight-screenshots-2026-09-03', campaign.screenshot);
  const curatedCapture = resolve(source, 'review-derived-captures', campaign.screenshot);
  const crop = spawnSync('magick', [sourceCapture, '-crop', '334x600+0+0', '+repage', curatedCapture], { stdio: 'inherit' });
  if (crop.status !== 0) process.exit(crop.status ?? 1);
}

for (const size of [400, 800, 1024]) {
  const target = resolve(generated, 'profiles', `profile-${size}x${size}.png`);
  const result = spawnSync('rsvg-convert', ['--width', String(size), '--height', String(size), '--output', target, resolve(source, 'logo-master.svg')], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const headers = [
  ['youtube', 2560, 1440, 'youtube-banner-2560x1440.png'],
  ['x', 1500, 500, 'x-header-1500x500.png'],
  ['facebook', 1640, 624, 'facebook-cover-1640x624.png'],
];
for (const [type, width, height, file] of headers) {
  render(headerCard(width, height, type), resolve(generated, 'headers', file), width, height);
}

for (const campaign of campaigns) {
  const out = resolve(generated, 'campaigns', campaign.id);
  mkdirSync(out, { recursive: true });
  for (const [format, [width, height]] of Object.entries(formats)) {
    render(campaignCard(campaign, format, width, height), resolve(out, `${campaign.id}-${format}-${width}x${height}.png`), width, height);
  }
}

const thumbnails = [
  ['01-create-a-wishlist', 'HOW TO', 'Create a useful wishlist', '01'],
  ['02-save-product-ideas', 'QUICK TIP', 'Save product ideas as you find them', '02'],
  ['03-share-with-confidence', 'GIFTING GUIDE', 'Share a list people can actually use', '03'],
];
for (const [id, eyebrow, headline, number] of thumbnails) {
  render(thumbnail(headline, eyebrow, number), resolve(generated, 'thumbnails', `${id}-1280x720.png`), 1280, 720);
}

const hashes = [];
for (const path of [
  resolve(source, 'logo-master.svg'),
  resolve(source, 'app-icon-master-1024.png'),
  ...campaigns.filter(({ screenshot }) => screenshot).map(({ screenshot }) => resolve(source, 'review-derived-captures', screenshot)),
]) {
  hashes.push(`${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${relative(library, path)}`);
}
writeFileSync(resolve(inventory, 'source-sha256.txt'), `${hashes.join('\n')}\n`);

const sourceRows = [
  ['canonical-brand', 'icons/icon-wishlist-wizard.svg', 'canonical', 'Primary editable mark'],
  ['canonical-brand', 'icons/icon-wishlist-wizard.png', 'canonical', 'Primary opaque 1024 px raster'],
  ['brand-duplicates', 'packages/web/public/logo.svg', 'reference', 'Matches canonical mark'],
  ['brand-duplicates', 'packages/mobile/assets/logo.svg', 'reference', 'Application logo source'],
  ['brand-duplicates', 'packages/mobile/assets/icon/app_icon.png', 'reference', 'Opaque 1024 px application icon'],
  ['launcher-derivatives', 'packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/', 'exclude-from-library', 'Platform-generated sizes; retain in app package'],
  ['launcher-derivatives', 'packages/mobile/android/app/src/main/res/', 'exclude-from-library', 'Density-specific launcher resources; retain in app package'],
  ['extension-derivatives', 'packages/browser-extension/{src,public}/icons/', 'exclude-from-library', 'Small extension icons; retain in extension package'],
  ['invalid-image', 'attached_assets/image_1747684886573.png', 'do-not-publish', '468x42 checklist/error strip'],
  ['invalid-image', 'packages/web/public/feature-screenshots/feature-demo.png', 'do-not-publish', 'Duplicate 468x42 checklist/error strip'],
  ['persona-cards', 'video-production/assets/cards/', 'reference', 'Coherent 1920x1080 visual precedent; not active social exports'],
  ['persona-video', 'video-production/dist/', 'hold', 'Encodes exist but picture/script were not approved'],
  ['persona-video', 'video-production/review/', 'do-not-publish', 'Review renders only'],
  ['test-artifact', 'playwright-report/data/', 'do-not-publish', 'Automated test evidence'],
];

const captureDirectory = resolve(root, 'output/testflight-screenshots-2026-09-03');
const selectedCaptures = new Set(campaigns.filter(({ screenshot }) => screenshot).map(({ screenshot }) => screenshot));
const defectiveCaptures = new Map([
  ['11-browse.png', 'Placeholder text and severe left-edge clipping'],
  ['14-wishlist-detail-empty.png', 'Left-edge clipping/content bleed'],
  ['24-subscription.png', 'Unable to load subscription data'],
  ['29-scan-add-item.png', 'Left-edge clipping/content bleed'],
]);
for (const file of readdirSync(captureDirectory).filter((name) => name.endsWith('.png')).sort()) {
  const status = defectiveCaptures.has(file)
    ? 'do-not-publish'
    : selectedCaptures.has(file) ? 'curated-review-source' : 'review-evidence';
  const note = defectiveCaptures.get(file)
    ?? (selectedCaptures.has(file) ? 'Upper portion cropped into campaign layout' : 'Not promoted into active library');
  sourceRows.push(['TestFlight-build-13', `output/testflight-screenshots-2026-09-03/${file}`, status, note]);
}

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
writeFileSync(
  resolve(inventory, 'source-index.csv'),
  `group,path,status,notes\n${sourceRows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`,
);

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

const libraryHashes = filesBelow(generated)
  .filter((path) => statSync(path).isFile() && !path.endsWith('/.DS_Store'))
  .sort()
  .map((path) => `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${relative(library, path)}`);
writeFileSync(resolve(inventory, 'library-sha256.txt'), `${libraryHashes.join('\n')}\n`);

console.log(`Generated ${campaigns.length * Object.keys(formats).length + headers.length + thumbnails.length + 3} PNG assets in ${relative(root, generated)}`);
