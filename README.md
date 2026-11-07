# Kabin tanıtım sitesi

kabincommunity.com tanıtım sitesi: statik HTML/CSS/JS + tek bir PHP pilot talebi ucu. Hostinger'de GitHub'dan otomatik
yayımlanacak şekilde hazırlandı. **Depo kökü = `public_html`**: Hostinger'in Git dağıtımı derleme adımı
çalıştırmaz, depodaki dosyaları olduğu gibi `public_html`'e koyar. Bu yüzden üretilmiş HTML dosyaları da depoya
işlenir. Kaynak, test ve belge dosyaları `.htaccess` ile dışarıya kapatılmıştır.

> Bu belge `.htaccess` ile web'den erişilemez (`README*`, `YAYIN-KONTROL*` → 404). Sayfaların üretilmiş
> `.md` sürümleri ise bilerek açıktır (yapay zekâ ajanları için).

## Klasörler

| Yol | Ne | Web'den erişim |
|---|---|---|
| `index.html`, `markalar.html`, `hakkinda.html`, `iletisim.html`, `yasal/*.html`, `404.html`, `basvuru-*.html` | Üretilmiş sayfalar (elle düzenlemeyin) | açık |
| `*.md`, `yasal/*.md` (README ve YAYIN-KONTROL hariç) | Sayfaların Markdown sürümleri (üretilir) | açık, `noindex` |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Tarayıcı ve ajan keşif dosyaları (üretilir) | açık |
| `styles.css`, `app.js`, `assets/` | Üretilmiş stil, derlenmiş betik, yazı tipleri, görseller | açık |
| `api/basvuru.php` | Pilot talebi ucu (POST, yalnız `tur=pilot`) | açık, `api/` altında tek dosya |
| `api/_lib/` | PHP kitaplığı + `yasal-durum.php` (üretilir) | kapalı |
| `_kaynak/` | Sayfa parçaları, şablon (`sablon.py`), ajan çıktıları (`ajan.py`, `md.py`), `kunye.json`, `app.ts`, `config.example.php` | kapalı |
| `_test/` | Tarayıcı QA (Playwright) ve PHP testleri | kapalı |
| `.well-known/security.txt` | Güvenlik iletişimi (üretilir) | açık |

## Derleme

`package.json` bilerek depo kökünde DEĞİL, `_kaynak/` içindedir: kökte olursa Hostinger projeyi Node.js
uygulaması sanıp `app.js`'i (tarayıcı betiği) sunucuda çalıştırmaya kalkar (`document is not defined`).

```bash
cd _kaynak
npm install            # typescript + playwright (yalnız geliştirme için; sunucuya gitmez)
npm run build          # app.ts → ../app.js, sayfalar → depo kökü
npm run qa             # 13 sayfa × 4 genişlik: çerez/depolama/dış istek/CSP/taşma, JSON-LD, .md, sitemap, WebMCP
npm run kontrol        # YAYIN KAPISI: künye eksik ya da hukuk onayı yoksa 1 ile çıkar
cd .. && bash _test/php-test.sh   # PHP ucu testleri (php 8.1+ ve curl gerekir)
```

Değişiklikten sonra **her zaman** `_kaynak/` içinde `npm run build` çalıştırıp üretilen dosyaları da commit'leyin.

## Yayın kapısı (veri toplamadan önce)

1. `_kaynak/kunye.json` alanları dolu (2026-11-07). Boş alan olursa sitede sarı `[DOLDURULACAK]` görünür.
2. Künyede eksik alan varken **ya da** `hukuk_onayi` false iken derleme pilot formunu **gizli ve kapalı** üretir
   (yerine e-posta kartı görünür) ve `api/basvuru.php` **503** döner. Bu kasıtlıdır: hukuken onaylanmamış bir
   aydınlatma metniyle formdan kişisel veri toplanmaz.
