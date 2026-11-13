/* Kabin web · Yön D · 3B sahne parçaları (three.js).
   Gömlek (gerçek fotoğraftan çıkarılan hacimli ağ) ve askı kancası = Blender modeli (model/gomlek.gltf + .bin + .jpg) · mezura = eğri boyunca süpürülen şerit (her karede yeniden kurulur) · çakıl = gürültüyle yoğrulmuş küre (D'deki pastel leke)
   · yüzen giysi = kesilmiş ürün fotoğrafı, hafif bombeli düzlem + yumuşak gölge. Renkler Yön D token'ları (css/temel.css :root ile aynı değerler; aşağıda RENK). */
(function (kok) {
  'use strict';
  var T = kok.THREE;
  if (!T) return;

  var RENK = { zemin: '#EEF1EA', ton: '#DCE3D8', murekkep: '#161816', blush: '#F0C9C2', mist: '#C9D8F2', butter: '#F2E6C4', beyaz: '#FFFFFF' };

  function gurultu(x, y, z) {
    return Math.sin(x * 1.7 + y * 1.3) * 0.5 + Math.sin(y * 2.1 + z * 1.9 + 1.3) * 0.3 + Math.sin(z * 1.5 + x * 2.3 + 2.1) * 0.2;
  }

  /* Pastel çakıl: mat, hafif yassı, düzensiz. */
  function cakil(renk, tohum) {
    var g = new T.SphereGeometry(1, 56, 40);
    g.rotateY(Math.PI / 2);
    var p = g.attributes.position, v = new T.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      var n = 1 + 0.17 * gurultu(v.x * 1.25 + tohum, v.y * 1.25 - tohum, v.z * 1.25 + tohum * 2);
      p.setXYZ(i, v.x * n, v.y * n * 0.8, v.z * n * 0.5);
    }
    g.computeVertexNormals();
    var m = new T.MeshStandardMaterial({ color: renk, roughness: 0.96, metalness: 0 });
    return new T.Mesh(g, m);
  }

  /* Model (Blender'da üretildi, web-opt/glb.mjs ile üçgen azaltıldı, köşeler KHR_mesh_quantization ile 16/8 bit): gomlek = askıda keten gömlek.
     Yayın yolu: model/gomlek.gltf + gomlek.bin + gomlek.jpg, sıkıştırmasız; doku DIŞ dosya (blob: adresi yok, WebAssembly çözücü yok: CSP'ye uyar).
     Ölçüler metre; ortalanıp boyu 2 birime getirilir. Malzemeler Yön D token'larına çevrilir. bitti(grup, olcek, ortaY) */
  function model(ad, bitti) {
    function kur(g) {
      var kutu = new T.Box3().setFromObject(g.scene), boy = kutu.max.y - kutu.min.y, k = 2 / boy;
      g.scene.traverse(function (o) {
        if (!o.isMesh) return;
        var m = o.material, ad2 = m.name;
        m.side = T.DoubleSide; m.metalness = 0;
        if (ad2 === 'murekkep') { m.color.set(RENK.murekkep); m.roughness = 0.45; }
        else { m.roughness = 1; m.color.setScalar(1.3); if (m.map) m.map.anisotropy = 8; } /* fotoğraf dokusu: sahne ışığında fotoğraftaki açıklığına yakın dursun */
      });
      var ic = new T.Group();
      g.scene.position.set(0, -(kutu.min.y + boy / 2) * k, 0);
      g.scene.scale.setScalar(k);
      ic.add(g.scene);
      bitti(ic, k, kutu.min.y + boy / 2);
    }
    var yk = new T.GLTFLoader(), hata = function () { bitti(null); };
    yk.load('/model/' + ad + '.gltf', kur, undefined, hata);
  }

  /* Mezura dokusu: tereyağı zemin, iki mürekkep kenar, cm çentikleri, 10'da bir sayı. 1 doku = 60 "cm". */
  function mezuraDoku() {
    var c = document.createElement('canvas');
    c.width = 4096; c.height = 128;
    var x = c.getContext('2d'), cm = c.width / 60;
    x.fillStyle = RENK.butter; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = RENK.murekkep;
    x.fillRect(0, 0, c.width, 9); x.fillRect(0, c.height - 9, c.width, 9);
    for (var i = 0; i < 60; i++) {
      var u = Math.round(i * cm), uzun = i % 10 === 0, orta = i % 5 === 0;
      x.fillRect(u - 2, 9, uzun ? 5 : 4, uzun ? 62 : orta ? 44 : 26);
    }
    x.font = '600 54px KabinInter, Inter, system-ui, sans-serif';
    x.textBaseline = 'alphabetic';
    for (var k = 0; k < 6; k++) x.fillText(String((k + 1) * 10 % 60 || 60), Math.round(k * 10 * cm) + 12, 112);
    var t = new T.CanvasTexture(c);
    t.wrapS = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  /* Şerit: N kesit, her kesitte iki köşe. guncelle(merkezler, enler) her karede çağrılır. */
  function serit(N, yariEn, tekrar) {
    var g = new T.BufferGeometry();
    var pos = new Float32Array(N * 2 * 3), nor = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), ix = [];
    for (var i = 0; i < N; i++) {
      var u = (i / (N - 1)) * tekrar;
      uv[i * 4] = u; uv[i * 4 + 1] = 1; uv[i * 4 + 2] = u; uv[i * 4 + 3] = 0;
      if (i < N - 1) { var a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setIndex(ix);
    var m = new T.MeshStandardMaterial({ map: mezuraDoku(), roughness: 0.8, metalness: 0, side: T.DoubleSide });
    var mesh = new T.Mesh(g, m);
    mesh.frustumCulled = false;
    var t = new T.Vector3(), w = new T.Vector3(), n = new T.Vector3();
    mesh.userData.guncelle = function (C, W) {
      for (var i = 0; i < N; i++) {
        var o = Math.max(0, i - 1), s = Math.min(N - 1, i + 1);
        t.subVectors(C[s], C[o]).normalize();
        w.copy(W[i]).addScaledVector(t, -W[i].dot(t));
        if (w.lengthSq() < 1e-6) w.set(0, 1, 0);
        w.normalize();
        n.crossVectors(t, w);
        var k = i * 6;
        pos[k] = C[i].x + w.x * yariEn; pos[k + 1] = C[i].y + w.y * yariEn; pos[k + 2] = C[i].z + w.z * yariEn;
        pos[k + 3] = C[i].x - w.x * yariEn; pos[k + 4] = C[i].y - w.y * yariEn; pos[k + 5] = C[i].z - w.z * yariEn;
        nor[k] = nor[k + 3] = n.x; nor[k + 1] = nor[k + 4] = n.y; nor[k + 2] = nor[k + 5] = n.z;
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.normal.needsUpdate = true;
    };
    /* en ve doku tekrarı: şerit uzunluğu değişince (pencere boyu) çentik aralığı sabit kalsın. 1 doku = 32 × şerit eni */
    mesh.userData.olcu = function (en, boy) { /* her karede: şerit uzasa da çentik aralığı aynı kalır; sıfır ucu giysideki uçtur */
      yariEn = en;
      var tk = boy / (64 * en);
      for (var i = 0; i < N; i++) { uv[i * 4] = uv[i * 4 + 2] = (1 - i / (N - 1)) * tk; }
      g.attributes.uv.needsUpdate = true;
    };
    return mesh;
  }

  /* Giysi: 2×2 birimlik bombeli düzlem (ortası öne), arkasında bulanık gölge. img yüklenmiş <img>. */
  function giysi(img, bombe) {
    var grup = new T.Group();
    var doku = new T.Texture(img);
    doku.colorSpace = T.SRGBColorSpace; doku.anisotropy = 8; doku.needsUpdate = true;
    var g = new T.PlaneGeometry(2, 2, 28, 28), p = g.attributes.position;
    bombe = bombe == null ? 0.22 : bombe;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i);
      p.setZ(i, bombe * (0.5 - x * x) + 0.025 * Math.sin(x * 5 + y * 3));
    }
    g.computeVertexNormals();
    var m = new T.MeshStandardMaterial({ map: doku, roughness: 1, metalness: 0, side: T.DoubleSide, transparent: true, alphaTest: 0.03 }); /* yumuşak kenar: karışımla çizilir (2560'ta tırtık olmasın) */
    var govde = new T.Mesh(g, m);
    govde.renderOrder = 2;
    grup.add(govde);

    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var x2 = c.getContext('2d');
    x2.filter = 'blur(9px)';
    x2.drawImage(img, 14, 14, 228, 228);
    x2.filter = 'none';
    x2.globalCompositeOperation = 'source-in';
    x2.fillStyle = '#263224';
    x2.fillRect(0, 0, 256, 256);
    var gd = new T.CanvasTexture(c);
    var golge = new T.Mesh(new T.PlaneGeometry(2.25, 2.25), new T.MeshBasicMaterial({ map: gd, transparent: true, opacity: 0.2, depthWrite: false }));
    golge.position.set(0.05, -0.07, -0.16);
    golge.renderOrder = 1;
    grup.add(golge);
    grup.userData.govde = govde;
    grup.userData.golge = golge;
    return grup;
  }

  /* Başlık maskesi: yalnız derinlik yazar ve kameranın hemen önünde durur. Hiçbir nesne harflerin olduğu yerde çizilmez:
     alttaki gerçek (DOM) başlık her zaman tam okunur; nesneler başlığın arkasında, yanında ya da altında kalır. */
  function maske(tuval) {
    var d = new T.CanvasTexture(tuval);
    d.minFilter = T.LinearFilter; d.generateMipmaps = false;
    var m = new T.MeshBasicMaterial({ map: d, alphaTest: 0.5, colorWrite: false, transparent: false });
    var mesh = new T.Mesh(new T.PlaneGeometry(1, 1), m);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    return mesh;
  }

  function isik(sahne) {
    sahne.add(new T.HemisphereLight(0xffffff, 0xdce3d8, 2.35));
    var d = new T.DirectionalLight(0xffffff, 1.15);
    d.position.set(-3, 5, 6);
    sahne.add(d);
  }

  kok.KGEO = { RENK: RENK, cakil: cakil, model: model, serit: serit, giysi: giysi, maske: maske, isik: isik };
})(this);
