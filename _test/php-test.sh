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
B=(-d tur=beta -d platform=ios -d yas18=evet -d aydinlatma=evet)
kontrol "GET 405"            "$(curl "${H[@]}" "$U")" 405
kontrol "geçerli beta"       "$(curl "${H[@]}" "${B[@]}" -d eposta=Ayse@Ornek.com "$U")" 200
kontrol "tekrar beta (aynı yanıt)" "$(curl "${H[@]}" "${B[@]}" -d eposta=ayse@ornek.com "$U")" 200
kontrol "geçersiz e-posta"   "$(curl "${H[@]}" "${B[@]}" -d eposta=yok "$U")" 400
kontrol "aydınlatma yok"     "$(curl "${H[@]}" -d tur=beta -d platform=ios -d yas18=evet -d eposta=b@ornek.com "$U")" 400
kontrol "yabancı Origin"     "$(curl "${H[@]}" -H 'Origin: https://kotu.example' "${B[@]}" -d eposta=c@ornek.com "$U")" 403
kontrol "cross-site fetch"   "$(curl "${H[@]}" -H 'Sec-Fetch-Site: cross-site' "${B[@]}" -d eposta=c@ornek.com "$U")" 403
kontrol "tuzak alan (sahte başarı)" "$(curl "${H[@]}" "${B[@]}" -d eposta=bot@ornek.com -d web_sitesi=x "$U")" 200
kontrol "pilot geçerli"      "$(curl "${H[@]}" -d tur=pilot -d ad='Ayşe Y' -d sirket=Marka -d eposta=p@marka.com -d kategori=kadin -d mesaj=$'Merhaba\r\nDeneme' -d aydinlatma=evet "$U")" 200
kontrol "HTML formu → 303"   "$(curl -s -o /dev/null -w '%{http_code}' "${B[@]}" -d eposta=d@ornek.com "$U")" 303
n=$(wc -l < "$TMP/ozel/veri/basvurular-beta.jsonl"); kontrol "beta satır sayısı (tekrar ve bot yazılmadı)" "$n" 2
grep -q '"eposta":"ayse@ornek.com"' "$TMP/ozel/veri/basvurular-beta.jsonl"; gecti=$((gecti+1))
if grep -q 'bot@ornek.com' "$TMP/ozel/veri/basvurular-beta.jsonl"; then echo "HATA: bot kaydedildi"; exit 1; fi
kontrol "veri izinleri 600" "$(stat -c %a "$TMP/ozel/veri/basvurular-beta.jsonl")" 600
if grep -q '127.0.0.1' "$TMP/ozel/veri/sinir.json"; then echo "HATA: IP düz yazılmış"; exit 1; fi
gecti=$((gecti+1))
# Hız sınırı: saatte 10 deneme. Yukarıda 7 sayılan POST var (403'ler kaynak denetiminde, sınırdan ÖNCE
# reddedilir; GET sayılmaz). 3 deneme daha → 10; 11. istek 429.
for _ in 1 2 3; do curl "${H[@]}" -d tur=beta "$U" >/dev/null; done
kontrol "hız sınırı 429" "$(curl "${H[@]}" "${B[@]}" -d eposta=e@ornek.com "$U")" 429
rm "$TMP/ozel/config.php"
kontrol "ayar yoksa 503" "$(curl "${H[@]}" "${B[@]}" -d eposta=f@ornek.com "$U")" 503
echo "PHP testleri geçti: $gecti denetim"
