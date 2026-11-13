// onizleme.mjs için ortak parçalar: sayfa listesi, dil eşleri, yerel statik sunucu (.htaccess CSP'siyle), yardımcılar.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const OUT = join(ROOT, '_test', 'artifacts');
export const SITE = 'https://kabincommunity.com';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml' };
export const PAGES = ['index.html', 'markalar.html', 'hakkinda.html', 'iletisim.html', 'sorular.html', 'basvuru-alindi.html', 'basvuru-hata.html', '404.html', 'yasal/', 'yasal/kvkk-aydinlatma.html', 'yasal/gizlilik.html', 'yasal/cerez.html',
  'yasal/kullanim-kosullari.html', 'yasal/kullanici-sozlesmesi.html', 'yasal/topluluk-kurallari.html',
  'en/', 'en/brands.html', 'en/about.html', 'en/contact.html', 'en/questions.html', 'en/application-received.html', 'en/application-error.html'];
// Dizine girmeyen sayfalar: canonical/JSON-LD/.md yok, noindex var.
export const DIZINSIZ = new Set(['basvuru-alindi.html', 'basvuru-hata.html', '404.html', 'en/application-received.html', 'en/application-error.html']);
// TR ↔ EN eş sayfalar. Eşi olmayan sayfanın (yasal, 404) dil değiştiricisi diğer dilin ana sayfasına gider.
export const ESLER = { 'index.html': 'en/', 'markalar.html': 'en/brands.html', 'hakkinda.html': 'en/about.html', 'iletisim.html': 'en/contact.html', 'sorular.html': 'en/questions.html',
  'basvuru-alindi.html': 'en/application-received.html', 'basvuru-hata.html': 'en/application-error.html' };
export const ES = new Map([...Object.entries(ESLER), ...Object.entries(ESLER).map(([tr, en]) => [en, tr])]);
export const SORULAR = new Set(['sorular.html', 'en/questions.html']);
export const dilOf = (route) => (route.startsWith('en/') ? 'en' : 'tr');
export const yolOf = (route) => '/' + (route === 'index.html' ? '' : route);
export const dilAdresleri = (route) => {
  const dil = dilOf(route);
  const diger = dil === 'tr' ? 'en' : 'tr';
  // 404'ün kendi adresi yoktur: TR bağlantısı ana sayfaya gider.
  const kendi = route === '404.html' ? '/' : yolOf(route);
  return { [dil]: kendi, [diger]: yolOf(ES.get(route) ?? (diger === 'en' ? 'en/' : 'index.html')) };
};
// Sitede olmaması gereken kavramlar (kullanıcı kararı: uygulamada çalışmayan özellik yok). "beta" yalnız ana sayfada
// (davet bölümünün çapası), KVKK aydınlatma ve gizlilik metninde (yurt dışı aktarım) geçebilir.
export const YASAK = /\bbeta\b|tarayıcı eklenti|chrome uzant|davet kodu|browser extension|chrome extension|invite code/i;
const BETA_IZINLI = new Set(['index.html', 'en/', 'yasal/kvkk-aydinlatma.html', 'yasal/gizlilik.html']);
export const yasakFor = (route) => (BETA_IZINLI.has(route) ? /tarayıcı eklenti|chrome uzant|davet kodu|browser extension|chrome extension|invite code/i : YASAK);

// Basit statik sunucu: .htaccess'in CSP başlığını da uygular ki CSP ihlalleri konsolda yakalansın.
export async function sunucuAc() {
  const htaccess = await readFile(join(ROOT, '.htaccess'), 'utf8');
  const csp = /Content-Security-Policy "([^"]+)"/.exec(htaccess)?.[1];
  assert.ok(csp, '.htaccess CSP bulunamadı');
  const yerelCsp = csp.replace(' upgrade-insecure-requests', '').replace('; upgrade-insecure-requests', '');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT + sep) && path !== ROOT) { res.writeHead(400).end(); return; }
    try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); } catch { /* aşağıda 404 */ }
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'content-security-policy': yerelCsp });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': TYPES['.html'], 'content-security-policy': yerelCsp });
      res.end(await readFile(join(ROOT, '404.html')));
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const address = server.address();
  return { server, base: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}` };
}

// Tembel görseller ve sonradan kurulan sahneler yüklensin diye sayfayı yavaşça baştan sona kaydırır.
export async function kaydir(page) {
  const h = await page.evaluate(() => innerHeight);
  let sh = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < sh; y += Math.round(h * 0.6)) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(60);
    sh = await page.evaluate(() => document.documentElement.scrollHeight);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => undefined);
  await page.evaluate(() => scrollTo(0, 0));
}

// Dar ekranda (≤ 819 px) gezinme menüsü kapalıdır; dil değiştirici menünün içindedir.
export async function menuAc(page) {
  const dg = page.locator('.ust-bilgi .menu-dugme');
  if (await dg.isVisible() && (await dg.getAttribute('aria-expanded')) !== 'true') await dg.click();
}
