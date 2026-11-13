/* Kabin web · telefon menüsü (≤ 819 px). Başta, eşzamanlı yüklenir: kök öğeye .js-menu ekler (CSS bağlantıları gizler, düğmeyi gösterir),
   sayfa okununca düğmeyi bağlar. Betik kapalıyken .js-menu yoktur: bağlantılar üst bilgide satır olarak görünür.
   Düğme: aria-expanded; Esc ve dışarı dokunma kapatır, odak düğmeye döner; bağlantıya basınca kapanır. Odak tuzağı yok. */
(function (kok) {
  'use strict';
  var d = document;
  d.documentElement.classList.remove('betiksiz'); /* betik çalışıyor (eskiden HTML'de satır içi betikti; CSP) */
  d.documentElement.classList.add('js-menu');
  function kur() {
    var ust = d.querySelector('.ust-bilgi'), dg = ust && ust.querySelector('.menu-dugme'), nav = ust && ust.querySelector('.gezin');
    if (!dg || !nav) return;
    function ac(acik, odakDon) {
      ust.classList.toggle('menu-acik', acik);
      dg.setAttribute('aria-expanded', String(acik));
      if (!acik && odakDon) dg.focus();
    }
    dg.addEventListener('click', function (e) {
      var acilacak = dg.getAttribute('aria-expanded') !== 'true';
      ac(acilacak);
      /* klavyeyle açıldıysa (detail 0) odak ilk bağlantıya geçer: Tab menüde ilerler, dil değiştiriciye ulaşır */
      if (acilacak && e.detail === 0) { var ilk = nav.querySelector('a'); if (ilk) ilk.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) ac(false); });
    d.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && dg.getAttribute('aria-expanded') === 'true') { e.preventDefault(); ac(false, true); }
    });
    d.addEventListener('pointerdown', function (e) {
      if (dg.getAttribute('aria-expanded') === 'true' && !ust.contains(e.target)) ac(false);
    });
    /* geniş ekrana geçince açık kalmasın */
    var gen = kok.matchMedia('(min-width: 820px)');
    var degis = function () { if (gen.matches) ac(false); };
    if (gen.addEventListener) gen.addEventListener('change', degis); else if (gen.addListener) gen.addListener(degis);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', kur); else kur();
})(this);
