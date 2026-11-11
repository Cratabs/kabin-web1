"""Ortak sayfa iskeleti: <head>, üst menü, alt bilgi ve başvuru formları (Türkçe ve İngilizce).

Bu modül yalnız metin üretir; dosya yazmaz. Kullanıcıdan gelen hiçbir veri burada işlenmez,
tüm değerler build.py'deki künye dosyasından gelir ve html.escape ile kaçırılır.
Dile bağlı metinlerin tamamı sablon_metin.py içindedir.
"""
from __future__ import annotations

from html import escape

from sablon_metin import ALT_LINKLER, DILLER, NAV, metin

# Meta CSP, .htaccess başlığı çalışmazsa ikinci savunma hattıdır (frame-ancestors meta'da geçmez).
META_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; "
    "connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'"
)


def _yasal_hreflang(dil: str, yasal: bool) -> str:
    """İngilizce sayfadan Türkçe yasal metne giden bağlantı: hedefin dili belirtilir."""
    return ' hreflang="tr"' if yasal and dil != "tr" else ""


def head(title: str, description: str, surum: dict[str, str], *, dil: str = "tr", canonical: str | None = None,
         md_href: str | None = None, jsonld: str | None = None,
         alternates: list[tuple[str, str]] | None = None) -> str:
    """canonical=None: dizine eklenmeyen sayfa (404, başvuru sonucu) → noindex.

    alternates: (hreflang, mutlak adres) çiftleri; yalnız iki dilde de karşılığı olan sayfalarda verilir.
    """
    t = metin(dil)
    if canonical is None:
        seo = '<meta name="robots" content="noindex">'
    else:
        c = escape(canonical)
        seo = f'<link rel="canonical" href="{c}">'
        for kod, adres in alternates or []:
            seo += f'<link rel="alternate" hreflang="{escape(kod)}" href="{escape(adres)}">'
        seo += (
            '<meta property="og:type" content="website"><meta property="og:site_name" content="Kabin">'
            f'<meta property="og:locale" content="{t["og_locale"]}">'
            f'<meta property="og:title" content="{escape(title)}">'
            f'<meta property="og:description" content="{escape(description)}">'
            f'<meta property="og:url" content="{c}">'
            '<meta name="twitter:card" content="summary">'
        )
    if md_href is not None:
        seo += f'<link rel="alternate" type="text/markdown" href="{escape(md_href)}">'
    seo += '<link rel="describedby" type="text/plain" href="/llms.txt">'
    # JSON-LD bir veri bloğudur, çalıştırılmaz; CSP script-src bunu engellemez. "<" ajan.py'de kaçırılır.
    ld = f'<script type="application/ld+json">{jsonld}</script>' if jsonld else ""
    return (
        f'<!doctype html><html lang="{dil}"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="referrer" content="strict-origin-when-cross-origin">'
        f'<meta http-equiv="Content-Security-Policy" content="{META_CSP}">'
        f"<title>{escape(title)}</title>"
        f'<meta name="description" content="{escape(description)}">{seo}'
        '<meta name="theme-color" content="#faf8f5">'
        '<link rel="icon" href="/assets/kabin-mark.svg" type="image/svg+xml">'
        '<link rel="preload" href="/assets/playfair.ttf" as="font" type="font/ttf" crossorigin>'
        f'<link rel="stylesheet" href="/styles.css?v={surum["css"]}">'
        f'<script src="/app.js?v={surum["js"]}" defer></script>{ld}'
        "</head><body>"
    )


def dil_degistirici(dil: str, adresler: dict[str, str]) -> str:
    """TR | EN bağlantıları. adresler: her dil için gidilecek adres (eş sayfa ya da o dilin ana sayfası)."""
    t = metin(dil)
    linkler = []
    for kod in DILLER:
        current = ' aria-current="true"' if kod == dil else ""
        linkler.append(
            f'<a href="{escape(adresler[kod])}" lang="{kod}" hreflang="{kod}" '
            f'aria-label="{escape(t["dil_" + kod])}"{current}>{kod.upper()}</a>'
        )
    return f'<div class="lang-switch" role="group" aria-label="{escape(t["dil_grup"])}">{"".join(linkler)}</div>'


