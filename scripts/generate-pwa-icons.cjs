const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function run() {
  const svgPath = path.join(__dirname, "../public/icon.svg");
  const publicDir = path.join(__dirname, "../public");

  // 1. Regular 512x512
  await sharp(svgPath).resize(512, 512).png().toFile(path.join(publicDir, "pwa-512x512.png"));
  console.log("Generated pwa-512x512.png");

  // 2. Regular 192x192
  await sharp(svgPath).resize(192, 192).png().toFile(path.join(publicDir, "pwa-192x192.png"));
  console.log("Generated pwa-192x192.png");

  // 3. Apple Touch Icon 180x180
  await sharp(svgPath).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");

  // 4. Maskable 512x512 with safe zone:
  // Android maskable requires the emblem to be inside the inner 80% circle (radius ~204px).
  // Full-bleed background with no rounded corners on the SVG canvas.
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ba3c1e"/>
        <stop offset="45%" stop-color="#932b16"/>
        <stop offset="100%" stop-color="#5a190c"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffde73"/>
        <stop offset="50%" stop-color="#f5ba3b"/>
        <stop offset="100%" stop-color="#d48a1a"/>
      </linearGradient>
      <linearGradient id="ivoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#faebd7"/>
      </linearGradient>
    </defs>
    <!-- Full-bleed background without border radius for maskable container -->
    <rect width="512" height="512" fill="url(#bgGrad)"/>
    
    <!-- Central emblem scaled inside 74% safe zone (center = 256, 256) -->
    <g transform="translate(66.5, 66.5) scale(0.74)">
      <circle cx="256" cy="256" r="195" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-dasharray="6 8" opacity="0.45"/>
      <circle cx="256" cy="256" r="172" fill="none" stroke="#f5ba3b" stroke-width="2" opacity="0.3"/>

      <!-- Diya vessel -->
      <path d="M148 298 C148 372, 364 372, 364 298 C364 262, 334 246, 256 246 C178 246, 148 262, 148 298 Z" fill="url(#goldGrad)"/>
      <path d="M214 366 L298 366 L310 392 C310 395, 306 398, 300 398 L212 398 C206 398, 202 395, 202 392 Z" fill="#d48a1a"/>
      <ellipse cx="256" cy="272" rx="92" ry="18" fill="url(#ivoryGrad)" opacity="0.95"/>
      <ellipse cx="256" cy="272" rx="72" ry="11" fill="#932b16"/>

      <!-- Flame -->
      <path d="M256 122 C268 162, 310 196, 310 232 C310 262, 286 284, 256 284 C226 284, 202 262, 202 232 C202 196, 244 162, 256 122 Z" fill="url(#goldGrad)"/>
      <path d="M256 156 C263 182, 288 205, 288 230 C288 248, 274 262, 256 262 C238 262, 224 248, 224 230 C224 205, 249 182, 256 156 Z" fill="url(#ivoryGrad)"/>

      <!-- Sparkles -->
      <path d="M356 142 Q356 162 376 162 Q356 162 356 182 Q356 162 336 162 Q356 162 356 142 Z" fill="url(#goldGrad)"/>
      <path d="M162 172 Q162 184 174 184 Q162 184 162 196 Q162 184 150 184 Q162 184 162 172 Z" fill="#ffde73" opacity="0.85"/>
      <path d="M228 206 C238 196, 274 196, 274 214 C274 232, 238 234, 238 252 C238 262, 254 268, 270 260" fill="none" stroke="#ba3c1e" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "pwa-maskable-512x512.png"));
  console.log("Generated pwa-maskable-512x512.png");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
