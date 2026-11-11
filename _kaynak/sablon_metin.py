"""Şablonun dile bağlı metinleri: tek sözlük, iki dil (tr, en).

sablon.py yalnız bu sözlükten okur; metin eklerken iki dili birlikte güncelleyin.
Türkçe değerler mevcut sitenin metinleriyle birebir aynıdır (üretilen TR sayfaları değişmesin).
İngilizce sayfalardaki yasal bağlantılar Türkçe /yasal/ metinlerine gider (yasal metin çevirisi yok).
"""
from __future__ import annotations

DILLER = ("tr", "en")

# Menü: (anahtar, adres, etiket). Anahtar etkin menüyü (aria-current) belirler.
NAV: dict[str, list[tuple[str, str, str]]] = {
    "tr": [
        ("nasil", "/index.html#nasil", "Nasıl çalışır?"),
        ("olcu", "/index.html#olcu", "Fotoğrafla ölçü"),
        ("markalar", "/markalar.html", "Markalar için"),
        ("yasal", "/yasal/", "Yasal"),
    ],
    "en": [
        ("nasil", "/en/index.html#how-it-works", "How it works"),
        ("olcu", "/en/index.html#measurements", "Photo measurements"),
        ("markalar", "/en/brands.html", "For brands"),
        ("yasal", "/yasal/", "Legal"),
    ],
}

# Alt bilgi bağlantıları: (adres, etiket, yasal mı). Yasal bağlantılar İngilizce sayfada hreflang="tr" alır.
ALT_LINKLER: dict[str, list[tuple[str, str, bool]]] = {
    "tr": [
        ("/index.html#nasil", "Nasıl çalışır?", False), ("/markalar.html", "Markalar için", False),
        ("/hakkinda.html", "Hakkımızda", False), ("/iletisim.html", "İletişim", False),
        ("/yasal/kvkk-aydinlatma.html", "KVKK aydınlatma", True), ("/yasal/gizlilik.html", "Gizlilik", True),
        ("/yasal/kullanici-sozlesmesi.html", "Kullanıcı sözleşmesi", True),
        ("/yasal/cerez.html", "Çerezler", True), ("/yasal/kullanim-kosullari.html", "Kullanım koşulları", True),
        ("/yasal/", "Tüm yasal metinler", True),
    ],
    "en": [
        ("/en/index.html#how-it-works", "How it works", False), ("/en/brands.html", "For brands", False),
        ("/en/about.html", "About us", False), ("/en/contact.html", "Contact", False),
        ("/yasal/kvkk-aydinlatma.html", "KVKK information notice", True), ("/yasal/gizlilik.html", "Privacy", True),
        ("/yasal/kullanici-sozlesmesi.html", "User agreement", True),
        ("/yasal/cerez.html", "Cookies", True), ("/yasal/kullanim-kosullari.html", "Terms of use", True),
        ("/yasal/", "All legal texts", True),
    ],
}

