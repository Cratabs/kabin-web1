#!/usr/bin/env bash
# Başvuru ucunun PHP testleri (yerel). Gerekli: php (8.1+) ve curl.  Çalıştırma: bash _test/php-test.sh
# Depoya dokunmaz: api/ klasörünü geçici bir dizine kopyalar, orada yasal kapıyı açar ve php -S ile çalıştırır.
# opcache kapalı: test ayar dosyalarını saniyeler içinde yeniden yazar (revalidate_freq=2 eski kopyayı tutar).
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'kill "${PID:-0}" 2>/dev/null || true; rm -rf "$TMP"' EXIT
mkdir -p "$TMP/site" "$TMP/ozel"
cp -r "$KOK/api" "$TMP/site/api"
printf "<?php\nreturn ['eksik' => 0, 'surum' => 'test', 'beta' => false];\n" > "$TMP/site/api/_lib/yasal-durum.php"
ayar() { # $1: beta_accepting (true|false)
cat > "$TMP/ozel/config.php" <<EOF
<?php
return ['secret' => str_repeat('t', 40), 'notify_to' => '', 'mail_from' => '',
  'allowed_hosts' => ['127.0.0.1'], 'accepting' => true, 'beta_accepting' => $1, 'daily_cap' => 50, 'require_https' => false];
EOF
}
ayar true
for f in "$KOK"/api/basvuru.php "$KOK"/api/_lib/*.php; do php -l "$f" >/dev/null; done
KABIN_PRIVATE_DIR="$TMP/ozel" php -d opcache.enable=0 -d enable_post_data_reading=0 -S 127.0.0.1:8099 -t "$TMP/site" >/dev/null 2>&1 & PID=$!
sleep 1
U=http://127.0.0.1:8099/api/basvuru.php; H=(-s -o /dev/null -w '%{http_code}' -H 'Accept: application/json')
gecti=0; kontrol() { if [ "$2" = "$3" ]; then gecti=$((gecti+1)); else echo "HATA: $1 → beklenen $3, gelen $2"; exit 1; fi; }
P=(-d tur=pilot -d ad='Ayşe Y' -d sirket=Marka -d kategori=kadin -d aydinlatma=evet)
V="$TMP/ozel/veri/basvurular-pilot.jsonl"
kontrol "GET 405"            "$(curl "${H[@]}" "$U")" 405
kontrol "multipart reddedilir" "$(curl "${H[@]}" -F tur=pilot -F foto=@"$KOK/assets/kabin-mark.svg" "$U")" 415
kontrol "yanlış origin portu" "$(curl "${H[@]}" -H 'Origin: http://127.0.0.1:8100' "${P[@]}" "$U")" 403
kontrol "iç içe form alanı" "$(curl "${H[@]}" -d 'ad[]=x' "$U")" 400
kontrol "pilot geçerli"      "$(curl "${H[@]}" "${P[@]}" -d eposta=Ayse@Marka.com -d mesaj=$'Merhaba\r\nDeneme' "$U")" 200
kontrol "künyede beta kapalıyken 503" "$(curl "${H[@]}" -d tur=beta -d ad=Ali -d platform=ios -d yas18=evet -d aydinlatma=evet -d eposta=b@ornek.com "$U")" 503
kontrol "bilinmeyen tür 400" "$(curl "${H[@]}" -d tur=bulten -d eposta=b@ornek.com "$U")" 400
kontrol "geçersiz e-posta"   "$(curl "${H[@]}" "${P[@]}" -d eposta=yok "$U")" 400
kontrol "aydınlatma yok"     "$(curl "${H[@]}" -d tur=pilot -d ad='Ayşe Y' -d sirket=Marka -d kategori=kadin -d eposta=b@marka.com "$U")" 400
kontrol "yabancı Origin"     "$(curl "${H[@]}" -H 'Origin: https://kotu.example' "${P[@]}" -d eposta=c@marka.com "$U")" 403
kontrol "cross-site fetch"   "$(curl "${H[@]}" -H 'Sec-Fetch-Site: cross-site' "${P[@]}" -d eposta=c@marka.com "$U")" 403
kontrol "tuzak alan (sahte başarı)" "$(curl "${H[@]}" "${P[@]}" -d eposta=bot@marka.com -d web_sitesi=x "$U")" 200
kontrol "HTML formu → 303"   "$(curl -s -o /dev/null -w '%{http_code}' "${P[@]}" -d eposta=d@marka.com "$U")" 303
n=$(wc -l < "$V"); kontrol "pilot satır sayısı (bot yazılmadı)" "$n" 2
grep -q '"eposta":"ayse@marka.com"' "$V"; gecti=$((gecti+1))
if grep -q 'bot@marka.com' "$V"; then echo "HATA: bot kaydedildi"; exit 1; fi
if [ -e "$TMP/ozel/veri/basvurular-beta.jsonl" ]; then echo "HATA: beta dosyası oluştu"; exit 1; fi
kontrol "veri izinleri 600" "$(stat -c %a "$V")" 600
if grep -q '127.0.0.1' "$TMP/ozel/veri/sinir.json"; then echo "HATA: IP düz yazılmış"; exit 1; fi
gecti=$((gecti+1))
# Hız sınırı: saatte 10 deneme. Yukarıda sınıra sayılan 5 POST var (pilot, geçersiz e-posta, aydınlatma
# yok, tuzak, 303); kapalı beta (503) ve bilinmeyen tür (400) sınırdan önce reddedilir. 403'ler kaynak denetiminde, sınırdan ÖNCE reddedilir; GET sayılmaz.
# 5 deneme daha → 10; 11. istek 429.
for _ in 1 2 3 4 5; do curl "${H[@]}" -d tur=pilot "$U" >/dev/null; done
kontrol "hız sınırı 429" "$(curl "${H[@]}" "${P[@]}" -d eposta=e@marka.com "$U")" 429
printf '{bozuk' > "$TMP/ozel/veri/sinir.json"
kontrol "bozuk sayaç kapalı kalır" "$(curl "${H[@]}" "${P[@]}" -d eposta=e@marka.com "$U")" 500
rm "$TMP/ozel/config.php"
kontrol "ayar yoksa 503" "$(curl "${H[@]}" "${P[@]}" -d eposta=f@marka.com "$U")" 503

# --- Beta bekleme listesi (künye bayrağı + sunucu ayarı; pilotun hukuk kapısından bağımsız) ---
printf "<?php\nreturn ['eksik' => 1, 'surum' => 'test', 'beta' => true];\n" > "$TMP/site/api/_lib/yasal-durum.php"
rm -f "$TMP/ozel/veri/sinir.json"; ayar false
B=(-d tur=beta -d ad='Zeynep' -d yas18=evet -d aydinlatma=evet)
BV="$TMP/ozel/veri/basvurular-beta.jsonl"
kontrol "beta: sunucu ayarı kapalıyken 503" "$(curl "${H[@]}" "${B[@]}" -d platform=android -d eposta=z@ornek.com "$U")" 503
ayar true
kontrol "beta: geçerli kayıt 200" "$(curl "${H[@]}" "${B[@]}" -d platform=android -d eposta=Z@Ornek.com -d utm_source=Instagram -d utm_campaign='<script>' "$U")" 200
kontrol "beta: aynı e-posta yine 200" "$(curl "${H[@]}" "${B[@]}" -d platform=ios -d eposta=z@ornek.com "$U")" 200
kontrol "beta: tek satır (tekrar yazılmadı)" "$(wc -l < "$BV")" 1
grep -q '"utm_source":"instagram"' "$BV"; gecti=$((gecti+1))
grep -q '"utm_campaign":""' "$BV"; gecti=$((gecti+1))
kontrol "beta: 18 yaş teyidi yok 400" "$(curl "${H[@]}" -d tur=beta -d ad=Ali -d platform=ios -d aydinlatma=evet -d eposta=a@ornek.com "$U")" 400
kontrol "beta: geçersiz telefon 400" "$(curl "${H[@]}" "${B[@]}" -d platform=windows -d eposta=a@ornek.com "$U")" 400
kontrol "beta: pilot hâlâ kapalı (eksik künye) 503" "$(curl "${H[@]}" "${P[@]}" -d eposta=g@marka.com "$U")" 503
kontrol "beta: veri izinleri 600" "$(stat -c %a "$BV")" 600
# Düz HTML gönderimi (JS kapalı): sonuç sayfası formun dilinde; yalnız dil=en İngilizce sayfaya gider.
R=(-s -o /dev/null -w '%{http_code} %{redirect_url}')
kontrol "dil=en başarı → İngilizce sayfa" "$(curl "${R[@]}" "${B[@]}" -d dil=en -d platform=ios -d eposta=en@ornek.com "$U")" "303 http://127.0.0.1:8099/en/application-received.html"
kontrol "dil=en hata → İngilizce sayfa" "$(curl "${R[@]}" -d tur=beta -d dil=en -d ad=Ali -d platform=ios -d aydinlatma=evet -d eposta=a@ornek.com "$U")" "303 http://127.0.0.1:8099/en/application-error.html"
kontrol "bilinmeyen dil → Türkçe sayfa" "$(curl "${R[@]}" "${B[@]}" -d dil=//kotu.example -d platform=ios -d eposta=tr@ornek.com "$U")" "303 http://127.0.0.1:8099/basvuru-alindi.html"
kontrol "dil yok → Türkçe hata sayfası" "$(curl "${R[@]}" -d tur=beta -d ad=Ali "$U")" "303 http://127.0.0.1:8099/basvuru-hata.html"
echo "PHP testleri geçti: $gecti denetim"
