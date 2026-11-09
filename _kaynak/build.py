"""Kabin tanıtım sitesini üretir: _kaynak/ → depo kökü (Hostinger public_html'e olduğu gibi gider).

Kullanım:  python3 _kaynak/build.py            (üretir, eksik künye alanlarını listeler)
           python3 _kaynak/build.py --kontrol  (eksik alan ya da hukuk onayı yoksa 1 ile çıkar; yayın öncesi)

Sayfa parçaları _kaynak/sayfalar/*.html içindedir ve şu işaretleri kullanabilir:
  {{alan}}        künye değeri (boşsa görünür [DOLDURULACAK] işareti)
  {{alan_link}}   e-posta alanı için mailto bağlantısı
  {{form:pilot}}  marka pilot formu
  {{surum}} / {{guncelleme}}               yasal metin sürüm bilgisi
  {{taslak}}      hukuk onayı yoksa taslak uyarısı

Ayrıca makine-okur çıktılar üretir (bkz. ajan.py): JSON-LD, sitemap.xml, llms.txt, sayfa başına .md.
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
import ajan  # noqa: E402
import sablon  # noqa: E402

KOK = KAYNAK.parent
ISARET = re.compile(r"\{\{([a-z_]+)(?::([a-z]+))?\}\}")

# (çıktı yolu, parça dosyası, başlık, açıklama, etkin menü)
SAYFALAR = [
    ("index.html", "anasayfa.html", "Kabin — Etiketteki beden değil, sana uyan beden.",
     "İki fotoğraftan ölçü tahmini, ürünün beden tablosuyla bölge bölge karşılaştırma ve nedenini açıklayan "
     "beden önerisi.", ""),
    ("markalar.html", "markalar.html", "Markalar için Kabin — Beden önerisini birlikte doğrulayalım",
     "Moda markaları için açıklanabilir beden önerisi pilotu.", "markalar"),
    ("hakkinda.html", "hakkinda.html", "Hakkımızda — Kabin", "Kabin'i kimin, neden ve nasıl geliştirdiği.", ""),
    ("iletisim.html", "iletisim.html", "İletişim — Kabin", "Kabin ekibinin e-posta ve adres bilgileri.", ""),
    ("basvuru-alindi.html", "basvuru-alindi.html", "Talebin alındı — Kabin", "Pilot talebin kaydedildi.", ""),
    ("basvuru-hata.html", "basvuru-hata.html", "Talep gönderilemedi — Kabin", "Pilot talebi gönderilemedi.", ""),
    ("404.html", "404.html", "Sayfa bulunamadı — Kabin", "Aradığın sayfa bulunamadı.", ""),
    ("yasal/index.html", "yasal-index.html", "Yasal metinler — Kabin", "Kabin yasal metinleri ve künye.", "yasal"),
    ("yasal/kvkk-aydinlatma.html", "kvkk-aydinlatma.html", "KVKK Aydınlatma Metni — Kabin",
     "Web sitesi ve marka pilot talebi için kişisel verilerin işlenmesine ilişkin aydınlatma metni.", "yasal"),
    ("yasal/gizlilik.html", "gizlilik.html", "Gizlilik Politikası — Kabin",
     "Kabin web sitesi ve uygulaması gizlilik politikası; fotoğrafla ölçü dahil.", "yasal"),
    ("yasal/cerez.html", "cerez.html", "Çerez Politikası — Kabin", "Kabin web sitesi çerez politikası.", "yasal"),
    ("yasal/kullanim-kosullari.html", "kullanim-kosullari.html", "Web Sitesi Kullanım Koşulları — Kabin",
     "Kabin web sitesi kullanım koşulları.", "yasal"),
    ("yasal/kullanici-sozlesmesi.html", "kullanici-sozlesmesi.html", "Kullanıcı Sözleşmesi — Kabin",
     "Kabin uygulamasını kullananlar ile aramızdaki sözleşme.", "yasal"),
    ("yasal/topluluk-kurallari.html", "topluluk-kurallari.html", "Topluluk Kuralları — Kabin",
     "Kabin topluluğu kuralları ve moderasyon süreci.", "yasal"),
]
# Arama motoru dizinine ve sitemap/llms.txt'ye girmeyen sayfalar.
DIZINSIZ = {"404.html", "basvuru-alindi.html", "basvuru-hata.html"}


def kisa_ozet(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def kunye_yukle() -> tuple[dict[str, object], dict[str, dict[str, str]]]:
    data = json.loads((KAYNAK / "kunye.json").read_text(encoding="utf-8"))
    alanlar = data["alanlar"]
    for ad, alan in alanlar.items():
        if not isinstance(alan.get("deger"), str) or not isinstance(alan.get("aciklama"), str):
            raise SystemExit(f"kunye.json: '{ad}' alanı deger/aciklama metni içermeli")
    same_as = data.get("sameAs", [])
    if not isinstance(same_as, list) or not all(isinstance(u, str) and u.startswith("https://") for u in same_as):
        raise SystemExit("kunye.json: sameAs https:// ile başlayan adreslerden oluşan bir liste olmalı")
    return data, alanlar


def html_deger(alan: dict[str, str]) -> str:
    deger = alan["deger"].strip()
    if deger:
        return escape(deger)
    return f'<mark class="todo">[DOLDURULACAK: {escape(alan["aciklama"])}]</mark>'


def mailto(alan: dict[str, str]) -> str:
    deger = alan["deger"].strip()
    if "@" not in deger:
        return html_deger(alan)
    return f'<a class="text-link" href="mailto:{escape(deger)}">{escape(deger)}</a>'


def sayfa_uret(parca: str, meta: dict[str, object], alanlar: dict[str, dict[str, str]],
               form_acik: bool, kullanilan: set[str]) -> str:
    def degistir(m: re.Match[str]) -> str:
        ad, alt = m.group(1), m.group(2)
        if ad == "form" and alt == "pilot":
            return sablon.form(alt, form_acik, mailto(alanlar["eposta_iletisim"]))
        beta_acik = meta.get("beta_listesi") is True
        if ad == "form" and alt == "beta":
            return sablon.beta_form(beta_acik)
        if ad == "beta" and alt in ("dugme", "cizgi"):
            return sablon.beta_dugme(beta_acik, "button" if alt == "dugme" else "button outline")
        if ad == "surum":
            return escape(str(meta["surum"]))
        if ad == "guncelleme":
            return escape(str(meta["guncelleme"]))
        if ad == "taslak":
            if meta["hukuk_onayi"] is True:
                return ""
            return ('<div class="draft-notice" role="note">Bu metin taslaktır; yayın öncesinde hukuk '
                    "danışmanı tarafından gözden geçirilecektir.</div>")
        taban = ad[: -len("_link")] if ad.endswith("_link") else ad
        if taban in alanlar:
            kullanilan.add(taban)
            return mailto(alanlar[taban]) if taban != ad else html_deger(alanlar[taban])
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
    onay = meta["hukuk_onayi"] is True
    # Form yalnız künye eksiksiz VE yasal metinler hukuk onaylıyken açılır.
    form_acik = not bos and onay
    duz = {ad: alan["deger"].strip() for ad, alan in alanlar.items()}
    alan_adi = duz["alan_adi"] or "example.invalid"
    kok = f"https://{alan_adi}"
    same_as = [str(u) for u in meta.get("sameAs", [])]  # type: ignore[union-attr]
    yapisal = meta["yapisal"]
    if not isinstance(yapisal, dict):
        raise SystemExit("kunye.json: yapisal nesnesi eksik")
    alt_bilgi_alan = {k: html_deger(alanlar[k]) for k in ("kisa_ad", "unvan")}
    alt_bilgi_alan["eposta_link"] = mailto(alanlar["eposta_iletisim"])
    kullanilan: set[str] = set()
    dizinli: list[tuple[str, str, str]] = []
    for cikti, parca_adi, baslik, aciklama, etkin in SAYFALAR:
        parca = (KAYNAK / "sayfalar" / parca_adi).read_text(encoding="utf-8")
        govde = sayfa_uret(parca, meta, alanlar, form_acik, kullanilan)
        acik = cikti not in DIZINSIZ
        html = (
            "<!-- Bu dosya _kaynak/build.py ile üretilir; doğrudan düzenlemeyin. -->\n"
            + sablon.head(
                baslik, aciklama, surum,
                canonical=ajan.sayfa_url(kok, cikti) if acik else None,
                md_href="/" + ajan.md_yolu(cikti) if acik else None,
                jsonld=ajan.jsonld(kok, cikti, baslik, aciklama, govde, duz, same_as, yapisal) if acik else None,
            )
            + sablon.header(etkin)
            + f'<main id="icerik">{govde}</main>'
            + sablon.footer(alt_bilgi_alan)
        )
        ajan.yaz(KOK / cikti, html + "\n")
        if acik:
            ajan.yaz(KOK / ajan.md_yolu(cikti), ajan.md_sayfa(kok, cikti, baslik, aciklama, govde))
            dizinli.append((cikti, baslik, aciklama))
    ajan.yaz(KOK / "sitemap.xml", ajan.sitemap(kok, [c for c, _, _ in dizinli], str(meta["guncelleme_iso"])))
    ajan.yaz(KOK / "llms.txt", ajan.llms(kok, dizinli, duz))
    ajan.yaz(KOK / "robots.txt", ajan.robots(kok))
    # Yayın kapısı: PHP, künyede eksik alan varken ya da hukuk onayı yokken başvuru kabul etmez.
    eksik_sayi = len(bos) + (0 if onay else 1)
    ajan.yaz(
        KOK / "api" / "_lib" / "yasal-durum.php",
        "<?php\n// _kaynak/build.py tarafından üretilir. Elle değiştirmeyin.\ndeclare(strict_types=1);\n"
        f"return ['eksik' => {eksik_sayi}, 'surum' => '{meta['surum']}', "
        f"'beta' => {'true' if meta.get('beta_listesi') is True else 'false'}];\n",
    )
    guvenlik = duz["eposta_guvenlik"] or "[DOLDURULACAK: guvenlik e-postasi]"
    ajan.yaz(
        KOK / ".well-known" / "security.txt",
        f"Contact: mailto:{guvenlik}\nExpires: 2027-11-01T00:00:00.000Z\nPreferred-Languages: tr, en\n"
        f"Canonical: {kok}/.well-known/security.txt\n"
        f"Policy: {kok}/yasal/kullanim-kosullari.html#guvenlik\n",
    )
    kullanilmayan = set(alanlar) - kullanilan - {"kisa_ad", "unvan", "eposta_iletisim", "eposta_guvenlik", "alan_adi"}
    if kullanilmayan:
        print("Uyarı: hiçbir sayfada kullanılmayan künye alanları:", ", ".join(sorted(kullanilmayan)))
    print(f"{len(SAYFALAR)} sayfa, {len(dizinli)} .md, sitemap.xml, llms.txt, robots.txt üretildi. "
          f"css={surum['css']} js={surum['js']}")
    if bos:
        print(f"EKSİK künye alanı ({len(bos)}): {', '.join(sorted(bos))}")
    if not form_acik:
        print("Pilot formu KAPALI üretildi (e-posta yolu gösteriliyor); PHP uç noktası 503 dönecek.")
    print("Beta listesi " + ("AÇIK (sunucuda beta_accepting de true olmalı)." if meta.get("beta_listesi") is True
                             else "KAPALI: düğme ve pencere üretilmedi."))
    if not onay:
        print("Hukuk onayı yok: yasal sayfalarda taslak uyarısı gösteriliyor.")
    if kontrol and (bos or not onay):
        print("KONTROL BAŞARISIZ: yayın kapısı karşılanmadı.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
