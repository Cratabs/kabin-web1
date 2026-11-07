# Kabin tanıtım sitesi

Kapalı beta tanıtım sitesi: statik HTML/CSS/JS + tek bir PHP başvuru ucu. Hostinger'de GitHub'dan otomatik
yayımlanacak şekilde hazırlandı. **Depo kökü = `public_html`**: Hostinger'in Git dağıtımı derleme adımı
çalıştırmaz, depodaki dosyaları olduğu gibi `public_html`'e koyar. Bu yüzden üretilmiş HTML dosyaları da depoya
işlenir. Kaynak, test ve belge dosyaları `.htaccess` ile dışarıya kapatılmıştır.

> Bu belge `.htaccess` ile web'den erişilemez (`*.md` → 404).

## Klasörler

| Yol | Ne | Web'den erişim |
|---|---|---|
| `index.html`, `markalar.html`, `yasal/*.html`, `404.html`, `basvuru-*.html` | Üretilmiş sayfalar (elle düzenlemeyin) | açık |
| `styles.css`, `app.js`, `assets/` | Üretilmiş stil, derlenmiş betik, yazı tipleri, görseller | açık |
| `api/basvuru.php` | Başvuru ucu (POST) | açık, `api/` altında tek dosya |
| `api/_lib/` | PHP kitaplığı + `yasal-durum.php` (üretilir) | kapalı |
| `_kaynak/` | Sayfa parçaları, şablon, `kunye.json`, `app.ts`, `config.example.php` | kapalı |
| `_test/` | Tarayıcı QA (Playwright) ve PHP testleri | kapalı |
| `.well-known/security.txt` | Güvenlik iletişimi (üretilir) | açık |

## Derleme

`package.json` bilerek depo kökünde DEĞİL, `_kaynak/` içindedir: kökte olursa Hostinger projeyi Node.js
uygulaması sanıp `app.js`'i (tarayıcı betiği) sunucuda çalıştırmaya kalkar (`document is not defined`).

```bash
cd _kaynak
npm install            # typescript + playwright (yalnız geliştirme için; sunucuya gitmez)
npm run build          # app.ts → ../app.js, sayfalar → depo kökü
npm run qa             # 11 sayfa × 4 genişlik tarayıcı denetimi (çerez/depolama/dış istek/CSP/taşma)
npm run kontrol        # YAYIN KAPISI: künye eksik ya da hukuk onayı yoksa 1 ile çıkar
cd .. && bash _test/php-test.sh   # PHP ucu testleri (php 8.1+ ve curl gerekir)
```

Değişiklikten sonra **her zaman** `_kaynak/` içinde `npm run build` çalıştırıp üretilen dosyaları da commit'leyin.

## Yayın kapısı (veri toplamadan önce)

1. `_kaynak/kunye.json` içindeki tüm boş `deger` alanlarını doldurun (veri sorumlusu, adres, e-postalar, sunucu
   konumu, saklama süreleri…). Boş alan sitede sarı `[DOLDURULACAK]` olarak görünür.
2. Eksik alan varken derleme formları **kapalı** üretir ve `api/basvuru.php` **503** döner. Bu kasıtlıdır:
   veri sorumlusu kimliği yazılmamış bir aydınlatma metniyle kişisel veri toplanmaz.
3. Yasal metinleri bir hukukçuya okutun; onaydan sonra `kunye.json` → `"hukuk_onayi": true` (taslak uyarısı kalkar).
4. `YAYIN-KONTROL.md` listesinin tamamını işaretleyin.

## GitHub'a gönderme (sizin yapacağınız adımlar)

Bu depo yereldir ve uzak bağlantısı yoktur. **Gizli (private)** bir GitHub deposu önerilir; yasal taslaklar ve
kaynak kod herkese açık olmasın.

1. GitHub'da yeni, **boş** bir private depo oluşturun (README / .gitignore / lisans EKLEMEYİN), ör. `kabin-web`.
2. Terminalde:
   ```bash
   cd /home/bkork/projects/kabin-web
   git remote add origin git@github.com:<github-kullanici-adiniz>/kabin-web.git
   git push -u origin main
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
   Başvurular `kabin-private/veri/basvurular-beta.jsonl` ve `…-pilot.jsonl` dosyalarına yazılır (izin 600).
   Bildirim e-postası kişisel veri içermez; başvuruları Dosya Yöneticisi'nden indirerek okuyun.
6. **SSL:** hPanel → Güvenlik → SSL → sertifikayı kurun ve *Force HTTPS* açın (`.htaccess` de yönlendirir).
   `.htaccess` HSTS (1 yıl) gönderir; SSL çalışmadan alan adını yayına almayın.
7. **E-posta doğrulaması:** hPanel → E-postalar → DNS'te SPF/DKIM/DMARC kayıtlarının etkin olduğunu kontrol edin;
   aksi hâlde bildirimler spam'e düşebilir.
8. **Canlı denetim** (alan adınızla):
   ```bash
   curl -sI https://<alan-adi>/ | grep -iE 'content-security|strict-transport|x-robots|x-frame'
   curl -s -o /dev/null -w '%{http_code}\n' https://<alan-adi>/README.md            # 404 olmalı
   curl -s -o /dev/null -w '%{http_code}\n' https://<alan-adi>/.git/config          # 404 olmalı
   curl -s -o /dev/null -w '%{http_code}\n' https://<alan-adi>/_kaynak/kunye.json   # 404 olmalı
   curl -s -o /dev/null -w '%{http_code}\n' https://<alan-adi>/api/_lib/ayar.php    # 404 olmalı
   curl -s -H 'Accept: application/json' -X POST https://<alan-adi>/api/basvuru.php # künye eksikse {"ok":false,"kod":"KAPALI"}
   ```

## İndeksleme

Site bilerek arama motorlarına kapalıdır (`robots.txt` Disallow, `<meta robots noindex>`, `X-Robots-Tag`).
Kapalı beta bitince üçünü birlikte kaldırın ve canonical / Open Graph etiketlerini ekleyin.

## Güvenlik özeti

- CSP: yalnız kendi kökü; satır içi betik/stil yok, `frame-ancestors 'none'`. Meta CSP ikinci savunma hattıdır.
- Çerez, yerel depolama, analiz, CDN, dış yazı tipi yok (QA bunları her çalıştırmada denetler).
- PHP ucu: yalnız POST; gövde ≤16 KB; Host/Origin/Sec-Fetch-Site denetimi; IP başına saatte 10 deneme
  (IP'nin HMAC özeti, 24 saat); günlük genel tavan; tuzak alan; sıkı doğrulama ve normalleştirme;
  `flock` ile kilitli yazma; dosyalar 600; ayar yoksa veya künye eksikse kapalı (503); hata ayrıntısı sızmaz;
  e-posta başlıklarına kullanıcı girdisi girmez.
- Bilinen sınır: Hostinger CDN açıksa `REMOTE_ADDR` CDN düğümü olabilir; o durumda IP başına sınır gevşer,
  günlük genel tavan yine geçerlidir.
