"""Ortak sayfa iskeleti: <head>, üst bilgi, alt bilgi ve başvuru formları (Türkçe ve İngilizce).

Bu modül yalnız metin üretir; dosya yazmaz. Kullanıcıdan gelen hiçbir veri burada işlenmez,
tüm değerler build.py'deki künye dosyasından gelir ve html.escape ile kaçırılır.
Dile bağlı metinlerin tamamı sablon_metin.py içindedir.

Sayfa türleri (build.py SAYFALAR): "ana" ve "marka" 3B sahneli sayfalardır (betikler gövdenin sonunda);
"okuma" düz metin sayfasıdır (Hakkında, İletişim, Sorular, sonuç sayfaları, 404); "yasal" yasal metinlerdir.
Stil ve betik dosyaları depo kökündeki /css ve /js klasörlerinde durur; burada yalnız bağlanır.
"""
from __future__ import annotations

import re
from html import escape

from sablon_metin import ALT_LINKLER, DILLER, NAV, metin

# Meta CSP, .htaccess başlığı çalışmazsa ikinci savunma hattıdır (frame-ancestors meta'da geçmez).
META_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; "
    "connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'"
)
# Sayfa türü → stil dosyaları (sıra önemli; ek.css en sonda) ve gövde sonundaki betikler.
STILLER = {
    "ana": ("temel", "telefon", "giris", "bolum", "ek"),
    "marka": ("temel", "telefon", "giris", "bolum", "markalar", "ek"),
    "okuma": ("temel", "sayfa", "ek"),
    "yasal": ("temel", "sayfa", "ek"),
}
BETIKLER = {
    "ana": ("dil", "cizim", "aski-serit", "telefon", "telefon-ek", "uyum", "sahne-yer", "site"),
    "marka": ("dil", "cizim", "telefon", "magaza", "sahne-yer", "site"),
    "okuma": (),
    "yasal": (),
}
GOVDE_SINIFI = {"ana": "", "marka": "", "okuma": "sayfa", "yasal": "sayfa yasal-sayfa"}
MENU_IKON = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
    'stroke-linecap="round" aria-hidden="true" focusable="false"><path class="m1" d="M4 8.5h16"/>'
    '<path class="m2" d="M4 15.5h16"/></svg>'
)
H2 = re.compile(r"<h2(?: id=\"([^\"]+)\")?>(.*?)</h2>", re.S)


def _yasal_hreflang(dil: str, yasal: bool) -> str:
    """İngilizce sayfadan Türkçe yasal metne giden bağlantı: hedefin dili belirtilir."""
    return ' hreflang="tr"' if yasal and dil != "tr" else ""


