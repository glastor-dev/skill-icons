const fs = require('fs');

function readPackageVersion() {
  try {
    const pkg = JSON.parse(String(fs.readFileSync('./package.json')));
    if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  } catch {
    // ignore
  }
  return '0.0.0';
}

const iconsDir = fs
  .readdirSync('./icons')
  .filter(name => name.toLowerCase().endsWith('.svg'))
  .sort((a, b) => a.localeCompare(b, 'en'));

const icons = {};
for (const icon of iconsDir) {
  const name = icon.replace(/\.svg$/i, '').toLowerCase();
  icons[name] = String(fs.readFileSync(`./icons/${icon}`));
}

if (!fs.existsSync('./dist')) fs.mkdirSync('./dist');
fs.writeFileSync('./dist/icons.json', JSON.stringify(icons));

const meta = {
  version: readPackageVersion(),
};
fs.writeFileSync('./dist/meta.json', JSON.stringify(meta));
