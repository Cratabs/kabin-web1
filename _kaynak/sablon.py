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
    ("kapsam", "/index.html#kapsam", "Beta kapsamı"),
    ("markalar", "/markalar.html", "Markalar için"),
    ("yasal", "/yasal/", "Yasal"),
]


def head(title: str, description: str, surum: dict[str, str]) -> str:
    return (
        '<!doctype html><html lang="tr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="robots" content="noindex,nofollow">'
        '<meta name="referrer" content="strict-origin-when-cross-origin">'
        f'<meta http-equiv="Content-Security-Policy" content="{META_CSP}">'
        f"<title>{escape(title)}</title>"
        f'<meta name="description" content="{escape(description)}">'
        '<meta name="theme-color" content="#faf8f5">'
        '<link rel="icon" href="/assets/kabin-mark.svg" type="image/svg+xml">'
        '<link rel="preload" href="/assets/playfair.ttf" as="font" type="font/ttf" crossorigin>'
        f'<link rel="stylesheet" href="/styles.css?v={surum["css"]}">'
        f'<script src="/app.js?v={surum["js"]}" defer></script>'
        "</head><body>"
    )


def header(active: str) -> str:
    links = []
    for key, href, label in NAV:
        current = ' aria-current="page"' if key == active else ""
        links.append(f'<a href="{href}"{current}>{label}</a>')
    links.append('<a class="nav-cta" href="/index.html#beta">Kapalı beta <span aria-hidden="true">↗</span></a>')
    return (
        '<a class="skip" href="#icerik">İçeriğe geç</a>'
        '<div class="preview-bar">KAPALI BETA HAZIRLIĞI · DAVETLİ KULLANIM</div>'
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
        '<a href="/yasal/kvkk-aydinlatma.html">KVKK aydınlatma</a><a href="/yasal/gizlilik.html">Gizlilik</a>'
        '<a href="/yasal/cerez.html">Çerezler</a><a href="/yasal/kullanim-kosullari.html">Kullanım koşulları</a>'
        '<a href="/yasal/">Tüm yasal metinler</a></div></div>'
        '<div class="footer-bottom">'
        f'<span>© 2026 {f["kisa_ad"]} · Veri sorumlusu: {f["unvan"]} · {f["eposta_iletisim"]}</span>'
        "<span>Kapalı beta hazırlığında. Genel kullanıma açık değildir. "
        "Beden önerileri tahminidir.</span></div></div></footer></body></html>"
    )


def _check(name: str, text: str, required: bool = True) -> str:
    req = " required" if required else ""
    return f'<label class="check-label"><input type="checkbox" name="{name}" value="evet"{req}><span>{text}</span></label>'


def _honeypot() -> str:
    # Görünmeyen tuzak alanı: insanlar doldurmaz, botlar doldurur. Ekran okuyuculardan da gizli.
    return (
        '<div class="hp" aria-hidden="true"><label for="web_sitesi_{k}">Web siteniz</label>'
        '<input id="web_sitesi_{k}" name="web_sitesi" type="text" tabindex="-1" autocomplete="off"></div>'
    )


def form(kind: str, open_: bool) -> str:
    """Başvuru formu. open_=False iken yasal metinler eksik: alanlar kapalı, gönderim yok."""
    aydinlatma = (
        '<a href="/yasal/kvkk-aydinlatma.html" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>’ni '
        "okudum. Bilgilerimin bu metinde belirtilen amaçlarla işleneceğini biliyorum."
    )
    if kind == "beta":
        fields = (
            '<label for="beta-eposta">E-posta adresin</label>'
            '<input id="beta-eposta" name="eposta" type="email" autocomplete="email" maxlength="254" '
            'placeholder="sen@ornek.com" required>'
            '<fieldset class="choice"><legend>Kabin’i nerede kullanmak istersin?</legend>'
            '<label><input type="radio" name="platform" value="ios" required> iPhone</label>'
            '<label><input type="radio" name="platform" value="android"> Android</label>'
            '<label><input type="radio" name="platform" value="tarayici"> Yalnız tarayıcı eklentisi</label>'
            "</fieldset>"
            + _check("chrome", "Bilgisayarımda Google Chrome ya da Chromium tabanlı bir tarayıcı kullanıyorum.", False)
            + _check("yas18", "18 yaşını doldurdum.")
            + _check("aydinlatma", aydinlatma)
        )
        button = "Kapalı betaya başvur"
    else:
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
            + _check("aydinlatma", aydinlatma)
        )
        button = "Pilot talebini gönder"
    hp = _honeypot().replace("{k}", kind)
    if open_:
        notice = ""
        disabled = ""
    else:
        notice = (
            '<div class="draft-notice" role="note">Başvurular henüz açılmadı. Veri sorumlusu bilgileri ve yasal '
            "metinler tamamlandığında bu form çalışacak. Şu an hiçbir bilgi gönderilemez.</div>"
        )
        disabled = " disabled"
    return (
        f'<form class="apply" action="/api/basvuru.php" method="post" data-basvuru="{kind}">'
        f'{notice}<fieldset class="form-body"{disabled}>'
        f'<input type="hidden" name="tur" value="{kind}">{fields}{hp}'
        f'<button class="button" type="submit">{button} <span aria-hidden="true">↗</span></button>'
        "</fieldset>"
        '<p class="form-status" role="status" aria-live="polite"></p>'
        "</form>"
    )
