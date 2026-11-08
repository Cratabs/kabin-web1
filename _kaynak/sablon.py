"""Ortak sayfa iskeleti: <head>, üst menü, alt bilgi ve başvuru formları.

Bu modül yalnız metin üretir; dosya yazmaz. Kullanıcıdan gelen hiçbir veri burada işlenmez,
tüm değerler build.py'deki künye dosyasından gelir ve html.escape ile kaçırılır.
"""
from __future__ import annotations

from html import escape

# Meta CSP, .htaccess başlığı çalışmazsa ikinci savunma hattıdır (frame-ancestors meta'da geçmez).
META_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; "
    "connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'"
)

NAV = [
    ("nasil", "/index.html#nasil", "Nasıl çalışır?"),
    ("olcu", "/index.html#olcu", "Fotoğrafla ölçü"),
    ("markalar", "/markalar.html", "Markalar için"),
    ("yasal", "/yasal/", "Yasal"),
]


def head(title: str, description: str, surum: dict[str, str], *, canonical: str | None = None,
         md_href: str | None = None, jsonld: str | None = None) -> str:
    """canonical=None: dizine eklenmeyen sayfa (404, başvuru sonucu) → noindex."""
    if canonical is None:
        seo = '<meta name="robots" content="noindex">'
    else:
        c = escape(canonical)
        seo = (
            f'<link rel="canonical" href="{c}">'
            '<meta property="og:type" content="website"><meta property="og:site_name" content="Kabin">'
            '<meta property="og:locale" content="tr_TR">'
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
        '<!doctype html><html lang="tr"><head><meta charset="utf-8">'
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


def header(active: str) -> str:
    links = []
    for key, href, label in NAV:
        current = ' aria-current="page"' if key == active else ""
        links.append(f'<a href="{href}"{current}>{label}</a>')
    links.append('<a class="nav-cta" href="/index.html#iletisim">İletişim <span aria-hidden="true">↗</span></a>')
    return (
        '<a class="skip" href="#icerik">İçeriğe geç</a>'
        '<header><nav class="wrap nav" aria-label="Ana menü">'
        '<a class="brand" href="/index.html" aria-label="Kabin ana sayfa">'
        '<img src="/assets/kabin-mark.svg" width="32" height="32" alt=""><span class="wordmark">kabin</span></a>'
        '<button class="menu-toggle" type="button" aria-label="Menüyü aç" aria-expanded="false" '
        'aria-controls="nav-links">Menü ☰</button>'
        f'<div class="nav-links" id="nav-links">{"".join(links)}</div>'
        "</nav></header>"
    )


def footer(f: dict[str, str]) -> str:
    """f: künye alanlarının HTML'e hazır (kaçırılmış ya da yer tutuculu) değerleri."""
    return (
        '<footer class="footer"><div class="wrap"><div class="footer-top">'
        '<a class="brand" href="/index.html"><img src="/assets/kabin-mark.svg" width="30" height="30" alt="">'
        '<span class="wordmark">kabin</span></a><div class="footer-links">'
        '<a href="/index.html#nasil">Nasıl çalışır?</a><a href="/markalar.html">Markalar için</a>'
        '<a href="/hakkinda.html">Hakkımızda</a><a href="/iletisim.html">İletişim</a>'
        '<a href="/yasal/kvkk-aydinlatma.html">KVKK aydınlatma</a><a href="/yasal/gizlilik.html">Gizlilik</a>'
        '<a href="/yasal/kullanici-sozlesmesi.html">Kullanıcı sözleşmesi</a>'
        '<a href="/yasal/cerez.html">Çerezler</a><a href="/yasal/kullanim-kosullari.html">Kullanım koşulları</a>'
        '<a href="/yasal/">Tüm yasal metinler</a></div></div>'
        '<div class="footer-bottom">'
        f'<span>© 2026 {f["kisa_ad"]} · Veri sorumluları: {f["unvan"]} · {f["eposta_link"]}</span>'
        "<span>Fotoğraftan ölçüler ve beden önerileri tahminidir; uyum garantisi değildir.</span>"
        "</div></div></footer></body></html>"
    )


def _check(name: str, text: str) -> str:
    return f'<label class="check-label"><input type="checkbox" name="{name}" value="evet" required><span>{text}</span></label>'


def _honeypot() -> str:
    # Görünmeyen tuzak alanı: insanlar doldurmaz, botlar doldurur. Ekran okuyuculardan da gizli.
    return (
        '<div class="hp" aria-hidden="true"><label for="web_sitesi_{k}">Web siteniz</label>'
        '<input id="web_sitesi_{k}" name="web_sitesi" type="text" tabindex="-1" autocomplete="off"></div>'
    )


def form(kind: str, open_: bool, eposta_link: str) -> str:
    """Marka pilot formu. open_=False iken yasal kapı kapalı: alanlar kapalı, gönderim yok, e-posta yolu gösterilir."""
    aydinlatma = (
        '<a href="/yasal/kvkk-aydinlatma.html" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>’ni '
        "okudum. Bilgilerimin bu metinde belirtilen amaçlarla işleneceğini biliyorum."
    )
    if kind != "pilot":
        raise ValueError(f"bilinmeyen form: {kind}")
    fields = (
        '<div class="form-grid"><div><label for="pilot-ad">Ad soyad</label>'
        '<input id="pilot-ad" name="ad" autocomplete="name" minlength="2" maxlength="100" required></div>'
        '<div><label for="pilot-sirket">Marka / şirket</label>'
        '<input id="pilot-sirket" name="sirket" autocomplete="organization" minlength="2" maxlength="120" '
        "required></div></div>"
        '<label for="pilot-eposta">İş e-posta adresi</label>'
        '<input id="pilot-eposta" name="eposta" type="email" autocomplete="email" maxlength="254" required>'
        '<label for="pilot-kategori">Ürün kategoriniz</label>'
        '<select id="pilot-kategori" name="kategori" required><option value="">Seçin</option>'
        '<option value="kadin">Kadın giyim</option><option value="erkek">Erkek giyim</option>'
        '<option value="unisex">Unisex / temel giyim</option><option value="spor">Spor giyim</option>'
        '<option value="diger">Diğer</option></select>'
        '<label for="pilot-mesaj">Pilotunuzda neyi çözmek istiyorsunuz? <span class="opt">(isteğe bağlı)</span></label>'
        '<textarea id="pilot-mesaj" name="mesaj" maxlength="1000" '
        'aria-describedby="pilot-mesaj-not"></textarea>'
        '<p class="fine" id="pilot-mesaj-not">Ticari sır, müşteri verisi ya da başka kişilere ait kişisel veri '
        "eklemeyin. En fazla 1000 karakter.</p>"
        # Katmanlı aydınlatma: özet veri toplama anında görünür, tam metin bağlantıda (hukuk incelemesi 2026-11-08).
        '<p class="fine" id="pilot-aydinlatma-ozet">Bu bilgileri, pilot talebinizi değerlendirmek ve size dönmek için '
        "Kabin kurucu ortakları (müşterek veri sorumlusu) işler: kendi adınıza başvuruda sözleşmenin kurulması "
        "(KVKK m.5/2-c), bir kuruluş adına başvuruda meşru menfaat (m.5/2-f). Veriler barındırma sağlayıcımızın "
        "yurt dışındaki veri merkezinde tutulur, başka kimseyle paylaşılmaz ve pazarlama için kullanılmaz. Yurt dışı "
        "aktarımın dayanağı, haklarınız ve saklama süreleri tam metinde.</p>"
        + _check("aydinlatma", aydinlatma)
    )
    button = "Pilot talebini gönder"
    # WebMCP bildirimsel araç: yalnız form gerçekten açıkken ajanlara sunulur.
    arac = (
        ' toolname="kabin_pilot_talebi" tooldescription="Bir moda markası adına Kabin beden önerisi pilotu için '
        "talep gönderir. Kişinin kendi ad, şirket ve iş e-posta bilgisiyle ve KVKK aydınlatma metnini okuduğunu "
        'onaylamasıyla kullanılmalıdır."'
        if open_ else ""
    )
    hp = _honeypot().replace("{k}", kind)
    if open_:
        notice = ""
        kapali = ""
    else:
        # Yasal kapı kapalıyken form hiç gösterilmez (gizli ve devre dışı); yerine e-posta yolu sunulur.
        notice = (
            '<div class="contact-card pilot-mail"><p class="eyebrow">PİLOT TALEBİ</p>'
            f'<p class="contact-mail">{eposta_link}</p>'
            '<p class="fine">Markanızı, ürün kategorinizi ve pilotta çözmek istediğiniz sorunu kısaca yazın. '
            "Ticari sır, müşteri verisi ya da başka kişilere ait kişisel veri eklemeyin. Kişisel verileriniz "
            '<a class="text-link" href="/yasal/kvkk-aydinlatma.html">KVKK Aydınlatma Metni</a>’ne göre işlenir.</p></div>'
        )
        kapali = " hidden"
    disabled = "" if open_ else " disabled"
    return (
        f'{notice}<form class="apply" action="/api/basvuru.php" method="post" data-basvuru="{kind}"{arac}{kapali}>'
        f'<fieldset class="form-body"{disabled}>'
        f'<input type="hidden" name="tur" value="{kind}">{fields}{hp}'
        f'<button class="button" type="submit">{button} <span aria-hidden="true">↗</span></button>'
        "</fieldset>"
        '<p class="form-status" role="status" aria-live="polite"></p>'
        "</form>"
    )
