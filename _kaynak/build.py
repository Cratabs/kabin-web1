"""Kabin tanıtım sitesini üretir: _kaynak/ → depo kökü (Hostinger public_html'e olduğu gibi gider).

Kullanım:  python3 _kaynak/build.py            (üretir, eksik künye alanlarını listeler)
           python3 _kaynak/build.py --kontrol  (eksik alan varsa 1 ile çıkar; yayın öncesi)

Sayfa parçaları _kaynak/sayfalar/*.html içindedir ve şu işaretleri kullanabilir:
  {{alan}}        künye değeri (boşsa görünür [DOLDURULACAK] işareti)
  {{form:beta}}   kapalı beta formu        {{form:pilot}}  marka pilot formu
  {{surum}} / {{guncelleme}}               yasal metin sürüm bilgisi
  {{taslak}}      hukuk onayı yoksa taslak uyarısı
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from html import escape
from pathlib import Path

KAYNAK = Path(__file__).resolve().parent
# `python3 -I` ile de çalışsın: yalnız kendi klasörümüzü yola ekleriz.
sys.path.insert(0, str(KAYNAK))
import sablon  # noqa: E402

KOK = KAYNAK.parent
ISARET = re.compile(r"\{\{([a-z_]+)(?::([a-z]+))?\}\}")

# (çıktı yolu, parça dosyası, başlık, açıklama, etkin menü)
SAYFALAR = [
    ("index.html", "anasayfa.html", "Kabin — Etiketteki beden değil, sana uyan beden.",
     "Ölçü profilin ile ürünün beden tablosunu karşılaştıran, nedenini açıklayan beden önerisi. Kapalı beta.", ""),
    ("markalar.html", "markalar.html", "Markalar için Kabin — Beden önerisini birlikte doğrulayalım",
     "Moda markaları için açıklanabilir beden önerisi pilotu.", "markalar"),
    ("basvuru-alindi.html", "basvuru-alindi.html", "Başvurun alındı — Kabin", "Başvurun kaydedildi.", ""),
    ("basvuru-hata.html", "basvuru-hata.html", "Başvuru gönderilemedi — Kabin", "Başvuru gönderilemedi.", ""),
    ("404.html", "404.html", "Sayfa bulunamadı — Kabin", "Aradığın sayfa bulunamadı.", ""),
    ("yasal/index.html", "yasal-index.html", "Yasal metinler — Kabin", "Kabin yasal metinleri ve künye.", "yasal"),
    ("yasal/kvkk-aydinlatma.html", "kvkk-aydinlatma.html", "KVKK Aydınlatma Metni — Kabin",
     "Web sitesi ve başvuru formları için kişisel verilerin işlenmesine ilişkin aydınlatma metni.", "yasal"),
    ("yasal/gizlilik.html", "gizlilik.html", "Gizlilik Politikası — Kabin",
     "Kabin web sitesi, kapalı beta uygulaması ve tarayıcı eklentisi gizlilik politikası.", "yasal"),
    ("yasal/cerez.html", "cerez.html", "Çerez Politikası — Kabin", "Kabin web sitesi çerez politikası.", "yasal"),
    ("yasal/kullanim-kosullari.html", "kullanim-kosullari.html", "Web Sitesi Kullanım Koşulları — Kabin",
     "Kabin web sitesi kullanım koşulları.", "yasal"),
    ("yasal/beta-katilim.html", "beta-katilim.html", "Kapalı Beta Katılım Koşulları — Kabin",
     "Kabin kapalı beta programı katılım sözleşmesi.", "yasal"),
    ("yasal/topluluk-kurallari.html", "topluluk-kurallari.html", "Topluluk Kuralları — Kabin",
     "Kabin kapalı beta topluluğu kuralları ve moderasyon süreci.", "yasal"),
]


def kisa_ozet(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def kunye_yukle() -> tuple[dict[str, object], dict[str, dict[str, str]]]:
    data = json.loads((KAYNAK / "kunye.json").read_text(encoding="utf-8"))
    alanlar = data["alanlar"]
    for ad, alan in alanlar.items():
        if not isinstance(alan.get("deger"), str) or not isinstance(alan.get("aciklama"), str):
            raise SystemExit(f"kunye.json: '{ad}' alanı deger/aciklama metni içermeli")
    return data, alanlar


def html_deger(alan: dict[str, str]) -> str:
    deger = alan["deger"].strip()
    if deger:
        return escape(deger)
    return f'<mark class="todo">[DOLDURULACAK: {escape(alan["aciklama"])}]</mark>'


def sayfa_uret(parca: str, meta: dict[str, object], alanlar: dict[str, dict[str, str]],
               form_acik: bool, eksik: set[str]) -> str:
    def degistir(m: re.Match[str]) -> str:
        ad, alt = m.group(1), m.group(2)
        if ad == "form" and alt in ("beta", "pilot"):
            return sablon.form(alt, form_acik)
        if ad == "surum":
            return escape(str(meta["surum"]))
        if ad == "guncelleme":
            return escape(str(meta["guncelleme"]))
        if ad == "taslak":
            if meta["hukuk_onayi"] is True:
                return ""
            return ('<div class="draft-notice" role="note">Bu metin taslaktır; yayın öncesinde hukuk '
                    "danışmanı tarafından gözden geçirilecektir.</div>")
        if ad in alanlar:
            if not alanlar[ad]["deger"].strip():
                eksik.add(ad)
            return html_deger(alanlar[ad])
        raise SystemExit(f"Bilinmeyen işaret: {m.group(0)}")

    return ISARET.sub(degistir, parca)


def css_uret() -> None:
    parcalar = [(KAYNAK / "stil" / ad).read_text(encoding="utf-8") for ad in ("temel.css", "ek.css")]
    (KOK / "styles.css").write_text("\n".join(parcalar), encoding="utf-8")


def main() -> int:
    kontrol = "--kontrol" in sys.argv[1:]
    meta, alanlar = kunye_yukle()
    css_uret()
    if not (KOK / "app.js").exists():
        raise SystemExit("app.js yok: önce `npm run build:ts` çalıştırın")
    surum = {"css": kisa_ozet(KOK / "styles.css"), "js": kisa_ozet(KOK / "app.js")}
    bos = {ad for ad, alan in alanlar.items() if not alan["deger"].strip()}
    form_acik = not bos
    alt_bilgi_alan = {k: html_deger(alanlar[k]) for k in ("kisa_ad", "unvan", "eposta_iletisim")}
    kullanilan: set[str] = set()
    for cikti, parca_adi, baslik, aciklama, etkin in SAYFALAR:
        parca = (KAYNAK / "sayfalar" / parca_adi).read_text(encoding="utf-8")
        govde = sayfa_uret(parca, meta, alanlar, form_acik, kullanilan)
        html = (
            "<!-- Bu dosya _kaynak/build.py ile üretilir; doğrudan düzenlemeyin. -->\n"
            + sablon.head(baslik, aciklama, surum)
            + sablon.header(etkin)
            + f'<main id="icerik">{govde}</main>'
            + sablon.footer(alt_bilgi_alan)
        )
        hedef = KOK / cikti
        hedef.parent.mkdir(parents=True, exist_ok=True)
        hedef.write_text(html + "\n", encoding="utf-8")
    # Yayın kapısı: PHP, yasal metinlerde eksik alan varken başvuru kabul etmez.
    (KOK / "api" / "_lib" / "yasal-durum.php").write_text(
        "<?php\n// _kaynak/build.py tarafından üretilir. Elle değiştirmeyin.\ndeclare(strict_types=1);\n"
        f"return ['eksik' => {len(bos)}, 'surum' => '{meta['surum']}'];\n",
        encoding="utf-8",
    )
    guvenlik = alanlar["eposta_guvenlik"]["deger"].strip() or "[DOLDURULACAK: guvenlik e-postasi]"
    alan_adi = alanlar["alan_adi"]["deger"].strip() or "[DOLDURULACAK: alan adi]"
    (KOK / ".well-known" / "security.txt").write_text(
        f"Contact: mailto:{guvenlik}\nExpires: 2027-11-01T00:00:00.000Z\nPreferred-Languages: tr, en\n"
        f"Canonical: https://{alan_adi}/.well-known/security.txt\n"
        f"Policy: https://{alan_adi}/yasal/kullanim-kosullari.html#guvenlik\n",
        encoding="utf-8",
    )
    kullanilmayan = set(alanlar) - kullanilan - {"kisa_ad", "unvan", "eposta_iletisim", "eposta_guvenlik", "alan_adi"}
    if kullanilmayan:
        print("Uyarı: hiçbir sayfada kullanılmayan künye alanları:", ", ".join(sorted(kullanilmayan)))
    print(f"{len(SAYFALAR)} sayfa üretildi. css={surum['css']} js={surum['js']}")
    if bos:
        print(f"EKSİK künye alanı ({len(bos)}): {', '.join(sorted(bos))}")
        print("Başvuru formları KAPALI üretildi; PHP uç noktası 503 dönecek.")
    if not meta["hukuk_onayi"]:
        print("Hukuk onayı yok: yasal sayfalarda taslak uyarısı gösteriliyor.")
    if kontrol and (bos or not meta["hukuk_onayi"]):
        print("KONTROL BAŞARISIZ: yayın kapısı karşılanmadı.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