3. Yasal metinleri bir hukukçuya okutun; onaydan sonra `kunye.json` → `"hukuk_onayi": true` (taslak uyarısı kalkar,
   form görünür olur ve WebMCP `toolname` niteliği eklenir).
4. `YAYIN-KONTROL.md` listesinin tamamını işaretleyin (B bölümünde engelleyici maddeler var).

## GitHub'a gönderme (sizin yapacağınız adımlar)

Uzak depo: `Cratabs/kabin-web1` (private önerilir). Her değişiklikten sonra kendi terminalinizden:
```bash
cd /home/bkork/projects/kabin-web
git push
```

## Hostinger kurulumu

Kaynak: Hostinger belgeleri, [Git ile dağıtım](https://docs.hostinger.com/websites/git) ve
[destek makalesi](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/).

1. **PHP sürümü:** hPanel → Web siteleri → Yönet → Gelişmiş → PHP Yapılandırması → **8.1 veya üstü**.
2. **public_html'i boşaltın:** Git dağıtımı boş klasör ister. Hostinger'in varsayılan `default.php` /
   `index.php` dosyalarını Dosya Yöneticisi'nden silin.
3. **Git bağlantısı (Node.js uygulaması DEĞİL):** hPanel → Gelişmiş → **GIT** → *Connect with GitHub* (Hostinger GitHub uygulamasına yalnız
   bu depo için izin verin) → depo `kabin-web`, dal `main`, dizin boş (= `public_html`) → Oluştur → *Deploy*.
4. **Otomatik dağıtım:** aynı ekranda *Auto Deployment* açın. Her `git push` sonrası site güncellenir.
   Her dağıtım `public_html` içeriğini depodakiyle değiştirir, bu yüzden sunucuda `public_html` içine elle
   dosya koymayın.
5. **Özel ayar dosyası (web kökünün DIŞINDA):** Dosya Yöneticisi'nde `public_html`'in bir üst klasörüne gidin
   (`/home/<kullanıcı>/domains/<alan-adı>/`) → `kabin-private` klasörü oluşturun → içine
   `_kaynak/config.example.php`'yi `config.php` adıyla kopyalayıp düzenleyin:
   - `secret`: `python3 -c "import secrets; print(secrets.token_hex(32))"` çıktısı.
   - `notify_to` / `mail_from`: hPanel → E-postalar'da bu alan adı için açtığınız gerçek posta kutuları.
   - `allowed_hosts`: alan adınız ve `www.` biçimi.
   - `accepting`: yayın kapısı geçilince `true`.
   - Dosya izni **600**, klasör izni **700**.
   Pilot talepleri `kabin-private/veri/basvurular-pilot.jsonl` dosyasına yazılır (izin 600).
   Bildirim e-postası kişisel veri içermez; başvuruları Dosya Yöneticisi'nden indirerek okuyun.
6. **SSL:** hPanel → Güvenlik → SSL → sertifikayı kurun ve *Force HTTPS* açın (`.htaccess` de yönlendirir).
   `.htaccess` HSTS (1 yıl) gönderir; SSL çalışmadan alan adını yayına almayın.
7. **E-posta doğrulaması:** hPanel → E-postalar → DNS'te SPF/DKIM/DMARC kayıtlarının etkin olduğunu kontrol edin;
   aksi hâlde bildirimler spam'e düşebilir.
8. **Canlı denetim** (alan adınızla):
   ```bash
   A=https://kabincommunity.com
   curl -sI $A/ | grep -iE 'content-security|strict-transport|x-frame|^link|^vary'   # Link: llms.txt, index.md
   curl -sI $A/ | grep -i x-robots                                                    # BOŞ olmalı (indekslenir)
   curl -s -H 'Accept: text/markdown' $A/ | head -3                                   # "---" / "title: …"
   curl -s -H 'Accept: text/markdown' $A/yasal/gizlilik.html | head -3                # Markdown
   curl -s $A/robots.txt $A/llms.txt | head -5 ; curl -s $A/sitemap.xml | head -3
   for y in README.md YAYIN-KONTROL.md .git/config _kaynak/kunye.json api/_lib/ayar.php; do
     curl -s -o /dev/null -w "%{http_code} $y\n" $A/$y; done                        # hepsi 404
   curl -s -H 'Accept: application/json' -X POST $A/api/basvuru.php                   # onay yoksa {"ok":false,"kod":"KAPALI"}
   ```

## İndeksleme ve yapay zekâ ajanları

Site arama motorlarına ve yapay zekâ ajanlarına açıktır. Hepsi `build.py` tarafından künyeden üretilir:
- `robots.txt`: herkese `Allow: /` (yalnız `/api/` kapalı), `Content-Signal: search=yes, ai-input=yes, ai-train=no`
  (aramada ve yanıt üretmede kullanılabilir, model eğitimine izin yok), `Sitemap:` satırı. Arama/kullanıcı
  ajanları (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User) ayrıca
  adlandırılmıştır. Eğitime izin vermek isterseniz `_kaynak/ajan.py` → `robots()` içinde `ai-train=yes` yapın.
- Her sayfada canonical, Open Graph, `<link rel="alternate" type="text/markdown">` ve JSON-LD
  (`Organization` + `sameAs`, `WebSite`, `WebPage` / `AboutPage` / `ContactPage`, ana sayfada `FAQPage`).
  Resmî sosyal medya profilleri açılınca `kunye.json` → `sameAs` listesine ekleyin.
- `llms.txt` (llmstxt.org): özet + tüm sayfaların `.md` bağlantıları.
- Markdown içerik anlaşması: `Accept: text/markdown` ile istenen sayfa aynı adreste `.md` olarak döner
  (`.htaccess` §5, `Vary: Accept`). Ana sayfa `Link` başlığıyla `llms.txt`, `sitemap.xml` ve `index.md`'yi gösterir.
- WebMCP (`app.ts`): destekleyen tarayıcılarda iki **salt-okunur** araç kaydedilir: `kabin_site_ozeti` (llms.txt)
  ve `kabin_sayfa_oku` (yalnız bu sitenin `/…/*.md` yolları). Pilot formu açıldığında bildirimsel
  `toolname="kabin_pilot_talebi"` niteliği alır.
- MCP sunucu kartı (`/.well-known/mcp…`) **yayımlanmaz**: ortada bir MCP sunucusu yoktur; olmayan bir uç
  noktayı ilan etmek ajanları yanıltır.
- `404.html` ve `basvuru-*.html` `noindex`'tir ve sitemap/llms.txt dışında tutulur.

## Güvenlik özeti

- CSP: yalnız kendi kökü; satır içi betik/stil yok, `frame-ancestors 'none'`. Meta CSP ikinci savunma hattıdır.
- Çerez, yerel depolama, analiz, CDN, dış yazı tipi yok (QA bunları her çalıştırmada denetler).
- JSON-LD satır içi bir veri bloğudur (çalıştırılmaz, CSP'yi gevşetmez); içindeki `<` karakterleri kaçırılır.
- PHP ucu: yalnız POST; gövde ≤16 KB; Host/Origin/Sec-Fetch-Site denetimi; IP başına saatte 10 deneme
  (IP'nin HMAC özeti, 24 saat); günlük genel tavan; tuzak alan; sıkı doğrulama ve normalleştirme;
  `flock` ile kilitli yazma; dosyalar 600; ayar yoksa, künye eksikse ya da hukuk onayı yoksa kapalı (503);
  yalnız `tur=pilot` kabul edilir; hata ayrıntısı sızmaz;
  e-posta başlıklarına kullanıcı girdisi girmez.
- Bilinen sınır: Hostinger CDN açıksa `REMOTE_ADDR` CDN düğümü olabilir; o durumda IP başına sınır gevşer,
  günlük genel tavan yine geçerlidir.
