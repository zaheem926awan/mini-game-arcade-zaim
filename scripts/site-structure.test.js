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
    assert(h.includes(`href="/game/${g.slug}"`), `games.html: no link to the /game/${g.slug} page for ${g.id}`);
  }
  assert(!h.includes('#/game/'), 'games.html must link to the direct game pages, not the hash routes');
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
    // Direct storage calls, key properties, and Fruit Slice's readStore()/writeStore() helpers in js/game.js
    for (const m of src.matchAll(/(?:storageKey\s*=|favKey\s*=|recentKey\s*=|localStorage\.(?:get|set)Item\(|(?:readStore|writeStore)\()\s*'([a-z0-9_]+)'/gi)) keys.add(m[1]);
  });
  walk(path.join(ROOT, 'js'));
  assert(keys.size >= 12, `expected >= 12 storage keys, found ${keys.size}`);
  for (const k of keys) assert(priv.includes(k), `privacy policy does not mention storage key "${k}"`);

  // The catalog's score keys (used to show best scores on the cards) must be among the detected keys
  const { ARCADE_GAMES } = require('../js/arcade.js');
  for (const g of ARCADE_GAMES.filter(g => g.scoreKey)) assert(keys.has(g.scoreKey), `catalog score key "${g.scoreKey}" was not detected in the code`);

  // Reverse check: every storage key the policy lists is really used by the code
  const listed = [...priv.matchAll(/<code>([^<]+)<\/code>/g)]
    .flatMap(m => m[1].split(',').map(x => x.trim()))
    .filter(x => /^[a-z0-9]+(_[a-z0-9]+)+$/.test(x));
  assert(listed.length > 0, 'privacy policy should list storage keys');
  for (const k of listed) assert(keys.has(k), `privacy policy lists "${k}" but no code uses it`);
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

test('Privacy Policy discloses Formspree, Vercel, Google Fonts, Google Analytics 4; retention; 13+', () => {
  const h = read('privacy-policy.html');
  const t = mainText('privacy-policy.html');
  assert(h.includes(CONFIRMED.formspreePrivacy), 'missing Formspree privacy link');
  assert(h.includes(CONFIRMED.vercelPrivacy), 'missing Vercel privacy link');
  assert(/Formspree/.test(t) && /Vercel/.test(t) && /Google Fonts/.test(t), 'must name all three services');
  assert(/Google Analytics 4/.test(t) && /cookies and similar technologies/.test(t), 'must disclose Google Analytics 4 and its cookies');
  assert(!/do not (currently )?use analytics|do not currently use analytics tools|before we enable advertising or analytics/i.test(t), 'must not contain the outdated no-analytics statements');
  assert(/id="google-analytics"/.test(h) && /href="#google-analytics"/.test(h), 'Google Analytics section and Contents entry must exist');
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

// ---------------------------------------------------------------------------
// /play guide pages (Phase 1): one SEO content page per game, linking to the
// existing hash routes. The game engines and routes themselves are untouched.
// ---------------------------------------------------------------------------
const PLAY_SLUGS = {
  'fruit-slice': 'fruit-slice',
  'snake': 'neon-snake',
  'brick-breaker': 'brick-breaker',
  'space-shooter': 'space-shooter',
  'puzzle-2048': '2048-puzzle',
  'tic-tac-toe': 'tic-tac-toe',
  'memory-match': 'memory-match',
  'endless-runner': 'endless-runner',
  'block-puzzle': 'block-puzzle',
  'whack-a-mole': 'whack-a-mole'
};
const PLAY_FILES = Object.values(PLAY_SLUGS).map(s => `play/${s}.html`);
const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&rsquo;/g, "'").replace(/&rsaquo;/g, '>');
const playHtml = (slug) => read(`play/${slug}.html`);
const metaOf = (h) => ({
  title: decodeEntities((h.match(/<title>([^<]+)<\/title>/) || [])[1] || ''),
  desc: decodeEntities((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''),
  canonical: (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1],
  h1: decodeEntities(((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, ''))
});
const jsonLdOf = (h) => JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test('Play guides: one page per game, mapped to the real route ids', () => {
  const { ARCADE_GAMES } = require('../js/arcade.js');
  assert.deepStrictEqual(Object.keys(PLAY_SLUGS).sort(), ARCADE_GAMES.map(g => g.id).sort(), 'PLAY_SLUGS must cover exactly the catalog ids');
  assert.strictEqual(new Set(Object.values(PLAY_SLUGS)).size, 10, 'slugs must be unique');
  for (const f of PLAY_FILES) {
    assert(fs.existsSync(path.join(ROOT, f)), `${f} is missing`);
    assert(read(f).trim().length > 5000, `${f} is too small to be a useful guide`);
  }
  const files = fs.readdirSync(path.join(ROOT, 'play')).filter(f => f.endsWith('.html')).sort();
  assert.deepStrictEqual(files, Object.values(PLAY_SLUGS).map(s => s + '.html').sort(), 'play/ must contain exactly the 10 guide pages');
});

test('Play guides: title, description, lang, robots and exactly one h1', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug), m = metaOf(h);
    assert(/<html lang="en">/.test(h), `${slug}: missing lang`);
    assert(m.title.length >= 15 && m.title.length <= 70, `${slug}: title length ${m.title.length}`);
    assert(m.desc.length >= 50 && m.desc.length <= 170, `${slug}: description length ${m.desc.length}`);
    assert(/<meta name="robots" content="index, follow">/.test(h), `${slug}: must be indexable`);
    assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, `${slug}: must have exactly one <h1>`);
  }
});

