# Yayın kontrol listesi

Pilot formunu açmadan (`hukuk_onayi: true` + config `accepting: true`) önce hepsi işaretlenmeli.
`npm run kontrol` A bölümünü makine olarak denetler; diğerleri insan kontrolüdür. Form kapalıyken site
yine yayında olabilir: pilot talepleri e-postayla alınır, sitede form görünmez.

## A. Makine kapısı
- [x] `_kaynak/kunye.json` içinde boş alan yok (2026-11-07 dolduruldu)
- [ ] `hukuk_onayi: true` (hukukçu onayından SONRA; o zamana kadar yasal sayfalarda "taslak" uyarısı görünür
      ve form kapalı kalır)

## B. Hukuk — ENGELLEYİCİ (hukukçuya sorulacaklar)
> 2026-11-08: Metinler v0.2'ye revize edildi (iki dış inceleme + kod denetimi). Kararlar (H1–H6), kod önkoşulları (K1–K9)
> ve hangi cümlenin hangi işe bağlı olduğu: `App-mvp/docs/hukuk/YASAL-SON-INCELEME.md`. §C tablosu o belgeye göre güncellenecek (V3).
- [ ] **Yurt dışı aktarım beyanı şu an doğru DEĞİL.** `yurt_disi_guvence` alanı "Hostinger ile imzalanan ve
      Kurul'a bildirilen standart sözleşme" diyor. Site sunucusu Fransa'da. Bu beyan ancak (1) Hostinger ile
      KVKK standart sözleşmesi imzalandıktan ve (2) imzadan sonra 5 iş günü içinde Kurul'a bildirildikten sonra
      doğru olur. Hostinger bu sözleşmeyi imzalamazsa: metni hukukçuyla yeniden yazın ya da Türkiye'de
      barındırmaya geçin.
- [ ] **Veri sorumlusu kimliği:** tüzel kişilik yok. Üç kurucunun "müşterek veri sorumlusu" olarak yazılması ve
      adi ortaklık yapısının uygunluğu. Şirket kurulunca unvan, MERSİS/VKN ve KEP güncellenmeli.
- [ ] **Adres:** "YTÜ Davutpaşa Kampüsü" yazılı KVKK başvurularının (iadeli taahhütlü posta, noter) ulaşacağı
      bir tebligat adresi mi? Üniversite adresinin kullanılması için izin gerekiyor mu?
- [ ] **Fotoğrafla ölçü:** vücut fotoğrafının ve ölçünün KVKK m.6 anlamında özel nitelikli (biyometrik /
      sağlık) veri sayılıp sayılmadığı. Bugünkü metin sözleşmenin ifasına (m.5/2-c) dayanıyor; özel nitelikli
      sayılırsa açık rıza ve ek önlemler gerekir.
- [ ] VERBİS kaydı gerekiyor mu? (çalışan sayısı / mali bilanço eşiği, ana faaliyetin özel nitelikli veri
      işleme olup olmadığı)
- [ ] Topluluk özelliği nedeniyle 5651 kapsamında **yer sağlayıcı** yükümlülükleri (bildirim, içerik kaldırma
      süreci) ve uyarı-kaldır sürecinin metindeki hâli.
- [ ] Ücretsiz uygulama sözleşmesine 6502 / Mesafeli Sözleşmeler Yönetmeliği'nin uygulanıp uygulanmadığı;
      sorumluluk sınırlaması maddesinin TBK m.115 ve tüketici mevzuatıyla uyumu.
- [ ] Pilot ve kullanıcı e-postalarının 6563 anlamında "ticari elektronik ileti" sayılıp sayılmadığı
      (sayılırsa İYS kaydı ve onay kutusu gerekir; bugün pazarlama onayı alınmıyor).
- [ ] Uygulama içi aydınlatma metni ve model geliştirme açık rıza metni ayrı ayrı hazır mı? (Site metinleri
      bunlara atıf yapıyor.)
- [ ] Saklama süreleri (pilot 2 yıl, uygulama kayıtları en fazla 90 gün) ve gerekiyorsa Kişisel Veri Saklama ve
      İmha Politikası.

