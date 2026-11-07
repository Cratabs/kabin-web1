# Yayın kontrol listesi

Başvuru formlarını açmadan (config `accepting: true`) önce hepsi işaretlenmeli. `npm run kontrol` ilk iki
maddeyi makine olarak denetler; diğerleri insan kontrolüdür.

## A. Makine kapısı
- [ ] `_kaynak/kunye.json` içinde boş alan yok (`npm run kontrol` → çıkış 0)
- [ ] `hukuk_onayi: true` (hukukçu onayından SONRA)

## B. Hukuk (hukukçuya sorulacaklar)
- [ ] Veri sorumlusu tüzel kişi mi, şahıs mı? Unvan, MERSİS/VKN, KEP doğru mu?
- [ ] VERBİS kaydı gerekiyor mu? (çalışan sayısı / mali bilanço eşiği ve ana faaliyetin özel nitelikli veri
      işleme olup olmadığı)
- [ ] Sunucu konumları (site: Hostinger veri merkezi; uygulama API'si) Türkiye dışındaysa KVKK m.9 dayanağı
      (yeterlilik kararı / Kurul'a 5 iş günü içinde bildirilen standart sözleşme / bağlayıcı şirket kuralları).
      Hostinger ile standart sözleşme imzalanabiliyor mu?
- [ ] Beden ölçüsünün KVKK m.6 anlamında özel nitelikli (sağlık) veri sayılıp sayılmayacağı; sayılırsa
      hukuki sebep ve ek önlemler (bugünkü metin m.5/2-c'ye dayanıyor).
- [ ] Kıyafet görseli etiketlemesi NVIDIA API'ye (ABD) gidecekse: yurt dışı aktarım dayanağı ve metin
      (`kiyafet_gorsel_analizi` alanı).
- [ ] Ücretsiz beta sözleşmesine 6502 / Mesafeli Sözleşmeler Yönetmeliği'nin uygulanıp uygulanmadığı;
      sorumluluk sınırlaması maddesinin TBK m.115 ve tüketici mevzuatıyla uyumu.
- [ ] Beta davet/bilgilendirme e-postalarının 6563 anlamında "ticari elektronik ileti" sayılıp sayılmadığı
      (sayılırsa İYS kaydı ve onay kutusu gerekir; bugün formda pazarlama onayı yok).
- [ ] Uygulama içi aydınlatma metni ve açık rıza metni (model geliştirme için kombin paylaşımı) ayrı ayrı
      hazırlandı mı? (Site metinleri bunlara atıf yapıyor.)
- [ ] Saklama süreleri ve imha politikası (Kişisel Veri Saklama ve İmha Politikası gerekiyorsa).

## C. Metindeki taahhüt ↔ uygulamadaki karşılığı
Gizlilik Politikası ve Beta Koşulları'ndaki her taahhüt, beta açılmadan önce uygulamada doğrulanmalı. Durum
2026-11-07 itibarıyla (mvp-beta dalı):

| Taahhüt | Durum |
|---|---|
| Ölçü profili yalnız sahibine; eklentiye/sosyal'e dönmez | API `/v1/profile` sahibine özel (T03); eklenti tarafı T08/T09 ile doğrulanacak |
| Mağaza sayfası cihazda okunur, sunucu indirmez | Tasarım ve `@kabin/extractor` hazır (T05/T06); eklenti/WebView entegrasyonu bekliyor |
| Eksik veride öneri yok | API tarafı T07b'de; T07b henüz doğrulamadan geçmedi |
| Görsel üst verisi (EXIF/GPS) temizlenir | Var (`apps/api/src/media/sanitize.ts`) |
| Parola Argon2id | Var (`apps/api/src/auth/passwords.ts`) |
| Hesap silmede profil, ürünler, dolap, görseller, paylaşımlar, eklenti jetonları silinir | Kullanıcı kaydı + CASCADE + görsel dosyaları var; dolap ve eklenti jetonları yapılınca test edilmeli |
| Davet kodu + yönetici onayı, moderasyon, DM yok | Bekliyor (MVP görevi) |
| Eklenti: yalnız activeTab/scripting/storage, kalıcı içerik betiği yok | Bekliyor (T09) |
| Eklenti bağlantısı uygulamadan kaldırılabilir | Bekliyor (T08 + mobil arayüz) |
| Yedeklerdeki kopyalar en geç 30 gün içinde silinir | Yedek politikası yazılmalı |
| Model geliştirme yalnız açık rızayla; geri alınca silinir | Var (`/v1/me/post-outfits` PUT/DELETE) |
| Engelleme iki yönlü | Var (`social/sql.ts` notBlocked) |
| Vücut fotoğrafı üçüncü taraf yapay zekâya gitmez | Kural; betada fotoğraf analizi kapalı |

## D. Teknik
- [ ] `npm run qa` geçti; `bash _test/php-test.sh` geçti
- [ ] Hostinger PHP ≥ 8.1, SSL kurulu, Force HTTPS açık
- [ ] `kabin-private/config.php` web kökünün dışında, izin 600, `secret` rastgele
- [ ] README > "Canlı denetim" komutlarının hepsi beklenen sonucu veriyor
- [ ] Test başvurusu gönderildi, bildirim e-postası geldi, kayıt `kabin-private/veri/` altında, sonra silindi