test('Play guides: titles, descriptions and h1s are unique across the whole site', () => {
  const titles = [], descs = [], h1s = [];
  for (const f of Object.keys(PAGES)) {
    const h = read(f);
    titles.push(decodeEntities(h.match(/<title>([^<]+)<\/title>/)[1]));
    descs.push(decodeEntities(h.match(/<meta name="description" content="([^"]+)"/)[1]));
  }
  for (const slug of Object.values(PLAY_SLUGS)) {
    const m = metaOf(playHtml(slug));
    titles.push(m.title); descs.push(m.desc); h1s.push(m.h1);
  }
  assert.strictEqual(new Set(titles).size, titles.length, 'duplicate <title> found');
  assert.strictEqual(new Set(descs).size, descs.length, 'duplicate meta description found');
  assert.strictEqual(new Set(h1s).size, h1s.length, 'duplicate <h1> among guide pages');
});

test('Play guides: canonical, Open Graph and Twitter tags use the site domain and the page URL', () => {
  const origin = collectOrigins()[0].origin;
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug), m = metaOf(h), url = `${origin}/play/${slug}`;
    assert.strictEqual(m.canonical, url, `${slug}: canonical must be ${url}`);
    assert(h.includes(`<meta property="og:url" content="${url}">`), `${slug}: og:url mismatch`);
    for (const p of ['og:title', 'og:description', 'og:site_name', 'og:type']) assert(h.includes(`property="${p}"`), `${slug}: ${p} missing`);
    assert(/name="twitter:title"/.test(h) && /name="twitter:description"/.test(h), `${slug}: twitter tags missing`);
    const ogTitle = decodeEntities(h.match(/property="og:title" content="([^"]*)"/)[1]);
    assert.strictEqual(ogTitle, m.title, `${slug}: og:title must match <title>`);
  }
});

test('Play guides: shared navigation, footer and breadcrumb', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug);
    assert(/<nav class="arcade-navbar"/.test(h), `${slug}: navbar missing`);
    assert(/<footer class="arcade-footer site-footer"/.test(h), `${slug}: footer missing`);
    for (const l of REQUIRED_LINKS) assert(h.includes(`href="${l}"`), `${slug}: missing link to ${l}`);
    assert(/<nav class="breadcrumbs"[^>]*>.*href="\/games".*<\/nav>/.test(h), `${slug}: breadcrumb must link to /games`);
    for (const css of ['/css/style.css', '/css/arcade.css', '/css/pages.css']) assert(h.includes(`href="${css}"`), `${slug}: ${css} not loaded with an absolute path`);
  }
});

test('Play guides: Play Now button points to the game\'s own /game/ page and no other game page', () => {
  for (const [id, slug] of Object.entries(PLAY_SLUGS)) {
    const h = playHtml(slug);
    const route = `/game/${slug}`;
    assert(new RegExp(`<a class="btn-link" href="${route.replace(/\//g, '\\/')}">Play [^<]+ now</a>`).test(h), `${slug}: Play Now button for ${route} missing`);
    const heroEnd = h.indexOf('</section>', h.indexOf('class="page-hero"'));
    assert(h.slice(0, heroEnd).includes(`href="${route}"`), `${slug}: Play Now must be inside the hero`);
    const routes = [...h.matchAll(/href="(\/game\/[^"]+)"/g)].map(m => m[1]);
    assert(routes.length >= 2 && routes.every(r => r === route), `${slug}: every /game/ link must be ${route} (found ${[...new Set(routes)].join(', ')})`);
    assert(!h.includes('#/game/'), `${slug}: guide must link to the direct game page, not the hash route`);
  }
});

test('Play guides: internal links, assets and in-page anchors resolve', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug);
    for (const m of h.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const r = m[1];
      if (/^(https?:|mailto:|data:|#|tel:)/.test(r)) continue;
      assert(r.startsWith('/'), `${slug}: reference "${r}" must be root-relative`);
      assert(resolves(r), `${slug}: broken reference "${r}"`);
    }
    const ids = new Set([...h.matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
    for (const m of h.matchAll(/href="#([^"]+)"/g)) assert(ids.has(m[1]), `${slug}: anchor #${m[1]} has no matching id`);
  }
});

test('Play guides: every guide has the required content sections and 5+ FAQs', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug);
    for (const id of ['how-to-play', 'controls', 'scoring', 'how-it-ends', 'features', 'tips', 'faq', 'more-games']) {
      assert(h.includes(`id="${id}"`), `${slug}: section #${id} missing`);
    }
    assert((h.match(/class="faq-item"/g) || []).length >= 5, `${slug}: needs at least 5 FAQs`);
    assert((h.match(/<tr>/g) || []).length >= 8, `${slug}: controls and scoring tables look too thin`);
    assert(/Free in your browser/.test(h), `${slug}: free-to-play note missing`);
  }
});

test('Play guides: structured data (VideoGame, BreadcrumbList, FAQPage) is valid and consistent', () => {
  const origin = collectOrigins()[0].origin;
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug), url = `${origin}/play/${slug}`;
    const g = jsonLdOf(h)['@graph'];
    const game = g.find(x => x['@type'] === 'VideoGame');
    const crumbs = g.find(x => x['@type'] === 'BreadcrumbList');
    const faq = g.find(x => x['@type'] === 'FAQPage');
    assert(game && crumbs && faq, `${slug}: JSON-LD must contain VideoGame, BreadcrumbList and FAQPage`);
    assert.strictEqual(game.url, url, `${slug}: VideoGame url`);
    assert.strictEqual(game.description, metaOf(h).desc, `${slug}: VideoGame description must equal the meta description`);
    assert.strictEqual(game.isAccessibleForFree, true);
    assert(game.potentialAction && game.potentialAction.target === `${origin}${h.match(/class="btn-link" href="([^"]+)"/)[1]}`, `${slug}: PlayAction target must be the Play Now route`);
    assert.strictEqual(crumbs.itemListElement.length, 3, `${slug}: breadcrumb length`);
    assert.strictEqual(crumbs.itemListElement[2].item, url, `${slug}: breadcrumb last item`);
    assert.strictEqual(faq.mainEntity.length, (h.match(/class="faq-item"/g) || []).length, `${slug}: FAQ JSON-LD must match the visible FAQs`);
    const dump = JSON.stringify(g);
    assert(!/aggregateRating|ratingValue|ratingCount|reviewCount|\"review\"|interactionStatistic|userInteractionCount/i.test(dump), `${slug}: no ratings, reviews or play counts allowed`);
  }
});

