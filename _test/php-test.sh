#!/usr/bin/env bash
# Başvuru ucunun PHP testleri (yerel). Gerekli: php (8.1+) ve curl.  Çalıştırma: bash _test/php-test.sh
# Depoya dokunmaz: api/ klasörünü geçici bir dizine kopyalar, orada yasal kapıyı açar ve php -S ile çalıştırır.
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'kill "${PID:-0}" 2>/dev/null || true; rm -rf "$TMP"' EXIT
mkdir -p "$TMP/site" "$TMP/ozel"
cp -r "$KOK/api" "$TMP/site/api"
printf "<?php\nreturn ['eksik' => 0, 'surum' => 'test'];\n" > "$TMP/site/api/_lib/yasal-durum.php"
cat > "$TMP/ozel/config.php" <<'EOF'
<?php
return ['secret' => str_repeat('t', 40), 'notify_to' => '', 'mail_from' => '',
  'allowed_hosts' => ['127.0.0.1'], 'accepting' => true, 'daily_cap' => 50, 'require_https' => false];
EOF
for f in "$KOK"/api/basvuru.php "$KOK"/api/_lib/*.php; do php -l "$f" >/dev/null; done
KABIN_PRIVATE_DIR="$TMP/ozel" php -S 127.0.0.1:8099 -t "$TMP/site" >/dev/null 2>&1 & PID=$!
sleep 1
U=http://127.0.0.1:8099/api/basvuru.php; H=(-s -o /dev/null -w '%{http_code}' -H 'Accept: application/json')
gecti=0; kontrol() { if [ "$2" = "$3" ]; then gecti=$((gecti+1)); else echo "HATA: $1 → beklenen $3, gelen $2"; exit 1; fi; }
P=(-d tur=pilot -d ad='Ayşe Y' -d sirket=Marka -d kategori=kadin -d aydinlatma=evet)
V="$TMP/ozel/veri/basvurular-pilot.jsonl"
kontrol "GET 405"            "$(curl "${H[@]}" "$U")" 405
kontrol "pilot geçerli"      "$(curl "${H[@]}" "${P[@]}" -d eposta=Ayse@Marka.com -d mesaj=$'Merhaba\r\nDeneme' "$U")" 200
kontrol "eski beta türü reddedilir" "$(curl "${H[@]}" -d tur=beta -d platform=ios -d yas18=evet -d aydinlatma=evet -d eposta=b@ornek.com "$U")" 400
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
# Hız sınırı: saatte 10 deneme. Yukarıda sınıra sayılan 6 POST var (pilot, beta türü, geçersiz e-posta,
# aydınlatma yok, tuzak, 303). 403'ler kaynak denetiminde, sınırdan ÖNCE reddedilir; GET sayılmaz.
# 4 deneme daha → 10; 11. istek 429.
for _ in 1 2 3 4; do curl "${H[@]}" -d tur=pilot "$U" >/dev/null; done
kontrol "hız sınırı 429" "$(curl "${H[@]}" "${P[@]}" -d eposta=e@marka.com "$U")" 429
rm "$TMP/ozel/config.php"
kontrol "ayar yoksa 503" "$(curl "${H[@]}" "${P[@]}" -d eposta=f@marka.com "$U")" 503
echo "PHP testleri geçti: $gecti denetim"
