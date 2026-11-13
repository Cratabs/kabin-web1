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

SSS = re.compile(r"<details><summary>(.*?)</summary>(.*?)</details>", re.S)
ETIKET = re.compile(r"<[^>]+>")
# Sayfa dili → schema.org inLanguage (BCP 47).
DIL_KODU = {"tr": "tr-TR", "en": "en"}
SAYFA_TURU = {"hakkinda.html": "AboutPage", "en/about.html": "AboutPage",
              "iletisim.html": "ContactPage", "en/contact.html": "ContactPage"}
SSS_SAYFALARI = {"index.html", "en/index.html"}
KURULUS_ACIKLAMA = {
    "tr": "Fotoğraftan ölçü tahmini ve ürünün beden tablosuna göre açıklanabilir beden önerisi "
          "sunan kişisel beden ve stil asistanı.",
    "en": "A personal size and style assistant that estimates body measurements from photos and gives "
          "explainable size recommendations based on the item's size chart.",
}


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
           d: dict[str, str], same_as: list[str], yapisal: dict[str, Any], dil: str = "tr") -> str:
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
    if cikti in SAYFA_TURU:
        sayfa["@type"] = SAYFA_TURU[cikti]
    graf: list[dict[str, object]] = [
        kurulus(kok, d, same_as, yapisal, dil),
        {"@type": "WebSite", "@id": f"{kok}/#site", "url": kok + "/", "name": "Kabin",
         "inLanguage": [DIL_KODU[k] for k in ("tr", "en")],
         "publisher": {"@id": f"{kok}/#kurulus"}},
        sayfa,
    ]
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


def sitemap(kok: str, yollar: list[str], tarih: str, esler: dict[str, str]) -> str:
    """esler: dizine giren sayfa → diğer dildeki eşi (iki yönlü). Eşler xhtml:link ile bildirilir."""
    satirlar = []
    for y in yollar:
        alt = "".join(f'<xhtml:link rel="alternate" hreflang="{k}" href="{a}"/>'
                      for k, a in hreflang_ciftleri(kok, y, esler))
        satirlar.append(f"<url><loc>{sayfa_url(kok, y)}</loc><lastmod>{tarih}</lastmod>{alt}</url>\n")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "".join(satirlar) + "</urlset>\n")


# Kullanıcı adına ya da arama için sayfa okuyan yapay zekâ ajanları: açıkça izinli.
# Eğitim amaçlı tarayıcılar (GPTBot, ClaudeBot, CCBot, Google-Extended …) "*" grubuna düşer;
# erişebilirler ama Content-Signal ile model eğitimine izin vermediğimizi bildiririz.
AJAN_TARAYICILAR = ("OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User",
                    "PerplexityBot", "Perplexity-User")


def robots(kok: str) -> str:
    kurallar = "Content-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\nDisallow: /api/\n"
    gruplar = "".join(f"User-agent: {a}\n" for a in AJAN_TARAYICILAR)
    return (
        "# Kabin — arama motorları ve yapay zekâ ajanları siteyi okuyabilir ve alıntılayabilir.\n"
        "# Content-Signal (contentsignals.org): arama=evet, yanıt üretmede kullanım=evet, model eğitimi=hayır.\n\n"
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
        "> Kabin, kişisel beden ve stil asistanıdır. Önden ve yandan çekilen iki fotoğraftan vücut ölçülerini "
        "tahmin eder (mezurayla girilen ölçü her zaman önceliklidir), ürünün beden tablosuyla karşılaştırır ve "
        "her bölge için dar / uygun / bol sonucunu nedeniyle gösterir. Dolap hesaba bağlıdır; kombin uyumu "
        "puanlanır; toplulukta kombin paylaşılır. Fotoğraflar diske yazılmaz.\n\n"
        "Önemli: Ölçüler ve beden önerileri tahminidir, uyum garantisi değildir. Uygulama davetle kullanılır; "
        "sitede satış, ödeme ya da hesap açma yoktur.\n\n"
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
