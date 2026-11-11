// Tarayıcı QA: tüm sayfalar × 4 genişlik. Ağ yalnız yerel; PHP yerine form ucu sahte yanıtla taklit edilir.
// Çalıştırma:  node _test/onizleme.mjs        (önce: cd _kaynak && npm install; başka kurulum için KABIN_PLAYWRIGHT=/yol/playwright/index.mjs)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, '_test', 'artifacts');
const { chromium } = await import(process.env.KABIN_PLAYWRIGHT ?? new URL('../_kaynak/node_modules/playwright/index.mjs', import.meta.url).href);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml' };
const PAGES = ['index.html', 'markalar.html', 'hakkinda.html', 'iletisim.html', 'basvuru-alindi.html', 'basvuru-hata.html', 'yasal/', 'yasal/kvkk-aydinlatma.html', 'yasal/gizlilik.html', 'yasal/cerez.html', 'yasal/kullanim-kosullari.html', 'yasal/kullanici-sozlesmesi.html', 'yasal/topluluk-kurallari.html',
  'en/', 'en/brands.html', 'en/about.html', 'en/contact.html', 'en/application-received.html', 'en/application-error.html'];
// Dizine girmeyen sayfalar: canonical/JSON-LD/.md yok, noindex var.
const DIZINSIZ = new Set(['basvuru-alindi.html', 'basvuru-hata.html', 'en/application-received.html', 'en/application-error.html']);
// TR ↔ EN eş sayfalar. Eşi olmayan sayfanın (yasal, 404) dil değiştiricisi diğer dilin ana sayfasına gider.
const ESLER = { 'index.html': 'en/', 'markalar.html': 'en/brands.html', 'hakkinda.html': 'en/about.html', 'iletisim.html': 'en/contact.html', 'basvuru-alindi.html': 'en/application-received.html', 'basvuru-hata.html': 'en/application-error.html' };
const ES = new Map([...Object.entries(ESLER), ...Object.entries(ESLER).map(([tr, en]) => [en, tr])]);
const SITE = 'https://kabincommunity.com';
const dilOf = (route) => (route.startsWith('en/') ? 'en' : 'tr');
const yolOf = (route) => '/' + (route === 'index.html' ? '' : route);
const dilAdresleri = (route) => {
  const dil = dilOf(route);
  const diger = dil === 'tr' ? 'en' : 'tr';
  return { [dil]: yolOf(route), [diger]: yolOf(ES.get(route) ?? (diger === 'en' ? 'en/' : 'index.html')) };
};
const hreflangler = new Map();
// Sitede olmaması gereken kavramlar (kullanıcı kararı: uygulamada çalışmayan özellik yok). 2026-11-09: beta
// bekleme listesi eklendi; "beta" yalnız ana sayfada (pencere), KVKK aydınlatma ve gizlilik metninde (yurt dışı aktarım) geçebilir.
const YASAK = /\bbeta\b|tarayıcı eklenti|chrome uzant|davet kodu|browser extension|chrome extension|invite code/i;
const BETA_IZINLI = new Set(['index.html', 'en/', 'yasal/kvkk-aydinlatma.html', 'yasal/gizlilik.html']);
const yasakFor = (route) => (BETA_IZINLI.has(route) ? /tarayıcı eklenti|chrome uzant|davet kodu|browser extension|chrome extension|invite code/i : YASAK);

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
      // Dil: <html lang>, dil değiştirici (eş sayfa ya da diğer dilin ana sayfası), etkin dil aria-current.
      const dil = dilOf(route);
      assert.equal(await page.evaluate(() => document.documentElement.lang), dil, `lang: ${route}`);
      const sw = await page.locator('header .lang-switch a').evaluateAll((as) => as.map((a) => {
        const r = a.getBoundingClientRect();
        return { href: a.getAttribute('href'), lang: a.lang, hreflang: a.hreflang, current: a.getAttribute('aria-current'), text: a.textContent, sag: r.right, sol: r.left, gorunur: r.width > 0 && r.height > 0 };
      }));
      const beklenen = dilAdresleri(route);
      assert.deepEqual(sw.map((a) => [a.text, a.lang, a.hreflang, a.href]), [['TR', 'tr', 'tr', beklenen.tr], ['EN', 'en', 'en', beklenen.en]], `dil değiştirici: ${route}`);
      assert.deepEqual(sw.map((a) => a.current), [dil === 'tr' ? 'true' : null, dil === 'en' ? 'true' : null], `etkin dil aria-current: ${route}`);
      assert.ok(sw.every((a) => a.gorunur && a.sol >= 0 && a.sag <= width), `dil değiştirici görünür ve ekrana sığar: ${route} @${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `taşma yok: ${route} @${width}`);
      assert.equal(await page.locator('img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)), true, `görseller: ${route}`);
      const broken = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const href of new Set(broken)) {
        const p = (href ?? '').split('#')[0];
        if (p) { const r = await page.request.get(`${base}${p}`); assert.equal(r.status(), 200, `bağlantı ${href} (${route})`); }
      }
      if (width === 1440) {
        const html = await res.text();
        assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), yasakFor(route), `yasak kavram yok: ${route}`);
        const dizinli = !DIZINSIZ.has(route);
        assert.equal(await page.locator('meta[name=robots][content*=noindex]').count(), dizinli ? 0 : 1, `noindex: ${route}`);
        assert.equal(await page.locator('link[rel=canonical]').count(), dizinli ? 1 : 0, `canonical: ${route}`);
        const alt = await page.locator('link[rel=alternate][hreflang]').evaluateAll((ls) => ls.map((l) => [l.hreflang, l.getAttribute('href')]));
        if (dizinli) {
          const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
          assert.equal(canonical, SITE + yolOf(route), `canonical adresi: ${route}`);
          assert.equal(await page.locator('meta[property="og:locale"]').getAttribute('content'), dil === 'en' ? 'en_US' : 'tr_TR', `og:locale: ${route}`);
          if (ES.has(route)) {
            const m = Object.fromEntries(alt);
            assert.deepEqual(Object.keys(m).sort(), ['en', 'tr', 'x-default'], `hreflang kümesi: ${route}`);
            assert.equal(m[dil], canonical, `hreflang kendini gösterir: ${route}`);
            assert.equal(m['x-default'], m.tr, `x-default Türkçe: ${route}`);
            hreflangler.set(route, alt);
          } else {
            assert.deepEqual(alt, [], `eşi olmayan sayfada hreflang yok: ${route}`);
          }
          checks += 4;
        } else {
          assert.deepEqual(alt, [], `noindex sayfada hreflang yok: ${route}`);
        }
        if (dizinli) {
          const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '');
          const types = ld['@graph'].map((n) => n['@type']);
          assert.ok(types.includes('Organization') && types.includes('WebSite'), `JSON-LD: ${route}`);
          if (route === 'index.html' || route === 'en/') assert.ok(types.includes('FAQPage'), `JSON-LD FAQPage: ${route}`);
          const webPage = ld['@graph'].find((n) => n['@id']?.endsWith('#sayfa'));
          assert.equal(webPage?.inLanguage, dil === 'en' ? 'en' : 'tr-TR', `JSON-LD inLanguage: ${route}`);
          const md = await page.locator('link[rel=alternate][type="text/markdown"]').getAttribute('href');
          const mr = await page.request.get(`${base}${md}`);
          assert.equal(mr.status(), 200, `md: ${md}`);
          const mt = await mr.text();
          assert.match(mt, /^---\ntitle: /, `md ön bilgi: ${md}`);
          assert.match(mt, new RegExp(`\\nlang: ${dil}\\n`), `md dili: ${md}`);
          assert.match(mt, /\n# /, `md başlık: ${md}`);
          assert.doesNotMatch(mt, yasakFor(route), `md yasak kavram yok: ${md}`);
          assert.doesNotMatch(mt, /<[a-z][^>]*>/i, `md içinde HTML etiketi yok: ${md}`);
          checks += 8;
        }
        checks += 3;
      }
      checks += 9;
      if (width === 390 || width === 1440) await page.screenshot({ path: join(OUT, `${route.replace(/\//g, '_') || 'yasal'}-${width}.png`), fullPage: true });
    }
    // 404 (beklenen tek kaynak hatası, sonra ayıklanır)
    assert.deepEqual(errors, [], `sayfalarda konsol/CSP hatası yok @${width}`);
    const nf = await page.goto(`${base}/yok-boyle-bir-sayfa`);
    assert.equal(nf?.status(), 404);
    assert.equal(await page.locator('h1').innerText(), 'Bu sayfa bulunamadı.');
    assert.deepEqual(await page.locator('.lang-switch a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), ['/', '/en/'], '404 dil değiştirici ana sayfalara gider');
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
    // Ana sayfada yalnız beta listesi formu var, pencere kapalı; iletişim e-postası tıklanabilir.
    assert.equal(await page.locator('form').count(), 1, 'ana sayfada tek form (beta)');
    assert.match(await page.locator('#iletisim a[href^="mailto:"]').getAttribute('href') ?? '', /^mailto:[^@]+@kabincommunity\.com$/);
    const beta = page.locator('dialog#beta');
    assert.equal(await beta.isVisible(), false, 'beta penceresi başta kapalı');
    await page.locator('.hero a[data-beta-ac]').click();
    assert.equal(await beta.isVisible(), true, 'düğme pencereyi açar');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'ad', 'odak ad alanında');
    const kutu = await beta.boundingBox();
    assert.ok(kutu && kutu.x >= 0 && kutu.x + kutu.width <= width, `pencere ekrana sığar @${width}`);
    await page.keyboard.press('Escape');
    assert.equal(await beta.isVisible(), false, 'Esc kapatır');
    // Reklam bağlantısı: utm etiketleri gizli alanlara, #beta pencereyi açar; geçersiz etiket alınmaz.
    let betaPosted = '';
    await page.route('**/api/basvuru.php', async (r) => {
      betaPosted = r.request().postData() ?? '';
      await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"kod":"TAMAM"}' });
    });
    await page.goto(`${base}/index.html?utm_source=Instagram&utm_medium=reklam&utm_campaign=%3Cscript%3E#beta`);
    await beta.waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).hash, '', 'adresteki #beta temizlenir');
    await beta.locator('[name=ad]').fill('Deneme');
    await beta.locator('[name=eposta]').fill('deneme@example.com');
    await beta.locator('[name=platform]').selectOption('android');
    await beta.locator('[name=yas18]').check();
    await beta.locator('[name=aydinlatma]').check();
    await beta.getByRole('button', { name: /Listeye katıl/ }).click();
    await beta.locator('.form-done').waitFor();
    assert.match(await beta.locator('.form-done').innerText(), /Listedesin/);
    const bf = new URLSearchParams(betaPosted);
    assert.equal(bf.get('tur'), 'beta');
    assert.equal(bf.get('utm_source'), 'instagram');
    assert.equal(bf.get('utm_medium'), 'reklam');
    assert.equal(bf.get('utm_campaign'), '', 'geçersiz kampanya etiketi gönderilmez');
    assert.equal(bf.get('web_sitesi'), '', 'tuzak alan boş gider');
    await page.locator('[data-beta-kapat]').click();
    assert.equal(await beta.isVisible(), false, 'kapat düğmesi kapatır');
    await page.unroute('**/api/basvuru.php');
    // Pilot formu: hukuk onayı yokken kapalı, e-posta yolu gösterilir, ajan aracı olarak sunulmaz.
    await page.goto(`${base}/markalar.html`);
    const form = page.locator('form[data-basvuru="pilot"]');
    assert.notEqual(await form.locator('fieldset.form-body').getAttribute('disabled'), null, 'yasal kapı kapalıyken fieldset kapalı');
    assert.equal(await form.locator('[name=eposta]').isDisabled(), true, 'yasal kapı kapalıyken alanlar kapalı');
    assert.equal(await form.isVisible(), false, 'yasal kapı kapalıyken form görünmez');
    assert.equal(await page.locator('.pilot-mail a[href^="mailto:"]').isVisible(), true, 'kapalıyken e-posta yolu görünür');
    assert.equal(await form.getAttribute('toolname'), null, 'kapalı form WebMCP aracı değil');
    // İstemci akışı: formu açıp sahte uçla hem hata hem başarı yolunu dene
    let posted = '';
    let reply = { status: 429, body: { ok: false, kod: 'SINIR' } };
    await page.route('**/api/basvuru.php', async (r) => {
      posted = r.request().postData() ?? '';
      assert.equal(r.request().method(), 'POST');
      assert.match(r.request().headers()['content-type'], /^application\/x-www-form-urlencoded/);
      await r.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) });
    });
    // İstemci akışını yine de sına: formu yalnız test için görünür ve etkin yap.
    await form.evaluate((f) => { f.hidden = false; f.querySelector('fieldset')?.removeAttribute('disabled'); });
    await form.locator('[name=ad]').fill('Test Kişi');
    await form.locator('[name=sirket]').fill('Örnek Marka');
    await form.locator('[name=eposta]').fill('test@example.com');
    await form.locator('[name=kategori]').selectOption('kadin');
    await form.locator('[name=aydinlatma]').check();
    await form.getByRole('button', { name: /Pilot talebini gönder/ }).click();
    await page.waitForFunction(() => document.querySelector('.form-status')?.classList.contains('err'));
    assert.match(await form.locator('.form-status').innerText(), /bir saat sonra/);
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 429/.test(e)));
    const fields = new URLSearchParams(posted);
    assert.equal(fields.get('eposta'), 'test@example.com');
    assert.equal(fields.get('tur'), 'pilot', 'tür pilot');
    assert.equal(fields.get('web_sitesi'), '', 'tuzak alan boş gider');
    reply = { status: 200, body: { ok: true, kod: 'TAMAM' } };
    await form.getByRole('button', { name: /Pilot talebini gönder/ }).click();
    await page.locator('.form-done').waitFor();
    assert.match(await page.locator('.form-done').innerText(), /Talebiniz alındı/);
    await page.unroute('**/api/basvuru.php');
    // İngilizce sayfalar: demo, beta penceresi ve pilot formu metinleri sayfa dilinde; yasal kapı burada da kapalı.
    await page.goto(`${base}/en/`);
    await page.getByRole('button', { name: 'L', exact: true }).click();
    assert.match(await page.locator('#fit-chest').innerText(), /^Loose$/, 'EN demo metni');
    assert.equal(await page.locator('form').count(), 1, 'EN ana sayfada tek form (beta)');
    assert.match(await page.locator('#contact a[href^="mailto:"]').getAttribute('href') ?? '', /^mailto:[^@]+@kabincommunity\.com$/);
    assert.equal(await page.locator('footer a[href^="/yasal/"]:not([hreflang="tr"])').count(), 0, 'EN alt bilgide yasal bağlantılar hreflang=tr');
    assert.match(await page.locator('footer').innerText(), /legal texts are available in Turkish only/i, 'EN yasal metin notu');
    if (width <= 700) {
      const toggle = page.locator('.menu-toggle');
      assert.equal(await toggle.getAttribute('aria-label'), 'Open menu');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-label'), 'Close menu');
      await page.keyboard.press('Escape');
      // Klavye: dil değiştirici menü kapalıyken de Tab ile erişilebilir.
      // Yeni yükleme: Tab sırası belgenin başından başlar (Esc sonrası odak menü düğmesindedir).
      await page.goto(`${base}/en/`);
      let ulasti = false;
      for (let i = 0; i < 6 && !ulasti; i += 1) {
        await page.keyboard.press('Tab');
        ulasti = await page.evaluate(() => Boolean(document.activeElement?.closest('.lang-switch')));
      }
      assert.ok(ulasti, `dil değiştirici klavyeyle erişilebilir @${width}`);
    }
    let enPosted = '';
    await page.route('**/api/basvuru.php', async (r) => {
      enPosted = r.request().postData() ?? '';
      await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"kod":"TAMAM"}' });
    });
    await page.locator('.hero a[data-beta-ac]').click();
    assert.equal(await beta.isVisible(), true, 'EN düğme pencereyi açar');
    await beta.locator('[name=ad]').fill('Test');
    await beta.locator('[name=eposta]').fill('test@example.com');
    await beta.locator('[name=platform]').selectOption('ios');
    await beta.locator('[name=yas18]').check();
    await beta.locator('[name=aydinlatma]').check();
    await beta.getByRole('button', { name: /Join the list/ }).click();
    await beta.locator('.form-done').waitFor();
    assert.match(await beta.locator('.form-done').innerText(), /You’re on the list/);
    const ef = new URLSearchParams(enPosted);
    assert.equal(ef.get('tur'), 'beta');
    assert.equal(ef.get('dil'), 'en', 'EN form dil alanı');
    await page.unroute('**/api/basvuru.php');
    await page.goto(`${base}/en/brands.html`);
    const enForm = page.locator('form[data-basvuru="pilot"]');
    assert.equal(await enForm.isVisible(), false, 'EN: yasal kapı kapalıyken form görünmez');
    assert.notEqual(await enForm.locator('fieldset.form-body').getAttribute('disabled'), null, 'EN: fieldset kapalı');
    assert.equal(await enForm.getAttribute('toolname'), null, 'EN: kapalı form WebMCP aracı değil');
    assert.equal(await page.locator('.pilot-mail a[href^="mailto:"]').isVisible(), true, 'EN: e-posta yolu görünür');
    let enReply = { status: 429, body: { ok: false, kod: 'SINIR' } };
    await page.route('**/api/basvuru.php', async (r) => {
      await r.fulfill({ status: enReply.status, contentType: 'application/json', body: JSON.stringify(enReply.body) });
    });
    await enForm.evaluate((f) => { f.hidden = false; f.querySelector('fieldset')?.removeAttribute('disabled'); });
    await enForm.locator('[name=ad]').fill('Test Person');
    await enForm.locator('[name=sirket]').fill('Sample Brand');
    await enForm.locator('[name=eposta]').fill('test@example.com');
    await enForm.locator('[name=kategori]').selectOption('kadin');
    await enForm.locator('[name=aydinlatma]').check();
    await enForm.getByRole('button', { name: /Send pilot request/ }).click();
    await page.waitForFunction(() => document.querySelector('.form-status')?.classList.contains('err'));
    assert.match(await enForm.locator('.form-status').innerText(), /try again in an hour/);
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 429/.test(e)));
    enReply = { status: 200, body: { ok: true, kod: 'TAMAM' } };
    await enForm.getByRole('button', { name: /Send pilot request/ }).click();
    await page.locator('.form-done').waitFor();
    assert.match(await page.locator('.form-done').innerText(), /Your request has been received/);
    await page.unroute('**/api/basvuru.php');
    checks += 18 + (width <= 700 ? 3 : 0);
    assert.deepEqual(await context.cookies(), [], 'çerez yok');
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'depolama yok');
    assert.deepEqual(errors, [], `konsol/CSP hatası yok @${width}`);
    assert.deepEqual(outgoing, [], `dış istek yok @${width}`);
    checks += 31;
    await context.close();
  }
  // Ajan dosyaları ve WebMCP (bir kez).
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const [yol, desen] of [['/robots.txt', /Content-Signal: search=yes, ai-input=yes, ai-train=no[\s\S]*Allow: \/[\s\S]*Sitemap: https:\/\/kabincommunity\.com\/sitemap\.xml/],
      ['/sitemap.xml', /<loc>https:\/\/kabincommunity\.com\/<\/loc>[\s\S]*hakkinda\.html/], ['/llms.txt', /^# Kabin\n\n> [\s\S]*## Yasal metinler/],
      ['/.well-known/security.txt', /Contact: mailto:/]]) {
      const r = await page.request.get(`${base}${yol}`);
      assert.equal(r.status(), 200, yol);
      const t = await r.text();
      assert.match(t, desen, yol);
      assert.doesNotMatch(t, YASAK, `yasak kavram yok: ${yol}`);
      checks += 3;
    }
    const sitemap = await (await page.request.get(`${base}/sitemap.xml`)).text();
    // Sitemap: İngilizce sayfalar ve eşler xhtml:link ile; llms.txt İngilizce .md'leri listeler.
    for (const [tr, en] of Object.entries(ESLER).filter(([t]) => !DIZINSIZ.has(t))) {
      const blok = new RegExp(`<url><loc>${SITE}${yolOf(en)}</loc>.*?</url>`).exec(sitemap)?.[0] ?? '';
      assert.ok(blok.includes(`hreflang="tr" href="${SITE}${yolOf(tr)}"`) && blok.includes(`hreflang="en" href="${SITE}${yolOf(en)}"`) && blok.includes(`hreflang="x-default" href="${SITE}${yolOf(tr)}"`), `sitemap eşleri: ${en}`);
      checks += 1;
    }
    assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/, 'sitemap xhtml ad alanı');
    for (const route of PAGES.filter((r) => r.startsWith('en/'))) assert.equal(sitemap.includes(`<loc>${SITE}${yolOf(route)}</loc>`), !DIZINSIZ.has(route), `sitemap: ${route}`);
    const llms = await (await page.request.get(`${base}/llms.txt`)).text();
    for (const md of ['/en/index.md', '/en/brands.md', '/en/about.md', '/en/contact.md']) assert.ok(llms.includes(`${SITE}${md}`), `llms.txt: ${md}`);
    checks += 2 + PAGES.filter((r) => r.startsWith('en/')).length + 4;
    // hreflang karşılıklılığı: eş sayfaların alternatif kümeleri aynıdır.
    for (const [tr, en] of Object.entries(ESLER).filter(([t]) => !DIZINSIZ.has(t))) {
      assert.deepEqual(hreflangler.get(en), hreflangler.get(tr), `hreflang karşılıklı: ${tr} ↔ ${en}`);
      checks += 1;
    }
    for (const loc of sitemap.matchAll(/<loc>https:\/\/kabincommunity\.com(\/[^<]*)<\/loc>/g)) {
      assert.equal((await page.request.get(`${base}${loc[1]}`)).status(), 200, `sitemap adresi: ${loc[1]}`);
      checks += 1;
    }
    // WebMCP: tarayıcı API'sini taklit et, araçların kaydını ve salt-okunur çalışmasını doğrula.
    await page.addInitScript(() => {
      const tools = [];
      Object.defineProperty(window, '__araclar', { value: tools });
      Object.defineProperty(document, 'modelContext', { value: { registerTool: (t) => { tools.push(t); return Promise.resolve(undefined); } } });
    });
    await page.goto(`${base}/yasal/gizlilik.html`);
    const adlar = await page.evaluate(() => window.__araclar.map((t) => `${t.name}:${t.annotations?.readOnlyHint}`));
    assert.deepEqual(adlar, ['kabin_site_ozeti:true', 'kabin_sayfa_oku:true']);
    const ozet = await page.evaluate(() => window.__araclar[0].execute({}));
    assert.match(ozet.content[0].text, /^# Kabin/);
    const bu = await page.evaluate(() => window.__araclar[1].execute({}));
    assert.match(bu.content[0].text, /# Gizlilik Politikası/);
    const kotu = await page.evaluate(() => window.__araclar[1].execute({ yol: 'https://kotu.example/x.md' }));
    assert.equal(kotu.isError, true, 'dış adres reddedilir');
    const gizli = await page.evaluate(() => window.__araclar[1].execute({ yol: '/../_kaynak/kunye.json' }));
    assert.equal(gizli.isError, true, 'kaynak dosyası reddedilir');
    checks += 5;
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`QA geçti: ${checks} denetim, ekran görüntüleri ${OUT}`);
