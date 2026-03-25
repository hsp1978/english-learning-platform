const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG template with emoji
const svgTemplate = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#FF6B9D" rx="${size * 0.15}"/>
  <text
    x="50%"
    y="50%"
    font-size="${size * 0.65}"
    text-anchor="middle"
    dominant-baseline="central"
    fill="white"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="bold"
  >🧚</text>
</svg>
`;

// Generate icons
async function generateIcons() {
  try {
    // 192x192 icon
    await sharp(Buffer.from(svgTemplate(192)))
      .png()
      .toFile(path.join(iconsDir, 'icon-192.png'));
    console.log('✓ Generated icon-192.png');

    // 512x512 icon
    await sharp(Buffer.from(svgTemplate(512)))
      .png()
      .toFile(path.join(iconsDir, 'icon-512.png'));
    console.log('✓ Generated icon-512.png');

    // 512x512 maskable icon (with safe zone padding - 10% on each side)
    // Create a 410x410 icon first (80% of 512), then add padding
    const smallIcon = svgTemplate(410);
    await sharp(Buffer.from(smallIcon))
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: '#FF6B9D'
      })
      .png()
      .toFile(path.join(iconsDir, 'maskable-512.png'));
    console.log('✓ Generated maskable-512.png');

    // Generate screenshots for PWA
    const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Mobile screenshot (540x720 - narrow form factor)
    const mobileScreenshot = `
<svg width="540" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF5F7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFE8F0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="540" height="720" fill="url(#bgGrad)"/>

  <!-- Header -->
  <rect x="0" y="0" width="540" height="80" fill="#FF6B9D" opacity="0.15"/>
  <circle cx="40" cy="40" r="20" fill="#FF6B9D"/>
  <text x="70" y="50" font-size="24" font-weight="bold" fill="#FF6B9D" font-family="system-ui, -apple-system, sans-serif">English Fairy</text>

  <!-- Content area -->
  <circle cx="270" cy="280" r="100" fill="#FF6B9D" opacity="0.1"/>
  <text x="270" y="300" font-size="80" text-anchor="middle" fill="#FF6B9D">🧚</text>

  <text x="270" y="420" font-size="28" font-weight="bold" text-anchor="middle" fill="#333" font-family="system-ui, -apple-system, sans-serif">놀이로 배우는</text>
  <text x="270" y="460" font-size="28" font-weight="bold" text-anchor="middle" fill="#333" font-family="system-ui, -apple-system, sans-serif">초등 영어</text>

  <rect x="70" y="520" width="400" height="60" rx="30" fill="#FF6B9D"/>
  <text x="270" y="557" font-size="22" font-weight="bold" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif">학습 시작하기</text>
</svg>
`;
    await sharp(Buffer.from(mobileScreenshot))
      .png()
      .toFile(path.join(screenshotsDir, 'mobile.png'));
    console.log('✓ Generated mobile screenshot');

    // Desktop screenshot (1280x720 - wide form factor)
    const desktopScreenshot = `
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF5F7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFE8F0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bgGrad2)"/>

  <!-- Header -->
  <rect x="0" y="0" width="1280" height="100" fill="#FF6B9D" opacity="0.15"/>
  <circle cx="60" cy="50" r="25" fill="#FF6B9D"/>
  <text x="95" y="60" font-size="28" font-weight="bold" fill="#FF6B9D" font-family="system-ui, -apple-system, sans-serif">English Fairy</text>

  <!-- Left side content -->
  <circle cx="420" cy="400" r="120" fill="#FF6B9D" opacity="0.1"/>
  <text x="420" y="430" font-size="100" text-anchor="middle" fill="#FF6B9D">🧚</text>

  <!-- Right side content -->
  <text x="800" y="280" font-size="42" font-weight="bold" fill="#333" font-family="system-ui, -apple-system, sans-serif">놀이로 배우는 초등 영어</text>
  <text x="800" y="340" font-size="20" fill="#666" font-family="system-ui, -apple-system, sans-serif">파닉스부터 스토리까지</text>
  <text x="800" y="375" font-size="20" fill="#666" font-family="system-ui, -apple-system, sans-serif">AI와 함께하는 재미있는 영어 학습</text>

  <rect x="800" y="430" width="300" height="70" rx="35" fill="#FF6B9D"/>
  <text x="950" y="475" font-size="26" font-weight="bold" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif">학습 시작하기</text>
</svg>
`;
    await sharp(Buffer.from(desktopScreenshot))
      .png()
      .toFile(path.join(screenshotsDir, 'desktop.png'));
    console.log('✓ Generated desktop screenshot');

    console.log('\n✅ All icons and screenshots generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
