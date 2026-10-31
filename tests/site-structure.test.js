/**
 * Site structure test: verifies the content pages, SEO tags, navigation,
 * footer, internal links and static-hosting files.
 * Remaining placeholders are reported as WARNINGS (they do not fail the test).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const PAGES = {
  'index.html': '/',
  'games.html': '/games',
  'about.html': '/about',
  'contact.html': '/contact',
  'privacy-policy.html': '/privacy-policy',
  'terms.html': '/terms',
  '404.html': '/404'
};
const REQUIRED_LINKS = ['/', '/games', '/about', '/contact', '/privacy-policy', '/terms'];

let passed = 0, total = 0;
function test(name, fn) {
  total++;
  try { fn(); console.log(`  [PASS] ${name}`); passed++; }
  catch (e) { console.log(`  [FAIL] ${name}\n         ${e.message}`); process.exitCode = 1; }
}

// Resolve an internal href to a file in the project (supports Vercel cleanUrls)
function resolves(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return fs.existsSync(path.join(ROOT, 'index.html'));
  const rel = clean.replace(/^\//, '');
  return [rel, rel + '.html'].some(c => fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile());
}

console.log('--- Starting Site Structure Test Suite ---');

test('All expected pages exist and are not empty', () => {
  for (const f of Object.keys(PAGES)) {
    assert(fs.existsSync(path.join(ROOT, f)), `${f} is missing`);
    assert(read(f).trim().length > 500, `${f} is empty or too small`);
  }
});

test('Every page has a title, description, h1 (or portal), and lang attribute', () => {
  for (const f of Object.keys(PAGES)) {
    const h = read(f);
    assert(/<html lang="en">/.test(h), `${f}: missing lang`);
    const title = (h.match(/<title>([^<]+)<\/title>/) || [])[1];
    assert(title && title.length >= 15 && title.length <= 70, `${f}: title missing or bad length (${title && title.length})`);
    const desc = (h.match(/<meta name="description" content="([^"]+)"/) || [])[1];
    assert(desc && desc.length >= 50 && desc.length <= 170, `${f}: description missing or bad length (${desc && desc.length})`);
    // <template> content is never rendered, so it does not count toward the page's headings
    const visible = h.replace(/<template[\s\S]*?<\/template>/g, '');
    assert((visible.match(/<h1[ >]/g) || []).length === 1, `${f}: must have exactly one <h1>`);
  }
});

test('Titles and descriptions are unique across pages', () => {
  const titles = new Set(), descs = new Set();
  for (const f of Object.keys(PAGES)) {
    const h = read(f);
    titles.add(h.match(/<title>([^<]+)<\/title>/)[1]);
    descs.add(h.match(/<meta name="description" content="([^"]+)"/)[1]);
  }
  assert.strictEqual(titles.size, Object.keys(PAGES).length, 'duplicate <title>');
  assert.strictEqual(descs.size, Object.keys(PAGES).length, 'duplicate meta description');
});

test('Indexable pages have canonical + Open Graph tags; 404 is noindex', () => {
  for (const f of Object.keys(PAGES)) {
    const h = read(f);
    if (f === '404.html') { assert(/noindex/.test(h), '404 must be noindex'); continue; }
    assert(/<link rel="canonical" href="https:\/\/[^"]+">/.test(h), `${f}: canonical missing`);
    assert(/property="og:title"/.test(h) && /property="og:description"/.test(h), `${f}: og tags missing`);
  }
});

test('Static pages have the shared nav and footer with all links', () => {
  for (const f of Object.keys(PAGES).filter(f => f !== 'index.html')) {
    const h = read(f);
    assert(/<nav class="arcade-navbar"/.test(h), `${f}: navbar missing`);
    assert(/<footer class="arcade-footer site-footer"/.test(h), `${f}: footer missing`);
    for (const l of REQUIRED_LINKS) {
      assert(h.includes(`href="${l}"`), `${f}: missing link to ${l}`);
    }
  }
});

test('Portal (index.html) fallback links + SiteShell renders all links', () => {
  const h = read('index.html');
  for (const l of ['/games', '/about', '/contact', '/privacy-policy', '/terms']) {
    assert(h.includes(`href="${l}"`), `index.html: missing link to ${l}`);
  }
  const { SiteShell } = require('../js/site-shell.js');
  const markup = SiteShell.subnavHTML('/') + SiteShell.footerHTML();
  for (const l of REQUIRED_LINKS) assert(markup.includes(`href="${l}"`), `SiteShell missing ${l}`);
  assert(h.indexOf('js/site-shell.js') < h.indexOf('js/arcade.js'), 'site-shell.js must load before arcade.js');
});

test('All internal links and assets resolve to real files', () => {
  for (const f of Object.keys(PAGES)) {
    const h = read(f);
    const refs = [...h.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
    for (const r of refs) {
      if (/^(https?:|mailto:|data:|#|tel:)/.test(r)) continue;
      const ok = resolves(r.startsWith('/') || r.startsWith('css') || r.startsWith('js') ? (r.startsWith('/') ? r : '/' + r) : '/' + r);
      assert(ok, `${f}: broken reference "${r}"`);
    }
  }
});

test('In-page anchors (#id) point to existing ids', () => {
  for (const f of ['privacy-policy.html', 'terms.html', 'about.html', 'contact.html']) {
    const h = read(f);
    const ids = new Set([...h.matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
    for (const m of h.matchAll(/href="#([^"]+)"/g)) {
      assert(ids.has(m[1]), `${f}: anchor #${m[1]} has no matching id`);
    }
  }
  // cross-page anchors used on the contact page
  const priv = read('privacy-policy.html');
  assert(/id="local-storage"/.test(priv) && /id="your-rights"/.test(priv), 'privacy anchors missing');
});

test('Games page lists all 10 games with working play links', () => {
  const { ARCADE_GAMES } = require('../js/arcade.js');
  assert.strictEqual(ARCADE_GAMES.length, 10);
  const h = read('games.html');
  for (const g of ARCADE_GAMES) {
    assert(h.includes(`href="/#/game/${g.id}"`), `games.html: no link for ${g.id}`);
  }
});

test('Contact form: required fields, honeypot, consent, endpoint, script', () => {
  const h = read('contact.html');
  for (const n of ['name', 'email', 'topic', 'message', '_gotcha', 'consent']) {
    assert(new RegExp(`name="${n}"`).test(h), `contact form missing field ${n}`);
  }
  assert(/<form id="contact-form"[^>]*method="POST"/.test(h), 'form must POST');
  assert(/action="https:\/\/formspree\.io\/f\//.test(h), 'form action missing');
  assert(h.includes('/js/contact.js'), 'contact.js not loaded');
  assert(h.includes('href="/privacy-policy"'), 'consent must link to privacy policy');
});

test('Privacy policy lists every localStorage key used by the code', () => {
  const priv = read('privacy-policy.html');
  const keys = new Set();
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    if (!p.endsWith('.js')) return;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/(?:storageKey\s*=|favKey\s*=|recentKey\s*=|localStorage\.(?:get|set)Item\()\s*'([a-z0-9_]+)'/gi)) keys.add(m[1]);
  });
  walk(path.join(ROOT, 'js'));
  assert(keys.size >= 12, `expected >= 12 storage keys, found ${keys.size}`);
  for (const k of keys) assert(priv.includes(k), `privacy policy does not mention storage key "${k}"`);
});

test('Code sets no cookies (privacy policy statement stays true)', () => {
  const walk = (d, out = []) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : out.push(p); }); return out; };
  for (const f of walk(path.join(ROOT, 'js'))) {
    assert(!/document\.cookie/.test(fs.readFileSync(f, 'utf8')), `${path.relative(ROOT, f)} uses document.cookie`);
  }
});

test('Static hosting files: vercel.json, robots.txt, sitemap.xml', () => {
  JSON.parse(read('vercel.json'));
  assert(/Sitemap:/.test(read('robots.txt')), 'robots.txt needs a Sitemap line');
  const sm = read('sitemap.xml');
  for (const l of REQUIRED_LINKS.filter(l => l !== '/')) assert(sm.includes(l + '</loc>'), `sitemap missing ${l}`);
});

test('All 10 game scripts are still loaded by index.html', () => {
  const h = read('index.html');
  for (const g of ['snake', 'brick-breaker', 'space-shooter', 'puzzle-2048', 'tic-tac-toe', 'memory-match', 'endless-runner', 'block-puzzle', 'whack-a-mole']) {
    assert(h.includes(`js/games/${g}.js`), `index.html lost script for ${g}`);
  }
  assert(h.includes('js/game.js') && h.includes('js/fruit.js'), 'Fruit Slice scripts missing');
});

console.log(`\nResults: ${passed}/${total} tests passed.`);

// Non-failing report: placeholders that must be filled before going live
const warnings = [];
for (const f of Object.keys(PAGES).concat(['robots.txt', 'sitemap.xml'])) {
  const h = read(f);
  const n = (h.match(/PLACEHOLDER:/g) || []).length;
  if (n) warnings.push(`${f}: ${n} text placeholder(s)`);
  if (/YOUR-DOMAIN\.example/.test(h)) warnings.push(`${f}: still uses YOUR-DOMAIN.example (run: npm run set-domain -- https://your-site)`);
  if (/YOUR_FORM_ID/.test(h)) warnings.push(`${f}: contact form endpoint still YOUR_FORM_ID`);
}
if (warnings.length) {
  console.log('\nBEFORE GOING LIVE / APPLYING TO ADSENSE - still to fill in:');
  warnings.forEach(w => console.log('  [TODO] ' + w));
}