def header(active: str, dil: str, adresler: dict[str, str]) -> str:
    t = metin(dil)
    links = []
    for key, href, label in NAV[dil]:
        current = ' aria-current="page"' if key == active else ""
        links.append(f'<a href="{href}"{_yasal_hreflang(dil, key == "yasal")}{current}>{label}</a>')
    links.append(f'<a class="nav-cta" href="{t["cta_href"]}">{t["cta"]} <span aria-hidden="true">↗</span></a>')
    return (
        f'<a class="skip" href="#icerik">{t["skip"]}</a>'
        f'<header><nav class="wrap nav" aria-label="{t["nav_aria"]}">'
        f'<a class="brand" href="{t["home"]}" aria-label="{t["brand_aria"]}">'
        '<img src="/assets/kabin-mark.svg" width="32" height="32" alt=""><span class="wordmark">kabin</span></a>'
        # Dil değiştirici menünün dışında ve önünde: her genişlikte görünür, görsel sıra = odak sırası.
        + dil_degistirici(dil, adresler)
        + f'<button class="menu-toggle" type="button" aria-label="{t["menu_aria"]}" aria-expanded="false" '
        f'aria-controls="nav-links">{t["menu"]}</button>'
        f'<div class="nav-links" id="nav-links">{"".join(links)}</div>'
        "</nav></header>"
    )


def footer(f: dict[str, str], dil: str = "tr") -> str:
    """f: künye alanlarının HTML'e hazır (kaçırılmış ya da yer tutuculu) değerleri."""
    t = metin(dil)
    linkler = "".join(
        f'<a href="{href}"{_yasal_hreflang(dil, yasal)}>{label}</a>' for href, label, yasal in ALT_LINKLER[dil]
    )
    not_ = f'<span>{t["alt_yasal_not"]}</span>' if t["alt_yasal_not"] else ""
    return (
        '<footer class="footer"><div class="wrap"><div class="footer-top">'
        f'<a class="brand" href="{t["home"]}"><img src="/assets/kabin-mark.svg" width="30" height="30" alt="">'
        f'<span class="wordmark">kabin</span></a><div class="footer-links">{linkler}</div></div>'
        '<div class="footer-bottom">'
        f'<span>{t["alt_telif"].format(**f)}</span>'
        f'<span>{t["alt_tahmin"]}</span>{not_}'
        "</div></div></footer></body></html>"
    )


def _check(name: str, text: str) -> str:
    return f'<label class="check-label"><input type="checkbox" name="{name}" value="evet" required><span>{text}</span></label>'


def _honeypot(kind: str, dil: str) -> str:
    # Görünmeyen tuzak alanı: insanlar doldurmaz, botlar doldurur. Ekran okuyuculardan da gizli.
    return (
        f'<div class="hp" aria-hidden="true"><label for="web_sitesi_{kind}">{metin(dil)["hp"]}</label>'
        f'<input id="web_sitesi_{kind}" name="web_sitesi" type="text" tabindex="-1" autocomplete="off"></div>'
    )


def _aydinlatma(dil: str, anchor: str = "") -> str:
    t = metin(dil)
    return (
        f'{t["aydinlatma_on"]}<a href="/yasal/kvkk-aydinlatma.html{anchor}"{_yasal_hreflang(dil, True)} '
        f'target="_blank" rel="noopener">{t["aydinlatma_ad"]}</a>{t["aydinlatma_son"]}'
    )


def _dil_alani(dil: str) -> str:
    """Düz HTML gönderiminde (JS kapalı) sunucu sonuç sayfasını bu dilde açsın. Türkçe varsayılandır."""
    return "" if dil == "tr" else f'<input type="hidden" name="dil" value="{dil}">'


