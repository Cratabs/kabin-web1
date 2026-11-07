// Tarayıcı QA: tüm sayfalar × 4 genişlik. Ağ yalnız yerel; PHP yerine form ucu sahte yanıtla taklit edilir.
// Çalıştırma:  node _test/onizleme.mjs        (playwright yoksa: KABIN_PLAYWRIGHT=/yol/playwright/index.mjs)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, '_test', 'artifacts');
const { chromium } = await import(process.env.KABIN_PLAYWRIGHT ?? 'playwright');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
const PAGES = ['index.html', 'markalar.html', 'basvuru-alindi.html', 'basvuru-hata.html', 'yasal/', 'yasal/kvkk-aydinlatma.html', 'yasal/gizlilik.html', 'yasal/cerez.html', 'yasal/kullanim-kosullari.html', 'yasal/beta-katilim.html', 'yasal/topluluk-kurallari.html'];

// Basit statik sunucu: .htaccess'in CSP başlığını da uygular ki CSP ihlalleri konsolda yakalansın.
const htaccess = await readFile(join(ROOT, '.htaccess'), 'utf8');
const csp = /Content-Security-Policy "([^"]+)"/.exec(htaccess)?.[1];
assert.ok(csp, '.htaccess CSP bulunamadı');
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!path.startsWith(ROOT + sep) && path !== ROOT) { res.writeHead(400).end(); return; }
  try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); } catch { /* aşağıda 404 */ }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'content-security-policy': csp.replace(' upgrade-insecure-requests', '') });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': TYPES['.html'], 'content-security-policy': csp });
    res.end(await readFile(join(ROOT, '404.html')));
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const address = server.address();
const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    const outgoing = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', (r) => { if (!r.url().startsWith(base)) outgoing.push(r.url()); });
    for (const route of PAGES) {
      const res = await page.goto(`${base}/${route}`);
      assert.equal(res?.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1, `tek h1: ${route}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `taşma yok: ${route} @${width}`);
      assert.equal(await page.locator('img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)), true, `görseller: ${route}`);
      const broken = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const href of new Set(broken)) {
        const p = (href ?? '').split('#')[0];
        if (p) { const r = await page.request.get(`${base}${p}`); assert.equal(r.status(), 200, `bağlantı ${href} (${route})`); }
      }
      checks += 5;
      if (width === 390 || width === 1440) await page.screenshot({ path: join(OUT, `${route.replace(/\//g, '_') || 'yasal'}-${width}.png`), fullPage: true });
    }
    // 404 (beklenen tek kaynak hatası, sonra ayıklanır)
    assert.deepEqual(errors, [], `sayfalarda konsol/CSP hatası yok @${width}`);
    const nf = await page.goto(`${base}/yok-boyle-bir-sayfa`);
    assert.equal(nf?.status(), 404);
    assert.equal(await page.locator('h1').innerText(), 'Bu sayfa bulunamadı.');
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 404/.test(e)));
    // Ana sayfa etkileşimleri
    await page.goto(`${base}/index.html`);
    await page.getByRole('button', { name: 'S', exact: true }).click();
    assert.match(await page.locator('#fit-title').innerText(), /^S/);
    await page.getByRole('button', { name: 'L', exact: true }).click();
    assert.match(await page.locator('#fit-chest').innerText(), /Bol/);
    if (width <= 700) {
      const toggle = page.locator('.menu-toggle');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    }
    // Künye eksikken form kapalı olmalı
    const form = page.locator('form[data-basvuru="beta"]');
    assert.notEqual(await form.locator('fieldset.form-body').getAttribute('disabled'), null, 'künye eksikken fieldset kapalı');
    assert.equal(await form.locator('[name=eposta]').isDisabled(), true, 'künye eksikken alanlar kapalı');
    // İstemci akışı: formu açıp sahte uçla hem hata hem başarı yolunu dene
    let posted = '';
    let reply = { status: 429, body: { ok: false, kod: 'SINIR' } };
    await page.route('**/api/basvuru.php', async (r) => {
      posted = r.request().postData() ?? '';
      assert.equal(r.request().method(), 'POST');
      await r.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) });
    });
    await form.evaluate((f) => f.querySelector('fieldset')?.removeAttribute('disabled'));
    await form.locator('[name=eposta]').fill('test@example.com');
    await form.locator('[name=platform][value=android]').check();
    await form.locator('[name=yas18]').check();
    await form.locator('[name=aydinlatma]').check();
    await form.getByRole('button', { name: /başvur/ }).click();
    await page.waitForFunction(() => document.querySelector('.form-status')?.classList.contains('err'));
    assert.match(await form.locator('.form-status').innerText(), /bir saat sonra/);
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 429/.test(e)));
    assert.match(posted, /name="eposta"[\s\S]*test@example\.com/);
    assert.match(posted, /name="web_sitesi"\r\n\r\n\r\n/, 'tuzak alan boş gider');
    reply = { status: 200, body: { ok: true, kod: 'TAMAM' } };
    await form.getByRole('button', { name: /başvur/ }).click();
    await page.locator('.form-done').waitFor();
    assert.match(await page.locator('.form-done').innerText(), /Başvurun alındı/);
    await page.unroute('**/api/basvuru.php');
    assert.deepEqual(await context.cookies(), [], 'çerez yok');
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'depolama yok');
    assert.deepEqual(errors, [], `konsol/CSP hatası yok @${width}`);
    assert.deepEqual(outgoing, [], `dış istek yok @${width}`);
    checks += 12;
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`QA geçti: ${checks} denetim, ekran görüntüleri ${OUT}`);
