"""Arama motorları ve yapay zekâ ajanları için makine-okur çıktılar.

JSON-LD (schema.org), sitemap.xml, llms.txt ve her herkese açık sayfanın Markdown sürümü.
Tüm değerler künye dosyasından ve bizim yazdığımız sayfa parçalarından gelir.
"""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path
from typing import Any

from md import html_to_md

# Sorular sayfası: her soru bir <h2>, yanıtı hemen ardındaki <p>. FAQPage verisi görünen metinden üretilir.
SSS = re.compile(r"<h2>(.*?)</h2>\s*<p>(.*?)</p>", re.S)
ETIKET = re.compile(r"<[^>]+>")
# Sayfa dili → schema.org inLanguage (BCP 47).
DIL_KODU = {"tr": "tr-TR", "en": "en"}
SAYFA_TURU = {"hakkinda.html": "AboutPage", "en/about.html": "AboutPage",
              "iletisim.html": "ContactPage", "en/contact.html": "ContactPage"}
SSS_SAYFALARI = {"sorular.html", "en/questions.html"}
KURULUS_ACIKLAMA = {
    "tr": "Ölçünüze göre beden söyleyen uygulama. Ölçünüzü mezurayla ya da iki fotoğrafla alır, ürünün beden "
          "tablosuna bakar, hangi bedenin uyacağını ve nerede dar, nerede bol kalacağını gösterir. Dolap ve kombin "
          "de içinde.",
    "en": "A personal size and style assistant that estimates body measurements from photos and gives "
          "explainable size recommendations based on the item's size chart.",
}
# Ana sayfa: uygulamayı tanımlayan düğüm. Bilerek yok: offers, puan, işletim sistemi, indirme adresi (sayfada yazmıyor).
UYGULAMA_ACIKLAMA = {
    "tr": "Ölçünüzü bir kez alırsınız; Kabin her üründe bedeninizi söyler: hangi beden, nerede dar, nerede bol. "
          "Dolabınızı ekler, kombin kurarsınız. Öneri tahmindir, garanti değildir.",
    "en": "You measure once; Kabin tells you your size for every item: which size, where it’s tight, where it’s "
          "loose. You add your clothes and put outfits together. The suggestion is an estimate, not a guarantee.",
}
# Markalar sayfası: hizmeti tanımlayan düğüm. Bilerek yok: bölge, fiyat, süre (sayfada yazmıyor).
HIZMET = {
    "tr": {"name": "Kabin beden aracı", "serviceType": "Ürün sayfası için beden önerisi aracı",
           "description": "Müşteriniz ürün sayfanızda ölçüsünü girer, bedenini görür. Ölçüyü yalnız müşteriniz görür. "
                          "Size önerilen beden gelir.",
           "audience": "Moda markaları ve mağazalar"},
    "en": {"name": "Kabin size tool", "serviceType": "Size suggestion tool for product pages",
           "description": "Your customer enters their measurements on your product page and sees their size. Only "
                          "your customer sees the measurements. You get the suggested size.",
           "audience": "Fashion brands and stores"},
}
ANA_SAYFALAR = {"index.html", "en/index.html"}
MARKA_SAYFALARI = {"markalar.html", "en/brands.html"}


def sayfa_url(kok: str, cikti: str) -> str:
    """Canonical adres: index.html → dizin adresi, diğerleri dosya yolu."""
    if cikti == "index.html":
        return kok + "/"
    if cikti.endswith("/index.html"):
        return f"{kok}/{cikti[: -len('index.html')]}"
    return f"{kok}/{cikti}"


def md_yolu(cikti: str) -> str:
    return cikti[: -len(".html")] + ".md"


def _duz(html: str) -> str:
    return re.sub(r"\s+", " ", unescape(ETIKET.sub("", html))).strip()


def kurulus(kok: str, d: dict[str, str], same_as: list[str], yapisal: dict[str, Any],
            dil: str = "tr") -> dict[str, object]:
    org: dict[str, object] = {
        "@type": "Organization",
        "@id": f"{kok}/#kurulus",
        "name": "Kabin",
        "url": kok + "/",
        "logo": f"{kok}/assets/kabin-mark.svg",
        "description": KURULUS_ACIKLAMA[dil],
        "email": d["eposta_iletisim"],
        "address": {"@type": "PostalAddress", **yapisal["adres"]},
        "founder": [{"@type": "Person", "name": ad} for ad in yapisal["kurucular"]],
        "contactPoint": [
            {"@type": "ContactPoint", "contactType": "customer support", "email": d["eposta_iletisim"],
             "availableLanguage": ["tr"]},
            {"@type": "ContactPoint", "contactType": "privacy", "email": d["eposta_kvkk"],
             "availableLanguage": ["tr"]},
        ],
    }
    if same_as:
        org["sameAs"] = same_as
    return org