def form(kind: str, open_: bool, eposta_link: str, dil: str = "tr") -> str:
    """Marka pilot formu. open_=False iken yasal kapı kapalı: alanlar kapalı, gönderim yok, e-posta yolu gösterilir."""
    if kind != "pilot":
        raise ValueError(f"bilinmeyen form: {kind}")
    t = metin(dil)
    kategoriler = "".join(
        f'<option value="{v}">{t["p_" + v]}</option>' for v in ("kadin", "erkek", "unisex", "spor", "diger")
    )
    fields = (
        f'<div class="form-grid"><div><label for="pilot-ad">{t["p_ad"]}</label>'
        '<input id="pilot-ad" name="ad" autocomplete="name" minlength="2" maxlength="100" required></div>'
        f'<div><label for="pilot-sirket">{t["p_sirket"]}</label>'
        '<input id="pilot-sirket" name="sirket" autocomplete="organization" minlength="2" maxlength="120" '
        "required></div></div>"
        f'<label for="pilot-eposta">{t["p_eposta"]}</label>'
        '<input id="pilot-eposta" name="eposta" type="email" autocomplete="email" maxlength="254" required>'
        f'<label for="pilot-kategori">{t["p_kategori"]}</label>'
        f'<select id="pilot-kategori" name="kategori" required><option value="">{t["p_sec"]}</option>'
        f"{kategoriler}</select>"
        f'<label for="pilot-mesaj">{t["p_mesaj"]} <span class="opt">{t["opt"]}</span></label>'
        '<textarea id="pilot-mesaj" name="mesaj" maxlength="1000" '
        'aria-describedby="pilot-mesaj-not"></textarea>'
        f'<p class="fine" id="pilot-mesaj-not">{t["p_mesaj_not"]}</p>'
        # Katmanlı aydınlatma: özet veri toplama anında görünür, tam metin bağlantıda (hukuk incelemesi 2026-11-08).
        f'<p class="fine" id="pilot-aydinlatma-ozet">{t["p_ozet"]}</p>'
        + _check("aydinlatma", _aydinlatma(dil))
    )
    # WebMCP bildirimsel araç: yalnız form gerçekten açıkken ajanlara sunulur.
    arac = f' toolname="kabin_pilot_talebi" tooldescription="{t["p_arac"]}"' if open_ else ""
    if open_:
        notice = ""
        kapali = ""
    else:
        # Yasal kapı kapalıyken form hiç gösterilmez (gizli ve devre dışı); yerine e-posta yolu sunulur.
        notice = (
            f'<div class="contact-card pilot-mail"><p class="eyebrow">{t["p_kapali_baslik"]}</p>'
            f'<p class="contact-mail">{eposta_link}</p>'
            f'<p class="fine">{t["p_kapali_metin"]}'
            f'<a class="text-link" href="/yasal/kvkk-aydinlatma.html"{_yasal_hreflang(dil, True)}>'
            f'{t["aydinlatma_ad"]}</a>{t["p_kapali_link_son"]}</p></div>'
        )
        kapali = " hidden"
    disabled = "" if open_ else " disabled"
    return (
        f'{notice}<form class="apply" action="/api/basvuru.php" method="post" data-basvuru="{kind}"{arac}{kapali}>'
        f'<fieldset class="form-body"{disabled}>'
        f'<input type="hidden" name="tur" value="{kind}">{_dil_alani(dil)}{fields}{_honeypot(kind, dil)}'
        f'<button class="button" type="submit">{t["p_gonder"]} <span aria-hidden="true">↗</span></button>'
        "</fieldset>"
        '<p class="form-status" role="status" aria-live="polite"></p>'
        "</form>"
    )


def beta_dugme(open_: bool, sinif: str = "button", dil: str = "tr") -> str:
    """Beta bekleme listesi düğmesi. Liste kapalıyken hiç üretilmez."""
    if not open_:
        return ""
    return f'<a class="{sinif}" href="#beta" data-beta-ac>{metin(dil)["b_dugme"]} <span aria-hidden="true">↗</span></a>'


def beta_form(open_: bool, dil: str = "tr") -> str:
    """Beta bekleme listesi açılır penceresi (<dialog>). JS kapalıyken #beta bağlantısı :target ile gösterir.

    Kampanya etiketleri (utm_*) sayfa adresinden JS ile gizli alanlara yazılır; çerez/izleme yok.
    """
    if not open_:
        return ""
    t = metin(dil)
    utm = "".join(f'<input type="hidden" name="{k}" value="">' for k in ("utm_source", "utm_medium", "utm_campaign"))
    return (
        '<dialog class="beta-dialog" id="beta" aria-labelledby="beta-baslik">'
        f'<div class="beta-head"><span class="eyebrow">{t["b_baslik_ust"]}</span>'
        f'<button type="button" class="beta-kapat" data-beta-kapat aria-label="{t["b_kapat"]}">×</button></div>'
        f'<h2 id="beta-baslik">{t["b_baslik"]}</h2>'
        f'<p class="fine">{t["b_giris"]}</p>'
        '<form class="apply" action="/api/basvuru.php" method="post" data-basvuru="beta">'
        '<fieldset class="form-body"><input type="hidden" name="tur" value="beta">' + _dil_alani(dil) + utm +
        f'<label for="beta-ad">{t["b_ad"]}</label>'
        '<input id="beta-ad" name="ad" autocomplete="given-name" minlength="2" maxlength="100" required>'
        f'<label for="beta-eposta">{t["b_eposta"]}</label>'
        '<input id="beta-eposta" name="eposta" type="email" autocomplete="email" maxlength="254" required>'
        f'<label for="beta-platform">{t["b_platform"]}</label>'
        f'<select id="beta-platform" name="platform" required><option value="">{t["b_sec"]}</option>'
        '<option value="android">Android</option><option value="ios">iPhone</option>'
        f'<option value="diger">{t["b_diger"]}</option></select>'
        f'<p class="fine" id="beta-aydinlatma-ozet">{t["b_ozet"]}</p>'
        + _check("yas18", t["b_yas"])
        + _check("aydinlatma", _aydinlatma(dil, "#beta-listesi"))
        + _honeypot("beta", dil)
        + f'<button class="button" type="submit">{t["b_gonder"]} <span aria-hidden="true">↗</span></button>'
        "</fieldset>"
        '<p class="form-status" role="status" aria-live="polite"></p>'
        "</form></dialog>"
    )
