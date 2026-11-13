/* Kabin web · Yön D · 3B sahne (three.js). Üç kip: giris (ana sayfa girişi), uyum (dar · tam · bol), marka (markalar sayfası).
   Sahne DOM'a bağlanır: [data-odak] kutusu gömleğin TERCİH edilen yerini ve boyunu (kanca ucundan eteğe), [data-maske] satırları başlığın harflerini verir.
   Gerçek yer js/sahne-yer.js ile her ölçümde hesaplanır: yazı bloğu, kart ve başlık kutularının dışında kalan alana sığan en büyük boy.
   Başlık gerçek metin olarak altta durur; tuval üstte. Derinlik maskesi kameranın hemen önündedir: hiçbir nesne harfleri örtmez.
   Durur: görünmüyorken, sekme arkadayken. prefers-reduced-motion: tek durağan kare. Yavaş cihaz (ısınmadan sonra 90 karenin ortanca süresi 33 ms
   üstü, yani ~30 kare/sn altı) ya da ?yavas=1: çizim durur, durağan çizime geçilir. WebGL yoksa js/site.js bu dosyayı hiç yüklemez. */
(function (kok) {
  'use strict';
  var T = kok.THREE, G = kok.KGEO, S = kok.KSERIT, Y = kok.KYER;
  var FOV = 30, UZAK = 10, HW = 2 * UZAK * Math.tan(FOV * Math.PI / 360);
  var AZ = kok.matchMedia && kok.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var YAVAS_MS = 1000 / 30, YAVAS_ZORLA = /[?&]yavas=1/.test(location.search);

  var KIP = {
    giris: { model: 'gomlek', yuzen: true, baslik: true, serit: true, yon: 1, yerles: 'giris' },
    uyum: { model: 'gomlek', serit: true, yon: 1 },
    marka: { model: 'gomlek', baslik: true, serit: true, yon: -1, yerles: 'marka' }
  };
  /* gömlek modelinin kesitleri (metre): z yükseklik.
     Gömlek = gerçek fotoğraftan çıkarılan ağ (Blender betiği gomlek-foto-olcu.json). cx: gövde ekseni, x: gövdenin yarı eni (kollar hariç), on / arka: derinlik.
     Omuzda kol gövdeye bitişik olduğu için halka omuz enini sarar; göğüs ve belde kolların altından yalnız gövdeyi. */
  var BOLGE = {
    omuz: { z: 0.601, cx: 0.001, x: 0.279, on: 0.034, arka: 0.02 }, gogus: { z: 0.343, cx: -0.009, x: 0.256, on: 0.041, arka: 0.023 },
    bel: { z: 0.2, cx: -0.013, x: 0.302, on: 0.039, arka: 0.022 }, etek: { z: 0.078, cx: -0.024, x: 0.265, on: 0.022, arka: 0.013 }
  };
  var PAY = { dar: 0.002, tam: 0.008, bol: 0.02 };
  /* yüzen giysiler: sahnenin oranı olarak TERCİH edilen yer (nx, ny), derinlik, boy (sahne yüksekliğinin oranı). Sığmazsa içeri kayar, küçülür ya da gizlenir. */
  var YUZEN = [
    { id: 'p4', nx: 0.885, ny: 0.5, z: -0.6, boy: 0.36, faz: 0.3 },
    { id: 'p5', nx: 0.405, ny: 0.58, z: -1.3, boy: 0.26, faz: 2.1 },
    { id: 'p3', nx: 0.93, ny: 0.87, z: -1.0, boy: 0.24, faz: 4.0 }
  ];
  var YUZEN_DAR = { p4: { nx: 0.9, ny: 0.45, boy: 0.15 }, p5: { nx: 0.08, ny: 0.6, boy: 0.19 } };
  var GECIS = 520; /* ms: bölge değişimi (dar · tam · bol) */
  var KENAR_PX = 10, KUYRUK_EN_AZ = 0.1; /* bölge geçişinde açılan halka panel kenarına en çok bu kadar (px) yaklaşır; serbest uca en az bu kadar (model-yerel) yer kalır */
  var ALAN = ['y', 'cx', 'cz', 'rx', 'rz', 'sark', 'dalga'];

  function gorselYukle(idler, bitti) {
    function basla() {
      var cik = {}, kalan = idler.length;
      idler.forEach(function (id) {
        var im = new Image();
        im.onload = im.onerror = function () { if (--kalan === 0) bitti(cik); };
        cik[id] = im;
        im.src = '/gorsel/kesim/' + id + '.webp';
      });
    }
    basla(); /* yayın: görseller kendi kökümüzden (taslaktaki file:// dalı ve data: adresli yedek taşınmadı) */
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function yumusak3(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function kur(kap) {
    if (!T || !G || !S || !Y) return null;
    var kip = KIP[kap.getAttribute('data-sahne')] || KIP.giris;
    var tutucu = kap.querySelector('.sahne-tuval'), odak = kap.querySelector('[data-odak]'), iz = kap.closest('[data-iz]');
    var ciz;
    try { ciz = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    ciz.setClearColor(0x000000, 0);
    ciz.toneMapping = T.NoToneMapping;
    var tuval = ciz.domElement;
    tuval.setAttribute('aria-hidden', 'true');
    tutucu.appendChild(tuval);

    var sahne = new T.Scene(), kam = new T.PerspectiveCamera(FOV, 1, 0.5, 60);
    kam.position.set(0, 0, UZAK);
    sahne.add(kam);
    G.isik(sahne);
    var dunya = new T.Group(), ana = new T.Group(), arka = new T.Group();
    sahne.add(dunya); dunya.add(arka); dunya.add(ana);

    var cakillar = [
      { m: G.cakil(G.RENK.blush, 1.3), x: -0.5, y: 0.22, z: -1.0, s: 0.6, f: 0 },
      { m: G.cakil(G.RENK.mist, 4.1), x: 0.6, y: -0.25, z: -1.3, s: 0.66, f: 2 },
      { m: G.cakil(G.RENK.butter, 7.7), x: -0.62, y: -0.72, z: -0.8, s: 0.28, f: 4, en: 1.35 }
    ];
    cakillar.forEach(function (c) { arka.add(c.m); });

    var serit = G.serit(300, 0.05, 1), yol = S.olustur({ N: 300, dalga: 0.05 });
    if (kip.serit) dunya.add(serit);
    var maskeTuval = document.createElement('canvas'), maske = null;
    if (kip.baslik) { maske = G.maske(maskeTuval); kam.add(maske); maske.position.z = -1; }

    var yuzenler = [], hazir = false, mk = 2.2, mOrta = 0.457, pr = null;
    var W = 1, H = 1, u = 1, dar = false, kafaPx = null;
    var P0 = { cx: 0, cy: 0, h: 1 }, P1 = P0, gecikme = false; /* gömleğin ekrandaki yeri: gevşek (p = 0) ve sarılı (p = 1) hâl, sahne pikseli */
    var d = { p: AZ ? 1 : 0, pH: AZ ? 1 : 0, fx: 0, fy: 0, fxH: 0, fyH: 0, t0: performance.now(), gorunur: true, kareler: [], son: 0 };
    var h = { y: 0, cx: 0, cz: 0, rx: 0.6, rz: 0.08, sark: 0, dalga: 0 }, hH = { y: 0, cx: 0, cz: 0, rx: 0.6, rz: 0.08, sark: 0, dalga: 0 };
    var hK = { y: 0, cx: 0, cz: 0, rx: 0.6, rz: 0.08, sark: 0, dalga: 0, gen: 1, egik: 0, tur: 1.03, yon: kip.yon || 1 }; /* karede kullanılan */
    /* bölge geçişi: başlangıç (gS) → hedef (hH), GECIS ms, yumuşak hızlanma/yavaşlama. Omuza giden ya da omuzdan gelen geçişte halka
       öne alınır ve kolların dışına çıkacak kadar açılır (zarf: kol), kayarken biçimi korunur, sonra yerine oturur. */
    var gS = null, gT0 = 0, gSure = GECIS, kol = 0, kolH = 0, kolGen = 1, kolOne = 0, bolgeSimdi = 'gogus', ilk = { bolge: 'gogus', uyum: 'tam' };
    var yEtek = 0;
    function bolgeHesap(bolge, uyum, cik) { /* metre → model-yerel */
      var b = BOLGE[bolge] || BOLGE.gogus, pay = PAY[uyum] || PAY.tam;
      cik.y = (b.z - mOrta) * mk; cik.cx = b.cx * mk; cik.cz = (b.on - b.arka) / 2 * mk;
      cik.rx = (b.x + pay) * mk; cik.rz = ((b.on + b.arka) / 2 + pay) * mk;
      cik.sark = uyum === 'bol' ? 0.05 : 0; cik.dalga = uyum === 'bol' ? 0.008 : 0;
      return cik;
    }
    function halkaHedef(bolge, uyum, hemen) {
      var omuzlu = bolge !== bolgeSimdi && (bolge === 'omuz' || bolgeSimdi === 'omuz');
      bolgeHesap(bolge, uyum, hH);
      yEtek = (BOLGE.etek.z - mOrta) * mk;
      if (hemen || AZ) { ALAN.forEach(function (k) { h[k] = hH[k]; }); gS = null; kol = kolH = kolOne = 0; bolgeSimdi = bolge; return; }
      gS = {}; ALAN.forEach(function (k) { gS[k] = h[k]; }); /* süren bir geçişin ortasından da yumuşakça yeni hedefe döner */
      gT0 = performance.now(); gSure = bolge === bolgeSimdi ? 320 : GECIS;
      if (omuzlu) kolH = 1;
      bolgeSimdi = bolge;
    }
    /* halkanın o anki yüksekliğinde (± küçük pay) kolların en dış ucu (siluetten): halka yalnız bunun az dışına açılır, fazlasına değil.
       Her karede o yüksekliğe göre hesaplanır; kolların dar olduğu yerde halka da daralır. */
    function kolAcikligi(y, rx) {
      if (!pr) return 1.6;
      var dis = 0;
      for (var i = 0; i < pr.sol.length; i++) {
        var yy = 1 - (i + 0.5) / pr.sol.length * 2; /* dilim ortası, model-yerel (üst +1, alt -1) */
        if (Math.abs(yy - y) > 0.09) continue;
        dis = Math.max(dis, -pr.sol[i] * 2, pr.sag[i] * 2);
      }
      return Math.max(1, Math.min(2.2, (dis + 0.05) / Math.max(0.1, rx)));
    }
    function gecisAdim(simdi, dt) {
      if (gS) {
        var t = Math.min(1, (simdi - gT0) / gSure), e = yumusak3(t);
        ALAN.forEach(function (k) { h[k] = lerp(gS[k], hH[k], e); });
        if (t > 0.78) kolH = 0;
        if (t >= 1) gS = null;
      }
      kol += (kolH - kol) * (1 - Math.exp(-dt / 60)); /* zarf: ~60 ms zaman sabitiyle açılır / kapanır; art arda tıklamada kesintisiz */
      if (!gS && kol < 0.003) kol = 0;
      kolOne = S.yumusak(kol);
    }

    function px(x, y, z) { /* sahne pikseli → dünya; z derinliğinde aynı ekran noktasına düşsün */
      var k = (UZAK - (z || 0)) / UZAK;
      return new T.Vector3((x - W / 2) * u * k, -(y - H / 2) * u * k, z || 0);
    }

    function maskeCiz() {
      if (!maske) return;
      var o = Math.min(kok.devicePixelRatio || 1, 2, 4096 / W);
      maskeTuval.width = Math.max(2, Math.round(W * o)); maskeTuval.height = Math.max(2, Math.round(H * o));
      var x = maskeTuval.getContext('2d'), kr = kap.getBoundingClientRect();
      x.setTransform(o, 0, 0, o, 0, 0);
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#000';
      x.textBaseline = 'alphabetic';
      [].forEach.call(kap.querySelectorAll('[data-maske]'), function (el) {
        var cs = getComputedStyle(el), r = el.getBoundingClientRect(), taban = el.querySelector('.taban');
        x.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        var ty = taban ? taban.getBoundingClientRect().bottom : r.bottom;
        x.fillText(el.getAttribute('data-maske') || el.textContent, r.left - kr.left, ty - kr.top);
      });
      maske.material.map.needsUpdate = true;
      maske.scale.set(W * u / UZAK, H * u / UZAK, 1);
    }

    /* serbest ucun başı (sahne pikseli): girişte başlığın ALTINDAN gelir. Başlığın alt kenarını döndürür (mezuranın tavanı). */
    function kafaHesap(kr) {
      var bas = kap.querySelector('[data-baslik]');
      kafaPx = null;
      if (kap.getAttribute('data-sahne') !== 'giris' || !bas) return null;
      var b = bas.getBoundingClientRect(), bx = b.left - kr.left, alt = b.bottom - kr.top, bw = b.width;
      kafaPx = dar ? [[-0.14 * W, alt + 0.05 * H, 0.3], [0.22 * W, alt + 0.035 * H, 0.5]]
        : [[bx - 0.14 * bw, alt + 0.085 * H, 0.3], [bx + 0.14 * bw, alt + 0.06 * H, 0.5], [bx + 0.34 * bw, alt + 0.1 * H, 0.3]];
      return alt;
    }
    function yollar(tavanPx) {
      var y = kip.yon || 1, gel;
      if (kafaPx) gel = kafaPx.map(function (k) { return px(k[0], k[1], k[2]); });
      else { /* markalar, uyum: gömleğe göre, başlığın olmadığı yandan (yon = -1: sağdan); birim = gömlek boyunun yarısı */
        var o = function (dx, dy, z) { return px(P0.cx + dx * P0.h / 2, P0.cy - dy * P0.h / 2, z); };
        gel = [o(-3.2 * y, 1.5, 0.2), o(-2.5 * y, 1.15, 0.3)];
      }
      yol.yolGelis(gel, tavanPx == null ? null : { y: -(tavanPx - H / 2) * u, uzak: UZAK });
    }

    /* mezura serbest ucunun halkaya kadar yolu (sahne pikseli), yerleşim denetimi için: halka etekte (gevşek) ya da göğüste (sarılı) */
    function seritYolu(sarili) { /* sarili: true / false ya da ara değer 0…1 */
      var f = +sarili, rx = hH.rx * 1.03 * (1.3 - 0.3 * f), yon = kip.yon || 1;
      var bx = hH.cx - yon * rx * 0.877, by = yEtek - 0.04 + (hH.y - yEtek + 0.04) * f;
      var ek = [[-yon * 0.8, 0.85], [-yon * 0.62, 0.22], [-yon * 0.32, 0.01], [0, 0]];
      return function (cx, cy, hh) {
        var n = (kafaPx || []).map(function (k) { return [k[0], k[1]]; });
        ek.forEach(function (e) { n.push([cx + (bx + e[0]) * hh / 2, cy - (by + e[1]) * hh / 2]); });
        return n;
      };
    }
    function halkaEk(sarili) { /* mezura halkasının siluete eklenen dilimi (oranlı: y 0 üst … 1 alt) */
      var ny = (1 - (sarili ? hH.y : yEtek)) / 2, yari = hH.rx * (sarili ? 1.03 : 1.34) / 2;
      return [{ y0: ny - 0.05, y1: ny + 0.04, yari: yari }];
    }

    /* gevşekten sarılıya geçerken ara hâllerde mezura yazının üstünden geçiyor mu (gömlek P0 → P1 arasında, halka yukarı çıkarken) */
    function araCarpar(P, engel) {
      if (!kafaPx || !engel || !engel.length) return false;
      for (var a = 1; a <= 7; a++) { /* kare()'deki zamanlama: gömlek pe ile kayar, halka cik ile yukarı çıkar */
        var p = a / 8, pe = S.yumusak(p / 0.7), f = S.yumusak((p - 0.35) / 0.65);
        var s = egriNokta(seritYolu(f)(P0.cx + (P.cx - P0.cx) * pe, P0.cy + (P.cy - P0.cy) * pe, P0.h + (P.h - P0.h) * pe));
        for (var k = 0; k < engel.length; k++) if (Y.yolKutu(s, engel[k])) return true;
      }
      return false;
    }
    function egriNokta(n) { /* Catmull-Rom ara noktaları: gerçek şerit köşeleri keserek değil, eğriyle gider */
      var c = [];
      for (var i = 0; i < n.length - 1; i++) {
        var a0 = n[Math.max(0, i - 1)], a1 = n[i], a2 = n[i + 1], a3 = n[Math.min(n.length - 1, i + 2)];
        for (var j = 0; j < 6; j++) {
          var s = j / 6, s2 = s * s, s3 = s2 * s, q = [0, 1].map(function (k) {
            return 0.5 * (2 * a1[k] + (a2[k] - a0[k]) * s + (2 * a0[k] - 5 * a1[k] + 4 * a2[k] - a3[k]) * s2 + (3 * a1[k] - a0[k] - 3 * a2[k] + a3[k]) * s3);
          });
          c.push(q);
        }
      }
      c.push(n[n.length - 1]);
      return c;
    }
    /* gömleğin (merkez cx, cy; boy hh) y0…y1 bandındaki en sağ ucu, sahne pikseli */
    function sagUc(cx, cy, hh, y0, y1) {
      var ust = cy - hh / 2, n = pr.sol.length, m = -1e9;
      for (var i = 0; i < n; i++) { var a = ust + i / n * hh, b = ust + (i + 1) / n * hh; if (b > y0 && a < y1) m = Math.max(m, cx + pr.sag[i] * hh); }
      return m;
    }
    function yerlesim(kr, tercih) {
      var B = Y.buyut, kenar = 8, ust = 0, alt = H * 0.99, E0 = [], yE0 = null;
      if (!pr || !kip.yerles) { P0 = tercih; P1 = { cx: tercih.cx, cy: tercih.cy, h: tercih.h * 1.06 }; return; }
      var br = Y.kutuOf(kap.querySelector('[data-baslik]'), kr), kart = null, Tr = [];
      if (kip.yerles === 'giris') {
        Tr = Y.icerik(kap.querySelector('.giris-yazi'), kr);
        kart = kap.querySelector('.giris-kart');
        ust = br ? br.y1 + H * 0.01 : 0;
        E0 = Tr.map(function (r) { return B(r, 18); }); yE0 = Tr.map(function (r) { return B(r, 10); });
      } else {
        var ub = Y.kutuOf(document.querySelector('.ust-bilgi .kap'), kr);
        ust = ub ? ub.y1 + 8 : 0; alt = H - 8;
        E0 = Y.icerik(kap.querySelector('.m-yazi'), kr).map(function (r) { return B(r, 18); });
        [].forEach.call(kap.querySelectorAll('[data-maske]'), function (el) { Y.metin(el, kr).forEach(function (r) { E0.push(B(r, 22)); }); });
      }
      var pay = Math.max(6, tercih.h * 0.015), sY = kip.serit && kafaPx;
      var o = function (t, engel, sarili, yolE, enAz) {
        return Y.yerlestir({ W: W, H: H, pr: pr, tercih: t, hEnAz: enAz, ust: ust, alt: alt, kenar: kenar, engel: engel, pay: pay,
          ek: halkaEk(sarili), yol: sY ? seritYolu(sarili) : null, yolEngel: yolE });
      };
      P0 = o(tercih, E0, false, yE0, tercih.h * 0.42);
      var t1 = { cx: P0.cx - (kip.yuzen && !dar ? W * 0.04 : 0), cy: P0.cy, h: P0.h * 1.06 };
      if (!kart) { P1 = o(t1, E0, true, null, P0.h * 0.6); }
      else if (dar) { /* telefon: kart gelirken yazı çekilir; kart altta tam genişlik */
        P1 = o(t1, [B(Y.kutuOf(kart, kr, true), 22)], true, null, P0.h * 0.6);
      } else {
        /* geniş: önce yazı yerinde kalır, kart gömleğin sağındaki boşluğa kayar (gerekirse sağ kenara kadar); gömlek kartın dışına çekilir.
           Gömlek bu hâlde gevşek boyunun üçte ikisinden küçük kalacaksa (ör. dikey tablet) yazı çekilir, kart yazının yerine (sola) geçer. */
        kap.classList.remove('kart-yazi'); kart.style.right = '';
        var K0 = Y.kutuOf(kart, kr, true), kw = K0.x1 - K0.x0, yA = Tr.map(function (r) { return B(r, 16); });
        var duvar = Tr.length ? [{ x0: -1e4, x1: Math.max.apply(null, Tr.map(function (r) { return r.x1; })) + 40, y0: -1e4, y1: 1e4 }] : [];
        var dene = function (t) { /* kartı gömleğin sağına kaydır, gömleği kartın ve yazı sütununun dışına yerleştir */
          var K = K0, uc = sagUc(t.cx, t.cy, t.h, K.y0 - 22, K.y1 + 22) + pay + 24;
          var x0 = Math.min(Math.max(K.x0, uc), W - Math.max(16, W * 0.02) - kw);
          if (x0 > K.x0) K = { x0: x0, x1: x0 + kw, y0: K.y0, y1: K.y1 };
          var P = o(t, E0.concat([B(K, 22)], duvar), true, yE0, P0.h * 0.6);
          var r = { P: P, K: K, iyi: !P.sigmadi && P.h >= P0.h * 0.64 && !araCarpar(P, yA) };
          return r;
        };
        var sec = null, F = [1.06, 0.94, 0.82];
        for (var fi = 0; fi < F.length && !(sec && sec.iyi); fi++) {
          [t1.cx, P0.cx].some(function (cx) { var r = dene({ cx: cx, cy: P0.cy, h: P0.h * F[fi] }); if (r.iyi) { sec = r; return true; } return false; });
        }
        if (sec) {
          P1 = sec.P;
          if (sec.K.x0 > K0.x0) kart.style.right = (W - sec.K.x0 - kw).toFixed(1) + 'px';
        } else {
          kap.classList.add('kart-yazi');
          P1 = o(t1, [B(K0, 22)], true, null, P0.h * 0.6);
        }
      }
      gecikme = kap.classList.contains('kart-yazi') && !dar; /* yazı çekilmeden giysi onun üstüne kaymasın */
      d.yer = { P0: P0, P1: P1, tercih: tercih, kartYazi: gecikme };
    }

    function yuzenYerles(kr) {
      var Tk = kip.yerles === 'giris' ? Y.kutuOf(kap.querySelector('.giris-yazi'), kr) : null, ortu = [];
      if (pr) { /* gömlek + arkadaki çakıllar: giysi bunların arkasında büyük ölçüde gizli kalmasın */
        var ust = P0.cy - P0.h / 2, n = pr.sol.length;
        for (var i = 0; i < n; i++) ortu.push({ x0: P0.cx + pr.sol[i] * P0.h, x1: P0.cx + pr.sag[i] * P0.h, y0: ust + i / n * P0.h, y1: ust + (i + 1) / n * P0.h });
        cakillar.forEach(function (c) {
          var x = P0.cx + c.x * P0.h / 2, y = P0.cy - c.y * P0.h / 2, rx = 1.05 * c.s * (c.en || 1) * P0.h / 2, ry = 0.85 * c.s * P0.h / 2;
          ortu.push({ x0: x - rx, x1: x + rx, y0: y - ry, y1: y + ry });
        });
      }
      d.yuzenBilgi = [];
      yuzenler.forEach(function (y) {
        var a = dar ? YUZEN_DAR[y.id] : y;
        y.acik = y.grup.visible = !!a;
        if (!a) return;
        var k = (UZAK - y.z) / UZAK, oyna = 0.13 * (dar ? 0.4 : 1) / (u * k);
        var yer = Y.giysiYeri({ x: a.nx * W, y: a.ny * H, s: a.boy * H, ic: y.ic, W: W, H: H, kenar: oyna + 6,
          engel: Tk ? [Y.buyut(Tk, 14)] : [], ortu: ortu, ortuEnCok: 0.6 });
        d.yuzenBilgi.push([y.id, yer && { x: Math.round(yer.x), y: Math.round(yer.y), s: Math.round(yer.s) }]);
        if (!yer) { y.acik = y.grup.visible = false; return; }
        y.taban = px(yer.x, yer.y, y.z);
        y.olcek = (yer.s / 2) * u * k;
      });
    }

    var olcBekle = false, raf = 0;
    function olc() {
      olcBekle = false;
      var kr = kap.getBoundingClientRect();
      W = Math.max(1, kr.width); H = Math.max(1, kr.height);
      dar = W < 720;
      ciz.setPixelRatio(Math.min(kok.devicePixelRatio || 1, dar ? 2 : 1.5));
      ciz.setSize(W, H, false);
      kam.aspect = W / H; kam.updateProjectionMatrix();
      u = HW / H;
      var or = odak.getBoundingClientRect();
      var tercih = { cx: or.left - kr.left + or.width / 2, cy: or.top - kr.top + or.height / 2, h: or.height };
      var tavan = kafaHesap(kr);
      yerlesim(kr, tercih);
      maskeCiz();
      yollar(tavan == null ? null : tavan + H * 0.012);
      d.seritEn = (P0.h / 2) * u * 0.036;
      yuzenYerles(kr);
      if (hazir && (AZ || !raf)) kare(performance.now());
    }
    function olcIste() { if (hazir && !olcBekle) { olcBekle = true; kok.requestAnimationFrame(olc); } }

    function kaydirma() {
      if (!iz || AZ) return;
      var r = iz.getBoundingClientRect(), yol2 = r.height - kok.innerHeight;
      d.pH = yol2 > 40 ? Math.max(0, Math.min(1, -r.top / yol2)) : Math.max(0, Math.min(1, -r.top / (r.height * 0.55)));
      iz.style.setProperty('--p', d.pH.toFixed(4));
    }

    var mat = new T.Matrix4();
    function kare(simdi) {
      var z = AZ ? 2.4 : (simdi - d.t0) / 1000, dt = d.son ? Math.min(100, simdi - d.son) : 16;
      d.p += (d.pH - d.p) * (AZ ? 1 : 0.12);
      d.fx += (d.fxH - d.fx) * 0.06; d.fy += (d.fyH - d.fy) * 0.06;
      gecisAdim(simdi, dt);
      var p = kip.baslik ? d.p : 1, pe = S.yumusak(gecikme ? (p - 0.3) / 0.42 : p / 0.7);

      dunya.rotation.y = d.fx * 0.07; dunya.rotation.x = d.fy * 0.045;
      ana.rotation.y = Math.sin(z * 0.36) * 0.4 * (1 - 0.6 * pe) + d.fx * 0.09; /* en çok ±28°: arka yüz tam görünmez */
      ana.rotation.z = Math.sin(z * 0.55 + 1) * 0.022 * (1 - 0.6 * pe);
      /* gevşek yer → sarılı yer (geniş ekranda giriş: sarılırken giysi kartın dışına çekilir) */
      var m = px(lerp(P0.cx, P1.cx, pe), lerp(P0.cy, P1.cy, pe), 0), hh = lerp(P0.h, P1.h, pe);
      ana.position.copy(m); arka.position.copy(m);
      ana.scale.setScalar(hh / 2 * u); arka.scale.setScalar(hh / 2 * u / (1 + 0.06 * pe));
      cakillar.forEach(function (c) {
        c.m.position.set(c.x + Math.sin(z * 0.23 + c.f) * 0.04, c.y + Math.sin(z * 0.31 + c.f * 2) * 0.05, c.z);
        var cs = c.s * (1 + 0.03 * Math.sin(z * 0.27 + c.f)); c.m.scale.set(cs * (c.en || 1), cs, cs);
        c.m.rotation.set(Math.sin(z * 0.17 + c.f) * 0.25, Math.sin(z * 0.11 + c.f) * 0.5, Math.sin(z * 0.13 + c.f) * 0.2);
      });
      /* sarılırken yüzen giysiler soluklaşıp tümüyle kaybolur (nokta gibi küçülüp kalmaz); yazının üstünden geçmezler */
      var gor = 1 - S.yumusak(pe / 0.4);
      yuzenler.forEach(function (y) {
        if (!y.acik) return;
        var g = y.grup, f = y.faz;
        g.visible = gor > 0.004;
        if (!g.visible) return;
        g.userData.govde.material.opacity = gor; g.userData.golge.material.opacity = 0.2 * gor;
        g.scale.setScalar(y.olcek * (1 - 0.12 * pe));
        g.position.set(y.taban.x + Math.sin(z * 0.21 + f) * 0.12 * (dar ? 0.4 : 1), y.taban.y + Math.sin(z * 0.33 + f * 1.7) * 0.1, y.z + Math.sin(z * 0.19 + f) * 0.25);
        g.rotation.set(Math.sin(z * 0.27 + f) * 0.08, Math.sin(z * 0.24 + f * 1.3) * 0.62, Math.sin(z * 0.2 + f) * 0.07);
      });
      ana.updateMatrixWorld(true);
      dunya.updateMatrixWorld(true);
      mat.copy(dunya.matrixWorld).invert().multiply(ana.matrixWorld); /* şerit dunya içinde: ana → dunya-yerel */
      if (kip.serit) {
        /* gevşek (p = 0): halka etek hizasında, geniş ve eğik. Sarılırken yukarı çıkar, daralır. Kol ağzı hizasını geçmeden daralmış olur. */
        /* p 0 → 0.45: tur tamamlanır (yarım turdan tam tura) · 0.35 → 1: etekten yukarı çıkar · 0.45 → 1: daralır */
        var tam = S.yumusak(p / 0.45), cik = S.yumusak((p - 0.35) / 0.65), gev = 1 - S.yumusak((p - 0.45) / 0.5);
        for (var k in h) hK[k] = h[k];
        hK.y = yEtek + (h.y - yEtek) * cik; hK.tur = 0.5 + 0.53 * tam;
        /* bölge geçişi (zarf kolOne): halka öne alınır (gömleğin ve kolların önünden geçer) ve kolların dışına açılır; biçimi aynı kalır */
        if (kolOne > 0) {
          kolGen = kolAcikligi(hK.y, h.rx);
          /* panel sınırı (serbest ucun geldiği yan, model-yerel x): açılan halka ve serbest uç bu çizgiyi geçmez, panelde kırpılmaz.
             Halkanın önü kameraya yakın olduğu için ekranda biraz büyür: izdüşüm payı (UZAK - z) / UZAK. */
          var cxPx = lerp(P0.cx, P1.cx, pe), yerelPx = hh / 2, ip = (UZAK - (h.cz + kolOne * 0.09 * mk + 0.3) * ana.scale.x) / UZAK;
          hK.kenar = (hK.yon > 0 ? KENAR_PX - cxPx : W - KENAR_PX - cxPx) / yerelPx * ip;
          kolGen = Math.max(1, Math.min(kolGen, (hK.yon * (h.cx - hK.kenar) - KUYRUK_EN_AZ) / (h.rx * 1.03)));
        }
        hK.kuyruk = kolOne; /* 0 = dinlenik: serbest uç tam bugünkü biçimde */
        hK.gen = (1 + (kolGen - 1) * kolOne) * (1 + 0.3 * gev);
        hK.cz = h.cz + kolOne * 0.09 * mk; hK.rz = h.rz + kolOne * 0.03 * mk;
        hK.egik = 0.05 * gev; hK.sark = h.sark + 0.03 * gev + kolOne * 0.11; /* önü arkasından alçak: kayarken halka (elips) olarak görünür, yassı bant değil */ hK.dalga = h.dalga + 0.012 * gev;
        var boy = yol.kare(hK, mat, z);
        serit.userData.olcu(d.seritEn, boy); serit.userData.guncelle(yol.C, yol.W);
      }
      ciz.render(sahne, kam);

      if (d.son) { d.kareler.push(simdi - d.son); if (d.kareler.length > 120) d.kareler.shift(); yavasDenetle(simdi - d.son); }
      d.son = simdi;
    }

    /* yavaş cihaz: görünürken ilk 30 kare ısınma, sonraki 90 karenin ortanca süresi 33 ms'yi (≈ 30 kare/sn) aşarsa durağan çizime geç */
    var yv = { n: 0, ornek: [], karar: false };
    function yavasDenetle(dtk) {
      if (yv.karar || ++yv.n <= 8) return;
      yv.ornek.push(dtk);
      /* erken karar: ısınmadan sonraki 12 karenin ortancası 50 ms'yi (< 20 kare/sn) aşıyorsa beklemeden durağan çizime geç;
         çok yavaş cihazda (ekran kartı yok, yazılımla çizim) 120 kare boyunca ana iş parçacığını tutmasın */
      var erken = yv.ornek.length === 12 && yv.n <= 30;
      if (!erken && (yv.n <= 30 || yv.ornek.length < 90 + 22)) return;
      var s = (erken ? yv.ornek : yv.ornek.slice(22)).slice().sort(function (a, b) { return a - b; });
      var ort = s[s.length >> 1];
      if (erken && ort <= 50 && !YAVAS_ZORLA) return;
      yv.karar = true;
      d.ortancaMs = ort;
      if (d.ortancaMs > YAVAS_MS || YAVAS_ZORLA) {
        hazir = false; kap.classList.remove('sahne-hazir'); kap.classList.add('sahne-yavas');
        if (kok.__kabinYer) kok.__kabinYer();
      }
    }

    function dongu(simdi) {
      raf = 0;
      if (!d.gorunur || document.hidden || !hazir) return;
      kare(simdi);
      raf = requestAnimationFrame(dongu);
    }
    function calis() {
      d.son = 0;
      if (!yv.karar) { yv.n = 0; yv.ornek.length = 0; } /* arka plandan dönüş / yeniden görünme ölçümü bozmasın */
      if (!raf && !AZ && hazir) raf = requestAnimationFrame(dongu);
    }

    var idler = kip.yuzen ? YUZEN.map(function (y) { return y.id; }) : [];
    function modelGeldi(grup, k, orta) {
      if (!grup) { document.documentElement.classList.add('sahnesiz'); return; } /* model okunamadı: durağan çizim kalır */
      mk = k; mOrta = orta;
      pr = Y.profil(grup);
      ana.add(grup);
      halkaHedef(ilk.bolge, ilk.uyum, true);
      var bitir = function () { hazir = true; olc(); kaydirma(); kap.classList.add('sahne-hazir'); if (AZ) kare(performance.now()); else calis(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(bitir); else bitir();
    }
    function gorselGeldi(im) {
      if (kip.yuzen) YUZEN.forEach(function (y) {
        var g = G.giysi(im[y.id], 0.3);
        dunya.add(g);
        yuzenler.push({ id: y.id, grup: g, z: y.z, faz: y.faz, nx: y.nx, ny: y.ny, boy: y.boy, ic: Y.doluKutu(im[y.id]), taban: new T.Vector3() });
      });
      G.model(kip.model, modelGeldi);
    }
    if (idler.length) gorselYukle(idler, gorselGeldi); else gorselGeldi({});

    kok.addEventListener('resize', function () { olcIste(); kaydirma(); });
    kok.addEventListener('orientationchange', olcIste);
    kok.addEventListener('scroll', kaydirma, { passive: true });
    document.addEventListener('visibilitychange', calis);
    if (!AZ) kok.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      d.fxH = (e.clientX / kok.innerWidth) * 2 - 1; d.fyH = (e.clientY / kok.innerHeight) * 2 - 1;
    }, { passive: true });
    if ('IntersectionObserver' in kok) {
      new IntersectionObserver(function (g) { d.gorunur = g[0].isIntersecting; calis(); }, { rootMargin: '80px' }).observe(kap);
    }
    if ('ResizeObserver' in kok) new ResizeObserver(olcIste).observe(kap);
    tuval.addEventListener('webglcontextlost', function (e) { e.preventDefault(); kap.classList.remove('sahne-hazir'); hazir = false; });

    return {
      /* uyum bölümü: halka yeri ve bolluğu. bolge: 'omuz' | 'gogus' | 'bel', uyum: 'dar' | 'tam' | 'bol' */
      ayarla: function (a) {
        if (!pr) { ilk = a; bolgeSimdi = a.bolge; return; }
        halkaHedef(a.bolge, a.uyum);
        if (hazir && (AZ || !raf)) kare(performance.now());
      },
      bilgi: function () { return { cagri: ciz.info.render.calls, ucgen: ciz.info.render.triangles, yer: d.yer, yuzen: d.yuzenBilgi, ortancaMs: d.ortancaMs, W: W, H: H }; },
      fps: function () {
        if (!d.kareler.length) return 0;
        var t = 0; d.kareler.forEach(function (x) { t += x; });
        return Math.round(1000 / (t / d.kareler.length));
      },
      calisiyor: function () { return hazir && d.gorunur && !AZ; },
      halka: function () { return { y: hK.y, gen: hK.gen, cz: hK.cz, kol: kolOne, gecis: !!gS }; } /* denetim: bölge geçişinin ara hâli */
    };
  }

  kok.KSAHNE = { kur: kur, azalt: AZ };
})(this);
