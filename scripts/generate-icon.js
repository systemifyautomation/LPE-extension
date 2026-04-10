// Run once: node scripts/generate-icon.js
// Generates assets/icon.png (128x128) for the extension

const path = require("path")
const fs   = require("fs")

const sharp = require(path.join(__dirname, "../node_modules/sharp"))

const assetsDir = path.join(__dirname, "../assets")
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })

// LPE icon: navy square, orange border, white "LPE" text
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <!-- Navy background -->
  <rect width="128" height="128" rx="22" fill="#0D2156"/>
  <!-- Orange border frame -->
  <rect x="8" y="8" width="112" height="112" rx="16" fill="none" stroke="#E8821A" stroke-width="6"/>
  <!-- White LPE text -->
  <text
    x="64" y="76"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="42"
    fill="#FFFFFF"
    text-anchor="middle"
    letter-spacing="-1"
  >LPE</text>
  <!-- Orange accent dot top-right -->
  <circle cx="108" cy="20" r="8" fill="#E8821A"/>
</svg>
`

sharp(Buffer.from(svgIcon))
  .resize(128, 128)
  .png()
  .toFile(path.join(assetsDir, "icon.png"))
  .then(() => console.log("✓ assets/icon.png created"))
  .catch((err) => {
    console.error("Failed to generate icon:", err.message)
    process.exit(1)
  })
