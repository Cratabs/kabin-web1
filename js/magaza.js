/* Kabin web · markalar sayfası · mağaza ürün sayfası örneği. "Bedenimi bul" Kabin panelini açar; "M’yi seç" mağazanın beden seçicisinde M'yi işaretler.
   Mağaza kısmı bilerek sade ve nötr çizildi (her mağazanın kendi görünümü olur); Kabin paneli Yön D parçalarıyla. Veri örnektir. */
(function (kok) {
  'use strict';
  function kur(el) {
    var E = kok.KEKRAN_D, L = kok.KDIL || function (s) { return s; };
    var html =
      '<div class="mg-cubuk" aria-hidden="true"><span class="mg-adres">magazaniz.com/lacivert-ceket</span></div>' +
      '<div class="mg-govde">' +
        '<div class="mg-gorsel"><img src="/gorsel/kesim/p4.webp" alt="Lacivert ceket" loading="lazy" decoding="async"></div>' +
        '<div class="mg-bilgi">' +
          '<p class="mg-ad">Lacivert ceket</p>' +
          '<div class="mg-bedenler" role="group" aria-label="Mağazanın beden seçicisi">' + ['S', 'M', 'L', 'XL'].map(function (b) {
            return '<button type="button" class="mg-beden" data-mg-beden="' + b + '" aria-pressed="false">' + b + '</button>';
          }).join('') + '</div>' +
          '<button type="button" class="mg-bul" data-mg-ac aria-expanded="true" aria-controls="mg-panel"><img src="/assets/kabin-mark.svg" alt="" width="22" height="22">Bedenimi bul</button>' +
          '<span class="mg-sepet" aria-hidden="true">Sepete ekle</span>' +
        '</div>' +
        '<div class="mg-panel d-ui" id="mg-panel" role="region" aria-label="Kabin beden aracı">' +
          '<div class="kart">' +
            '<p class="oneri"><span>Önerimiz</span><b class="oneri-harf">M</b></p>' +
            '<p class="govde">Omuzda ve göğüste tam, belde rahat.</p>' +
            E.bolge('Omuz', 'tam') + E.bolge('Göğüs', 'tam') + E.bolge('Bel', 'bol') +
            '<button type="button" class="hap hap-1 hap-genis mg-sec" data-mg-sec>M’yi seç</button>' +
            '<p class="ikincil">Örnek.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    el.innerHTML = L.html ? L.html(html) : html;
    var panel = el.querySelector('.mg-panel'), ac = el.querySelector('[data-mg-ac]');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mg-beden]');
      if (e.target.closest('[data-mg-sec]')) b = el.querySelector('[data-mg-beden="M"]');
      if (b) [].forEach.call(el.querySelectorAll('[data-mg-beden]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (e.target.closest('[data-mg-ac]')) {
        var acik = panel.hidden;
        panel.hidden = !acik;
        ac.setAttribute('aria-expanded', String(acik));
      }
    });
  }
  kok.KMAGAZA = { kur: kur };
})(this);
