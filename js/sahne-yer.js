/* Kabin web · Yön D · sahne yerleşimi: gömleği ve çevredeki giysileri yazının DIŞINDA kalan alana sığdırır.
   Sabit kırılma noktası yok: her ölçümde (yeniden boyutlama, tutuş değişimi) yazı bloğunun, kartın ve başlığın ekrandaki kutuları ölçülür,
   gömleğin gerçek silueti (ağdan çıkarılan dilimler) bu kutulara değmeyecek en büyük boyda, tercih edilen yere en yakın noktaya konur.
   Sığmazsa gömlek küçülür; çevre giysileri önce içeri kayar, sonra küçülür, yine sığmazsa gizlenir. Birimler: sahne pikseli (kabın sol üstü 0,0). */
(function (kok) {
  'use strict';
  /* three.js yalnız profil() için gerekir (sonradan yüklenir); yerleştirme hesapları kütüphanesiz çalışır: yedek çizim de bununla yerleşir. */

  /* Gömleğin silueti: yükseklik boyunca DILIM dilim; her dilimde en sol / en sağ x. Hepsi model yüksekliğine oranlı (y: 0 üst … 1 alt; x: eksene göre). */
  var DILIM = 24;
  function profil(grup) {
    var T = kok.THREE, sol = [], sag = [], i, v = new T.Vector3(), kutu = new T.Box3().setFromObject(grup);
    var boy = kutu.max.y - kutu.min.y, ox = (kutu.max.x + kutu.min.x) / 2;
    for (i = 0; i < DILIM; i++) { sol.push(1e9); sag.push(-1e9); }
    grup.updateMatrixWorld(true);
    grup.traverse(function (o) {
      if (!o.isMesh) return;
      var p = o.geometry.attributes.position;
      for (var k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld);
        var d = Math.min(DILIM - 1, Math.max(0, Math.floor((kutu.max.y - v.y) / boy * DILIM)));
        var x = (v.x - ox) / boy;
        if (x < sol[d]) sol[d] = x;
        if (x > sag[d]) sag[d] = x;
      }
    });
    for (i = 0; i < DILIM; i++) if (sol[i] > sag[i]) { sol[i] = 0; sag[i] = 0; }
    return { sol: sol, sag: sag, en: (kutu.max.x - kutu.min.x) / boy };
  }

  function kesisir(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }
  function buyut(r, m) { return { x0: r.x0 - m, y0: r.y0 - m, x1: r.x1 + m, y1: r.y1 + m }; }

  /* Gömlek (merkez cx, cy; boy h) siluetinin dilimleri, pay kadar genişletilmiş. ek: [{ y0, y1, yari }] (oranlı; ör. gevşek mezura halkası) */
  function dilimler(pr, cx, cy, h, pay, ek) {
    var r = [], ust = cy - h / 2, i;
    for (i = 0; i < DILIM; i++) {
      r.push({ x0: cx + pr.sol[i] * h - pay, x1: cx + pr.sag[i] * h + pay, y0: ust + i / DILIM * h - pay * 0.5, y1: ust + (i + 1) / DILIM * h + pay * 0.5 });
    }
    (ek || []).forEach(function (e) { r.push({ x0: cx - e.yari * h - pay, x1: cx + e.yari * h + pay, y0: ust + e.y0 * h, y1: ust + e.y1 * h }); });
    return r;
  }
  function serbest(dl, engel) {
    for (var i = 0; i < dl.length; i++) for (var k = 0; k < engel.length; k++) if (kesisir(dl[i], engel[k])) return false;
    return true;
  }

  /* doğru parçası – dikdörtgen kesişimi */
  function parcaKutu(ax, ay, bx, by, r) {
    if (Math.max(ax, bx) < r.x0 || Math.min(ax, bx) > r.x1 || Math.max(ay, by) < r.y0 || Math.min(ay, by) > r.y1) return false;
    if ((ax > r.x0 && ax < r.x1 && ay > r.y0 && ay < r.y1) || (bx > r.x0 && bx < r.x1 && by > r.y0 && by < r.y1)) return true;
    var k = [[r.x0, r.y0, r.x1, r.y0], [r.x1, r.y0, r.x1, r.y1], [r.x1, r.y1, r.x0, r.y1], [r.x0, r.y1, r.x0, r.y0]];
    for (var i = 0; i < 4; i++) {
      var c = k[i], d1 = (bx - ax) * (c[1] - ay) - (by - ay) * (c[0] - ax), d2 = (bx - ax) * (c[3] - ay) - (by - ay) * (c[2] - ax);
      var d3 = (c[2] - c[0]) * (ay - c[1]) - (c[3] - c[1]) * (ax - c[0]), d4 = (c[2] - c[0]) * (by - c[1]) - (c[3] - c[1]) * (bx - c[0]);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
    return false;
  }
  function yolKutu(noktalar, r) {
    for (var i = 1; i < noktalar.length; i++) if (parcaKutu(noktalar[i - 1][0], noktalar[i - 1][1], noktalar[i][0], noktalar[i][1], r)) return true;
    return false;
  }

  /* o: { W, H, pr (profil), tercih: { cx, cy, h }, hEnAz, ust, alt, kenar, engel: [kutu], pay, ek, yol(cx, cy, h) → nokta dizisi, yolEngel: [kutu] }
     Döner: { cx, cy, h } — en büyük boy, aynı boyda tercih edilen yere en yakın nokta. Hiçbiri olmazsa en küçük boyla tercih edilen yer. */
  function yerlestir(o) {
    var pr = o.pr, adim = Math.max(4, Math.min(o.W, o.H) / 60), pay = o.pay || 0;
    function dene(cx, cy, h) {
      var w2 = pr.en * h / 2;
      if (cx - w2 < o.kenar || cx + w2 > o.W - o.kenar || cy - h / 2 < o.ust || cy + h / 2 > o.alt) return false;
      if (!serbest(dilimler(pr, cx, cy, h, pay, o.ek), o.engel)) return false;
      if (o.yol && o.yolEngel) { var y = o.yol(cx, cy, h); for (var k = 0; k < o.yolEngel.length; k++) if (yolKutu(y, o.yolEngel[k])) return false; }
      return true;
    }
    var t = o.tercih;
    if (dene(t.cx, t.cy, t.h)) return { cx: t.cx, cy: t.cy, h: t.h, tam: true };
    for (var h = t.h; h >= o.hEnAz; h -= t.h * 0.03) {
      var w2 = pr.en * h / 2, en = null, enD = 1e18;
      for (var cy = o.ust + h / 2; cy <= o.alt - h / 2; cy += adim) {
        for (var cx = o.kenar + w2; cx <= o.W - o.kenar - w2; cx += adim) {
          var dd = (cx - t.cx) * (cx - t.cx) + (cy - t.cy) * (cy - t.cy) * 1.6;
          if (dd >= enD) continue;
          if (dene(cx, cy, h)) { en = { cx: cx, cy: cy, h: h }; enD = dd; }
        }
      }
      if (en) return en;
    }
    return { cx: t.cx, cy: t.cy, h: o.hEnAz, sigmadi: true };
  }

  /* çevre giysisi: kutu (kare, kenar s; içeriğin dolu kısmı ic = { x0, y0, x1, y1 } oranlı). Ekrandan taşmasın (içeri kaydır),
     engellere değmesin, gömlek grubunun arkasında büyük ölçüde gizli kalmasın (ortu: oranın üstü gizler). Döner { x, y, s } ya da null. */
  function giysiYeri(o) {
    var olc = [1, 0.8, 0.64];
    for (var i = 0; i < olc.length; i++) {
      var s = o.s * olc[i], ic = o.ic;
      var x = o.x, y = o.y;
      var kx0 = x - s / 2 + ic.x0 * s, kx1 = x - s / 2 + ic.x1 * s, ky0 = y - s / 2 + ic.y0 * s, ky1 = y - s / 2 + ic.y1 * s;
      var m = o.kenar;
      if (kx0 < m) x += m - kx0; if (kx1 > o.W - m) x -= kx1 - (o.W - m);
      if (ky0 < m) y += m - ky0; if (ky1 > o.H - m) y -= ky1 - (o.H - m);
      var kutu = { x0: x - s / 2 + ic.x0 * s, x1: x - s / 2 + ic.x1 * s, y0: y - s / 2 + ic.y0 * s, y1: y - s / 2 + ic.y1 * s };
      if (kutu.x0 < 0 || kutu.x1 > o.W || kutu.y0 < 0 || kutu.y1 > o.H) continue;
      if (Math.abs(x - o.x) > s * 0.6) continue; /* fazla kaydırma yok: yerinden kopmasın */
      var temiz = o.engel.every(function (e) { return !kesisir(kutu, e); });
      if (!temiz) continue;
      var alan = (kutu.x1 - kutu.x0) * (kutu.y1 - kutu.y0), ort = 0;
      o.ortu.forEach(function (e) {
        var w = Math.min(kutu.x1, e.x1) - Math.max(kutu.x0, e.x0), hh = Math.min(kutu.y1, e.y1) - Math.max(kutu.y0, e.y0);
        if (w > 0 && hh > 0) ort += w * hh;
      });
      if (ort / alan > o.ortuEnCok) continue;
      return { x: x, y: y, s: s };
    }
    return null;
  }

  /* kesim görselinin dolu (saydam olmayan) kısmı, oranlı. Yüklenmiş <img>. */
  function doluKutu(img) {
    try {
      var c = document.createElement('canvas'), n = 64; c.width = c.height = n;
      var x = c.getContext('2d'); x.drawImage(img, 0, 0, n, n);
      var d = x.getImageData(0, 0, n, n).data, x0 = n, y0 = n, x1 = 0, y1 = 0;
      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) if (d[(j * n + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
      if (x1 <= x0) return { x0: 0, y0: 0, x1: 1, y1: 1 };
      return { x0: x0 / n, y0: y0 / n, x1: (x1 + 1) / n, y1: (y1 + 1) / n };
    } catch (e) { return { x0: 0, y0: 0, x1: 1, y1: 1 }; }
  }

  /* öğenin kaba göre kutusu. donusumYok: transform yok sayılır (kart kayarak gelir; yeri son hâline göre ölçülür) */
  function kutuOf(el, kr, donusumYok) {
    if (!el) return null;
    var tr = el.style.transform;
    if (donusumYok) el.style.transform = 'none';
    var r = el.getBoundingClientRect();
    if (donusumYok) el.style.transform = tr;
    if (!r.width || !r.height) return null;
    return { x0: r.left - kr.left, y0: r.top - kr.top, x1: r.right - kr.left, y1: r.bottom - kr.top };
  }

  /* bir yazı bloğunun DOLU kutuları: paragrafların satır kutuları + düğmeler (blok kutusunun boş sağ yanı engel sayılmaz) */
  function icerik(el, kr) {
    var cik = [];
    if (!el) return cik;
    function ekle(r) { if (r.width > 0 && r.height > 0) cik.push({ x0: r.left - kr.left, y0: r.top - kr.top, x1: r.right - kr.left, y1: r.bottom - kr.top }); }
    [].forEach.call(el.querySelectorAll('p, .dugme, h1, h2'), function (c) {
      if (c.classList.contains('dugme') || !c.textContent.trim()) { ekle(c.getBoundingClientRect()); return; }
      var rg = document.createRange(); rg.selectNodeContents(c);
      [].forEach.call(rg.getClientRects(), ekle);
    });
    return cik;
  }

  /* bir öğedeki yazının satır kutuları (blok genişliği değil, harflerin kapladığı yer) */
  function metin(el, kr) {
    var cik = [];
    if (!el) return cik;
    var rg = document.createRange(); rg.selectNodeContents(el);
    [].forEach.call(rg.getClientRects(), function (r) { if (r.width > 0 && r.height > 0) cik.push({ x0: r.left - kr.left, y0: r.top - kr.top, x1: r.right - kr.left, y1: r.bottom - kr.top }); });
    return cik;
  }

  /* yedek çizim (kare, içi dolu sayılır) için silüet */
  var KARE = { sol: [], sag: [], en: 1 };
  for (var q = 0; q < DILIM; q++) { KARE.sol.push(-0.5); KARE.sag.push(0.5); }

  kok.KYER = { KARE: KARE, icerik: icerik, metin: metin, yolKutu: yolKutu, profil: profil, yerlestir: yerlestir, giysiYeri: giysiYeri, doluKutu: doluKutu, kutuOf: kutuOf, kesisir: kesisir, buyut: buyut };
})(this);