test('Play guides: no ads, third-party scripts besides GA4, fake ratings, play counts or embedded games', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug);
    assert(!/adsbygoogle|googlesyndication|doubleclick|adsense/i.test(h), `${slug}: advertising code found`);
    const scripts = [...h.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    assert.deepStrictEqual(scripts, ['https://www.googletagmanager.com/gtag/js?id=G-LJY94260LN', '/js/site-shell.js'], `${slug}: only the GA4 tag and site-shell.js may be loaded`);
    assert.strictEqual((h.match(/gtag\('config'/g) || []).length, 1, `${slug}: GA4 config must appear exactly once`);
    assert(!/<canvas|js\/arcade\.js|js\/games\/|js\/game\.js/.test(h), `${slug}: games must not be embedded in Phase 1`);
    const text = mainText(`play/${slug}.html`);
    assert(!/\b(\d{1,3}(,\d{3})+|\d{3,}|\d+(\.\d+)?\s*(million|thousand|k))\+?\s*(players|plays|downloads|reviews|users|votes)\b/i.test(text), `${slug}: contains a play-count style claim`);
    assert(!/\b(\d(\.\d)?\s*\/\s*5|\d(\.\d)?\s*stars? (rating|rated)|top[- ]rated|best[- ]selling|#1|award[- ]winning|number one)\b/i.test(text), `${slug}: contains a rating or ranking claim`);
  }
});

test('Play guides: stated facts still match the game engine source', () => {
  const src = (f) => read(f);
  const page = (slug) => mainText(`play/${slug}.html`);
  assert(/this\.gridSize = 22/.test(src('js/games/snake.js')) && /22 x 22/.test(page('neon-snake')), 'snake board size');
  assert(/this\.baseSpeed = 120/.test(src('js/games/snake.js')) && /Math\.max\(65,/.test(src('js/games/snake.js')) && /120 milliseconds/.test(page('neon-snake')) && /65 milliseconds/.test(page('neon-snake')), 'snake speeds');
  assert(/this\.maxLevels = 3/.test(src('js/games/brick-breaker.js')) && /this\.lives = 3/.test(src('js/games/brick-breaker.js')) && /Three/.test(page('brick-breaker')), 'brick breaker stages and lives');
  assert(/maxShield: 3/.test(src('js/games/space-shooter.js')) && /shield of 3 points/i.test(page('space-shooter')), 'space shooter shield');
  assert(/this\.maxTime = 60/.test(src('js/game.js')) && /this\.maxLives = 3/.test(src('js/game.js')) && /60 seconds/.test(page('fruit-slice')), 'fruit slice timer and lives');
  assert(/this\.size = 4/.test(src('js/games/puzzle-2048.js')) && /4 x 4/.test(page('2048-puzzle')), '2048 board');
  assert(/Math\.random\(\) < 0\.65/.test(src('js/games/tic-tac-toe.js')) && /65%/.test(page('tic-tac-toe')), 'tic-tac-toe medium AI');
  assert((src('js/games/memory-match.js').match(/symbol: '/g) || []).length === 8 && /8 pairs/.test(page('memory-match')), 'memory match pairs');
  assert(/this\.cols = 10/.test(src('js/games/block-puzzle.js')) && /this\.rows = 20/.test(src('js/games/block-puzzle.js')) && /10 x 20/.test(page('block-puzzle')), 'block puzzle board');
  assert(/jumpsLeft = 2/.test(src('js/games/endless-runner.js')) && /double jump/i.test(page('endless-runner')), 'runner double jump');
  assert(/this\.timer = 30/.test(src('js/games/whack-a-mole.js')) && /30 seconds/.test(page('whack-a-mole')), 'whack-a-mole timer');
});

test('Play guides: games.html keeps every instant Play link and adds a Guide & Rules link per game', () => {
  const h = read('games.html');
  for (const [id, slug] of Object.entries(PLAY_SLUGS)) {
    assert(h.includes(`class="pgc-play" href="/game/${slug}"`), `games.html: Play link for ${id} (/game/${slug}) was removed or changed`);
    assert(h.includes(`class="pgc-guide" href="/play/${slug}"`), `games.html: Guide & Rules link for ${slug} missing`);
  }
  assert.strictEqual((h.match(/class="pgc-guide"/g) || []).length, 10, 'exactly 10 guide links expected');
});

test('Play guides: sitemap lists all 10 pages once, with the real domain, plus the original pages', () => {
  const sm = read('sitemap.xml');
  const origin = collectOrigins()[0].origin;
  for (const slug of Object.values(PLAY_SLUGS)) {
    const loc = `<loc>${origin}/play/${slug}</loc>`;
    assert.strictEqual(sm.split(loc).length - 1, 1, `sitemap must list ${loc} exactly once`);
  }
  for (const l of REQUIRED_LINKS) assert(sm.includes(`${l === '/' ? origin + '/' : origin + l}</loc>`), `sitemap lost ${l}`);
  assert.strictEqual((sm.match(/<loc>/g) || []).length, 26, 'sitemap should list 6 original + 10 guide + 10 game pages');
});

test('Play guides: README documents the new pages', () => {
  const r = read('README.md');
  assert(/\/play\//.test(r), 'README must mention the /play/ pages');
  for (const slug of Object.values(PLAY_SLUGS)) assert(r.includes(slug), `README does not mention ${slug}`);
});

test('Play guides: existing hash-route portal is untouched (scripts and routes still present)', () => {
  const idx = read('index.html'), arcade = read('js/arcade.js');
  for (const g of ['snake', 'brick-breaker', 'space-shooter', 'puzzle-2048', 'tic-tac-toe', 'memory-match', 'endless-runner', 'block-puzzle', 'whack-a-mole']) {
    assert(idx.includes(`js/games/${g}.js`), `index.html lost script for ${g}`);
  }
  assert(arcade.includes("hash.startsWith('#/game/')"), 'arcade.js hash route for games must remain');
});

// ---------------------------------------------------------------------------
// Accessibility (Google PageSpeed Insights): zoomable viewport + one <main> landmark
// ---------------------------------------------------------------------------
const ALL_HTML = ['index.html', '404.html', 'about.html', 'contact.html', 'games.html', 'privacy-policy.html', 'terms.html']
  .concat(fs.readdirSync(path.join(ROOT, 'play')).filter(f => f.endsWith('.html')).map(f => `play/${f}`));
// <template> content is inert (never part of the live DOM), so it is ignored
const liveHtml = (f) => read(f).replace(/<template[\s\S]*?<\/template>/g, '');

test('Accessibility: every HTML page uses the accessible viewport (pinch-zoom allowed)', () => {
  assert(ALL_HTML.length >= 17, `expected at least 17 HTML pages, found ${ALL_HTML.length}`);
  for (const f of ALL_HTML) {
    const tags = read(f).match(/<meta\s+name="viewport"[^>]*>/g) || [];
    assert.strictEqual(tags.length, 1, `${f}: must have exactly one viewport meta tag`);
    assert(/content="width=device-width, initial-scale=1(\.0)?"/.test(tags[0]), `${f}: viewport must be width=device-width, initial-scale=1`);
    assert(!/maximum-scale|minimum-scale|user-scalable/i.test(tags[0]), `${f}: viewport must not restrict zooming`);
  }
});

test('Accessibility: every HTML page has exactly one <main>, with header/nav/footer outside it', () => {
  for (const f of ALL_HTML) {
    const h = liveHtml(f);
    assert.strictEqual((h.match(/<main[\s>]/g) || []).length, 1, `${f}: must have exactly one <main>`);
    assert.strictEqual((h.match(/<\/main>/g) || []).length, 1, `${f}: <main> must be closed exactly once`);
    if (f === 'index.html') continue; // the portal's header/nav/footer are rendered by arcade.js (checked below)
    const body = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
    assert(!/<footer[\s>]/.test(body), `${f}: footer must be outside <main>`);
    assert(h.indexOf('<header') < h.indexOf('<main'), `${f}: header must come before <main>`);
    assert(h.indexOf('<footer') > h.indexOf('</main>'), `${f}: footer must come after <main>`);
  }
});

test('Accessibility: portal renders one <main> per view, keeping navbar, subnav and footer outside it', () => {
  const idx = read('index.html'), arcade = read('js/arcade.js');
  // No-JS fallback in index.html is the only live <main>; the Fruit Slice <template> must not add another
  assert(/<main id="main-content" class="js-fallback">/.test(idx), 'index.html fallback content must be inside <main>');
  const tpl = (idx.match(/<template[\s\S]*?<\/template>/g) || []).join('');
  assert(!/<main[\s>]/.test(tpl), 'Fruit Slice template must not contain <main> (it is mounted inside the game view <main>)');
  assert(/id="game-container"/.test(tpl), 'Fruit Slice template must keep #game-container');

  const home = arcade.slice(arcade.indexOf('homeView.innerHTML = `'), arcade.indexOf('// Carousel'));
  const game = arcade.slice(arcade.indexOf('gameView.innerHTML = `'), arcade.indexOf("document.getElementById('gv-btn-fav')?.addEventListener"));
  for (const [name, t] of [['home view', home], ['game view', game]]) {
    assert.strictEqual((t.match(/<main[\s>]/g) || []).length, 1, `${name}: exactly one <main>`);
    assert.strictEqual((t.match(/<\/main>/g) || []).length, 1, `${name}: <main> closed once`);
    const before = t.slice(0, t.indexOf('<main')), after = t.slice(t.indexOf('</main>'));
    assert(before.includes('shellSubnav'), `${name}: site subnav must be before <main>`);
    assert(after.includes('shellFooter'), `${name}: footer must be after <main>`);
    assert(!t.slice(t.indexOf('<main'), t.indexOf('</main>')).includes('shellFooter'), `${name}: footer must not be inside <main>`);
  }
  assert(home.slice(0, home.indexOf('<main')).includes('arcade-navbar'), 'home view: navbar must be before <main>');
  assert(home.slice(home.indexOf('<main'), home.indexOf('</main>')).includes('<h1'), 'home view: <h1> must be inside <main>');
});

// ---------------------------------------------------------------------------
// Static homepage content (works without JavaScript; arcade.js moves it, never copies it)
// ---------------------------------------------------------------------------
const HOME_GUIDES = {
  'fruit-slice': 'Fruit Slice', 'neon-snake': 'Neon Snake', 'brick-breaker': 'Brick Breaker',
  'space-shooter': 'Space Shooter', '2048-puzzle': '2048 Puzzle', 'tic-tac-toe': 'Tic-Tac-Toe',
  'memory-match': 'Memory Match', 'endless-runner': 'Endless Runner', 'block-puzzle': 'Block Puzzle',
  'whack-a-mole': 'Whack-a-Mole'
};
function homeInfo() {
  const h = liveHtml('index.html');
  const m = h.match(/<section class="home-info"[\s\S]*?<\/section>/);
  assert(m, 'index.html: static .home-info section is missing');
  return { section: m[0], page: h };
}
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('Homepage static HTML: one intro/guide section inside <main>, with a clean heading hierarchy', () => {
  const { section, page } = homeInfo();
  assert.strictEqual((page.match(/class="home-info"/g) || []).length, 1, 'exactly one .home-info section');
  const mainHtml = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
  assert(mainHtml.includes('class="home-info"'), '.home-info must be inside the page <main>');
  assert((page.match(/<h1[ >]/g) || []).length === 1, 'still exactly one <h1>');
  const levels = (page.match(/<h([1-6])[ >]/g) || []).map(x => Number(x[2]));
  levels.forEach((lv, i) => assert(i === 0 ? lv === 1 : lv <= levels[i - 1] + 1, `heading level jumps from h${levels[i - 1]} to h${lv}`));
  const h2s = (section.match(/<h2[ >]/g) || []).length, h3s = (section.match(/<h3[ >]/g) || []).length;
  assert(h2s === 2 && h3s === 10, `expected 2 h2 and 10 h3 in the section, found ${h2s} h2 and ${h3s} h3`);
  const words = plain(section).split(' ').length;
  assert(words >= 300 && words <= 700, `static section should be useful but light (found ${words} words)`);
  assert(/free/i.test(section) && /no account|nothing to install/i.test(section), 'intro must explain what the site is and that it is free');
});

test('Homepage static HTML: crawlable, descriptive links to all 10 existing guide pages', () => {
  const { section } = homeInfo();
  const links = [...section.matchAll(/<a href="(\/play\/[^"]+)">([^<]+)<\/a>/g)].map(m => ({ href: m[1], text: m[2].trim() }));
  assert.strictEqual(links.length, 10, `expected 10 /play/ links, found ${links.length}`);
  for (const [slug, title] of Object.entries(HOME_GUIDES)) {
    const l = links.filter(x => x.href === `/play/${slug}`);
    assert.strictEqual(l.length, 1, `link to /play/${slug} must appear exactly once`);
    assert(l[0].text.includes(title) && /guide/i.test(l[0].text), `link text for ${slug} must name the game and say it is a guide`);
    assert(!/^(click here|here|read more|more|link)$/i.test(l[0].text), `${slug}: generic link text`);
    assert(fs.existsSync(path.join(ROOT, 'play', `${slug}.html`)), `${slug}: guide file does not exist`);
    assert(resolves(l[0].href), `${slug}: link does not resolve`);
    assert(new RegExp(`<h3>${title.replace(/[-]/g, '\\-')}\\s`).test(section), `${slug}: needs an <h3> with the game name`);
  }
  assert.strictEqual(new Set(links.map(l => l.text)).size, 10, 'link texts must be unique');
  assert(section.includes('href="/games"') && section.includes('href="/about"'), 'section links to the games and about pages');
  // Every guide the homepage links to is also in the sitemap
  const sm = read('sitemap.xml');
  for (const slug of Object.keys(HOME_GUIDES)) assert(sm.includes(`/play/${slug}</loc>`), `${slug} missing from sitemap`);
});

test('Homepage static HTML: game facts match the guide for that game (no invented numbers)', () => {
  const { section } = homeInfo();
  const guideText = (slug) => plain(read(`play/${slug}.html`).replace(/<template[\s\S]*?<\/template>/g, ''));
  for (const [slug, title] of Object.entries(HOME_GUIDES)) {
    const li = (section.match(new RegExp(`<li>\\s*<h3>${title.replace(/[-]/g, '\\-')}[\\s\\S]*?</li>`)) || [''])[0];
    assert(li, `${slug}: list item not found`);
    const desc = plain(li);
    const g = guideText(slug);
    // sizes such as "22 x 22" and round lengths such as "60-second" must appear in the guide too
    for (const fact of desc.match(/\b\d+ x \d+\b|\b\d+-second\b/g) || []) {
      assert(g.includes(fact), `${slug}: homepage says "${fact}" but the guide does not`);
    }
  }
});

test('Homepage static HTML: shown once - arcade.js moves the section instead of duplicating it', () => {
  const idx = read('index.html'), arcade = read('js/arcade.js'), css = read('css/pages.css');
  assert(!/class="home-info"/.test(arcade) && !arcade.includes('/play/'), 'arcade.js must not re-render the guide section as a second copy');
  assert(arcade.includes("querySelector?.('.home-info')") && arcade.includes('appendChild(this.homeInfo)'), 'arcade.js must keep and re-attach the static section');
  assert(/\.home-info\s*\{/.test(css) && /\.home-game-list\s*\{/.test(css), 'styles for the static section must exist');
  assert.strictEqual((idx.match(/\/play\/[a-z0-9-]+"/g) || []).length, 10, 'index.html links each guide exactly once');
  // SEO / verification / accessibility items must survive
  assert(idx.includes('name="google-site-verification" content="EUzjwsrCJ7rOlLMAv9V49wVVUIMJ9vyyOce6aKRHFRs"'), 'Search Console verification tag must stay');
  assert(/<link rel="canonical" href="https:\/\/mini-game-arcade-zaim\.vercel\.app\/">/.test(idx), 'canonical must stay');
  assert(/<meta name="viewport" content="width=device-width, initial-scale=1.0">/.test(idx), 'accessible viewport must stay');
});

// ---------------------------------------------------------------------------
// Direct game pages (C1): /game/<slug> plays one game; /play/<slug> stays its guide.
// ---------------------------------------------------------------------------
const GAME_FILES = fs.readdirSync(path.join(ROOT, 'game')).filter(f => f.endsWith('.html')).sort();
const gameHtml = (slug) => read(`game/${slug}.html`);
const ORIGIN = 'https://mini-game-arcade-zaim.vercel.app';
const visibleText = (h) => decodeEntities(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<template[\s\S]*?<\/template>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

test('Game pages: exactly one page per game, named by the catalog slug', () => {
  const { ARCADE_GAMES } = require('../js/arcade.js');
  assert.deepStrictEqual(ARCADE_GAMES.map(g => g.slug).sort(), Object.values(PLAY_SLUGS).sort(), 'catalog slugs must equal the guide slugs');
  assert.deepStrictEqual(GAME_FILES, Object.values(PLAY_SLUGS).map(s => s + '.html').sort(), 'game/ must contain exactly the 10 game pages');
  for (const g of ARCADE_GAMES) assert(new RegExp(`<body data-game-page="${g.id}">`).test(gameHtml(g.slug)), `${g.slug}: <body data-game-page> must name the real game id "${g.id}"`);
});

test('Game pages: generated files are up to date with scripts/build-game-pages.js', () => {
  const { page } = require('../scripts/build-game-pages.js');
  const { ARCADE_GAMES } = require('../js/arcade.js');
  for (const g of ARCADE_GAMES) assert.strictEqual(gameHtml(g.slug), page(g), `game/${g.slug}.html is stale: run "npm run build-game-pages"`);
});

test('Game pages: unique title, description, h1 and a canonical URL on the site domain', () => {
  const titles = [], descs = [], h1s = [];
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = gameHtml(slug), m = metaOf(h);
    assert(/<html lang="en">/.test(h), `${slug}: missing lang`);
    assert(m.title.length >= 15 && m.title.length <= 70, `${slug}: title length ${m.title.length}`);
    assert(m.desc.length >= 50 && m.desc.length <= 170, `${slug}: description length ${m.desc.length}`);
    assert(/<meta name="robots" content="index, follow">/.test(h), `${slug}: must be indexable`);
    assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, `${slug}: exactly one <h1>`);
    assert.strictEqual(m.canonical, `${ORIGIN}/game/${slug}`, `${slug}: canonical`);
    assert(h.includes(`<meta property="og:url" content="${ORIGIN}/game/${slug}">`), `${slug}: og:url`);
    assert(h.includes(`<meta property="og:title" content="${metaOf(h).title.replace(/&/g, '&amp;')}">`) || h.includes('og:title'), `${slug}: og:title`);
    assert(/<meta name="twitter:title"/.test(h) && /<meta name="twitter:description"/.test(h), `${slug}: twitter tags`);
    for (const css of ['/css/style.css', '/css/arcade.css', '/css/pages.css']) assert(h.includes(`href="${css}"`), `${slug}: ${css}`);
    titles.push(m.title); descs.push(m.desc); h1s.push(m.h1);
  }
  for (const [name, list] of [['title', titles], ['description', descs], ['h1', h1s]]) assert.strictEqual(new Set(list).size, 10, `game pages: duplicate ${name}`);
  // ...and nothing collides with any guide or original page either
  const others = Object.values(PLAY_SLUGS).map(sl => metaOf(playHtml(sl))).concat(Object.keys(PAGES).map(f => metaOf(read(f))));
  for (const o of others) {
    assert(!titles.includes(o.title), `game page title duplicates another page: ${o.title}`);
    assert(!descs.includes(o.desc), `game page description duplicates another page: ${o.desc}`);
  }
});

test('Game pages: one <main>, header before it, footer after it, zoomable viewport, skip link', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const raw = gameHtml(slug), h = liveHtml(`game/${slug}.html`);
    assert.strictEqual((raw.match(/<meta\s+name="viewport"[^>]*>/g) || []).length, 1, `${slug}: one viewport tag`);
    assert(/content="width=device-width, initial-scale=1"/.test(raw) && !/maximum-scale|user-scalable/i.test(raw), `${slug}: viewport must allow zoom`);
    assert.strictEqual((h.match(/<main[\s>]/g) || []).length, 1, `${slug}: exactly one <main>`);
    assert(h.indexOf('<header') < h.indexOf('<main') && h.indexOf('<footer') > h.indexOf('</main>'), `${slug}: header/footer must sit outside <main>`);
    assert(raw.includes('class="skip-link" href="#main-content"'), `${slug}: skip link`);
    assert(/<main id="main-content"/.test(raw), `${slug}: main needs id for the skip link`);
  }
});

test('Game pages: each loads only its own game script, arcade.js last, and the engine can mount it', () => {
  const { ARCADE_GAMES } = require('../js/arcade.js');
  const GAME_SCRIPTS = { 'fruit-slice': ['js/fruit.js', 'js/game.js'], snake: ['js/games/snake.js'], 'brick-breaker': ['js/games/brick-breaker.js'], 'space-shooter': ['js/games/space-shooter.js'], 'puzzle-2048': ['js/games/puzzle-2048.js'], 'tic-tac-toe': ['js/games/tic-tac-toe.js'], 'memory-match': ['js/games/memory-match.js'], 'endless-runner': ['js/games/endless-runner.js'], 'block-puzzle': ['js/games/block-puzzle.js'], 'whack-a-mole': ['js/games/whack-a-mole.js'] };
  const everyGameScript = Object.values(GAME_SCRIPTS).flat();
  for (const g of ARCADE_GAMES) {
    const h = gameHtml(g.slug);
    const scripts = [...h.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1].replace(/^\//, ''));
    for (const s of ['js/site-shell.js', 'js/audio.js', 'js/arcade.js'].concat(GAME_SCRIPTS[g.id])) assert(scripts.includes(s), `${g.slug}: missing ${s}`);
    assert.strictEqual(scripts[scripts.length - 1], 'js/arcade.js', `${g.slug}: arcade.js must load last`);
    for (const s of everyGameScript.filter(x => !GAME_SCRIPTS[g.id].includes(x))) assert(!scripts.includes(s), `${g.slug}: must not load ${s}`);
    for (const s of scripts.filter(x => !/^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-LJY94260LN$/.test(x))) assert(fs.existsSync(path.join(ROOT, s)), `${g.slug}: script ${s} does not exist`);
    assert(/<div id="game-viewport" class="game-viewport">/.test(h), `${g.slug}: #game-viewport missing`);
    assert(/<div class="gv-actions" id="game-actions">/.test(h), `${g.slug}: #game-actions missing`);
    assert(/id="gd-best-score"/.test(h), `${g.slug}: #gd-best-score missing`);
  }
  const arcade = read('js/arcade.js');
  assert(/initGamePage\(gameId\)/.test(arcade) && arcade.includes('dataset.gamePage'), 'arcade.js must support data-game-page');
  // Fruit Slice is the only game that needs its markup template, and it must not add a second <main>
  const fruit = gameHtml('fruit-slice');
  assert(/<template id="fruit-slice-template">/.test(fruit) && /id="gameCanvas"/.test(fruit) && /id="game-container"/.test(fruit), 'fruit-slice page needs the game template');
  assert(!/<main[\s>]/.test((fruit.match(/<template[\s\S]*?<\/template>/) || [''])[0]), 'template must not contain <main>');
  for (const slug of Object.values(PLAY_SLUGS).filter(x => x !== 'fruit-slice')) assert(!/<template/.test(gameHtml(slug)), `${slug}: only fruit-slice needs a template`);
});

test('Game pages: link to their detailed guide, and each guide links back to the game', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = gameHtml(slug);
    const toGuide = (h.match(new RegExp(`href="/play/${slug}"`, 'g')) || []).length;
    assert(toGuide >= 3, `${slug}: expected at least 3 links to /play/${slug}, found ${toGuide}`);
    assert(playHtml(slug).includes(`href="/game/${slug}"`), `${slug}: guide must link back to /game/${slug}`);
  }
});

test('Game pages: breadcrumb, structured data (VideoGame + BreadcrumbList) is valid and consistent', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = gameHtml(slug), url = `${ORIGIN}/game/${slug}`, m = metaOf(h), ld = jsonLdOf(h);
    assert(h.includes('class="breadcrumbs" aria-label="Breadcrumb"'), `${slug}: breadcrumb nav`);
    const g = ld['@graph'].find(n => n['@type'] === 'VideoGame'), b = ld['@graph'].find(n => n['@type'] === 'BreadcrumbList');
    assert(g && b, `${slug}: needs VideoGame and BreadcrumbList`);
    assert.strictEqual(g.url, url); assert.strictEqual(g['@id'], `${url}#game`); assert.strictEqual(g.potentialAction.target, url);
    assert.strictEqual(g.description, m.desc, `${slug}: JSON-LD description must equal the meta description`);
    assert.strictEqual(g.isAccessibleForFree, true);
    assert.deepStrictEqual(b.itemListElement.map(i => i.item), [`${ORIGIN}/`, `${ORIGIN}/games`, url]);
    assert(!/aggregateRating|ratingValue|interactionStatistic|reviewCount/.test(h), `${slug}: no fake ratings or play counts`);
  }
});

test('Game pages: useful game-specific content (intro, facts, controls table, tips, related games)', () => {
  const { ARCADE_GAMES } = require('../js/arcade.js');
  const intros = new Set();
  for (const g of ARCADE_GAMES) {
    const h = gameHtml(g.slug), t = visibleText(h);
    const words = t.split(' ').length;
    assert(words >= 300, `${g.slug}: only ${words} visible words, expected a useful page`);
    for (const id of ['about-game', 'game-facts', 'game-controls', 'game-tips', 'more-games']) assert(h.includes(`id="${id}"`), `${g.slug}: missing section #${id}`);
    assert((h.match(/<div class="info-card">/g) || []).length === 4, `${g.slug}: 4 fact cards`);
    assert((h.match(/<tr><td>/g) || []).length >= 3, `${g.slug}: controls table needs 3+ rows`);
    assert(((h.match(/id="game-tips"[\s\S]*?<\/ul>/) || [''])[0].match(/<li>/g) || []).length === 3, `${g.slug}: 3 tips`);
    assert.strictEqual((h.match(/<article class="info-card">/g) || []).length, 3, `${g.slug}: 3 related games`);
    const rel = [...h.matchAll(/<h3><a href="\/game\/([^"]+)">/g)].map(m => m[1]);
    assert(rel.length === 3 && !rel.includes(g.slug) && new Set(rel).size === 3, `${g.slug}: related games must be 3 different other games`);
    for (const r of rel) assert(Object.values(PLAY_SLUGS).includes(r), `${g.slug}: unknown related game ${r}`);
    assert(t.includes(g.title), `${g.slug}: should name the game`);
    const intro = (h.match(/id="about-game">[^<]*<\/h2>\s*<p>([^<]+)<\/p>/) || [])[1];
    assert(intro && !intros.has(intro), `${g.slug}: intro paragraph must be unique`);
    intros.add(intro);
    assert(!/<p class="page-lead">/.test(h) && !t.includes(decodeEntities((playHtml(g.slug).match(/<p class="page-lead">([^<]+)</) || [])[1] || 'NO-GUIDE-LEAD')), `${g.slug}: must not copy the guide lead paragraph`);
  }
});

test('Game pages: pause-key text matches the engine (only games with a pause key mention P / Esc)', () => {
  const SRC = { 'fruit-slice': 'js/game.js', snake: 'js/games/snake.js', 'brick-breaker': 'js/games/brick-breaker.js', 'space-shooter': 'js/games/space-shooter.js', 'puzzle-2048': 'js/games/puzzle-2048.js', 'tic-tac-toe': 'js/games/tic-tac-toe.js', 'memory-match': 'js/games/memory-match.js', 'endless-runner': 'js/games/endless-runner.js', 'block-puzzle': 'js/games/block-puzzle.js', 'whack-a-mole': 'js/games/whack-a-mole.js' };
  const { ARCADE_GAMES } = require('../js/arcade.js');
  for (const g of ARCADE_GAMES) {
    const hasPauseKey = /'Escape'/.test(read(SRC[g.id])) && /e\.key === 'p'|e\.key !== 'p'/.test(read(SRC[g.id]));
    const mentions = /<tr><td>P or Esc<\/td>/.test(gameHtml(g.slug));
    assert.strictEqual(mentions, hasPauseKey, `${g.slug}: page ${mentions ? 'mentions' : 'omits'} the P / Esc pause key but the engine ${hasPauseKey ? 'has' : 'has no'} one`);
  }
});

test('Game pages: internal links, assets and in-page anchors resolve', () => {
  const exists = (href) => {
    const p = href.split('#')[0].split('?')[0];
    if (p === '/' || p === '') return true;
    return fs.existsSync(path.join(ROOT, p + '.html')) || fs.existsSync(path.join(ROOT, p));
  };
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = gameHtml(slug);
    for (const m of h.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const r = m[1];
      if (/^(https?:|data:|mailto:)/.test(r)) continue;
      if (r.startsWith('#')) { assert(h.includes(`id="${r.slice(1)}"`), `${slug}: anchor ${r} has no target`); continue; }
      assert(r.startsWith('/'), `${slug}: internal link must be absolute: ${r}`);
      assert(exists(r), `${slug}: broken internal link ${r}`);
    }
  }
});

test('Game pages: no ads, no ads, only the GA4 tag as third-party script', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = gameHtml(slug);
    assert(!/adsbygoogle|googlesyndication|doubleclick|google-analytics|fbq\(/i.test(h), `${slug}: ad/other tracking code found`);
    assert.strictEqual((h.match(/gtag\('config'/g) || []).length, 1, `${slug}: GA4 config must appear exactly once`);
    const scripts = [...h.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(scripts[0], 'https://www.googletagmanager.com/gtag/js?id=G-LJY94260LN', `${slug}: GA4 tag must load first`);
    assert(scripts.slice(1).every(s => s.startsWith('/js/')), `${slug}: only same-site scripts allowed besides GA4`);
  }
});

test('Game pages: sitemap lists all 10 game pages exactly once, with the site domain', () => {
  const sm = read('sitemap.xml');
  for (const slug of Object.values(PLAY_SLUGS)) {
    const loc = `<loc>${ORIGIN}/game/${slug}</loc>`;
    assert.strictEqual(sm.split(loc).length - 1, 1, `sitemap must list ${loc} exactly once`);
  }
  assert(!/#/.test(sm), 'sitemap must not contain hash URLs');
});

test('Game pages: homepage, Games page, About page and guides all link to the direct pages', () => {
  const idx = read('index.html'), games = read('games.html'), about = read('about.html');
  for (const slug of Object.values(PLAY_SLUGS)) {
    assert(idx.includes(`<a href="/game/${slug}">`), `index.html: static link to /game/${slug} missing`);
    assert(games.includes(`class="pgc-play" href="/game/${slug}"`), `games.html: link to /game/${slug} missing`);
    assert(about.includes(`href="/game/${slug}"`), `about.html: link to /game/${slug} missing`);
  }
  assert.strictEqual((idx.match(/href="\/game\/[a-z0-9-]+"/g) || []).length, 10, 'index.html: one /game/ link per game');
});

test('Game pages: the hash routes, Search Console tag and homepage content are preserved', () => {
  const arcade = read('js/arcade.js'), idx = read('index.html');
  for (const needle of ["hash.startsWith('#/game/')", "hash.startsWith('#/category/')", "hash === '#/favorites'", 'window.addEventListener(\'hashchange\'']) assert(arcade.includes(needle), `arcade.js lost hash routing: ${needle}`);
  assert(idx.includes('google-site-verification" content="EUzjwsrCJ7rOlLMAv9V49wVVUIMJ9vyyOce6aKRHFRs"'), 'Search Console tag must stay');
  assert(idx.includes('class="home-info"') && idx.includes('id="home-about-title"'), 'homepage SEO section must stay');
  assert(!/data-game-page/.test(idx), 'index.html must stay the hash-route portal');
});

test('Gameplay notes in the guides no longer describe the fixed bugs', () => {
  for (const slug of Object.values(PLAY_SLUGS)) {
    const h = playHtml(slug);
    assert(!/currently restarts/.test(h), `${slug}: stale note: Resume button restarting`);
    assert(!/there is no keyboard shortcut in this game/.test(h), `${slug}: stale note: no pause shortcut`);
    assert(!/can sometimes glow as if a line had been completed/.test(h), `${slug}: stale note: Tic-Tac-Toe glow`);
  }
  assert(/<tr><td><code>P<\/code> or <code>Esc<\/code><\/td>/.test(playHtml('whack-a-mole')), 'whack-a-mole guide must list the P / Esc pause key');
});

console.log(`\nResults: ${passed}/${total} tests passed.`);

// Report: domain status (placeholders are now a hard test failure above)
const currentOrigin = collectOrigins()[0].origin;
console.log('');
console.log(`Domain status: set to ${currentOrigin}`);
console.log('Manual steps still required before enabling advertising: see "Before enabling Google AdSense" in README.md.');