def head(title: str, description: str, surum: str, *, tur: str, dil: str = "tr", canonical: str | None = None,
         md_href: str | None = None, jsonld: str | None = None,
         alternates: list[tuple[str, str]] | None = None) -> str:
    """canonical=None: dizine eklenmeyen sayfa (404, başvuru sonucu) → noindex.

    alternates: (hreflang, mutlak adres) çiftleri; yalnız iki dilde de karşılığı olan sayfalarda verilir.
    surum: stil ve betik adreslerine eklenen içerik özeti (?v=…); dosyalar 30 gün önbellekte kalır.
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
        )
        if alternates:
            seo += f'<meta property="og:locale:alternate" content="{t["og_locale_diger"]}">'
        seo += (
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
    stiller = "".join(f'<link rel="stylesheet" href="/css/{ad}.css?v={surum}">' for ad in STILLER[tur])
    # "betiksiz": betik çalışmazsa 3B sahne yerine durağan çizim görünür; /js/menu.js ilk iş bu sınıfı kaldırır.
    kok_sinif = ' class="betiksiz"' if BETIKLER[tur] else ""
    govde_sinif = f' class="{GOVDE_SINIFI[tur]}"' if GOVDE_SINIFI[tur] else ""
    return (
        f'<!doctype html><html lang="{dil}"{kok_sinif}><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="referrer" content="strict-origin-when-cross-origin">'
        f'<meta http-equiv="Content-Security-Policy" content="{META_CSP}">'
        f"<title>{escape(title)}</title>"
        f'<meta name="description" content="{escape(description)}">{seo}'
        '<meta name="theme-color" content="#EEF1EA">'
        '<link rel="icon" href="/assets/kabin-mark.svg" type="image/svg+xml">'
        '<link rel="preload" href="/fonts/playfair.woff2" as="font" type="font/woff2" crossorigin>'
        '<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>'
        f"{stiller}"
        f'<script src="/js/menu.js?v={surum}"></script>'
        f'<script src="/app.js?v={surum}" defer></script>{ld}'
        f"</head><body{govde_sinif}>"
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
    return f'<div class="dil" role="group" aria-label="{escape(t["dil_grup"])}">{"".join(linkler)}</div>'


def header(active: str, dil: str, adresler: dict[str, str]) -> str:
    """active: etkin menü anahtarı ("markalar" ya da ""). Markalar sayfasında üstteki hap düğme pilot bölümüne gider."""
    t = metin(dil)
    links = []
    for key, href, label in NAV[dil]:
        current = ' aria-current="page"' if key == active else ""
        links.append(f'<a href="{href}"{current}>{label}</a>')
    links.append(f'<a class="gezin-davet" href="{t["davet_href"]}">{t["davet"]}</a>')
    hap_href, hap = ("#pilot", t["pilot_dugme"]) if active == "markalar" else (t["davet_href"], t["davet"])
    return (
        f'<a class="atla" href="#icerik">{t["skip"]}</a>'
        '<header class="ust-bilgi"><div class="kap">'
        f'<a class="logo" href="{t["home"]}" aria-label="{t["brand_aria"]}">'
        '<img src="/assets/kabin-mark.svg" width="32" height="32" alt="">kabin</a>'
        f'<nav class="gezin" id="gezin" aria-label="{t["nav_aria"]}">{"".join(links)}'
        # Dil değiştirici menünün içinde: geniş ekranda bağlantıların sonunda, telefonda açılır listenin son satırı.
        + dil_degistirici(dil, adresler)
        + "</nav>"
        f'<a class="dugme dugme-1 dugme-k" href="{hap_href}">{hap}</a>'
        f'<button class="menu-dugme" type="button" aria-expanded="false" aria-controls="gezin" '
        f'aria-label="{t["menu_aria"]}">{MENU_IKON}</button>'
        "</div></header>"
    )


def footer(dil: str, cikti: str, eposta: str, tur: str, surum: str) -> str:
    """eposta: künyedeki iletişim adresi (düz metin). cikti: o anki sayfa (alt bilgide aria-current)."""
    t = metin(dil)
    linkler = "".join(
        f'<a href="{href}"{_yasal_hreflang(dil, yasal)}{" aria-current=" + chr(34) + "page" + chr(34) if yol == cikti else ""}>'
        f"{label}</a>"
        for href, label, yasal, yol in ALT_LINKLER[dil]
    )
    e = escape(eposta)
    posta = f'<a id="{t["alt_eposta_id"]}" href="mailto:{e}">{e}</a>' if "@" in eposta else ""
    not_ = f'<p class="alt-not">{t["alt_yasal_not"]}</p>' if t["alt_yasal_not"] else ""
    betikler = "".join(f'<script src="/js/{ad}.js?v={surum}"></script>' for ad in BETIKLER[tur])
    return (
        '<footer class="alt-bilgi"><span class="dev-yazi" aria-hidden="true"><span class="cakil c1"></span>'
        '<span class="cakil c2"></span><span class="cakil c3"></span>kabin</span>'
        f'<div class="kap alt-satir"><nav aria-label="{t["alt_aria"]}">{linkler}</nav>{posta}{not_}</div>'
        f"</footer>{betikler}</body></html>"
    )


def okuma_govdesi(govde: str, dil: str, yanli: bool = False) -> str:
    """Eski sınıf adlarıyla yazılmış parçayı (yasal metinler: div.wrap > article.legal) yeni okuma düzenine sarar.

    Parça dosyaları değişmez; yalnız dış sarmalayıcının sınıfı değişir. yanli=True: başlıklardan (h2) yanda duran
    bir içindekiler listesi üretilir; kimliği olmayan başlığa "bolum-N" verilir. Görünen metne dokunulmaz.
    """
    eski = '<div class="wrap"><article class="legal">'
    if not govde.startswith(eski):
        return govde
    ic = govde[len(eski):]
    if not yanli:
        return '<div class="kap okuma-duzen"><article class="okuma">' + ic
    maddeler: list[str] = []

    def kimlik(m: re.Match[str]) -> str:
        kim = m.group(1) or f"bolum-{len(maddeler) + 1}"
        maddeler.append(f'<li><a href="#{kim}">{m.group(2)}</a></li>')
        return f'<h2 id="{kim}">{m.group(2)}</h2>'

    ic = H2.sub(kimlik, ic)
    t = metin(dil)
    liste = (f'<nav class="icindekiler" aria-label="{t["icindekiler"]}"><strong>{t["icindekiler"]}</strong>'
             f'<ol>{"".join(maddeler)}</ol></nav>')
    return f'<div class="kap okuma-duzen okuma-yanli">{liste}<article class="okuma">' + ic


def _onay(name: str, text: str, kapali: str = "") -> str:
    return (f'<label class="onay"><input type="checkbox" name="{name}" value="evet" required{kapali}>'
            f"<span>{text}</span></label>")


def _honeypot(kind: str, dil: str, kapali: str = "") -> str:
    # Görünmeyen tuzak alanı: insanlar doldurmaz, botlar doldurur. Ekran okuyuculardan da gizli.
    return (
        f'<div class="hp" aria-hidden="true"><label for="web_sitesi_{kind}">{metin(dil)["hp"]}</label>'
        f'<input id="web_sitesi_{kind}" name="web_sitesi" type="text" tabindex="-1" autocomplete="off"{kapali}></div>'
    )


def _aydinlatma(dil: str, on: str, son: str, anchor: str = "") -> str:
    t = metin(dil)
    return (
        f'{on}<a class="bag" href="/yasal/kvkk-aydinlatma.html{anchor}"{_yasal_hreflang(dil, True)} '
        f'target="_blank" rel="noopener">{t["aydinlatma_ad"]}</a>{son}'
    )


def _dil_alani(dil: str) -> str:
    """Düz HTML gönderiminde (JS kapalı) sunucu sonuç sayfasını bu dilde açsın. Türkçe varsayılandır."""
    return "" if dil == "tr" else f'<input type="hidden" name="dil" value="{dil}">'


def _gonder(etiket: str, kapali: str = "") -> str:
    return (f'<div class="form-son"><button class="dugme dugme-1" type="submit"{kapali}>{etiket}</button>'
            '<p class="ince form-status" role="status" aria-live="polite"></p></div>')


def form(kind: str, open_: bool, dil: str = "tr") -> str:
    """Marka pilot formu. open_=False iken yasal kapı kapalı: form gizli, alanlar kapalı, gönderim yok.

    Kapalıyken sayfada e-posta yolu ve pilot_notu() görünür; api/basvuru.php de 503 döner.
    Alan adları ve değerleri uç noktasıyla (api/_lib/dogrula.php) birebir aynıdır; yeni alan eklemeyin.
    """
    if kind != "pilot":
        raise ValueError(f"bilinmeyen form: {kind}")
    t = metin(dil)
    k = "" if open_ else " disabled"
    kategoriler = "".join(
        f'<option value="{v}">{t["p_" + v]}</option>' for v in ("kadin", "erkek", "unisex", "spor", "diger")
    )
    fields = (
        f'<div class="alan"><label for="pilot-ad">{t["p_ad"]}</label>'
        f'<input id="pilot-ad" name="ad" autocomplete="name" minlength="2" maxlength="100" required{k}></div>'
        f'<div class="alan"><label for="pilot-sirket">{t["p_sirket"]}</label>'
        f'<input id="pilot-sirket" name="sirket" autocomplete="organization" minlength="2" maxlength="120" '
        f"required{k}></div>"
        f'<div class="alan"><label for="pilot-eposta">{t["p_eposta"]}</label>'
        f'<input id="pilot-eposta" name="eposta" type="email" autocomplete="email" maxlength="254" required{k}></div>'
        f'<div class="alan"><label for="pilot-kategori">{t["p_kategori"]}</label>'
        f'<select id="pilot-kategori" name="kategori" required{k}><option value="">{t["p_sec"]}</option>'
        f"{kategoriler}</select></div>"
        f'<div class="alan"><label for="pilot-mesaj">{t["p_mesaj"]} <span class="opt">{t["opt"]}</span></label>'
        f'<textarea id="pilot-mesaj" name="mesaj" maxlength="1000" aria-describedby="pilot-mesaj-not"{k}></textarea>'
        f'<p class="ince" id="pilot-mesaj-not">{t["p_mesaj_not"]}</p></div>'
        # Katmanlı aydınlatma: özet veri toplama anında görünür, tam metin bağlantıda (hukuk incelemesi 2026-11-08).
        f'<p class="ince" id="pilot-aydinlatma-ozet">{t["p_ozet"]}</p>'
        + _onay("aydinlatma", _aydinlatma(dil, t["aydinlatma_on"], t["aydinlatma_son"]), k)
    )
    # WebMCP bildirimsel araç: yalnız form gerçekten açıkken ajanlara sunulur.
    arac = f' toolname="kabin_pilot_talebi" tooldescription="{t["p_arac"]}"' if open_ else ""
    gizli = "" if open_ else " hidden"
    return (
        f'<form class="davet-form pilot-form" action="/api/basvuru.php" method="post" data-basvuru="{kind}"{arac}{gizli}>'
        f'<input type="hidden" name="tur" value="{kind}">{_dil_alani(dil)}{fields}{_honeypot(kind, dil, k)}'
        f'{_gonder(t["p_gonder"], k)}'
        "</form>"
    )


def pilot_notu(open_: bool, dil: str = "tr") -> str:
    """Pilot formu kapalıyken e-posta adresinin altında duran not (ne yazılmalı + aydınlatma metni bağlantısı)."""
    if open_:
        return ""
    t = metin(dil)
    return (
        f'<p class="ince panel-not">{t["p_kapali_metin"]}'
        f'<a class="bag" href="/yasal/kvkk-aydinlatma.html"{_yasal_hreflang(dil, True)}>'
        f'{t["aydinlatma_ad"]}</a>{t["p_kapali_link_son"]}</p>'
    )


def beta_form(open_: bool, dil: str = "tr") -> str:
    """Davet (beta bekleme listesi) formu: ana sayfadaki "Davet isteyin" bölümünde, sayfa içinde durur.

    Kampanya etiketleri (utm_*) sayfa adresinden JS ile gizli alanlara yazılır; çerez/izleme yok.
    Alan adları ve değerleri uç noktasıyla birebir aynıdır (onay kutuları value="evet", tur=beta).
    Altındaki özet (b_ozet) katmanlı aydınlatmanın ilk katmanıdır (hukuk incelemesi 2026-11-08): kaldırmayın.
    """
    if not open_:
        return ""
    t = metin(dil)
    utm = "".join(f'<input type="hidden" name="{k}" value="">' for k in ("utm_source", "utm_medium", "utm_campaign"))
    return (
        '<form class="davet-form" action="/api/basvuru.php" method="post" data-basvuru="beta">'
        '<input type="hidden" name="tur" value="beta">' + _dil_alani(dil) + utm +
        f'<div class="alan"><label for="d-ad">{t["b_ad"]}</label>'
        '<input id="d-ad" name="ad" autocomplete="given-name" minlength="2" maxlength="100" required></div>'
        f'<div class="alan"><label for="d-eposta">{t["b_eposta"]}</label>'
        '<input id="d-eposta" name="eposta" type="email" autocomplete="email" maxlength="254" required></div>'
        f'<div class="alan"><label for="d-tel">{t["b_platform"]}</label>'
        f'<select id="d-tel" name="platform" required><option value="">{t["b_sec"]}</option>'
        '<option value="android">Android</option><option value="ios">iPhone</option>'
        f'<option value="diger">{t["b_diger"]}</option></select></div>'
        + _onay("yas18", t["b_yas"])
        + _onay("aydinlatma", _aydinlatma(dil, t["b_aydinlatma_on"], t["b_aydinlatma_son"], "#beta-listesi"))
        + _honeypot("beta", dil)
        + _gonder(t["b_gonder"])
        + f'<p class="ince form-ozet" id="beta-aydinlatma-ozet">{t["b_ozet"]}</p>'
        "</form>"
    )
