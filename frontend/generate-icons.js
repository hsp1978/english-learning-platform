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

    // 512x512 maskable icon (with padding)
    await sharp(Buffer.from(svgTemplate(512)))
      .extend({
        top: 52,
        bottom: 52,
        left: 52,
        right: 52,
        background: '#FF6B9D'
      })
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'maskable-512.png'));
    console.log('✓ Generated maskable-512.png');

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
