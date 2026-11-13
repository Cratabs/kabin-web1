"""Şablonun dile bağlı metinleri: tek sözlük, iki dil (tr, en).

sablon.py yalnız bu sözlükten okur; metin eklerken iki dili birlikte güncelleyin.
Türkçe değerler onaylı metin listesinden, İngilizce değerler onaylı İngilizce listeden gelir. Aydınlatma özetleri
(b_ozet, p_ozet), pilot formunun onay cümlesi ve kapalı form notu hukuk incelemesinden geçmiş metinlerdir: değiştirmeyin.
İngilizce sayfalardaki yasal bağlantılar Türkçe /yasal/ metinlerine gider (yasal metin çevirisi yok).
"""
from __future__ import annotations

DILLER = ("tr", "en")

# Üst menü: (anahtar, adres, etiket). Anahtar etkin menüyü (aria-current) belirler.
NAV: dict[str, list[tuple[str, str, str]]] = {
    "tr": [
        ("nasil", "/#nasil", "Nasıl çalışır"),
        ("uyum", "/#uyum", "Nasıl olur"),
        ("dolap", "/#dolap", "Dolap"),
        ("markalar", "/markalar.html", "Markalar için"),
    ],
    "en": [
        ("nasil", "/en/#how-it-works", "How it works"),
        ("uyum", "/en/#fit", "How it fits"),
        ("dolap", "/en/#wardrobe", "Wardrobe"),
        ("markalar", "/en/brands.html", "For brands"),
    ],
}

# Alt bilgi bağlantıları: (adres, etiket, yasal mı, çıktı yolu). Yasal bağlantılar İngilizce sayfada hreflang="tr" alır;
# çıktı yolu o anki sayfayı (aria-current="page") işaretlemek içindir.
ALT_LINKLER: dict[str, list[tuple[str, str, bool, str]]] = {
    "tr": [
        ("/", "Ana sayfa", False, "index.html"), ("/hakkinda.html", "Hakkında", False, "hakkinda.html"),
        ("/sorular.html", "Sorular", False, "sorular.html"), ("/iletisim.html", "İletişim", False, "iletisim.html"),
        ("/markalar.html", "Markalar için", False, "markalar.html"),
        ("/yasal/gizlilik.html", "Gizlilik", True, "yasal/gizlilik.html"),
        ("/yasal/kvkk-aydinlatma.html", "KVKK", True, "yasal/kvkk-aydinlatma.html"),
        ("/yasal/kullanim-kosullari.html", "Kullanım koşulları", True, "yasal/kullanim-kosullari.html"),
        ("/yasal/", "Tüm yasal metinler", True, "yasal/index.html"),
    ],
    "en": [
        ("/en/", "Home", False, "en/index.html"), ("/en/about.html", "About", False, "en/about.html"),
        ("/en/questions.html", "Questions", False, "en/questions.html"),
        ("/en/contact.html", "Contact", False, "en/contact.html"),
        ("/en/brands.html", "For brands", False, "en/brands.html"),
        ("/yasal/gizlilik.html", "Privacy", True, ""), ("/yasal/kvkk-aydinlatma.html", "KVKK notice", True, ""),
        ("/yasal/kullanim-kosullari.html", "Terms of use", True, ""), ("/yasal/", "All legal texts", True, ""),
    ],
}

METIN: dict[str, dict[str, str]] = {
    "tr": {
        "og_locale": "tr_TR",
        "og_locale_diger": "en_US",
        # Üst bilgi
        "skip": "İçeriğe geç",
        "nav_aria": "Site",
        "brand_aria": "Kabin, ana sayfa",
        "menu_aria": "Menü",
        "home": "/",
        "davet_href": "/#davet",
        "davet": "Davet isteyin",
        "pilot_dugme": "Pilot için yazın",
        # Dil değiştirici (her iki dilde aynı grup adı; bağlantı adları kendi dilinde)
        "dil_grup": "Dil / Language",
        "dil_tr": "TR, Türkçe",
        "dil_en": "EN, English",
        # Alt bilgi
        "alt_aria": "Alt bağlantılar",
        "alt_eposta_id": "iletisim",
        "alt_yasal_not": "",
        "icindekiler": "İçindekiler",
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
        # Davet (beta bekleme) listesi
        "b_ad": "Adınız",
        "b_eposta": "E-posta",
        "b_platform": "Hangi telefon?",
        "b_sec": "Seçin",
        "b_diger": "Diğer",
        "b_aydinlatma_on": "",
        "b_aydinlatma_son": "’ni okudum.",
        "b_ozet": (
            "Adını, e-postanı ve telefon türünü, beta açıldığında sana davet göndermek için; geldiğin tanıtım "
            "kanalını da yalnız sayısal olarak ölçmek için Kabin kurucu ortakları (müşterek veri sorumlusu) işler. "
            "Veriler barındırma sağlayıcımızın yurt dışındaki (AB) veri merkezinde tutulur, kimseyle paylaşılmaz; "
            "bülten ya da kampanya gönderilmez. Hukuki sebepler, haklarınız ve saklama süresi tam metinde."
        ),
        "b_yas": "18 yaşından büyüğüm.",
        "b_gonder": "Davet isteyin",
    },
    "en": {
        "og_locale": "en_US",
        "og_locale_diger": "tr_TR",
        "skip": "Skip to content",
        "nav_aria": "Site",
        "brand_aria": "Kabin, home",
        "menu_aria": "Menu",
        "home": "/en/",
        "davet_href": "/en/#invite",
        "davet": "Request an invite",
        "pilot_dugme": "Ask about a pilot",
        "dil_grup": "Dil / Language",
        "dil_tr": "TR, Türkçe",
        "dil_en": "EN, English",
        "alt_aria": "Footer links",
        "alt_eposta_id": "contact",
        "alt_yasal_not": "Our legal texts are available in Turkish only; the Turkish version is the governing one.",
        "icindekiler": "Contents",
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
        "b_ad": "Your name",
        "b_eposta": "Email",
        "b_platform": "Which phone?",
        "b_sec": "Select",
        "b_diger": "Other",
        "b_aydinlatma_on": "I’ve read the ",
        "b_aydinlatma_son": " (in Turkish).",
        "b_ozet": (
            "The Kabin co-founders (joint data controllers) process your name, email and phone type to send you an "
            "invitation when the beta opens, and the promotional channel you came from only to count it in "
            "aggregate. The data is stored in our hosting provider’s data center abroad (EU) and is not shared with "
            "anyone; no newsletters or promotions are sent. The legal bases, your rights and the retention period "
            "are set out in the full notice (in Turkish)."
        ),
        "b_yas": "I’m over 18.",
        "b_gonder": "Request an invite",
    },
}


def metin(dil: str) -> dict[str, str]:
    if dil not in METIN:
        raise ValueError(f"bilinmeyen dil: {dil}")
    return METIN[dil]
