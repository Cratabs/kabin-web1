"""Kabin tanıtım sitesini üretir: _kaynak/ → depo kökü (Hostinger public_html'e olduğu gibi gider).

Kullanım:  python3 _kaynak/build.py            (üretir, eksik künye alanlarını listeler)
           python3 _kaynak/build.py --kontrol  (eksik alan ya da hukuk onayı yoksa 1 ile çıkar; yayın öncesi)

Sayfa parçaları _kaynak/sayfalar/*.html (İngilizce: sayfalar/en/*.html) içindedir ve şu işaretleri kullanabilir:
  {{alan}}        künye değeri (boşsa görünür [DOLDURULACAK] işareti)
  {{alan_link}}   e-posta alanı için mailto bağlantısı
  {{form:pilot}}  marka pilot formu (kapalıyken gizli)   {{pilot:not}}  form kapalıyken e-posta altındaki not
  {{form:beta}}   davet (beta bekleme listesi) formu
  {{surum}} / {{guncelleme}}               yasal metin sürüm bilgisi
  {{taslak}}      hukuk onayı yoksa taslak uyarısı

Ayrıca makine-okur çıktılar üretir (bkz. ajan.py): JSON-LD, sitemap.xml, llms.txt, sayfa başına .md.

Stil, betik, yazı tipi, görsel ve model dosyaları üretilmez: depo kökündeki /css, /js, /fonts, /gorsel, /model
klasörlerinde durur ve doğrudan düzenlenir. Bu betik yalnız adreslerine içerik özeti ekler (?v=…).

Dil: "en/" ile başlayan çıktılar İngilizcedir. ESLER, iki dilde karşılığı olan sayfaları eşler (hreflang,
dil değiştirici, sitemap). Yasal metinlerin İngilizcesi yoktur; İngilizce sayfalar Türkçe /yasal/ metnine gider.
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

# (çıktı yolu, parça dosyası, başlık, açıklama, etkin menü, sayfa türü). Türler: sablon.py STILLER / BETIKLER.
SAYFALAR = [
    ("index.html", "anasayfa.html", "Kabin · Hangi beden? Ölçünüze göre beden önerisi",
     "Ölçünüzü bir kez alın, mezurayla ya da iki fotoğrafla. Kabin her üründe bedeninizi söylesin. "
     "Şimdilik davetle, ücretsiz.", "", "ana"),
    ("markalar.html", "markalar.html", "Kabin · Markalar için beden aracı",
     "Müşteriniz ürün sayfanızda ölçüsünü girer, bedenini görür. Sayfanıza bir düğme gelir. "
     "Önce birkaç üründe deneyin.", "markalar", "marka"),
    ("hakkinda.html", "hakkinda.html", "Hakkında · Kabin",
     "Kabin bedeni etiketteki harfe göre değil, sizin ölçünüze göre söyler. Neden ve kimlerin yaptığı.", "", "okuma"),
    ("iletisim.html", "iletisim.html", "İletişim · Kabin",
     "Soru, öneri, iş birliği ya da basın için e-posta yazın. Adres, KVKK ve güvenlik bildirimi bilgileri.",
     "", "okuma"),
    ("sorular.html", "sorular.html", "Sorular · Kabin",
     "Fotoğraftan ölçü ne kadar doğru? Fotoğraflarım saklanıyor mu? Beden önerisi ne kadar güvenilir? "
     "Verilerimi nasıl silerim?", "", "okuma"),
    ("basvuru-alindi.html", "basvuru-alindi.html", "Aldık · Kabin", "İsteğiniz bize ulaştı.", "", "okuma"),
    ("basvuru-hata.html", "basvuru-hata.html", "Gönderilemedi · Kabin", "İsteğiniz gönderilemedi.", "", "okuma"),
    ("404.html", "404.html", "Sayfa bulunamadı · Kabin", "Aradığınız sayfa bulunamadı.", "", "okuma"),
    ("yasal/index.html", "yasal-index.html", "Yasal metinler — Kabin", "Kabin yasal metinleri ve künye.",
     "", "yasal"),
    ("yasal/kvkk-aydinlatma.html", "kvkk-aydinlatma.html", "KVKK Aydınlatma Metni — Kabin",
     "Web sitesi ve marka pilot talebi için kişisel verilerin işlenmesine ilişkin aydınlatma metni.", "", "yasal"),
    ("yasal/gizlilik.html", "gizlilik.html", "Gizlilik Politikası — Kabin",
     "Kabin web sitesi ve uygulaması gizlilik politikası; fotoğrafla ölçü dahil.", "", "yasal"),
    ("yasal/cerez.html", "cerez.html", "Çerez Politikası — Kabin", "Kabin web sitesi çerez politikası.",
     "", "yasal"),
    ("yasal/kullanim-kosullari.html", "kullanim-kosullari.html", "Web Sitesi Kullanım Koşulları — Kabin",
     "Kabin web sitesi kullanım koşulları.", "", "yasal"),
    ("yasal/kullanici-sozlesmesi.html", "kullanici-sozlesmesi.html", "Kullanıcı Sözleşmesi — Kabin",
     "Kabin uygulamasını kullananlar ile aramızdaki sözleşme.", "", "yasal"),
    ("yasal/topluluk-kurallari.html", "topluluk-kurallari.html", "Topluluk Kuralları — Kabin",
     "Kabin topluluğu kuralları ve moderasyon süreci.", "", "yasal"),
    # İngilizce sürüm (yasal metinler çevrilmez).
    ("en/index.html", "en/index.html", "Kabin · Which size? Size suggestions from your measurements",
     "Measure once, with a tape measure or two photos. Kabin tells you your size for every item. "
     "Invite only for now, free.", "", "ana"),
    ("en/brands.html", "en/brands.html", "Kabin · For brands",
     "Your customer enters their measurements on your product page and sees their size.", "markalar", "marka"),
    ("en/about.html", "en/about.html", "About · Kabin", "Why we’re building Kabin, and who we are.", "", "okuma"),
    ("en/contact.html", "en/contact.html", "Contact · Kabin", "How to reach Kabin.", "", "okuma"),
    ("en/questions.html", "en/questions.html", "Questions · Kabin",
     "How accurate are measurements from photos? Are my photos stored? How reliable is the size recommendation? "
     "How do I delete my data?", "", "okuma"),
    ("en/application-received.html", "en/application-received.html", "Got it · Kabin",
     "Your request reached us.", "", "okuma"),
    ("en/application-error.html", "en/application-error.html", "Not sent · Kabin",
     "Your request wasn’t sent.", "", "okuma"),
]
# Yasal olmayan sayfaların içeriğinin son değişiklik günü (sitemap lastmod ve JSON-LD dateModified).
# Bu sayfaların metni değişince elle güncelleyin; yasal metinlerde künyedeki guncelleme_iso kullanılır.
ICERIK_TARIHI = "2026-11-14"
# Yanda içindekiler listesi gösterilen uzun yasal metinler.
ICINDEKILERLI = {"yasal/kullanim-kosullari.html"}
# Arama motoru dizinine ve sitemap/llms.txt'ye girmeyen sayfalar.
DIZINSIZ = {"404.html", "basvuru-alindi.html", "basvuru-hata.html",
            "en/application-received.html", "en/application-error.html"}
# Türkçe sayfa → İngilizce eşi. Eşi olmayan sayfanın dil değiştiricisi diğer dilin ana sayfasına gider.
ESLER_TR_EN = {
    "index.html": "en/index.html",
    "markalar.html": "en/brands.html",
    "hakkinda.html": "en/about.html",
    "iletisim.html": "en/contact.html",
    "sorular.html": "en/questions.html",
    "basvuru-alindi.html": "en/application-received.html",
    "basvuru-hata.html": "en/application-error.html",
}
ESLER = {**ESLER_TR_EN, **{en: tr for tr, en in ESLER_TR_EN.items()}}
# Künyedeki unvanın İngilizcesi: yalnız bilinen kalıpta çevrilir; künye değişirse unvan olduğu gibi kullanılır.
UNVAN_EK_TR = " (Kabin kurucu ortakları; henüz tüzel kişilik kurulmamıştır)"
UNVAN_EK_EN = " (the Kabin co-founders; no legal entity has been established yet)"


def sayfa_dili(cikti: str) -> str:
    return "en" if cikti.startswith("en/") else "tr"


def dil_adresleri(cikti: str) -> dict[str, str]:
    """Dil değiştirici: her dil için eş sayfa; eşi yoksa o dilin ana sayfası (404'te kendi dili de ana sayfa)."""
    dil = sayfa_dili(cikti)
    ana = {"tr": "index.html", "en": "en/index.html"}
    kendi = ana[dil] if cikti == "404.html" else cikti
    diger = "tr" if dil == "en" else "en"
    return {dil: ajan.sayfa_url("", kendi), diger: ajan.sayfa_url("", ESLER.get(cikti, ana[diger]))}


def unvan_en(alan: dict[str, str]) -> str:
    deger = alan["deger"].strip()
    if deger.endswith(UNVAN_EK_TR):
        return escape(deger[: -len(UNVAN_EK_TR)].replace(" ve ", " and ") + UNVAN_EK_EN)
    return html_deger(alan)


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
               form_acik: bool, kullanilan: set[str], dil: str = "tr") -> str:
    def degistir(m: re.Match[str]) -> str:
        ad, alt = m.group(1), m.group(2)
        if ad == "form" and alt == "pilot":
            return sablon.form(alt, form_acik, dil)
        if ad == "pilot" and alt == "not":
            return sablon.pilot_notu(form_acik, dil)
        if ad == "form" and alt == "beta":
            return sablon.beta_form(meta.get("beta_listesi") is True, dil)
        if ad == "unvan" and dil == "en":
            kullanilan.add(ad)
            return unvan_en(alanlar[ad])
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


