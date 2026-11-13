/* Kabin web · Yön D · mezura şeridinin hareketi.
   Şerit = serbest uç (başlığın altından gelir) + giysinin gövdesini saran halka. Gevşek hâlde halka yarım turdur (etek hizasında, önden geçen tek kıvrım);
   sarılırken önce tur tamamlanır, sonra halka etekten göğse çıkar ve daralır (gerçekte mezura da alttan geçirilir): giysinin ya da kolların içinden geçmez. Halka ölçüleri (yükseklik, yarıçap, sarkma) dışarıdan verilir: uyum bölümü bunu oynatır. */
(function (kok) {
  'use strict';
  var T = kok.THREE;
  if (!T) return;

  function yumusak(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* Çoklu çizgiyi eşit aralıklı N noktaya indirger; toplam uzunluğu döndürür. cik: önceden ayrılmış Vector3 dizisi. */
  function esitle(ham, n, cik, uzun) {
    var m = ham.length, top = 0, i;
    uzun[0] = 0;
    for (i = 1; i < m; i++) { top += ham[i].distanceTo(ham[i - 1]); uzun[i] = top; }
    var j = 1;
    for (i = 0; i < n; i++) {
      var s = (i / (n - 1)) * top;
      while (j < m - 1 && uzun[j] < s) j++;
      var a = uzun[j - 1], b = uzun[j], k = b > a ? (s - a) / (b - a) : 0;
      cik[i].lerpVectors(ham[j - 1], ham[j], k);
    }
    return top;
  }

  function dizi(n) { var a = []; for (var i = 0; i < n; i++) a.push(new T.Vector3()); return a; }

  function olustur(ayar) {
    var N = ayar.N || 300, HALKA = 150, GELIS = 90, A0 = Math.PI * 0.8;
    var B = dizi(N), W = dizi(N), ham = dizi(GELIS + HALKA), uzun = new Float32Array(GELIS + HALKA);
    var kafa = [], on1 = new T.Vector3(), on2 = new T.Vector3(), on3 = new T.Vector3(), bas = new T.Vector3();
    var Z = new T.Vector3(0, 0, 1), t = new T.Vector3(), yan = new T.Vector3(), yukari = new T.Vector3(), q = new T.Vector3();

    /* serbest ucun uzak kısmı (dünya koordinatı denetim noktaları; başlığın altından ya da ekranın dışından gelir) */
    /* tavan: { y, uzak } verilirse serbest uç başlığın alt çizgisinin üstüne çıkmaz (harflerin arasına girip kesik kesik görünmesin).
       y: z = 0 derinliğindeki en yüksek dünya y'si; z derinliğinde (uzak - z) / uzak ile ölçeklenir (aynı ekran çizgisi). */
    var tavan = null, egri = new T.CatmullRomCurve3([], false, 'centripetal');
    function yolGelis(noktalar, tv) { kafa = noktalar; tavan = tv || null; }
    function halkaNokta(h, f, zaman, cik) {
      var a = A0 - f * Math.PI * 2 * h.tur, co = Math.cos(a), si = Math.sin(a), on = 0.5 + 0.5 * si;
      var r = h.gen * (1.03 - 0.03 * f); /* uç, gelen şeridin altında kalır */
      /* süper-elips: gövdenin kesitine yakın, köşeleri yuvarlak dikdörtgen (kollar halkanın DIŞINDA kalır); yon = -1 ise şerit sağdan gelir */
      return cik.set(h.cx + h.yon * h.rx * r * (co < 0 ? -1 : 1) * Math.pow(Math.abs(co), 0.62),
        h.y - h.sark * on + h.egik * co + h.dalga * Math.sin(a * 3 + zaman * 0.9),
        h.cz + h.rz * r * (si < 0 ? -1 : 1) * Math.pow(Math.abs(si), 0.62) + h.dalga * 0.6 * Math.cos(a * 2 + zaman * 0.7));
    }

    /* h: { y, cx, cz, rx, rz, gen, egik, sark, dalga, tur, yon } giysi-yerel (gen: genişleme çarpanı, tur: kaç tur sarılı);
       mat: giysinin dünya matrisi; zaman: sn. Şeridin uzunluğunu döndürür. */
    function kare(h, mat, zaman) {
      var i, j;
      /* halkaya giriş: sol ön köşeden, halkaya teğet (yatay) gelir; kolun ÖNÜNDEN geçer */
      halkaNokta(h, 0, zaman, bas);
      /* bölge geçişinde (h.kuyruk > 0) halka açılınca giriş kıvrımı yana daralır: h.kenar'ı (panel sınırı, model-yerel x) geçmez. Dinlenikte k = 1. */
      var k = 1;
      if (h.kuyruk > 0 && h.kenar != null) k = 1 - h.kuyruk * (1 - Math.max(0.1, Math.min(1, h.yon * (bas.x - h.kenar) / 0.8)));
      on1.set(bas.x - h.yon * 0.32 * k, bas.y + 0.01, bas.z + 0.07).applyMatrix4(mat);
      on2.set(bas.x - h.yon * 0.62 * k, bas.y + 0.22 + 0.25 * (1 - k), bas.z + 0.24).applyMatrix4(mat); /* daralınca daha dik yükselir */
      on3.set(bas.x - h.yon * 0.8 * k, bas.y + 0.85 + 0.5 * (1 - k), bas.z + 0.34).applyMatrix4(mat); /* yukarı döner: yandaki yazının üstüne taşmaz */
      bas.applyMatrix4(mat);
      egri.points = kafa.concat([on3, on2, on1, bas]);
      for (i = 0; i < GELIS; i++) {
        egri.getPoint(i / (GELIS - 1), ham[i]);
        if (tavan) { var lim = tavan.y * (tavan.uzak - ham[i].z) / tavan.uzak; if (ham[i].y > lim) ham[i].y = lim; }
      }
      for (j = 0; j < HALKA; j++) halkaNokta(h, (j + 1) / HALKA, zaman, q), ham[GELIS + j].copy(q.applyMatrix4(mat));
      var Lgelis = 0;
      for (i = 1; i < GELIS; i++) Lgelis += ham[i].distanceTo(ham[i - 1]);
      var LB = esitle(ham, N, B, uzun), halkaBas = Lgelis / LB;
      yukari.set(0, 1, 0).transformDirection(mat);
      for (i = 0; i < N; i++) {
        var u = i / (N - 1), o = Math.max(0, i - 1), s = Math.min(N - 1, i + 1);
        t.subVectors(B[s], B[o]).normalize();
        yan.crossVectors(Z, t).multiplyScalar(h.yon); /* serbest uçta şerit yüzü kameraya bakar; halkadaki yönle aynı tarafta: yüz ters dönmez */
        if (yan.lengthSq() < 1e-5) yan.copy(yukari);
        yan.normalize();
        var halka = yumusak((u - halkaBas) / 0.14 + 1), bur = 0.3 * Math.sin(u * 5 + zaman * 0.22) * (1 - halka);
        yan.multiplyScalar(Math.cos(bur)).addScaledVector(Z, Math.sin(bur));
        W[i].lerpVectors(yan, yukari, halka).normalize();
        if (halka < 1) B[i].y += (1 - halka) * ayar.dalga * 0.5 * Math.sin(u * 8.5 - zaman * 0.55);
      }
      return LB;
    }

    return { C: B, W: W, N: N, yolGelis: yolGelis, kare: kare };
  }

  kok.KSERIT = { olustur: olustur, yumusak: yumusak };
})(this);