## C. Metindeki taahhüt ↔ uygulamadaki karşılığı
Sitede yalnız uygulamada çalışan özellikler anlatılır. Her taahhüt yayından önce uygulamada doğrulanmalı.
Durum 2026-11-07 itibarıyla (App-mvp, mvp-beta dalı):

| Taahhüt (sitede) | Durum |
|---|---|
| Vücut fotoğrafları yalnız bellekte işlenir, diske/kayda yazılmaz | Var (`/v1/body/analyze`, ml-engine); üretim günlük ayarlarıyla yeniden doğrulanmalı |
| Vücut fotoğrafları üçüncü taraf yapay zekâya gitmez | Kural; üretimde ölçü servisi yalnız yerel model kullanmalı |
| **Kıyafet görselleri NVIDIA'ya gönderilmez** (`kiyafet_gorsel_analizi`) | **ENGELLEYİCİ:** üretim ml-engine ortamında `NVIDIA_NIM_API_KEY` TANIMLI OLMAMALI ya da kıyafet etiketleme NIM yolu kapalı olmalı |
| Fotoğraftan ölçü doğruluğu için sayı verilmez | Sitede "henüz doğrulanmış hata oranı yayımlamıyoruz" yazıyor; KABUL-OLCUTLERI §1 fotoğraf kapısı (n≥20 mezura kaydı) karşılanmadı, bu yüzden doğruluk iddiası EKLENMEMELİ |
| Mezurayla girilen ölçü her zaman önceliklidir | Uygulamada doğrulanmalı (öneri isteğine giden ölçü kaynağı) |
| Beden önerisi sunucuda hesaplanır, istek saklanmaz | Var (fit uç noktası durumsuz); T07c tamamlanınca yeniden doğrulanmalı |
| Ölçüler, öneri geçmişi, dolap cihazda | Var (mobil yerel depolama) |
| Kombin puanı için görselin kendisi değil, sayısal özellikler önbelleklenir | Var (garment embed önbelleği) |
| Topluluk: paylaşım, yorum, beğeni, takip, iki yönlü engelleme, bildirim | Var (`social/`) |
| Görsel üst verisi (EXIF/GPS) temizlenir | Var (`apps/api/src/media/sanitize.ts`) |
| Parola Argon2id | Var (`apps/api/src/auth/passwords.ts`) |
| Hesap silmede bağlı veriler ve görseller silinir | Var (CASCADE + görsel dosyaları) |
| Model geliştirme yalnız açık rızayla; geri alınca silinir | Kombinler var (`/v1/me/post-outfits`); fit geri bildirimi ve mezura doğrulama paylaşımı (`/v1/fit/share/*`) için geri alma = silme doğrulanmalı |
| Uygulama teknik kayıtları en fazla 90 gün | Günlük döndürme ayarı yazılmalı/doğrulanmalı |
| Önemli değişiklikler uygulama içinde önceden bildirilir | Uygulama içi duyuru mekanizmasının varlığı doğrulanmadı: yoksa eklenmeli ya da metin değiştirilmeli |

## D. Teknik
- [ ] `npm run qa` geçti; `bash _test/php-test.sh` geçti
- [ ] Hostinger PHP ≥ 8.1, SSL kurulu, Force HTTPS açık
- [ ] `kabin-private/config.php` web kökünün dışında, izin 600, `secret` rastgele
- [ ] README > "Canlı denetim" komutlarının hepsi beklenen sonucu veriyor
- [ ] 2026-11-14 görünüm taşımasından sonra canlıda: `/model/gomlek.gltf`, `/model/gomlek.bin`, `/fonts/inter.woff2` 200 dönüyor
      ve tür başlıkları doğru (`model/gltf+json`, `application/octet-stream`, `font/woff2`); ana sayfada 3B gömlek görünüyor,
      konsolda CSP hatası yok; eski `styles.css` ve `assets/*.ttf` sunucudan da silinmiş
- [ ] `berkay@kabincommunity.com` posta kutusu hPanel'de açık ve posta alıyor (sitede, security.txt'de ve
      JSON-LD'de yayımlanıyor)
- [ ] Form açıldıktan sonra: test talebi gönderildi, bildirim e-postası geldi, kayıt
      `kabin-private/veri/basvurular-pilot.jsonl` altında, sonra silindi