def jsonld(kok: str, cikti: str, baslik: str, aciklama: str, govde: str,
           d: dict[str, str], same_as: list[str], yapisal: dict[str, Any], dil: str = "tr",
           tarih: str | None = None) -> str:
    """tarih: sayfa içeriğinin son değişiklik günü (sitemap lastmod ile aynı kaynak)."""
    url = sayfa_url(kok, cikti)
    sayfa: dict[str, object] = {
        "@type": "WebPage",
        "@id": url + "#sayfa",
        "url": url,
        "name": baslik,
        "description": aciklama,
        "inLanguage": DIL_KODU[dil],
        "isPartOf": {"@id": f"{kok}/#site"},
        "publisher": {"@id": f"{kok}/#kurulus"},
    }
    if tarih:
        sayfa["dateModified"] = tarih
    if cikti in SAYFA_TURU:
        sayfa["@type"] = SAYFA_TURU[cikti]
    graf: list[dict[str, object]] = [
        kurulus(kok, d, same_as, yapisal, dil),
        {"@type": "WebSite", "@id": f"{kok}/#site", "url": kok + "/", "name": "Kabin",
         "inLanguage": [DIL_KODU[k] for k in ("tr", "en")],
         "publisher": {"@id": f"{kok}/#kurulus"}},
        sayfa,
    ]
    if cikti in ANA_SAYFALAR:
        sayfa["about"] = {"@id": f"{kok}/#uygulama"}
        graf.append({"@type": "SoftwareApplication", "@id": f"{kok}/#uygulama", "name": "Kabin",
                     "applicationCategory": "LifestyleApplication", "description": UYGULAMA_ACIKLAMA[dil],
                     "inLanguage": "tr", "publisher": {"@id": f"{kok}/#kurulus"}})
    if cikti in MARKA_SAYFALARI:
        h = HIZMET[dil]
        sayfa["about"] = {"@id": url + "#hizmet"}
        graf.append({"@type": "Service", "@id": url + "#hizmet", "name": h["name"], "serviceType": h["serviceType"],
                     "description": h["description"], "provider": {"@id": f"{kok}/#kurulus"},
                     "audience": {"@type": "BusinessAudience", "name": h["audience"]}})
    if cikti in SSS_SAYFALARI:
        sorular = [{"@type": "Question", "name": _duz(q),
                    "acceptedAnswer": {"@type": "Answer", "text": _duz(a)}} for q, a in SSS.findall(govde)]
        if sorular:
            graf.append({"@type": "FAQPage", "@id": url + "#sss", "mainEntity": sorular})
    veri = json.dumps({"@context": "https://schema.org", "@graph": graf}, ensure_ascii=False, separators=(",", ":"))
    # </script> kaçışı: JSON içinde "<" hiç kalmasın.
    return veri.replace("<", "\\u003c")


def hreflang_ciftleri(kok: str, cikti: str, esler: dict[str, str]) -> list[tuple[str, str]]:
    """Eş sayfası olan sayfa için (hreflang, adres) listesi; x-default Türkçe sayfadır. Eşi yoksa boş."""
    es = esler.get(cikti)
    if es is None:
        return []
    tr, en = (es, cikti) if cikti.startswith("en/") else (cikti, es)
    return [("tr", sayfa_url(kok, tr)), ("en", sayfa_url(kok, en)), ("x-default", sayfa_url(kok, tr))]


def sitemap(kok: str, yollar: list[str], tarihler: dict[str, str], esler: dict[str, str]) -> str:
    """esler: dizine giren sayfa → diğer dildeki eşi (iki yönlü). Eşler xhtml:link ile bildirilir.

    tarihler: sayfa → içeriğinin son değişiklik günü (yasal metinlerde künyedeki güncelleme tarihi).
    """
    satirlar = []
    for y in yollar:
        alt = "".join(f'<xhtml:link rel="alternate" hreflang="{k}" href="{a}"/>'
                      for k, a in hreflang_ciftleri(kok, y, esler))
        satirlar.append(f"<url><loc>{sayfa_url(kok, y)}</loc><lastmod>{tarihler[y]}</lastmod>{alt}</url>\n")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "".join(satirlar) + "</urlset>\n")


