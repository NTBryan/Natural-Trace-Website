/**
 * Post-build health check. No dependencies.
 *
 *   npx @11ty/eleventy && node scripts/healthcheck.mjs _site
 *   node scripts/healthcheck.mjs _site --external   (also pings outbound links)
 *
 * Run it against a FULL build. SKIP_ASSETS=1 omits assets and every asset
 * reference will look broken.
 *
 * Fails the build if the site would ship broken. Run in CI on every push and
 * on a schedule, so a dead link or a silently missing page surfaces on its own
 * rather than when someone happens to click it.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const ROOT = process.argv[2] || '_site';
const CHECK_EXTERNAL = process.argv.includes('--external');
const problems = [];
const note = (m) => problems.push(m);

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
const pages = files.filter((f) => f.endsWith('.html') && !f.includes(`${ROOT}/admin/`));

// ── 1. every page must exist and carry the basics
const REQUIRED = ['/', '/about/', '/naturaltag/', '/naturaldetect/', '/naturalcloud/',
                  '/industries/', '/industries/use-cases/', '/faq/', '/team/',
                  '/careers/', '/insights/', '/contact/', '/privacy/'];
for (const url of REQUIRED) {
  const f = join(ROOT, url === '/' ? 'index.html' : `${url}index.html`);
  if (!existsSync(f)) note(`missing page: ${url}`);
}
if (!existsSync(join(ROOT, '404.html'))) note('missing 404.html');
if (!existsSync(join(ROOT, 'sitemap.xml'))) note('missing sitemap.xml');
if (!existsSync(join(ROOT, 'robots.txt'))) note('missing robots.txt');
if (!existsSync(join(ROOT, 'llms.txt'))) note('missing llms.txt');

// ── 2. internal links resolve
const externals = new Set();
for (const f of pages) {
  const html = await readFile(f, 'utf8');
  const page = '/' + relative(ROOT, f).replace(/index\.html$/, '').replace(/\\/g, '/');

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(mailto:|tel:|javascript:|#|data:)/.test(raw)) continue;
    if (/^https?:\/\//.test(raw) || raw.startsWith('//')) { externals.add(raw.replace(/^\/\//, 'https://')); continue; }
    const clean = raw.split(/[?#]/)[0];
    if (!clean) continue;
    const abs = clean.startsWith('/') ? join(ROOT, clean) : join(dirname(f), clean);
    const ok = existsSync(abs) || existsSync(join(abs, 'index.html')) || existsSync(`${abs}.html`);
    if (!ok) note(`broken link on ${page}: ${raw}`);
  }

  // ── 3. SEO basics. Redirect stubs are noindex by design, so they are exempt.
  const noindex = /name="robots"[^>]*noindex/.test(html);
  if (!noindex) {
  if (!/<title>.{10,}<\/title>/s.test(html)) note(`missing or thin <title>: ${page}`);
  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  if (!desc || desc[1].length < 50) note(`missing or thin meta description: ${page}`);
  else if (desc[1].length > 165) note(`meta description too long (${desc[1].length}): ${page}`);
  if (!/rel="canonical"/.test(html)) note(`missing canonical: ${page}`);
  }

  // ── 4. structured data must parse
  for (const s of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { JSON.parse(s[1]); } catch (e) { note(`invalid JSON-LD on ${page}: ${e.message.slice(0, 60)}`); }
  }
}

// ── 4b. every redirect target resolves, and no stub leaks into the sitemap
const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8').catch(() => '');
let stubs = 0;
for (const f of pages) {
  const html = await readFile(f, 'utf8');
  const m = html.match(/http-equiv="refresh" content="0; url=([^"]+)"/);
  if (!m) continue;
  stubs++;
  const from = '/' + relative(ROOT, f).replace(/index\.html$/, '').replace(/\\/g, '/');
  const target = m[1].split('#')[0];
  const abs = join(ROOT, target);
  if (!existsSync(abs) && !existsSync(join(abs, 'index.html'))) note(`redirect ${from} points at missing ${m[1]}`);
  if (sitemap.includes(`<loc>${''}` ) && sitemap.includes(from + '</loc>')) note(`redirect stub in sitemap: ${from}`);
}
console.log(`  ${stubs} redirect stubs`);

// ── 5. the contact form still exists and still has somewhere to send to
const contact = await readFile(join(ROOT, 'contact/index.html'), 'utf8').catch(() => '');
if (!/<form/i.test(contact)) note('contact page has no <form>');
if (!/mailto:|hs-portal="[^"]+"/.test(contact)) note('contact form has no HubSpot portal and no mailto fallback');

// ── 6. optional external link check
if (CHECK_EXTERNAL) {
  for (const url of externals) {
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (r.status >= 400) note(`external link ${r.status}: ${url}`);
    } catch { note(`external link unreachable: ${url}`); }
  }
}

console.log(`checked ${pages.length} pages, ${externals.size} external links${CHECK_EXTERNAL ? '' : ' (skipped)'}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('all checks passed');
