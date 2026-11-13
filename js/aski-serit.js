/* Yön D · Ana vitrini için askı şeridi. Parçalar sabit bir çubuğa kendi küçük askılarıyla asılır; şerit yatay kaydırılır
   (dokunma, fare sürükleme, ok tuşları), scroll-snap ile ortaya oturur. Ortadaki öne çıkar, kenardakiler küçülür ve solar.
   Boşta yalnız ±1° askı salınımı (css/aski.css); otomatik kayma yok. Davranış referansı: apps/mobile/src/features/studio/hanger-carousel.tsx.
   tur = 'kesim' (arka planı silinmiş, şeffaf; ton yüzeyinde kutusuz) | 'foto' (KABIN_CUTOUT_ENABLED kapalı: ham fotoğraf, yuvarlak ton kutusu). */
(function (kok) {
  'use strict';
  var KOK = '/gorsel/';
  var L = kok.KDIL || function (s) { return s; };
  /* ust / boy: kesimin şeffaf payı atılmış giysi kutusunun üst kenarı ve yüksekliği (640 px görselin oranı olarak; tarayıcıda alfa kanalından ölçüldü).
     Giysinin omzu askı çubuğunun hemen altına gelsin diye görsel bu oranla yukarı kaydırılır. k: uzun parçalar (pantolon, elbise) biraz küçük çizilir ki
     kısa bir üst ortadayken altta büyük boşluk kalmasın. p13 (askılıkta çekilmiş, kesimde askı kalıyor) bilerek yok. */
  var P = [
    { id: 'p4', ad: 'Lacivert ceket', ust: 0.138, boy: 0.723 },
    { id: 'p1', ad: 'Keten gömlek', ust: 0.227, boy: 0.544 },
    { id: 'p9', k: 100, ad: 'Kahve chino', ust: 0.081, boy: 0.836 },
    { id: 'p3', ad: 'Örgü kazak', ust: 0.191, boy: 0.616 },
    { id: 'p5', k: 100, ad: 'Kiremit elbise', ust: 0.081, boy: 0.836 },
    { id: 'p15', ad: 'Haki ceket', ust: 0.194, boy: 0.609 },
    { id: 'p14', k: 100, ad: 'Siyah elbise', ust: 0.081, boy: 0.836 },
    { id: 'p12', ad: 'Bordo kazak', ust: 0.195, boy: 0.608 }
  ];
  var BAS = 1; /* açılışta ortadaki parça: soldan da bir komşu görünsün */

  function askiSvg() {
    return '<svg class="aski-cizim" viewBox="0 0 64 30" width="64" height="30" fill="none" aria-hidden="true" focusable="false">' +
      '<path d="M32 12V8a4 4 0 1 0-4-4"/><path d="M32 12L5 27h54z"/></svg>';
  }
  function gorsel(p, tur) {
    if (tur === 'foto') return '<span class="aski-kutu"><img src="' + KOK + 'ham/' + p.id + '.jpg" alt="" loading="lazy" decoding="async" draggable="false"></span>';
    return '<img class="aski-kesim" src="' + KOK + 'kesim/' + p.id + '.webp" alt="" loading="lazy" decoding="async" draggable="false">';
  }

  function serit(tur, etiket) {
    tur = tur || 'kesim';
    return '<div class="aski-serit aski-t-' + tur + '" data-aski>' +
      '<span class="aski-cubuk" aria-hidden="true"></span>' +
      '<ul class="aski-liste" aria-label="' + L(etiket || 'Dolabındaki parçalar') + '">' + P.map(function (p, i) {
        return '<li class="aski-o' + (i === BAS ? ' orta' : '') + '" data-i="' + i + '" data-ust="' + p.ust + '" data-boy="' + p.boy + '"' + (p.k ? ' data-k="' + p.k + '"' : '') + '>' +
          '<button type="button" class="aski-btn" tabindex="' + (i === BAS ? 0 : -1) + '" aria-label="' + L(p.ad) + '">' +
          '<span class="aski-olcek"><span class="aski-sallan">' + askiSvg() + gorsel(p, tur) + '</span><span class="aski-golge" aria-hidden="true"></span></span>' +
          '</button></li>';
      }).join('') + '</ul>' +
      /* ad, görenler için; ekran okuyucu adı odaklanan düğmeden alır (iki kez okunmasın diye aria-hidden) */
      '<p class="aski-ad" aria-hidden="true">' + L(P[BAS].ad) + '</p>' +
      '</div>';
  }

  function hareketYok() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('hareket-kapali');
  }

  function bagla(el) {
    var ul = el.querySelector('.aski-liste'), ad = el.querySelector('.aski-ad');
    var li = [].slice.call(ul.children), orta = -1, raf = 0, bas = null, surukledi = false, birak = 0;
    /* yerleşim değişkenleri CSSOM ile verilir (CSP: HTML'de style özniteliği yok) */
    li.forEach(function (o) {
      var s = o.style, v = o.dataset;
      s.setProperty('--i', v.i); s.setProperty('--ust', v.ust); s.setProperty('--boy', v.boy);
      if (v.k) s.setProperty('--k', v.k + 'px');
    });

    function merkez(i) { var o = li[i]; return o.offsetLeft + o.offsetWidth / 2 - ul.clientWidth / 2; }
    function git(i, yumusak) {
      i = Math.max(0, Math.min(li.length - 1, i));
      ul.scrollTo({ left: merkez(i), behavior: yumusak && !hareketYok() ? 'smooth' : 'auto' });
      return i;
    }
    function guncelle() {
      raf = 0;
      var c = ul.scrollLeft + ul.clientWidth / 2, en = 0, enD = 1e9;
      li.forEach(function (o, i) {
        var d = Math.abs(o.offsetLeft + o.offsetWidth / 2 - c) / o.offsetWidth;
        o.style.setProperty('--d', Math.min(d, 2).toFixed(3));
        if (d < enD) { enD = d; en = i; }
      });
      if (en === orta) return;
      orta = en;
      li.forEach(function (o, i) {
        o.classList.toggle('orta', i === en);
        o.firstChild.tabIndex = i === en ? 0 : -1; /* tek sekme durağı; içinde ok tuşları */
      });
      ad.textContent = L(P[en].ad);
    }
    function sira(hedef) { var b = hedef.closest && hedef.closest('.aski-btn'); return b ? li.indexOf(b.parentNode) : -1; }

    ul.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(guncelle); }, { passive: true });
    ul.addEventListener('keydown', function (e) {
      var adim = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      var i = e.key === 'Home' ? 0 : e.key === 'End' ? li.length - 1 : adim ? Math.max(0, sira(e.target)) + adim : null;
      if (i === null) return;
      e.preventDefault();
      i = git(i, true);
      li[i].firstChild.focus({ preventScroll: true });
    });
    ul.addEventListener('focusin', function (e) { var i = sira(e.target); if (i >= 0 && i !== orta) git(i, true); });
    ul.addEventListener('click', function (e) {
      if (surukledi) { e.preventDefault(); return; }
      var i = sira(e.target);
      if (i >= 0 && i !== orta) git(i, true); /* yandaki parçaya dokunmak onu ortaya getirir; ortadaki uygulamada parçayı açar */
    });

    /* fare: tut-sürükle (dokunma ve dokunmatik yüzey zaten yerel kaydırır) */
    ul.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      bas = { x: e.clientX, s: ul.scrollLeft, id: e.pointerId };
      surukledi = false;
    });
    ul.addEventListener('pointermove', function (e) {
      if (!bas) return;
      var dx = e.clientX - bas.x;
      if (!surukledi && Math.abs(dx) > 4) {
        surukledi = true;
        clearTimeout(birak);
        el.classList.add('surukle');
        ul.setPointerCapture(bas.id);
      }
      if (surukledi) ul.scrollLeft = bas.s - dx;
    });
    function bitir() {
      if (!bas) return;
      bas = null;
      if (!surukledi) return;
      git(orta, true);
      birak = setTimeout(function () { el.classList.remove('surukle'); surukledi = false; }, hareketYok() ? 0 : 420);
    }
    ul.addEventListener('pointerup', bitir);
    ul.addEventListener('pointercancel', bitir);

    ul.scrollLeft = merkez(BAS);
    guncelle();
  }

  function hepsi(kokEl) { (kokEl || document).querySelectorAll('[data-aski]').forEach(bagla); }

  kok.KASKI = { P: P, serit: serit, bagla: bagla, hepsi: hepsi };
})(this);
