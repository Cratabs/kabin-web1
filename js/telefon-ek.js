/* Kabin web · "nasıl çalışır" adımlarının iki ekranı: mezura girişi ve bağlantı yapıştırma. Yön D parçalarıyla (palet-pastel/d/js/ekran-ek.js çizimleri).
   Tanıtım amaçlı durağan ekranlardır: giriş alanı yerine dolu / boş hap gösterilir. */
(function (kok) {
  'use strict';
  var E = kok.KEKRAN_D;
  var GOMLEK = 'M22 10L13 14L7 24L13 27L16 23V48H40V23L43 27L49 24L43 14L34 10C33 13 31 15 28 15C25 15 23 13 22 10Z';
  var PANTOLON = 'M17 8H39L42 48H31L28 22L25 48H14Z';
  var CIZIM = { gogus: [GOMLEK, 'M14 27H42'], bel: [PANTOLON, 'M15 11H41'], basen: [PANTOLON, 'M13.5 19H42.5'], omuz: [GOMLEK, 'M12 12.5H44'] };

  function satir(ad, etiket, deger) {
    var c = CIZIM[ad];
    return '<div class="olcu-satir"><span class="ek-cizim-kutu"><svg class="ek-cizim" viewBox="0 0 56 56" width="56" height="56" fill="none" aria-hidden="true" focusable="false">' +
      '<path class="ek-c-giysi" d="' + c[0] + '"/><path class="ek-c-bant-kenar" d="' + c[1] + '"/><path class="ek-c-bant" d="' + c[1] + '"/></svg></span>' +
      '<b class="ek-etiket">' + etiket + '</b>' +
      '<span class="olcu-hap' + (deger ? '' : ' bos') + '">' + (deger ? '<b>' + deger + '</b><span>cm</span>' : '<span>cm</span>') + '</span></div>';
  }

  function olcu() {
    return E.tel(
      E.ustCubuk('Ölçülerim') +
      '<p class="serif-1">Mezurayla ölçün</p>' +
      '<section class="kart olcu-kart">' + satir('gogus', 'Göğüs', '96') + satir('bel', 'Bel', '81') + satir('basen', 'Basen', '') + satir('omuz', 'Omuz', '') + '</section>' +
      '<span class="hap hap-1 hap-genis">Kaydet</span>' +
      '<p class="ikincil orta">Ölçüleriniz yalnız sayı olarak saklanır.</p>' +
      '<span class="metin-btn orta-btn">Mezuram yok</span>');
  }

  function bul() {
    return E.tel(
      E.ustCubuk('Beden bul') +
      '<p class="serif-1">Hangi ürün?</p>' +
      '<div class="bul-alan"><span class="bul-giris">' + E.i('ara') + '<span>ornekmagaza.example/keten-gomlek</span></span></div>' +
      '<span class="hap hap-1 hap-genis">Bedenimi göster</span>' +
      '<p class="ikincil">Mağazadaki ürün sayfasının bağlantısını yapıştırın.</p>' +
      '<h2 class="baslik-3 bul-baslik">Son baktıklarınız</h2>' +
      '<div class="urun-satir bul-satir"><span class="urun-mini">' + E.kesim('p4', 'Lacivert ceket') + '</span><span class="esne"><b>Lacivert ceket</b><span class="veri">Bedeniniz: M</span></span><span class="rozet r-butter">Emin</span></div>' +
      '<div class="urun-satir bul-satir"><span class="urun-mini">' + E.kesim('p9', 'Kahve chino') + '</span><span class="esne"><b>Kahve chino</b><span class="veri">Bedeniniz: 32</span></span><span class="rozet r-mist">Tahmini</span></div>');
  }

  kok.KEKRAN_EK = { olcu: olcu, bul: bul };
})(this);
