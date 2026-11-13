/* Yön D çizimleri: ince mürekkep çizgisi + iki üç pastel leke. Elle çizildi (referans çizimlerinden kopya yok); nesne çizilir, insan figürü/yüz çizilmez.
   Hepsi aria-hidden, pointer-events yok. Hareket css/motif.css'te: yalnız transform/opacity, 9–12 sn, prefers-reduced-motion'da durur. */
(function (kok) {
  'use strict';
  var NS = 'viewBox';
  function svg(vb, w, h, ic, sinif) {
    return '<svg class="' + (sinif || '') + '" ' + NS + '="' + vb + '" width="' + w + '" height="' + h + '" fill="none" aria-hidden="true" focusable="false">' + ic + '</svg>';
  }
  /* dikiş işareti (+): referanstaki parıltı yıldızı yerine terzi dili */
  function arti(x, y, s) {
    return '<path class="c-ince" d="M' + x + ' ' + (y - s) + 'v' + 2 * s + 'M' + (x - s) + ' ' + y + 'h' + 2 * s + '"/>';
  }
  /* mezura şeridi: kalın mürekkep + biraz ince tereyağı = kenarlı şerit; üstüne çentik deseni */
  function serit(d, sinif) {
    return '<g class="' + (sinif || '') + '"><path class="c-serit-kenar" d="' + d + '"/><path class="c-serit" d="' + d + '"/><path class="c-serit-centik" d="' + d + '"/></g>';
  }

  /* Büyük çizim (karşılama, web): askıda katlanmış kumaş + kıvrılan mezura */
  function buyuk(sinif) {
    var ic =
      '<g class="c-leke c-l1"><path fill="var(--blush)" d="M46 74c10-26 44-34 66-20 20 13 18 42 2 58-17 17-48 20-64 4-10-10-9-28-4-42z"/></g>' +
      '<g class="c-leke c-l2"><path fill="var(--mist)" d="M148 92c20-14 52-8 60 16 8 25-4 56-28 64-22 8-44-8-46-30-2-19 0-40 14-50z"/></g>' +
      '<g class="c-leke c-l3"><path fill="var(--butter)" d="M40 178c8-16 34-20 48-8 13 11 8 32-8 38-18 7-48-8-40-30z"/></g>' +
      '<g class="c-esin">' +
        '<path class="c-cizgi" d="M120 58v-6c8-5 14-8 13-15-1-7-9-10-14-7-3 2-4 4-4 7"/>' +
        '<path class="c-cizgi" d="M120 58L52 98c-6 4-4 9 3 9h130c7 0 9-5 3-9L120 58z"/>' +
        '<path class="c-dolgu" d="M80 107c-3 30-9 58-5 88 13-7 25 3 37-4-1-30-3-58-5-84z"/>' +
        '<path class="c-kumas" d="M107 107c4 28 7 56 5 84 14 8 26-6 39 1-3-30-5-58-6-85z"/>' +
        '<path class="c-ince" d="M126 120c2 22 3 44 1 64M138 116c1 18 2 36 1 52"/>' +
      '</g>' +
      serit('M150 196c26 6 52-4 50-26-2-18-26-20-28-4', 'c-mezura') +
      arti(196, 52, 5) + arti(34, 136, 4) + arti(178, 218, 4);
    return svg('0 0 240 240', 240, 240, ic, 'cizim ' + (sinif || ''));
  }

  /* Köşe motifleri (küçük) */
  function aski() {
    var ic =
      '<g class="c-leke c-l1"><path fill="var(--blush)" d="M14 34c4-14 24-18 34-8 9 9 4 26-8 30-13 5-30-8-26-22z"/></g>' +
      '<g class="c-leke c-l2"><path fill="var(--mist)" d="M48 20c8-8 22-6 26 4 4 11-4 22-14 22-11 0-19-17-12-26z"/></g>' +
      '<g class="c-esin">' +
        '<path class="c-cizgi" d="M44 22v-3c4-3 7-5 6-8-1-4-5-5-8-3"/>' +
        '<path class="c-cizgi" d="M44 22L14 40c-3 2-2 4 1 4h58c3 0 4-2 1-4L44 22z"/>' +
      '</g>' + arti(76, 52, 3);
    return '<div class="motif m-aski" aria-hidden="true">' + svg('0 0 90 64', 76, 54, ic, 'cizim') + '</div>';
  }
  function mezura() {
    var ic =
      '<g class="c-leke c-l3"><path fill="var(--butter)" d="M10 26c6-14 28-16 36-4 7 11-2 26-16 26-14 0-26-10-20-22z"/></g>' +
      '<g class="c-leke c-l1"><path fill="var(--blush)" d="M50 44c6-8 18-6 21 2 3 9-5 16-13 15-8 0-13-10-8-17z"/></g>' +
      serit('M8 50c18 4 40 2 52-10 10-10 6-26-6-26-10 0-14 10-8 16', 'c-mezura c-esin') + arti(74, 16, 3);
    return '<div class="motif m-mezura" aria-hidden="true">' + svg('0 0 84 66', 84, 66, ic, 'cizim') + '</div>';
  }
  function kumas() {
    var ic =
      '<g class="c-leke c-l2"><path fill="var(--mist)" d="M58 14c12-8 30-2 32 12 2 15-12 26-26 22-14-4-18-26-6-34z"/></g>' +
      '<g class="c-leke c-l1"><path fill="var(--blush)" d="M8 36c4-10 20-12 26-4 6 9-2 20-12 20-10 0-18-8-14-16z"/></g>' +
      '<g class="c-esin">' +
        '<path class="c-kumas" d="M10 22c14-10 26 8 40-2s28-10 44 0v18c-14-8-28-4-42 6s-28-4-42 4z"/>' +
        '<path class="c-dolgu" d="M10 22c14-10 26 8 40-2v14c-14 8-26-4-40 4z"/>' +
        '<path class="c-ince c-dikis" d="M14 40c12-6 24 6 36-2s26-10 40-2"/>' +
      '</g>' + arti(100, 12, 3);
    return '<div class="motif m-kumas" aria-hidden="true">' + svg('0 0 110 60', 110, 60, ic, 'cizim') + '</div>';
  }

  kok.KCIZIM = { buyuk: buyuk, aski: aski, mezura: mezura, kumas: kumas };
})(this);