METIN: dict[str, dict[str, str]] = {
    "tr": {
        "og_locale": "tr_TR",
        # Üst bilgi
        "skip": "İçeriğe geç",
        "nav_aria": "Ana menü",
        "brand_aria": "Kabin ana sayfa",
        "menu_aria": "Menüyü aç",
        "menu": "Menü ☰",
        "cta_href": "/index.html#iletisim",
        "cta": "İletişim",
        "home": "/index.html",
        # Dil değiştirici (her iki dilde aynı grup adı; bağlantı adları kendi dilinde)
        "dil_grup": "Dil / Language",
        "dil_tr": "TR, Türkçe",
        "dil_en": "EN, English",
        # Alt bilgi
        "alt_telif": "© 2026 {kisa_ad} · Veri sorumluları: {unvan} · {eposta_link}",
        "alt_tahmin": "Fotoğraftan ölçüler ve beden önerileri tahminidir; uyum garantisi değildir.",
        "alt_yasal_not": "",
        # Pilot formu
        "aydinlatma_ad": "KVKK Aydınlatma Metni",
        "aydinlatma_on": "",
        "aydinlatma_son": "’ni okudum. Bilgilerimin bu metinde belirtilen amaçlarla işleneceğini biliyorum.",
        "hp": "Web siteniz",
        "p_ad": "Ad soyad",
        "p_sirket": "Marka / şirket",
        "p_eposta": "İş e-posta adresi",
        "p_kategori": "Ürün kategoriniz",
        "p_sec": "Seçin",
        "p_kadin": "Kadın giyim", "p_erkek": "Erkek giyim", "p_unisex": "Unisex / temel giyim",
        "p_spor": "Spor giyim", "p_diger": "Diğer",
        "p_mesaj": "Pilotunuzda neyi çözmek istiyorsunuz?",
        "opt": "(isteğe bağlı)",
        "p_mesaj_not": "Ticari sır, müşteri verisi ya da başka kişilere ait kişisel veri eklemeyin. En fazla 1000 karakter.",
        "p_ozet": (
            "Bu bilgileri, pilot talebinizi değerlendirmek ve size dönmek için Kabin kurucu ortakları (müşterek veri "
            "sorumlusu) işler: kendi adınıza başvuruda sözleşmenin kurulması (KVKK m.5/2-c), bir kuruluş adına "
            "başvuruda meşru menfaat (m.5/2-f). Veriler barındırma sağlayıcımızın yurt dışındaki veri merkezinde "
            "tutulur, başka kimseyle paylaşılmaz ve pazarlama için kullanılmaz. Yurt dışı aktarımın dayanağı, "
            "haklarınız ve saklama süreleri tam metinde."
        ),
        "p_gonder": "Pilot talebini gönder",
        "p_arac": (
            "Bir moda markası adına Kabin beden önerisi pilotu için talep gönderir. Kişinin kendi ad, şirket ve iş "
            "e-posta bilgisiyle ve KVKK aydınlatma metnini okuduğunu onaylamasıyla kullanılmalıdır."
        ),
        "p_kapali_baslik": "PİLOT TALEBİ",
        "p_kapali_metin": (
            "Markanızı, ürün kategorinizi ve pilotta çözmek istediğiniz sorunu kısaca yazın. Ticari sır, müşteri "
            "verisi ya da başka kişilere ait kişisel veri eklemeyin. Kişisel verileriniz "
        ),
        "p_kapali_link_son": "’ne göre işlenir.",
        # Beta listesi
        "b_dugme": "Beta’ya katıl",
        "b_baslik_ust": "BETA LİSTESİ",
        "b_kapat": "Kapat",
        "b_baslik": "İlk deneyenlerden <em>ol.</em>",
        "b_giris": "Kapalı beta açıldığında sana e-postayla davet gönderelim. Başka bir ileti göndermeyiz.",
        "b_ad": "Adın",
        "b_eposta": "E-posta adresin",
        "b_platform": "Telefonun",
        "b_sec": "Seç",
        "b_diger": "Diğer",
        "b_ozet": (
            "Adını, e-postanı ve telefon türünü, beta açıldığında sana davet göndermek için; geldiğin tanıtım "
            "kanalını da yalnız sayısal olarak ölçmek için Kabin kurucu ortakları (müşterek veri sorumlusu) işler. "
            "Veriler barındırma sağlayıcımızın yurt dışındaki (AB) veri merkezinde tutulur, kimseyle paylaşılmaz; "
            "bülten ya da kampanya gönderilmez. Hukuki sebepler, haklarınız ve saklama süresi tam metinde."
        ),
        "b_yas": "18 yaşından büyüğüm.",
        "b_gonder": "Listeye katıl",
    },
    "en": {
        "og_locale": "en_US",
        "skip": "Skip to content",
        "nav_aria": "Main menu",
        "brand_aria": "Kabin home page",
        "menu_aria": "Open menu",
        "menu": "Menu ☰",
        "cta_href": "/en/index.html#contact",
        "cta": "Contact",
        "home": "/en/index.html",
        "dil_grup": "Dil / Language",
        "dil_tr": "TR, Türkçe",
        "dil_en": "EN, English",
        "alt_telif": "© 2026 {kisa_ad} · Data controllers: {unvan} · {eposta_link}",
        "alt_tahmin": "Measurements from photos and size recommendations are estimates, not a guarantee of fit.",
        "alt_yasal_not": "Our legal texts are available in Turkish only; the Turkish version is the governing one.",
        "aydinlatma_ad": "KVKK Information Notice",
        "aydinlatma_on": "I have read the ",
        "aydinlatma_son": " (in Turkish) and understand that my information will be processed for the purposes set out in it.",
        "hp": "Your website",
        "p_ad": "Full name",
        "p_sirket": "Brand / company",
        "p_eposta": "Work email address",
        "p_kategori": "Your product category",
        "p_sec": "Select",
        "p_kadin": "Womenswear", "p_erkek": "Menswear", "p_unisex": "Unisex / basics",
        "p_spor": "Sportswear", "p_diger": "Other",
        "p_mesaj": "What would you like to solve in your pilot?",
        "opt": "(optional)",
        "p_mesaj_not": (
            "Don’t include trade secrets, customer data or anyone else’s personal data. Up to 1000 characters."
        ),
        "p_ozet": (
            "The Kabin co-founders (joint data controllers) process this information to assess your pilot request and "
            "get back to you. The legal basis is the establishment of a contract if you apply on your own behalf "
            "(KVKK Art. 5/2-c), and legitimate interest if you apply on behalf of an organization (Art. 5/2-f). The "
            "data is stored in our hosting provider’s data center abroad, is not shared with anyone else and is not "
            "used for marketing. The basis for the transfer abroad, your rights and the retention periods are set "
            "out in the full notice (in Turkish)."
        ),
        "p_gonder": "Send pilot request",
        "p_arac": (
            "Sends a request for a Kabin size recommendation pilot on behalf of a fashion brand. Use only with the "
            "person’s own name, company and work email, and with their confirmation that they have read the KVKK "
            "information notice."
        ),
        "p_kapali_baslik": "PILOT REQUEST",
        "p_kapali_metin": (
            "Briefly tell us about your brand, your product category and the problem you want to solve in the "
            "pilot. Don’t include trade secrets, customer data or anyone else’s personal data. Your personal data "
            "is processed in line with the "
        ),
        "p_kapali_link_son": " (in Turkish).",
        "b_dugme": "Join the beta",
        "b_baslik_ust": "BETA LIST",
        "b_kapat": "Close",
        "b_baslik": "Be among the first <em>to try it.</em>",
        "b_giris": "We’ll email you an invitation when the closed beta opens. We won’t send you anything else.",
        "b_ad": "Your name",
        "b_eposta": "Your email address",
        "b_platform": "Your phone",
        "b_sec": "Select",
        "b_diger": "Other",
        "b_ozet": (
            "The Kabin co-founders (joint data controllers) process your name, email and phone type to send you an "
            "invitation when the beta opens, and the promotional channel you came from only to count it in "
            "aggregate. The data is stored in our hosting provider’s data center abroad (EU) and is not shared with "
            "anyone; no newsletters or promotions are sent. The legal bases, your rights and the retention period "
            "are set out in the full notice (in Turkish)."
        ),
        "b_yas": "I am over 18.",
        "b_gonder": "Join the list",
    },
}


def metin(dil: str) -> dict[str, str]:
    if dil not in METIN:
        raise ValueError(f"bilinmeyen dil: {dil}")
    return METIN[dil]
