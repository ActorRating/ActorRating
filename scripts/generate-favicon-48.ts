import sharp from 'sharp';
import { join } from 'path';

async function generateFavicon48() {
  const logoPath = join(process.cwd(), 'public', 'logos', 'favicon-32x32.png');
  const outputPath = join(process.cwd(), 'public', 'favicon-48.png');

  try {
    // Create a 48x48 solid background (black)
    const background = sharp({
      create: {
        width: 48,
        height: 48,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Solid black, no transparency
      }
    });

    // Load and resize the logo to fit with padding (about 36x36 to leave 6px padding on each side)
    const logo = await sharp(logoPath)
      .resize(36, 36, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background for the logo itself
      })
      .toBuffer();

    // Composite the logo onto the center of the background
    await background
      .composite([
        {
          input: logo,
          top: 6, // 6px padding from top
          left: 6, // 6px padding from left
        }
      ])
      .png()
      .toFile(outputPath);

    console.log(`✅ Created favicon-48.png at ${outputPath}`);
  } catch (error) {
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateFavicon48();