def varlik_surumu() -> str:
    """Bütün stil ve betik dosyalarının ortak içerik özeti. Biri değişince hepsinin adresi değişir (?v=…);
    js/site.js sonradan yüklediği sahne betiklerine aynı eki koyar."""
    dosyalar = sorted([*(KOK / "css").glob("*.css"), *(KOK / "js").rglob("*.js"), KOK / "app.js"])
    eksik = [ad for ad in {a for adlar in sablon.STILLER.values() for a in adlar} if not (KOK / "css" / f"{ad}.css").exists()]
    eksik += [ad for ad in {a for adlar in sablon.BETIKLER.values() for a in adlar} if not (KOK / "js" / f"{ad}.js").exists()]
    if eksik:
        raise SystemExit(f"Eksik stil/betik dosyası: {', '.join(sorted(eksik))}")
    ozet = hashlib.sha256()
    for yol in dosyalar:
        ozet.update(yol.relative_to(KOK).as_posix().encode() + b"\0" + yol.read_bytes() + b"\0")
    return ozet.hexdigest()[:10]


def main() -> int:
    kontrol = "--kontrol" in sys.argv[1:]
    meta, alanlar = kunye_yukle()
    if not set(ESLER) <= {c for c, *_ in SAYFALAR}:
        raise SystemExit("ESLER: SAYFALAR listesinde olmayan bir sayfayı eşliyor")
    if not (KOK / "app.js").exists():
        raise SystemExit("app.js yok: önce `npm run build:ts` çalıştırın")
    surum = varlik_surumu()
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
    kullanilan: set[str] = set()
    dizinli: list[tuple[str, str, str]] = []
    tarihler: dict[str, str] = {}
    # hreflang yalnız iki eşi de dizine giren sayfalar için (noindex sayfa alternatif olarak gösterilmez).
    dizinli_esler = {a: b for a, b in ESLER.items() if a not in DIZINSIZ and b not in DIZINSIZ}
    for cikti, parca_adi, baslik, aciklama, etkin, tur in SAYFALAR:
        parca = (KAYNAK / "sayfalar" / parca_adi).read_text(encoding="utf-8")
        dil = sayfa_dili(cikti)
        govde = sayfa_uret(parca, meta, alanlar, form_acik, kullanilan, dil)
        acik = cikti not in DIZINSIZ
        tarih = str(meta["guncelleme_iso"]) if tur == "yasal" else ICERIK_TARIHI
        # Yasal metin parçaları eski sarmalayıcı sınıflarıyla durur (dosyalara dokunulmaz); HTML'e yazarken çevrilir.
        html_govde = sablon.okuma_govdesi(govde, dil, cikti in ICINDEKILERLI)
        html = (
            "<!-- Bu dosya _kaynak/build.py ile üretilir; doğrudan düzenlemeyin. -->\n"
            + sablon.head(
                baslik, aciklama, surum, tur=tur, dil=dil,
                canonical=ajan.sayfa_url(kok, cikti) if acik else None,
                md_href="/" + ajan.md_yolu(cikti) if acik else None,
                jsonld=(ajan.jsonld(kok, cikti, baslik, aciklama, govde, duz, same_as, yapisal, dil, tarih)
                        if acik else None),
                alternates=ajan.hreflang_ciftleri(kok, cikti, dizinli_esler) if acik else None,
            )
            + sablon.header(etkin, dil, dil_adresleri(cikti))
            + f'<main id="icerik">{html_govde}</main>'
            + sablon.footer(dil, cikti, duz["eposta_iletisim"], tur, surum)
        )
        ajan.yaz(KOK / cikti, html + "\n")
        if acik:
            ajan.yaz(KOK / ajan.md_yolu(cikti), ajan.md_sayfa(kok, cikti, baslik, aciklama, govde, dil))
            dizinli.append((cikti, baslik, aciklama))
            tarihler[cikti] = tarih
    ajan.yaz(KOK / "sitemap.xml", ajan.sitemap(kok, [c for c, _, _ in dizinli], tarihler, dizinli_esler))
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
          f"sürüm eki={surum}")
    if bos:
        print(f"EKSİK künye alanı ({len(bos)}): {', '.join(sorted(bos))}")
    if not form_acik:
        print("Pilot formu KAPALI üretildi (e-posta yolu gösteriliyor); PHP uç noktası 503 dönecek.")
    print("Beta listesi " + ("AÇIK (sunucuda beta_accepting de true olmalı)." if meta.get("beta_listesi") is True
                             else "KAPALI: davet formu üretilmedi."))
    if not onay:
        print("Hukuk onayı yok: yasal sayfalarda taslak uyarısı gösteriliyor.")
    if kontrol and (bos or not onay):
        print("KONTROL BAŞARISIZ: yayın kapısı karşılanmadı.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
