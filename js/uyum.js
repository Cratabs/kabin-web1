/* Kabin web · dar · tam · bol bölümü. Beden (S/M/L) ve bölge (omuz/göğüs/bel) seçilir; çubuklar, cümle ve 3B mezura birlikte değişir.
   Veri örnektir (keten gömlek); uygulamanın uyum haritasıyla aynı: M = tam / tam / bol. Renk tek başına anlam taşımaz: etiket + çerçeve + desen. */
(function (kok) {
  'use strict';
  var BOLGE = [{ ad: 'Omuz', kod: 'omuz' }, { ad: 'Göğüs', kod: 'gogus' }, { ad: 'Bel', kod: 'bel' }];
  var VERI = {
    S: { uyum: ['dar', 'dar', 'tam'], soz: 'S omuzda ve göğüste dar kalır.' },
    M: { uyum: ['tam', 'tam', 'bol'], soz: 'Göğüste tam oturur, belde rahat kalır.' },
    L: { uyum: ['bol', 'bol', 'bol'], soz: 'L her yerde bol durur.' }
  };
  var ONERI = 'M';
  var L = kok.KDIL || function (s) { return s; };

  function kur(el, sahne) {
    var beden = ONERI, bolge = 1;
    var html =
      '<div class="kart">' +
        '<p class="oneri"><span>Önerimiz</span><b class="oneri-harf">' + ONERI + '</b></p>' +
        '<div class="bedenler" role="group" aria-label="Beden seçin">' + Object.keys(VERI).map(function (b) {
          return '<button type="button" class="beden' + (b === ONERI ? ' oner' : '') + '" data-beden="' + b + '" aria-pressed="false">' + b + '</button>';
        }).join('') + '</div>' +
        '<p class="govde uyum-soz" aria-live="polite"></p>' +
        BOLGE.map(function (b, i) {
          return '<button type="button" class="bolge" data-bolge-i="' + i + '" aria-pressed="false"><span class="bolge-ad">' + b.ad + '</span>' +
            '<span class="bolge-iz" aria-hidden="true"><span>dar</span><span>tam</span><span>bol</span></span><span class="gizli"></span></button>';
        }).join('') +
        '<p class="uyum-ipucu">Omuza, göğse ya da bele basın. Mezura oraya gider.</p>' +
      '</div>';
    el.innerHTML = L.html ? L.html(html) : html;
    var soz = el.querySelector('.uyum-soz');

    function ciz() {
      var v = VERI[beden];
      [].forEach.call(el.querySelectorAll('[data-beden]'), function (b) {
        var on = b.getAttribute('data-beden') === beden;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      soz.textContent = L(v.soz);
      [].forEach.call(el.querySelectorAll('[data-bolge-i]'), function (b, i) {
        var u = v.uyum[i];
        b.setAttribute('aria-pressed', String(i === bolge));
        b.querySelector('.gizli').textContent = ': ' + L(u);
        [].forEach.call(b.querySelectorAll('.bolge-iz > span'), function (s) {
          s.className = s.textContent === L(u) ? 'on z-' + u : '';
        });
      });
      if (sahne) sahne.ayarla({ bolge: BOLGE[bolge].kod, uyum: v.uyum[bolge] });
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-beden]'), g = e.target.closest('[data-bolge-i]');
      if (b) beden = b.getAttribute('data-beden');
      if (g) bolge = +g.getAttribute('data-bolge-i');
      if (b || g) ciz();
    });
    ciz();
    /* 3B sahne sonradan yüklenir: gelince bağlanır ve o anki seçime oturur */
    return { bagla: function (s) { sahne = s; ciz(); } };
  }

  kok.KUYUM = { kur: kur };
})(this);
