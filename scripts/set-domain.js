/**
 * Replaces the placeholder domain (YOUR-DOMAIN.example) in every HTML, XML and
 * TXT file with your real domain.
 *
 * Usage:   npm run set-domain -- https://your-site.vercel.app
 */
const fs = require('fs');
const path = require('path');

const PLACEHOLDER_URL = 'https://YOUR-DOMAIN.example';
const PLACEHOLDER_HOST = 'YOUR-DOMAIN.example';
const ROOT = path.join(__dirname, '..');

const arg = (process.argv[2] || '').trim().replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(arg)) {
  console.error('Please pass your site origin, e.g.:  npm run set-domain -- https://your-site.vercel.app');
  process.exit(1);
}
const host = arg.replace('https://', '');

let changed = 0;
for (const file of fs.readdirSync(ROOT)) {
  if (!/\.(html|xml|txt)$/.test(file)) continue;
  const full = path.join(ROOT, file);
  const before = fs.readFileSync(full, 'utf8');
  const after = before.split(PLACEHOLDER_URL).join(arg).split(PLACEHOLDER_HOST).join(host);
  if (after !== before) {
    fs.writeFileSync(full, after);
    console.log('updated', file);
    changed++;
  }
}
console.log(changed ? `Done. ${changed} file(s) updated.` : 'Nothing to update (placeholder not found).');
