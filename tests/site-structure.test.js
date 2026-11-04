/**
 * Site structure test: verifies the content pages, SEO tags, navigation,
 * footer, internal links, static-hosting files, and the consistency of the
 * legal / contact pages (confirmed contact details, Formspree endpoint,
 * no leftover placeholders, no premature advertising or consent claims,
 * All Rights Reserved licensing).
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

// Collect every public origin used for SEO purposes across the project
function collectOrigins() {
  const origins = [];
  const add = (where, url) => origins.push({ where, origin: url.match(/^https?:\/\/[^\/"'\s<]+/)[0] });
  for (const f of Object.keys(PAGES)) {
    const h = read(f);
    const canon = h.match(/<link rel="canonical" href="([^"]+)"/);
    if (canon) add(`${f} canonical`, canon[1]);
    const og = h.match(/property="og:url" content="([^"]+)"/);
    if (og) add(`${f} og:url`, og[1]);
  }
  const ld = read('index.html').match(/"url":\s*"([^"]+)"/);
  if (ld) add('index.html JSON-LD', ld[1]);
  for (const m of read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)) add('sitemap.xml <loc>', m[1]);
  const robots = read('robots.txt').match(/Sitemap:\s*(\S+)/);
  if (robots) add('robots.txt Sitemap', robots[1]);
  return origins;
}

test('One consistent domain is used in canonicals, og:url, JSON-LD, sitemap and robots', () => {
  const origins = collectOrigins();
  assert(origins.length >= 12, `expected at least 12 domain references, found ${origins.length}`);
  const unique = [...new Set(origins.map(o => o.origin))];
  assert.strictEqual(
    unique.length, 1,
    'mixed domains found: ' + unique.join(', ') + ' (run npm run set-domain to fix)'
  );
});

test('Privacy policy mentions the same host as the canonical domain', () => {
  const origin = collectOrigins()[0].origin;
  const host = origin.replace(/^https?:\/\//, '');
  assert(read('privacy-policy.html').includes(host), `privacy-policy.html does not mention ${host}`);
});

// ---------------------------------------------------------------------------
// Legal / trust pages: confirmed facts, consistency and "no premature claims"
// ---------------------------------------------------------------------------
const CONFIRMED = {
  email: 'zaim926awan@gmail.com',
  formEndpoint: 'https://formspree.io/f/xaeepjol',
  vercelPrivacy: 'https://vercel.com/legal/privacy-policy',
  formspreePrivacy: 'https://formspree.io/legal/privacy-policy/'
};
// Visible text of a page's <main> (tags and entities simplified)
function mainText(file) {
  const h = read(file);
  const m = h.match(/<main[\s\S]*?<\/main>/);
  return (m ? m[0] : h)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').replace(/&mdash;/g, '-').replace(/&copy;/g, '(c)')
    .replace(/\s+/g, ' ');
}
const LEGAL_PAGES = ['about.html', 'contact.html', 'privacy-policy.html', 'terms.html'];

test('No placeholders, placeholder domain or placeholder form ID remain anywhere', () => {
  const files = Object.keys(PAGES).concat(['robots.txt', 'sitemap.xml']);
  for (const f of files) {
    const h = read(f);
    assert(!/PLACEHOLDER:/.test(h), `${f}: still contains a [PLACEHOLDER: ...] marker`);
    assert(!/YOUR-DOMAIN\.example/.test(h), `${f}: still uses the placeholder domain`);
    assert(!/YOUR_FORM_ID/.test(h), `${f}: still uses the placeholder form ID`);
    assert(!/<mark class="placeholder"/.test(h), `${f}: still contains a highlighted placeholder`);
  }
});

test('Contact form posts to the confirmed Formspree endpoint and is accessible', () => {
  const h = read('contact.html');
  assert(h.includes(`action="${CONFIRMED.formEndpoint}"`), 'form action must be the confirmed Formspree endpoint');
  assert(/<form id="contact-form"[^>]*method="POST"/.test(h), 'form must POST');
  for (const id of ['cf-name', 'cf-email', 'cf-topic', 'cf-message', 'cf-consent']) {
    assert(new RegExp(`<label[^>]*for="${id}"`).test(h), `missing <label for="${id}">`);
    assert(new RegExp(`id="${id}"[^>]*required`).test(h), `${id} must be required`);
  }
  for (const n of ['name', 'email', 'topic', 'message', 'consent']) {
    assert(h.includes(`id="err-${n}"`), `missing inline error element for ${n}`);
  }
  assert(/id="form-status"[^>]*role="status"[^>]*aria-live="polite"/.test(h), 'status region must be announced to screen readers');
  const js = read('js/contact.js');
  assert(js.includes('formspree\\.io\\/f\\/'), 'contact.js must validate the Formspree endpoint');
  assert(/aria-invalid/.test(js) && /Accept/.test(js), 'contact.js must flag invalid fields and request JSON');
});

test('Public email and 12-hour response time appear consistently; no postal address', () => {
  for (const f of ['contact.html', 'privacy-policy.html', 'terms.html', 'about.html']) {
    assert(read(f).includes(`mailto:${CONFIRMED.email}`), `${f}: missing mailto link to ${CONFIRMED.email}`);
  }
  assert(/within 12 hours/.test(mainText('contact.html')), 'contact page must state the 12-hour response time');
  for (const f of LEGAL_PAGES) {
    assert(!/postal address|mailing address|street address/i.test(mainText(f)), `${f}: must not display a postal address`);
  }
});

test('Privacy Policy discloses Formspree, Vercel, Google Fonts; no analytics; retention; 13+', () => {
  const h = read('privacy-policy.html');
  const t = mainText('privacy-policy.html');
  assert(h.includes(CONFIRMED.formspreePrivacy), 'missing Formspree privacy link');
  assert(h.includes(CONFIRMED.vercelPrivacy), 'missing Vercel privacy link');
  assert(/Formspree/.test(t) && /Vercel/.test(t) && /Google Fonts/.test(t), 'must name all three services');
  assert(/do not currently use analytics/i.test(t), 'must state that analytics are not currently used');
  assert(/12 months/.test(t), 'must state the 12-month retention period');
  assert(/at least 13/.test(t) && /not specifically directed at children/.test(t), 'must state the 13+ general-audience position');
  assert(/Last updated: \d{1,2} [A-Z][a-z]+ 20\d\d/.test(t), 'must show a Last updated date');
});

test('Advertising and consent are described as planned, never as already running', () => {
  const privacy = mainText('privacy-policy.html');
  const terms = mainText('terms.html');
  const about = mainText('about.html');
  assert(/does not display advertising/.test(privacy), 'privacy: must say no advertising is displayed yet');
  assert(/No consent-management tool is installed/.test(privacy), 'privacy: must say no consent tool is installed');
  assert(/Before any advertising goes live, we will update this policy/.test(privacy), 'privacy: must promise an update before ads go live');
  assert(/no advertising is shown/.test(terms), 'terms: must say no advertising is shown yet');
  assert(/does not display any advertising/.test(about), 'about: must say no advertising is displayed yet');
  const forbidden = [
    /we (currently )?(use|run|show|display|serve) (Google )?AdSense/i,
    /ads are (currently )?(shown|displayed|served|running)/i,
    /our (consent|cookie)[- ](management )?(tool|banner|platform) (is|has been) (installed|enabled|in place)/i,
    /(footer|privacy settings) link (to|that lets|which lets)/i,
    /you can (change|withdraw|manage) (your )?consent (at any time )?(using|via|through) the/i,
    /fully compliant|guarantee[sd]? (approval|compliance)/i
  ];
  for (const f of LEGAL_PAGES) {
    const t = mainText(f);
    for (const re of forbidden) assert(!re.test(t), `${f}: contains a premature or unsafe claim matching ${re}`);
  }
});

test('Terms: 13+, Pakistan governing law, Pakistani courts, third-party font licences', () => {
  const t = mainText('terms.html');
  assert(/at least 13 years old/.test(t), 'terms must state the minimum age');
  assert(/laws of Pakistan/.test(t) && /courts of Pakistan/.test(t), 'terms must state governing law and courts');
  assert(/mandatory consumer protections/.test(t), 'terms must keep mandatory consumer protections');
  assert(/Outfit/.test(t) && /SIL Open Font License/.test(t), 'terms must credit the Outfit licence');
  assert(/Luckiest Guy/.test(t) && /Apache License, Version 2\.0/.test(t), 'terms must credit the Luckiest Guy licence');
  assert(/created with the assistance of AI tools/.test(t), 'terms must describe AI assistance carefully');
  assert(/Last updated: \d{1,2} [A-Z][a-z]+ 20\d\d/.test(t), 'terms must show a Last updated date');
});

test('All Rights Reserved: no MIT/open-source licence claims in metadata, README or pages', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(pkg.license, 'UNLICENSED', 'package.json license must be UNLICENSED');
  assert.strictEqual(pkg.private, true, 'package.json must be private');
  const readme = read('README.md');
  assert(/All Rights Reserved/.test(readme), 'README must state All Rights Reserved');
  assert(!/\bMIT\b/.test(readme) && !/\bMIT\b/.test(JSON.stringify(pkg)), 'MIT must not appear in README or package.json');
  assert(!fs.existsSync(path.join(ROOT, 'LICENSE')), 'no LICENSE file should grant an open-source licence');
  for (const f of LEGAL_PAGES) assert(!/\bMIT\b/.test(read(f)), `${f}: must not mention the MIT licence`);
  assert(/All rights reserved/.test(read('js/site-shell.js')), 'portal footer must say All rights reserved');
  assert(/All rights reserved/.test(read('about.html')), 'static footer must say All rights reserved');
});

console.log(`\nResults: ${passed}/${total} tests passed.`);

// Report: domain status (placeholders are now a hard test failure above)
const currentOrigin = collectOrigins()[0].origin;
console.log('');
console.log(`Domain status: set to ${currentOrigin}`);
console.log('Manual steps still required before enabling advertising: see "Before enabling Google AdSense" in README.md.');
