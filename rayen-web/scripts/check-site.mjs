// Checks the static site in public/ (/about, /guides, /privacy) the way a search engine
// and a reader would hit it: every page has the tags that make it findable, every link
// lands somewhere, and the sitemap matches the pages that exist.
//
// Plain Node on purpose, like the pages themselves: no dependencies, no build.
//
// THE ADDRESS LIVES IN ONE PLACE. Canonical URLs, social tags, JSON-LD and the sitemap
// all carry ORIGIN, so a move to a real domain is a find-and-replace of this one string
// across public/, then this script confirms nothing was missed.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ORIGIN = 'https://rayen-garden.vercel.app';
const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

// --- the routes vercel.json serves, so a page's public URL can be derived from its file ---
const rewrites = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).rewrites ?? [];
const routeToFile = (route) => {
  for (const { source, destination } of rewrites) {
    const named = source.match(/:(\w+)/);
    if (!named) {
      if (source === route) return destination;
      continue;
    }
    const pattern = new RegExp(`^${source.replace(/:(\w+)/, '([^/]+)')}$`);
    const hit = route.match(pattern);
    if (hit) return destination.replace(`:${named[1]}`, hit[1]);
  }
  return null;
};
const fileToRoute = (file) => {
  // The inverse, found by asking every candidate route in the site.
  for (const route of pageRoutes) if (routeToFile(route) === `/${file}`) return route;
  return null;
};

const pageFiles = walk(PUBLIC)
  .map((f) => relative(PUBLIC, f))
  .filter((f) => f.endsWith('.html') && !f.startsWith('google'));

// Candidate routes: each file served at a fixed rewrite, plus /guides/<name> for guides.
const pageRoutes = [
  ...rewrites.filter((r) => !r.source.includes(':')).map((r) => r.source),
  ...pageFiles.filter((f) => f.startsWith('guides/') && f !== 'guides/index.html').map((f) => `/guides/${f.slice(7, -5)}`),
];

// Everything that exists at a path: the app's own pages, static files and the routes above.
const known = new Set(['/', '/grid']);
for (const f of walk(PUBLIC)) known.add(`/${relative(PUBLIC, f)}`);
for (const route of pageRoutes) known.add(route);

const pages = pageFiles.map((file) => ({ file, route: fileToRoute(file), html: readFileSync(join(PUBLIC, file), 'utf8') }));
const referencedImages = new Set();

for (const { file, route, html } of pages) {
  const where = file;
  if (!route) { fail(where, 'is not reachable: no rewrite in vercel.json serves it'); continue; }
  const url = ORIGIN + route;

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  if (!title) fail(where, 'has no <title>');
  else if (title.length > 75) fail(where, `title is ${title.length} characters (keep it under 75)`);

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) fail(where, 'has no meta description');
  else if (desc.length < 70 || desc.length > 170) fail(where, `description is ${desc.length} characters (aim for 70-170)`);

  if (html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] !== url) fail(where, `canonical should be ${url}`);
  if (html.match(/<meta property="og:url" content="([^"]*)"/)?.[1] !== url) fail(where, `og:url should be ${url}`);
  if (!/<html lang="en">/.test(html)) fail(where, 'has no <html lang>');
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) fail(where, 'should have exactly one <h1>');

  // The privacy policy promises no analytics and no scripts. A page with a script breaks it.
  for (const tag of html.matchAll(/<script\b([^>]*)>/g)) {
    if (!/type="application\/ld\+json"/.test(tag[1])) fail(where, 'has a script that is not JSON-LD, which the privacy page says the site has none of');
  }
  for (const ld of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(ld[1]); } catch { fail(where, 'has JSON-LD that does not parse'); }
  }

  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = img[0];
    if (!/ alt="[^"]+"/.test(tag)) fail(where, `image without alt text: ${tag.slice(0, 60)}`);
    if (!/ width="\d+"/.test(tag) || !/ height="\d+"/.test(tag)) fail(where, `image without width and height: ${tag.slice(0, 60)}`);
  }

  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  const targets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const raw of targets) {
    if (/^(mailto:|tel:)/.test(raw)) continue;
    if (/^https?:\/\//.test(raw) && !raw.startsWith(ORIGIN)) continue; // external: not checked here
    const clean = raw.replace(ORIGIN, '');
    const [path, hash] = clean.split('#');
    if (path.startsWith('/img/')) referencedImages.add(path);
    if (!path && hash) { if (!ids.has(hash)) fail(where, `anchor #${hash} has no matching id`); continue; }
    if (!path.startsWith('/')) { fail(where, `relative link "${raw}" (use root-relative paths)`); continue; }
    if (!known.has(path.replace(/\?.*$/, ''))) fail(where, `link to ${path} goes nowhere`);
  }
  for (const m of html.matchAll(/<meta property="og:image" content="([^"]+)"/g)) referencedImages.add(m[1].replace(ORIGIN, ''));
}

// Every image shipped is used somewhere.
for (const f of walk(join(PUBLIC, 'img')).map((f) => `/${relative(PUBLIC, f)}`)) {
  if (!referencedImages.has(f)) fail(f, 'is not used by any page');
}

// The sitemap lists exactly the pages that exist, plus the app.
const sitemap = readFileSync(join(PUBLIC, 'sitemap.xml'), 'utf8');
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const expected = new Set([`${ORIGIN}/`, ...pages.filter((p) => p.route).map((p) => ORIGIN + p.route)]);
for (const u of expected) if (!listed.has(u)) fail('sitemap.xml', `is missing ${u}`);
for (const u of listed) if (!expected.has(u)) fail('sitemap.xml', `lists ${u}, which is not a page`);
if (!existsSync(join(PUBLIC, 'robots.txt')) || !readFileSync(join(PUBLIC, 'robots.txt'), 'utf8').includes(`${ORIGIN}/sitemap.xml`)) {
  fail('robots.txt', 'is missing or does not point at the sitemap');
}

if (failures.length) {
  console.error(`site check: ${failures.length} problem${failures.length === 1 ? '' : 's'}\n`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`site check: ${pages.length} pages, ${listed.size} sitemap URLs — all good`);
