/* eslint-disable no-console */

const fs = require('fs');

function usage() {
  console.error('Usage: node scripts/extract-changelog.js <version>');
  console.error('Example: node scripts/extract-changelog.js 1.0.1');
}

function normalizeVersion(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  return raw.startsWith('v') ? raw.slice(1) : raw;
}

function extractSection(markdown, version) {
  // Very small parser: looks for a heading exactly "## <version>" (optionally "## v<version>")
  // and returns everything until the next "## " heading.
  const lines = markdown.split(/\r?\n/);

  const isHeader = line => /^##\s+/.test(line);
  const headerMatches = line => {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) return null;
    const h = m[1].trim();
    return h;
  };

  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const h = headerMatches(lines[i]);
    if (!h) continue;
    if (h === version || h === `v${version}`) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) return null;

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (isHeader(lines[i])) {
      endIndex = i;
      break;
    }
  }

  // Return the heading + section body.
  const section = lines.slice(startIndex, endIndex).join('\n').trim();
  return section;
}

function main() {
  const version = normalizeVersion(process.argv[2]);
  if (!version) {
    usage();
    process.exit(2);
  }

  const changelogPath = './CHANGELOG.md';
  if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.md not found');
    process.exit(2);
  }

  const md = String(fs.readFileSync(changelogPath));
  const section = extractSection(md, version);

  if (!section) {
    // Fallback to the whole changelog if the version is missing.
    console.log(`# Release ${version}\n\n(No matching section in CHANGELOG.md)`);
    return;
  }

  // Add a small standard footer.
  const footer =
    '\n\n---\n\n' +
    '**Deploy (workers.dev)**\n\n' +
    '- CI: configura el secret `CF_API_TOKEN` y haz push a `main`.\n' +
    '- Manual: `CLOUDFLARE_API_TOKEN=...` y luego `yarn deploy`.\n';
  const out = `${section}${footer}`;
  console.log(out);
}

main();