# Kullanıcı adına ya da arama için sayfa okuyan yapay zekâ ajanları: açıkça izinli.
# Eğitim amaçlı tarayıcılar (GPTBot, ClaudeBot, CCBot, Google-Extended …) "*" grubuna düşer; onlar da açıktır.
# Content-Signal bunu açıkça söyler: model eğitimine de izin veriyoruz (karar: 14 Kasım 2026).
AJAN_TARAYICILAR = ("OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User",
                    "PerplexityBot", "Perplexity-User")


def robots(kok: str) -> str:
    kurallar = "Content-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /\nDisallow: /api/\n"
    gruplar = "".join(f"User-agent: {a}\n" for a in AJAN_TARAYICILAR)
    return (
        "# Kabin — arama motorları ve yapay zekâ ajanları siteyi okuyabilir ve alıntılayabilir.\n"
        "# Content-Signal (contentsignals.org): arama=evet, yanıt üretmede kullanım=evet, model eğitimi=evet.\n\n"
        f"User-agent: *\n{kurallar}\n{gruplar}{kurallar}\nSitemap: {kok}/sitemap.xml\n"
    )


def llms(kok: str, sayfalar: list[tuple[str, str, str]], d: dict[str, str]) -> str:
    """sayfalar: (çıktı yolu, başlık, açıklama). llmstxt.org biçimi."""
    ana = [s for s in sayfalar if not s[0].startswith(("yasal/", "en/"))]
    yasal = [s for s in sayfalar if s[0].startswith("yasal/")]
    ingilizce = [s for s in sayfalar if s[0].startswith("en/")]

    def liste(ss: list[tuple[str, str, str]]) -> str:
        return "".join(f"- [{b}]({kok}/{md_yolu(c)}): {a}\n" for c, b, a in ss)

    return (
        "# Kabin\n\n"
        "> Kabin, ölçünüze göre beden söyleyen bir uygulamadır. Ölçünüzü bir kez mezurayla ya da önden ve yandan "
        "iki fotoğrafla alırsınız; mezurayla girdiğiniz ölçü her zaman önce gelir. Ürünün bağlantısını uygulamaya "
        "yapıştırırsınız; Kabin ürünün beden tablosuna bakar, hangi bedenin uyacağını ve göğüste, belde, basende "
        "nerede dar, nerede bol kalacağını gösterir. Dolabınızı ekler, kombin kurarsınız; dolap hesaba bağlıdır. "
        "Moda markaları için ürün sayfasına eklenen bir beden düğmesi de var.\n\n"
        "Önemli: Öneri tahmindir, garanti değildir. Vücut fotoğrafları saklanmaz. Uygulama şimdilik davetle, "
        "ücretsiz. Sitede satış, ödeme ya da hesap açma yoktur.\n\n"
        f"İletişim: {d['eposta_iletisim']} · KVKK başvuruları: {d['eposta_kvkk']} · "
        f"Güvenlik bildirimi: {d['eposta_guvenlik']} ({kok}/.well-known/security.txt)\n\n"
        "## Sayfalar\n\n" + liste(ana) + "\n## Yasal metinler\n\n" + liste(yasal)
        + ("\n## English\n\n"
           "English versions of the main pages. Legal texts are available in Turkish only; the Turkish version "
           "is the governing one.\n\n" + liste(ingilizce) if ingilizce else "")
    )


def md_sayfa(kok: str, cikti: str, baslik: str, aciklama: str, govde: str, dil: str = "tr") -> str:
    url = sayfa_url(kok, cikti)
    return (f"---\ntitle: {json.dumps(baslik, ensure_ascii=False)}\n"
            f"description: {json.dumps(aciklama, ensure_ascii=False)}\nurl: {url}\nlang: {dil}\n---\n\n"
            + html_to_md(govde, kok, dil))


def yaz(hedef: Path, metin: str) -> None:
    hedef.parent.mkdir(parents=True, exist_ok=True)
    hedef.write_text(metin, encoding="utf-8")
