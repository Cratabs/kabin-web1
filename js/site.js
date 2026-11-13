/* Kabin web · Yön D · sayfa kurulumu: giriş yerleşimi, yedek çizim, 3B sahnelerin ertelenmiş yüklenmesi, telefon ekranları, adım izleme, belirme.
   Klasik betik. Dış istek yok. Form gönderimi /app.js'te (kaynak: _kaynak/app.ts). three.js ve sahne betikleri ilk boyamadan SONRA yüklenir; o ana kadar (ve WebGL yoksa,
   ?3b=0'da, yavaş cihazda) yerinde durağan çizim (HTML'e gömülü SVG) görünür, sahne gelince yumuşakça yerini alır. */
(function (kok) {
  'use strict';
  var d = document, kokEl = d.documentElement;
  /* sonradan yüklenen betikler bu dosyanın sürüm ekini (?v=…, build.py yazar) taşır: 30 günlük önbellek eski sahneyi tutmasın */
  var SURUM = ((d.currentScript && d.currentScript.src.match(/\?v=[0-9a-f]+/)) || [''])[0];
  var E = kok.KEKRAN_D, EK = kok.KEKRAN_EK, C = kok.KCIZIM, Y = kok.KYER;
  var AZ = kok.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hepsi(s, k) { return [].slice.call((k || d).querySelectorAll(s)); }
  function sonraki(f) { kok.requestAnimationFrame(function () { setTimeout(f, 0); }); }

  /* telefon çerçeveleri px ile çizilir; kök yazı boyuyla aynı oranda büyüsün */
  function olcek() { kokEl.style.setProperty('--z', (parseFloat(getComputedStyle(kokEl).fontSize) / 16).toFixed(4)); }
  olcek();
  if (AZ) kokEl.classList.add('azalt');

  /* yedek çizim HTML'de gömülü; yoksa (eski sayfa) burada çizilir */
  if (C) hepsi('.sahne-yedek').forEach(function (el) { if (!el.firstElementChild) el.innerHTML = C.buyuk('c-web'); });
  if (E) hepsi('[data-bolge]').forEach(function (el) { var p = el.getAttribute('data-bolge').split(':'); el.outerHTML = E.bolge(p[0], p[1]); });

  /* 3B desteği: WebGL var mı, ?3b=0 değil mi. Ekran kartı olmayan ortamda (yazılımla çizim: SwiftShader, llvmpipe…) her kare
     ana iş parçacığını uzun süre tutar; orada 3B hiç başlatılmaz, durağan çizim kalır. Testler __kabin3bZorla ile açar. */
  function webgl() {
    try {
      var c = d.createElement('canvas'), g = kok.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
      if (!g) return false;
      if (kok.__kabin3bZorla) return true;
      var e = g.getExtension('WEBGL_debug_renderer_info'), ad = e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : '';
      return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(ad);
    } catch (h) { return false; }
  }
  var var3b = webgl() && !/[?&]3b=0/.test(location.search);
  if (!var3b) kokEl.classList.add('sahnesiz');

  /* GİRİŞ YERLEŞİMİ (her boyutta, kırılma noktası yok): kart gelince yazıyla çakışacaksa yazı çekilir (.kart-yazi);
     yedek çizim yazı bloğunun ve (durağan hâllerde) kartın dışına, başlığın altına sığdırılır. 3B sahne kendi yerini js/sahne.js'te hesaplar. */
  function durgun() { return /\b(sahnesiz|azalt|betiksiz)\b/.test(kokEl.className); }
  function yedekYer(kap, yedek, engel, ust, alt) {
    if (!Y || !yedek) return;
    ['left', 'top', 'width', 'height', 'transform', 'right', 'bottom'].forEach(function (k) { yedek.style.removeProperty(k); });
    var kr = kap.getBoundingClientRect(), r = Y.kutuOf(yedek, kr);
    if (!r) return;
    var t = { cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2, h: r.y1 - r.y0 };
    var y = Y.yerlestir({ W: kr.width, H: kr.height, pr: Y.KARE, tercih: t, hEnAz: t.h * 0.4, ust: ust, alt: alt, kenar: 8, engel: engel, pay: 6 });
    if (y.tam) return;
    var st = { left: (y.cx - y.h / 2).toFixed(1) + 'px', top: (y.cy - y.h / 2).toFixed(1) + 'px', width: y.h.toFixed(1) + 'px', height: y.h.toFixed(1) + 'px', transform: 'none', right: 'auto', bottom: 'auto' };
    for (var k in st) yedek.style.setProperty(k, st[k]);
  }
  function girisYer() {
    var g = d.querySelector('.giris-sabit');
    if (g && Y) {
      var kr = g.getBoundingClientRect(), T = Y.kutuOf(g.querySelector('.giris-yazi'), kr), K = Y.kutuOf(g.querySelector('.giris-kart'), kr, true);
      var B = Y.kutuOf(g.querySelector('[data-baslik]'), kr);
      g.classList.toggle('kart-yazi', kr.width >= 720 && !!T && !!K && T.x1 + 24 > K.x0);
      var en = [];
      if (T) en.push(Y.buyut(T, 16));
      if (K && (durgun() || g.classList.contains('sahne-yavas')) && !g.classList.contains('kart-yazi') && getComputedStyle(g.querySelector('.giris-kart')).display !== 'none') en.push(Y.buyut(K, 16));
      yedekYer(g, g.querySelector('.sahne-yedek'), en, B ? B.y1 + 8 : 0, kr.height - 8);
    }
    var m = d.querySelector('.m-giris');
    if (m && Y) {
      var mr = m.getBoundingClientRect(), en2 = [], M = Y.kutuOf(m.querySelector('.m-yazi'), mr), U = Y.kutuOf(d.querySelector('.ust-bilgi .kap'), mr);
      if (M) en2.push(Y.buyut(M, 16));
      hepsi('[data-maske]', m).forEach(function (el) { Y.metin(el, mr).forEach(function (r) { en2.push(Y.buyut(r, 16)); }); });
      yedekYer(m, m.querySelector('.sahne-yedek'), en2, U ? U.y1 + 8 : 0, mr.height - 8);
    }
  }
  var yerBekle = false;
  function yerIste() { if (!yerBekle) { yerBekle = true; kok.requestAnimationFrame(function () { yerBekle = false; olcek(); girisYer(); }); } }
  kok.__kabinYer = yerIste;
  girisYer();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(yerIste);
  kok.addEventListener('resize', yerIste);
  kok.addEventListener('orientationchange', yerIste);

  /* ?fps=1: köşede kare hızı (taslak denetimi) */
  var sahneler = {};
  kok.__kabinSahne = sahneler;
  if (/[?&]fps=1/.test(location.search)) {
    var g = d.createElement('div');
    g.className = 'fps-gosterge'; /* görünüşü css/temel.css */
    d.body.appendChild(g);
    setInterval(function () { g.textContent = Object.keys(sahneler).map(function (k) { return k + ' ' + sahneler[k].fps() + ' fps'; }).join(' · '); }, 500);
  }

  /* adımlar: üç ekran üst üste; görünen adımın ekranı açılır */
  var teller = d.querySelector('[data-adim-teller]');
  if (teller && E && EK) {
    teller.innerHTML = EK.olcu() + EK.bul() + E.cevap();
    var tl = hepsi('.tel', teller), adimlar = hepsi('.adim');
    var sec = function (i) {
      tl.forEach(function (t, k) { t.classList.toggle('on', k === i); });
      adimlar.forEach(function (a, k) { a.classList.toggle('on', k === i); });
    };
    sec(0);
    if ('IntersectionObserver' in kok && kok.matchMedia('(min-width: 900px)').matches) {
      var io = new IntersectionObserver(function (gir) {
        gir.forEach(function (g2) { if (g2.isIntersecting) sec(+g2.target.getAttribute('data-adim')); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      adimlar.forEach(function (a) { io.observe(a); });
    } else if (AZ || !('IntersectionObserver' in kok)) {
      /* dar ekran, hareket azaltma: adımlar düz liste; adıma dokununca alttaki ekran değişir */
      adimlar.forEach(function (a, k) { a.classList.add('on'); a.addEventListener('click', function () { sec(k); adimlar.forEach(function (x) { x.classList.add('on'); }); }); });
    } else {
      /* dar ekran: maket üstte sabit, altında yalnız etkin adım; kaydırdıkça 1 → 2 → 3 (css/bolum.css .adimlar.kay) */
      var bolum = d.querySelector('.adimlar'), izg = bolum.querySelector('.adim-izgara'), panel = bolum.querySelector('.adim-panel');
      var cen = d.createElement('div'), simdi = -1, bekle = false;
      cen.className = 'adim-centik'; cen.setAttribute('aria-hidden', 'true');
      cen.innerHTML = adimlar.map(function () { return '<i></i>'; }).join('');
      izg.appendChild(cen);
      var cl = hepsi('i', cen), dar = kok.matchMedia('(max-width: 899px)');
      var sig = function () { /* maket panele tam sığsın: üstten kesilmez */
        if (!dar.matches) { teller.style.zoom = ''; return; }
        teller.style.zoom = Math.max(0.3, Math.min((panel.clientHeight - 16) / 640, (panel.clientWidth - 32) / 360)).toFixed(3);
      };
      var iz = function () {
        bekle = false;
        if (!dar.matches) return;
        var r = bolum.getBoundingClientRect(), yol = r.height - izg.offsetHeight;
        var i = yol > 0 ? Math.floor(Math.min(0.999, Math.max(0, -r.top / yol)) * adimlar.length) : 0;
        if (i === simdi) return;
        simdi = i; sec(i);
        cl.forEach(function (c, k) { c.classList.toggle('on', k === i); });
      };
      bolum.classList.add('kay');
      sig(); iz();
      kok.addEventListener('scroll', function () { if (!bekle) { bekle = true; kok.requestAnimationFrame(iz); } }, { passive: true });
      kok.addEventListener('resize', function () { sig(); simdi = -1; iz(); });
    }
  }

  /* uygulama ekranları */
  var serit = d.querySelector('[data-tel-serit]');
  if (serit && E) serit.innerHTML = E.ana('aski') + E.dolap(); /* Ana: askı şeridi (uygulamadaki vitrin). Cevap ekranı adımlarda var, burada yinelenmez. */

  /* dolap rayı */
  var ray = d.querySelector('[data-ray]');
  if (ray && kok.KASKI) ray.innerHTML = kok.KASKI.serit('kesim', 'Dolaptaki parçalar');
  if (kok.KASKI) kok.KASKI.hepsi(d);
  if (ray) { /* geniş rayda ortadan başla: iki yanda da parça görünsün */
    var ul = ray.querySelector('.aski-liste'), o = ul && ul.children[3];
    if (o) ul.scrollLeft = o.offsetLeft + o.offsetWidth / 2 - ul.clientWidth / 2;
  }

  /* dar · tam · bol (3B sahne sonradan bağlanır) */
  var uyumEl = d.querySelector('[data-uyum]'), uyum = null;
  if (uyumEl && kok.KUYUM) uyum = kok.KUYUM.kur(uyumEl, null);

  /* markalar sayfası: mağaza örneği */
  if (kok.KMAGAZA) hepsi('[data-magaza]').forEach(kok.KMAGAZA.kur);

  /* kaydırınca belirme */
  var bel = hepsi('.belir');
  if ('IntersectionObserver' in kok && !AZ) {
    var io2 = new IntersectionObserver(function (gir) {
      gir.forEach(function (g3) { if (g3.isIntersecting) { g3.target.classList.add('gor'); io2.unobserve(g3.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    bel.forEach(function (b) { io2.observe(b); });
  } else bel.forEach(function (b) { b.classList.add('gor'); });

  /* 3B: ilk boyamadan sonra kütüphane + sahne betikleri sırayla yüklenir */
  var DOSYA = ['/js/vendor/three.min.js', '/js/sahne-geo.js', '/js/sahne-serit.js', '/js/sahne.js'].map(function (y) { return y + SURUM; });
  function sahneKur() {
    var S = kok.KSAHNE;
    if (!S) { kokEl.classList.add('sahnesiz'); yerIste(); return; }
    hepsi('[data-sahne]').forEach(function (kap) {
      if (!kap.offsetWidth) return; /* gizli sahne kurulmaz */
      var s = S.kur(kap);
      if (s) sahneler[kap.getAttribute('data-sahne')] = s; else { kokEl.classList.add('sahnesiz'); yerIste(); }
    });
    if (uyum && sahneler.uyum) uyum.bagla(sahneler.uyum);
  }
  if (var3b && hepsi('[data-sahne]').length) sonraki(function () {
    var kalan = DOSYA.length, hata = false;
    DOSYA.forEach(function (yol) {
      var b = d.createElement('script');
      b.src = yol; b.async = false; /* sırayla çalışsınlar */
      b.onload = function () { if (--kalan === 0 && !hata) sahneKur(); };
      b.onerror = function () { if (!hata) { hata = true; kokEl.classList.add('sahnesiz'); yerIste(); } };
      d.body.appendChild(b);
    });
  });
})(this);
