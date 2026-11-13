// Tarayıcı QA: tüm sayfalar × 5 genişlik. Ağ yalnız yerel; PHP yerine form ucu sahte yanıtla taklit edilir (gerçek uca istek gitmez).
// Çalıştırma:  node _test/onizleme.mjs        (önce: cd _kaynak && npm install; başka kurulum için KABIN_PLAYWRIGHT=/yol/playwright/index.mjs)
// Ortak parçalar (sayfa listesi, eşler, yerel sunucu): _test/onizleme-ortak.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DIZINSIZ, ES, ESLER, OUT, PAGES, SITE, SORULAR, YASAK, dilAdresleri, dilOf, kaydir, menuAc, sunucuAc, yasakFor, yolOf } from './onizleme-ortak.mjs';

const { chromium } = await import(process.env.KABIN_PLAYWRIGHT ?? new URL('../_kaynak/node_modules/playwright/index.mjs', import.meta.url).href);
const { server, base } = await sunucuAc();
await mkdir(OUT, { recursive: true });
const hreflangler = new Map();
const MENU_EN_COK = 819; // css: bu genişlik ve altında gezinme menü düğmesinin arkasında

// WebGL başsız Chromium'da yazılımla çalışsın: 3B sahneler de sınansın.
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
try {
  for (const width of [2560, 1440, 768, 390, 320]) {
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
      if (width <= MENU_EN_COK) await menuAc(page);
      const sw = await page.locator('header .dil a').evaluateAll((as) => as.map((a) => {
        const r = a.getBoundingClientRect();
        return { href: a.getAttribute('href'), lang: a.lang, hreflang: a.hreflang, current: a.getAttribute('aria-current'), text: a.textContent, sag: r.right, sol: r.left, gorunur: r.width > 0 && r.height > 0 };
      }));
      const beklenen = dilAdresleri(route);
      assert.deepEqual(sw.map((a) => [a.text, a.lang, a.hreflang, a.href]), [['TR', 'tr', 'tr', beklenen.tr], ['EN', 'en', 'en', beklenen.en]], `dil değiştirici: ${route}`);
      assert.deepEqual(sw.map((a) => a.current), [dil === 'tr' ? 'true' : null, dil === 'en' ? 'true' : null], `etkin dil aria-current: ${route}`);
      assert.ok(sw.every((a) => a.gorunur && a.sol >= 0 && a.sag <= width), `dil değiştirici görünür ve ekrana sığar: ${route} @${width}`);
      if (width <= MENU_EN_COK) { await page.keyboard.press('Escape'); assert.equal(await page.locator('.menu-dugme').getAttribute('aria-expanded'), 'false', `Esc menüyü kapatır: ${route}`); }
      await kaydir(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `taşma yok: ${route} @${width}`);
      assert.equal(await page.locator('img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)), true, `görseller: ${route} @${width}`);
      const broken = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const href of new Set(broken)) {
        const p = (href ?? '').split('#')[0];
        if (p) { const r = await page.request.get(`${base}${p}`); assert.equal(r.status(), 200, `bağlantı ${href} (${route})`); }
      }
      if (width === 1440) {
        const html = await res.text();
        assert.doesNotMatch(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '), yasakFor(route), `yasak kavram yok: ${route}`);
        assert.doesNotMatch(html, /<[a-z][^>]*\sstyle=|<style\b/i, `satır içi stil yok: ${route}`);
        assert.equal([...html.matchAll(/<script\b([^>]*)>/g)].filter((m) => !/\ssrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1])).length, 0, `satır içi betik yok: ${route}`);
        const dizinli = !DIZINSIZ.has(route);
        assert.equal(await page.locator('meta[name=robots][content*=noindex]').count(), dizinli ? 0 : 1, `noindex: ${route}`);
        assert.equal(await page.locator('link[rel=canonical]').count(), dizinli ? 1 : 0, `canonical: ${route}`);
        assert.equal(await page.locator('meta[property="og:image"]').count(), 0, `og:image yok: ${route}`);
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
          checks += 5;
        } else {
          assert.deepEqual(alt, [], `noindex sayfada hreflang yok: ${route}`);
          assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0, `noindex sayfada JSON-LD yok: ${route}`);
        }
        if (dizinli) {
          const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '');
          const types = ld['@graph'].map((n) => n['@type']);
          assert.ok(types.includes('Organization') && types.includes('WebSite'), `JSON-LD: ${route}`);
          // SSS yalnız Sorular sayfalarında; soru/cevap metni sayfada görünen h2/p ile aynı.
          assert.equal(types.includes('FAQPage'), SORULAR.has(route), `JSON-LD FAQPage yalnız Sorular: ${route}`);
          if (SORULAR.has(route)) {
            const faq = ld['@graph'].find((n) => n['@type'] === 'FAQPage');
            const gorunen = await page.locator('main h2').evaluateAll((hs) => hs.map((h) => [h.textContent.trim(), h.nextElementSibling?.textContent.trim()]));
            assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), gorunen, `FAQPage = görünen sorular: ${route}`);
            assert.equal(gorunen.length, 4, `dört soru: ${route}`);
          }
          if (route === 'index.html' || route === 'en/') assert.ok(types.includes('SoftwareApplication'), `JSON-LD SoftwareApplication: ${route}`);
          if (route === 'markalar.html' || route === 'en/brands.html') assert.ok(types.includes('Service'), `JSON-LD Service: ${route}`);
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
          checks += 9;
        }
        checks += 6;
      }
      checks += 11;
      if (width === 390 || width === 1440) await page.screenshot({ path: join(OUT, `${route.replace(/\//g, '_') || 'yasal'}-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, [], `sayfalarda konsol/CSP hatası yok @${width}`);
    // 404 (beklenen tek kaynak hatası, sonra ayıklanır)
    const nf = await page.goto(`${base}/yok-boyle-bir-sayfa`);
    assert.equal(nf?.status(), 404);
    assert.equal(await page.locator('h1').innerText(), 'Bu sayfa bulunamadı.');
    assert.deepEqual(await page.locator('.dil a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), ['/', '/en/'], '404 dil değiştirici ana sayfalara gider');
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 404/.test(e)));
    // Ana sayfa: 3B sahneler, adımlar, dar · tam · bol kartı
    await page.goto(`${base}/index.html`);
    await kaydir(page);
    await page.waitForFunction(() => Object.keys(window.__kabinSahne || {}).length >= 2 || document.documentElement.classList.contains('sahnesiz'), null, { timeout: 15000 });
    assert.deepEqual(await page.evaluate(() => Object.keys(window.__kabinSahne || {}).sort()), ['giris', 'uyum'], `ana sayfa 3B sahneleri kuruldu @${width}`);
    const adimSirasi = [];
    const nasil = await page.evaluate(() => { const s = document.querySelector('#nasil'); return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight }; });
    for (let i = 0; i <= 30; i++) {
      await page.evaluate((y) => scrollTo(0, y), nasil.top - 450 + nasil.h * i / 30);
      await page.waitForTimeout(120);
      const on = await page.evaluate(() => [[...document.querySelectorAll('#nasil .adim')].findIndex((a) => a.classList.contains('on')), [...document.querySelectorAll('#nasil [data-adim-teller] .tel')].findIndex((a) => a.classList.contains('on'))]);
      assert.equal(on[0], on[1], `adım ile telefon ekranı aynı @${width}`);
      if (adimSirasi.at(-1) !== on[0]) adimSirasi.push(on[0]);
    }
    assert.deepEqual(adimSirasi, [0, 1, 2], `Nasıl çalışır kaydırınca 1 → 2 → 3 @${width}`);
    const uyum = page.locator('[data-uyum]');
    await uyum.getByRole('button', { name: 'S', exact: true }).click();
    assert.match(await uyum.locator('.uyum-soz').innerText(), /^S /);
    assert.equal(await uyum.locator('[data-beden="S"]').getAttribute('aria-pressed'), 'true');
    await uyum.getByRole('button', { name: 'L', exact: true }).click();
    assert.match(await uyum.locator('[data-bolge-i="1"] .gizli').textContent(), /bol/, 'L göğüste bol');
    if (width <= MENU_EN_COK) {
      const toggle = page.locator('.menu-dugme');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#gezin').isVisible(), true, 'menü açılınca gezinme görünür');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#gezin').isVisible(), false, 'Esc gezinmeyi gizler');
    }
    // Ana sayfada yalnız davet formu var (#davet içinde, sayfada açık); iletişim e-postası tıklanabilir.
    assert.equal(await page.locator('form').count(), 1, 'ana sayfada tek form (davet)');
    assert.equal(await page.locator('#davet form[data-basvuru="beta"]').count(), 1, 'davet formu #davet bölümünde');
    assert.match(await page.locator('a#iletisim[href^="mailto:"]').getAttribute('href') ?? '', /^mailto:[^@]+@kabincommunity\.com$/);
    assert.equal(await page.locator('dialog').count(), 0, 'pencere yok');
    // Reklam bağlantısı: utm etiketleri gizli alanlara, #beta davet bölümüne götürür; geçersiz etiket alınmaz.
    let betaPosted = '';
    await page.route('**/api/basvuru.php', async (r) => {
      betaPosted = r.request().postData() ?? '';
      await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"kod":"TAMAM"}' });
    });
    await page.goto(`${base}/index.html?utm_source=Instagram&utm_medium=reklam&utm_campaign=%3Cscript%3E#beta`);
    const beta = page.locator('#davet form[data-basvuru="beta"]');
    // Sayfa çapaya yumuşak kayar (~1,5 sn): kayma bitene kadar bekle.
    await page.waitForFunction(() => { const r = document.querySelector('#beta').getBoundingClientRect(); return r.top >= -2 && r.top < innerHeight; }, null, { timeout: 8000 }).catch(() => undefined);
    const kutu = await beta.boundingBox();
    assert.ok(kutu && kutu.x >= 0 && kutu.x + kutu.width <= width, `form ekrana sığar @${width}`);
    assert.ok(await page.evaluate(() => { const r = document.querySelector('#beta').getBoundingClientRect(); return r.top >= -2 && r.top < innerHeight; }), '#beta davet bölümüne götürür');
    await beta.locator('[name=ad]').fill('Deneme');
    await beta.locator('[name=eposta]').fill('deneme@example.com');
    await beta.locator('[name=platform]').selectOption('android');
    await beta.locator('[name=yas18]').check();
    await beta.locator('[name=aydinlatma]').check();
    await beta.getByRole('button', { name: /Davet isteyin/ }).click();
    await page.locator('#davet .form-done').waitFor();
    assert.match(await page.locator('#davet .form-done').innerText(), /Listedesiniz/);
    const bf = new URLSearchParams(betaPosted);
    assert.equal(bf.get('tur'), 'beta');
    assert.equal(bf.get('utm_source'), 'instagram');
    assert.equal(bf.get('utm_medium'), 'reklam');
    assert.equal(bf.get('utm_campaign'), '', 'geçersiz kampanya etiketi gönderilmez');
    assert.equal(bf.get('web_sitesi'), '', 'tuzak alan boş gider');
    assert.equal(bf.get('dil'), null, 'TR formda dil alanı yok');
    await page.unroute('**/api/basvuru.php');
    // Pilot formu: hukuk onayı yokken kapalı, e-posta yolu gösterilir, ajan aracı olarak sunulmaz.
    await page.goto(`${base}/markalar.html`);
    await page.waitForFunction(() => 'marka' in (window.__kabinSahne || {}) || document.documentElement.classList.contains('sahnesiz'), null, { timeout: 15000 });
    assert.ok(await page.evaluate(() => 'marka' in (window.__kabinSahne || {})), `markalar 3B sahnesi kuruldu @${width}`);
    const form = page.locator('form[data-basvuru="pilot"]');
    assert.equal(await form.locator('input:not([type=hidden]), select, textarea, button').evaluateAll((els) => els.every((e) => e.disabled)), true, 'yasal kapı kapalıyken tüm alanlar kapalı');
    assert.equal(await form.isVisible(), false, 'yasal kapı kapalıyken form görünmez');
    assert.equal(await page.locator('#pilot a[href^="mailto:"]').first().isVisible(), true, 'kapalıyken e-posta yolu görünür');
    assert.equal(await form.getAttribute('toolname'), null, 'kapalı form WebMCP aracı değil');
    // Mağaza örneği: "Bedenimi bul" paneli açıp kapar, "M'yi seç" mağaza seçicisinde M'yi işaretler.
    const mg = page.locator('[data-magaza]');
    await mg.locator('[data-mg-sec]').click();
    assert.equal(await mg.locator('[data-mg-beden="M"]').getAttribute('aria-pressed'), 'true', 'M’yi seç mağaza seçicisini işaretler');
    await mg.locator('[data-mg-ac]').click();
    assert.equal(await mg.locator('.mg-panel').isVisible(), false, 'Bedenimi bul paneli kapatır');
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
    await form.evaluate((f) => { f.hidden = false; f.querySelectorAll('[disabled]').forEach((e) => e.removeAttribute('disabled')); });
    await form.locator('[name=ad]').fill('Test Kişi');
    await form.locator('[name=sirket]').fill('Örnek Marka');
    await form.locator('[name=eposta]').fill('test@example.com');
    await form.locator('[name=kategori]').selectOption('kadin');
    await form.locator('[name=aydinlatma]').check();
    await form.getByRole('button', { name: /Pilot talebini gönder/ }).click();
    await page.waitForFunction(() => document.querySelector('form[data-basvuru="pilot"] .form-status')?.classList.contains('err'));
    assert.match(await form.locator('.form-status').innerText(), /bir saat sonra/i);
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 429/.test(e)));
    const fields = new URLSearchParams(posted);
    assert.equal(fields.get('eposta'), 'test@example.com');
    assert.equal(fields.get('tur'), 'pilot', 'tür pilot');
    assert.equal(fields.get('web_sitesi'), '', 'tuzak alan boş gider');
    reply = { status: 200, body: { ok: true, kod: 'TAMAM' } };
    await form.getByRole('button', { name: /Pilot talebini gönder/ }).click();
    await page.locator('.form-done').waitFor();
    assert.match(await page.locator('.form-done').innerText(), /Yazdıklarınızı aldık/);
    await page.unroute('**/api/basvuru.php');
    // İngilizce sayfalar: örnek kart, davet formu ve pilot formu metinleri sayfa dilinde; yasal kapı burada da kapalı.
    await page.goto(`${base}/en/`);
    await page.locator('[data-uyum]').getByRole('button', { name: 'L', exact: true }).click();
    assert.match(await page.locator('[data-uyum] .uyum-soz').innerText(), /^L is loose/, 'EN örnek kart metni');
    assert.match(await page.locator('[data-uyum] [data-bolge-i="1"] .gizli').textContent(), /loose/, 'EN bölge metni');
    assert.equal(await page.locator('form').count(), 1, 'EN ana sayfada tek form (davet)');
    assert.equal(await page.locator('#invite form[data-basvuru="beta"]').count(), 1, 'EN davet formu #invite bölümünde');
    assert.match(await page.locator('a#contact[href^="mailto:"]').getAttribute('href') ?? '', /^mailto:[^@]+@kabincommunity\.com$/);
    assert.equal(await page.locator('footer a[href^="/yasal/"]:not([hreflang="tr"])').count(), 0, 'EN alt bilgide yasal bağlantılar hreflang=tr');
    assert.match(await page.locator('footer').innerText(), /legal texts are available in Turkish only/i, 'EN yasal metin notu');
    // Betikle çizilen örnek ekranlarda Türkçe kalıntı yok.
    await kaydir(page);
    const maket = await page.locator('[data-adim-teller], [data-tel-serit], [data-uyum], [data-ray]').evaluateAll((els) => els.map((e) => e.textContent).join(' '));
    assert.doesNotMatch(maket, /[çğıöşüİÇĞÖŞÜ]|\b(Beden|Bel|Dolap|dar|tam|bol)\b/, 'EN örnek ekranlarda Türkçe yok');
    if (width <= MENU_EN_COK) {
      const toggle = page.locator('.menu-dugme');
      assert.equal(await toggle.getAttribute('aria-label'), 'Menu');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('menu-dugme')), true, 'Esc sonrası odak menü düğmesinde');
      // Klavye: menü düğmesi Enter ile açılır, dil değiştiriciye Tab ile ulaşılır.
      await page.goto(`${base}/en/`);
      let ulasti = false;
      for (let i = 0; i < 12 && !ulasti; i += 1) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => document.activeElement?.classList.contains('menu-dugme'))) await page.keyboard.press('Enter');
        ulasti = await page.evaluate(() => Boolean(document.activeElement?.closest('.dil')));
      }
      assert.ok(ulasti, `dil değiştirici klavyeyle erişilebilir @${width}`);
    }
    let enPosted = '';
    await page.route('**/api/basvuru.php', async (r) => {
      enPosted = r.request().postData() ?? '';
      await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"kod":"TAMAM"}' });
    });
    await page.goto(`${base}/en/#invite`);
    const enBeta = page.locator('#invite form[data-basvuru="beta"]');
    await enBeta.locator('[name=ad]').fill('Test');
    await enBeta.locator('[name=eposta]').fill('test@example.com');
    await enBeta.locator('[name=platform]').selectOption('ios');
    await enBeta.locator('[name=yas18]').check();
    await enBeta.locator('[name=aydinlatma]').check();
    await enBeta.getByRole('button', { name: /Request an invite/ }).click();
    await page.locator('#invite .form-done').waitFor();
    assert.match(await page.locator('#invite .form-done').innerText(), /You’re on the list/);
    const ef = new URLSearchParams(enPosted);
    assert.equal(ef.get('tur'), 'beta');
    assert.equal(ef.get('dil'), 'en', 'EN form dil alanı');
    await page.unroute('**/api/basvuru.php');
    await page.goto(`${base}/en/brands.html`);
    const enForm = page.locator('form[data-basvuru="pilot"]');
    assert.equal(await enForm.isVisible(), false, 'EN: yasal kapı kapalıyken form görünmez');
    assert.equal(await enForm.locator('input:not([type=hidden]), select, textarea, button').evaluateAll((els) => els.every((e) => e.disabled)), true, 'EN: alanlar kapalı');
    assert.equal(await enForm.getAttribute('toolname'), null, 'EN: kapalı form WebMCP aracı değil');
    assert.equal(await page.locator('#pilot a[href^="mailto:"]').first().isVisible(), true, 'EN: e-posta yolu görünür');
    const enMg = await page.locator('[data-magaza]').evaluate((e) => e.textContent);
    assert.doesNotMatch(enMg, /[çğıöşüİÇĞÖŞÜ]|\b(Beden|Bel|Sepete|Mağaza|dar|tam|bol)\b/, 'EN mağaza örneğinde Türkçe yok');
    let enReply = { status: 429, body: { ok: false, kod: 'SINIR' } };
    await page.route('**/api/basvuru.php', async (r) => {
      await r.fulfill({ status: enReply.status, contentType: 'application/json', body: JSON.stringify(enReply.body) });
    });
    await enForm.evaluate((f) => { f.hidden = false; f.querySelectorAll('[disabled]').forEach((e) => e.removeAttribute('disabled')); });
    await enForm.locator('[name=ad]').fill('Test Person');
    await enForm.locator('[name=sirket]').fill('Sample Brand');
    await enForm.locator('[name=eposta]').fill('test@example.com');
    await enForm.locator('[name=kategori]').selectOption('kadin');
    await enForm.locator('[name=aydinlatma]').check();
    await enForm.getByRole('button', { name: /Send pilot request/ }).click();
    await page.waitForFunction(() => document.querySelector('form[data-basvuru="pilot"] .form-status')?.classList.contains('err'));
    assert.match(await enForm.locator('.form-status').innerText(), /try again in an hour/i);
    errors.splice(0, errors.length, ...errors.filter((e) => !/status of 429/.test(e)));
    enReply = { status: 200, body: { ok: true, kod: 'TAMAM' } };
    await enForm.getByRole('button', { name: /Send pilot request/ }).click();
    await page.locator('.form-done').waitFor();
    assert.match(await page.locator('.form-done').innerText(), /We got your message/);
    await page.unroute('**/api/basvuru.php');
    checks += 40 + (width <= MENU_EN_COK ? 11 : 0);
    assert.deepEqual(await context.cookies(), [], 'çerez yok');
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'depolama yok');
    assert.deepEqual(errors, [], `konsol/CSP hatası yok @${width}`);
    assert.deepEqual(outgoing, [], `dış istek yok @${width}`);
    checks += 4;
    await context.close();
  }
  // Ajan dosyaları ve WebMCP (bir kez).
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const [yol, desen] of [['/robots.txt', /Content-Signal: search=yes, ai-input=yes, ai-train=yes[\s\S]*Allow: \/[\s\S]*Sitemap: https:\/\/kabincommunity\.com\/sitemap\.xml/],
      ['/sitemap.xml', /<loc>https:\/\/kabincommunity\.com\/<\/loc>[\s\S]*hakkinda\.html[\s\S]*sorular\.html/], ['/llms.txt', /^# Kabin\n\n> [\s\S]*sorular\.md[\s\S]*## Yasal metinler/],
      ['/.well-known/security.txt', /Contact: mailto:/]]) {
      const r = await page.request.get(`${base}${yol}`);
      assert.equal(r.status(), 200, yol);
      const t = await r.text();
      assert.match(t, desen, yol);
      assert.doesNotMatch(t, YASAK, `yasak kavram yok: ${yol}`);
      if (yol === '/robots.txt') assert.doesNotMatch(t, /ai-train=no/, 'robots: ai-train=no yok');
      checks += 3;
    }
    const sitemap = await (await page.request.get(`${base}/sitemap.xml`)).text();
    // Sitemap: İngilizce sayfalar ve eşler xhtml:link ile; llms.txt İngilizce .md'leri listeler.
    for (const [tr, en] of Object.entries(ESLER).filter(([t]) => !DIZINSIZ.has(t))) {
      const blok = new RegExp(`<url><loc>${SITE}${yolOf(en)}</loc>.*?</url>`, 's').exec(sitemap)?.[0] ?? '';
      assert.ok(blok.includes(`hreflang="tr" href="${SITE}${yolOf(tr)}"`) && blok.includes(`hreflang="en" href="${SITE}${yolOf(en)}"`) && blok.includes(`hreflang="x-default" href="${SITE}${yolOf(tr)}"`), `sitemap eşleri: ${en}`);
      checks += 1;
    }
    assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/, 'sitemap xhtml ad alanı');
    for (const route of PAGES) assert.equal(sitemap.includes(`<loc>${SITE}${yolOf(route)}</loc>`), !DIZINSIZ.has(route), `sitemap: ${route}`);
    const llms = await (await page.request.get(`${base}/llms.txt`)).text();
    for (const md of ['/sorular.md', '/en/index.md', '/en/brands.md', '/en/about.md', '/en/contact.md', '/en/questions.md']) assert.ok(llms.includes(`${SITE}${md}`), `llms.txt: ${md}`);
    checks += 2 + PAGES.length + 6;
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
