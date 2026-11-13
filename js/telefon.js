/* Kabin web · telefon çerçevesindeki ekranlar. Görünen metin js/dil.js üzerinden sayfa diline çevrilir (KDIL; Türkçe sayfada aynen kalır).
    palet-pastel/d/js/ekran-uygulama.js'ten alındı (yalnız görsel yolları değişti).
   Yön D · uygulama ekran parçaları: karşılama, Ana, cevap kartı, ret kartı, Dolap. İçerik ve akış uygulama-taslak'tan ve apps/mobile metinlerinden.
   Görseller: dolap = kullanıcının çektiği fotoğraf (foto/ham, arka plan silme kapalı); ürün = mağaza görseli yerine geçen foto/kesim. */
(function (kok) {
  'use strict';
  var KOK = '/gorsel/';
  var C = kok.KCIZIM, L = kok.KDIL || function (s) { return s; };
  if (!L.html) L.html = function (s) { return s; };
  var IK = {
    ara: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    geri: '<path d="M15 5.5L8.5 12l6.5 6.5"/>',
    ileri: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    ev: '<path d="M4.5 10.5L12 4.5l7.5 6V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"/><path d="M10 20v-5h4v5"/>',
    aski: '<path d="M12 7.5a2 2 0 1 1 2-2c0 1.2-2 1.6-2 3v1L3.8 15.6a1.3 1.3 0 0 0 .8 2.4h14.8a1.3 1.3 0 0 0 .8-2.4L12 9.5"/>',
    sosyal: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    ben: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    mezura: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v2"/>',
    tik: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arti: '<path d="M12 5v14M5 12h14"/>',
    suzgec: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    disari: '<path d="M13.5 4.5H19.5V10.5M19.5 4.5L11 13M17 14v5.5H4.5V7H10"/>',
    kalp: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>'
  };
  function i(ad, sinif) {
    return '<svg class="ik ' + (sinif || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IK[ad] + '</svg>';
  }
  function ham(id, ad) { return '<img src="' + KOK + 'ham/' + id + '.jpg" alt="' + L(ad) + L(', kullanıcının çektiği fotoğraf') + '" loading="lazy" decoding="async">'; }
  function kesim(id, ad) { return '<img class="urun-gorsel" src="' + KOK + 'kesim/' + id + '.webp" alt="' + L(ad) + L(', mağaza görseli') + '" loading="lazy" decoding="async">'; }
  function marka() { return '<span class="marka"><img src="/assets/kabin-mark.svg" alt="">Kabin</span>'; }
  function tel(ic, sinif) { return L.html('<div class="tel ' + (sinif || '') + '"><div class="tel-govde">' + ic + '</div></div>'); }

  function sekmeler(sec) {
    var S = [['ev', 'Ana'], ['aski', 'Dolap'], ['sosyal', 'Sosyal'], ['ben', 'Profil']];
    return '<nav class="sekme" aria-label="Sekmeler">' + S.map(function (s) {
      var on = s[1] === sec;
      return '<span class="sekme-o' + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : ' aria-label="' + s[1] + '"') + '>' + i(s[0]) + (on ? '<b>' + s[1] + '</b>' : '') + '</span>';
    }).join('') + '</nav>';
  }
  function ustCubuk(baslik) {
    return '<div class="ust"><span class="yuvarlak" aria-label="Geri">' + i('geri') + '</span><p class="ust-baslik">' + baslik + '</p><span class="yuvarlak bos" aria-hidden="true"></span></div>';
  }

  /* dar · tam · bol çubuğu: seçili bölüm = pastel dolgu (süs) + 2 px mürekkep çerçeve + kalın etiket + desen. Renk tek başına anlam taşımaz. */
  function bolge(ad, durum, soz) {
    return '<div class="bolge" role="img" aria-label="' + L(ad) + ': ' + L(durum) + (soz ? '. ' + L(soz) : '') + '"><span class="bolge-ad">' + L(ad) + '</span>' +
      '<span class="bolge-iz" aria-hidden="true">' + ['dar', 'tam', 'bol'].map(function (z) {
        return '<span class="' + (z === durum ? 'on z-' + z : '') + '">' + L(z) + '</span>';
      }).join('') + '</span>' + (soz ? '<p class="bolge-soz">' + L(soz) + '</p>' : '') + '</div>';
  }
  function bedenler(sec, alt) {
    return '<div class="bedenler" role="group" aria-label="Bedenler">' + ['XS', 'S', 'M', 'L', 'XL'].map(function (b) {
      return '<span class="beden' + (b === sec ? ' on' : '') + (b === alt ? ' alt' : '') + '">' + b + '</span>';
    }).join('') + '</div>';
  }

  function karsilama() {
    return tel(
      '<div class="ust"><span class="yuvarlak duz" aria-label="Geri">' + i('geri') + '</span><span class="metin-btn">Atla</span></div>' +
      '<div class="k-cizim">' + C.buyuk('c-buyuk') + '</div>' +
      '<div class="noktalar" aria-label="1 / 3"><span class="on"></span><span></span><span></span></div>' +
      '<div class="k-metin"><p class="serif-1">Ölçülerinizi bir kez alın</p><p class="ikincil">Mezurayla ya da iki fotoğrafla. Fotoğraf saklanmaz.</p></div>' +
      '<span class="ileri" aria-label="İleri"><svg class="ileri-halka" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="35"/></svg><span class="ileri-ic">' + i('ileri') + '</span></span>',
      'tel-karsilama');
  }

  function vitrinAlt() { return '<div class="vitrin-alt"><span class="veri"><b>Bugün</b> · 3 parça</span><span class="hap hap-1 hap-k">Kombin öner</span></div>'; }
  /* vitrin: 'foto' = üç fotoğraflı ızgara (bugünkü); 'aski' = askı şeridi, kesim (js/aski-serit.js); 'aski-foto' = kesim kapalıyken düşülen hâl */
  function vitrin(mod) {
    if (mod === 'aski') return '<article class="vitrin vitrin-aski" aria-label="Vitrin">' + kok.KASKI.serit('kesim') + vitrinAlt() + '</article>';
    if (mod === 'aski-foto') return '<article class="vitrin vitrin-aski vitrin-kart" aria-label="Vitrin">' + kok.KASKI.serit('foto') + vitrinAlt() + '</article>';
    return '<article class="vitrin">' +
      '<div class="vitrin-izgara"><span class="foto f-buyuk">' + ham('p4', 'Lacivert ceket') + '</span><span class="foto">' + ham('p1', 'Keten gömlek') + '</span><span class="foto">' + ham('p9', 'Kahve chino') + '</span></div>' +
      vitrinAlt() + '</article>';
  }

  function ana(mod) {
    return tel(
      (mod === 'aski' ? '' : C.aski()) + /* şeritte askı zaten var: köşe motifi tekrar etmesin */
      '<div class="ust ust-ana">' + marka() + '<span class="yuvarlak" aria-label="Ara">' + i('ara') + '</span></div>' +
      '<div class="ana-bas"><p class="ikincil">İstanbul 10° · parçalı bulutlu</p><p class="serif-1">Bugün ne giysem?</p></div>' +
      vitrin(mod) +
      '<div class="ikili">' +
        '<a class="kutu"><span class="kutu-ik">' + i('ara') + '</span><b>Beden bul</b></a>' +
        '<a class="kutu"><span class="kutu-ik">' + i('mezura') + '</span><b>Ölçülerim</b><span class="veri">31 Ekim · 3 ölçü</span></a>' +
      '</div>' +
      '<a class="satir-kart"><span class="mini-ikili"><span class="foto">' + ham('p3', 'Örgü kazak') + '</span><span class="foto">' + ham('p12', 'Bordo kazak') + '</span></span>' +
        '<span class="esne"><b>Mert soruyor: Hangisi?</b><span class="veri">dün · 2 kişi</span></span>' + i('ileri', 'ok') + '</a>' +
      sekmeler('Ana'),
      'tel-sekmeli');
  }

  function cevap() {
    return tel(
      ustCubuk('Beden') +
      '<div class="urun-kutu">' + C.mezura() + kesim('p1', 'Keten gömlek') + '</div>' +
      '<div class="urun-ad"><p class="baslik-2">Keten gömlek</p><p class="ikincil">Örnek Mağaza · üst giyim</p></div>' +
      '<section class="kart cevap" aria-label="Beden önerisi">' +
        bedenler('M', 'L') +
        '<p class="oneri"><span>Önerimiz</span><b class="oneri-harf">M</b></p>' +
        '<p class="govde">Göğüste tam oturur, belde rahat kalır.</p>' +
        '<p class="guven"><span class="rozet r-butter">Emin</span><span class="veri">Mezura · ürüne özel tablo · onaylı</span></p>' +
      '</section>' +
      '<section class="kart" aria-label="M bedenin uyumu"><h2 class="baslik-3">M bedenin uyumu</h2>' +
        bolge('Omuz', 'tam') + bolge('Göğüs', 'tam') + bolge('Bel', 'bol', 'M’nin beli ölçünüzden 4 cm geniş.') +
      '</section>' +
      '<section class="kart arasi" aria-label="M ile L arasında"><h2 class="baslik-3">M ile L arasında</h2>' +
        '<p class="arasi-satir"><b class="rozet r-murekkep">M</b><span>Göğüste tam, belde biraz bol.</span></p>' +
        '<p class="arasi-satir"><b class="rozet r-bos">L</b><span>Göğüste bol, belde bol.</span></p>' +
        '<p class="ikincil">Bu kalıpta genelde hangisini alırsınız? Öneri değişmez.</p>' +
        '<div class="ikili-btn"><span class="hap hap-2">Bir küçük alırım</span><span class="hap hap-2">Bir büyük alırım</span></div>' +
      '</section>' +
      '<span class="hap hap-1 hap-genis">' + i('disari') + 'Mağazaya dön</span>' +
      '<p class="ikincil orta">Öneri tahmindir, garanti değildir.</p>');
  }

  function ret() {
    return tel(
      ustCubuk('Beden') +
      '<div class="urun-satir"><span class="urun-mini">' + kesim('p8', 'Taş rengi etek') + '</span><span class="esne"><b>Taş rengi etek</b><span class="veri">Örnek Mağaza · alt giyim</span></span></div>' +
      '<section class="kart ret" aria-label="Uygun beden yok">' +
        '<p class="serif-2">Bu üründe tam uyan beden yok.</p>' +
        '<p class="govde">En yakını <b>L</b>: belde tam, basende dar.</p>' +
        '<p class="ikincil">Bu bir öneri değil. L bedenini seçerseniz bunu bilerek seçersiniz.</p>' +
      '</section>' +
      '<section class="kart" aria-label="L bedenin uyumu"><h2 class="baslik-3">L bedenin uyumu</h2>' +
        bolge('Bel', 'tam') + bolge('Basen', 'dar', 'Basen çevreniz L aralığının 3 cm üstünde.') +
      '</section>' +
      '<span class="hap hap-1 hap-genis">Başka ürüne bak</span>' +
      '<span class="hap hap-2 hap-genis hap-kart">Ölçülerimi kontrol et</span>');
  }

  function dolap() {
    var P = [['p3', 'Örgü kazak', 1], ['p1', 'Keten gömlek'], ['p9', 'Kahve chino'], ['p7', 'Açık mavi gömlek'], ['p8', 'Taş rengi etek'], ['p12', 'Bordo kazak']];
    return tel(
      C.kumas() +
      '<div class="ust ust-dolap"><div><p class="serif-1">Dolap</p><p class="ikincil">14 parça</p></div><span class="yuvarlak murekkep" aria-label="Parça ekle">' + i('arti') + '</span></div>' +
      '<div class="arama"><span class="arama-alan">' + i('ara') + '<span>Dolabında ara</span></span><span class="yuvarlak" aria-label="Süz">' + i('suzgec') + '</span></div>' +
      '<div class="cipler" role="group" aria-label="Tür"><span class="cip on">Hepsi</span><span class="cip">Üst</span><span class="cip">Alt</span><span class="cip">Elbise</span><span class="cip">Dış giyim</span><span class="cip">Çanta</span></div>' +
      '<div class="izgara">' + P.map(function (p) {
        return '<figure class="parca' + (p[2] ? ' secili' : '') + '"><span class="foto">' + ham(p[0], p[1]) + (p[2] ? '<span class="secim" aria-label="Seçili">' + i('tik') + '</span>' : '') + '</span><figcaption>' + p[1] + '</figcaption></figure>';
      }).join('') + '</div>' +
      '<div class="secim-cubuk"><span class="veri-acik">1 seçili</span><span class="hap hap-ters hap-k">Kombin kur</span></div>' +
      sekmeler('Dolap'),
      'tel-sekmeli');
  }

  kok.KEKRAN_D = { karsilama: karsilama, ana: ana, vitrin: vitrin, cevap: cevap, ret: ret, dolap: dolap, bolge: bolge, bedenler: bedenler, i: i, tel: tel, ustCubuk: ustCubuk, kesim: kesim };
})(this);
