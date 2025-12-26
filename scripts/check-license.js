const fs = require('fs');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync('LICENSE')) fail('LICENSE file is missing');
if (!fs.existsSync('package.json')) fail('package.json is missing');

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
} catch (e) {
  fail(`Failed to parse package.json: ${e.message}`);
}

if (!pkg.license || typeof pkg.license !== 'string' || pkg.license.trim() === '') {
  fail('package.json license field is missing/empty');
}

console.log(`OK: LICENSE present, package.json license=${pkg.license}`);
