/* Kabin web · betikle çizilen örnek ekranların dili. Türkçe sayfada (lang="tr") hiçbir şey değişmez; İngilizce sayfada (lang="en")
   aşağıdaki sözlükteki karşılık yazılır. Sözlükte olmayan metin olduğu gibi kalır. Kaynak: onaylı İngilizce metin listesi.
   KDIL(metin): tek metin. KDIL.html(html): bir HTML dizgisindeki metin parçalarını ve aria-label / alt değerlerini çevirir. */
(function (kok) {
  'use strict';
  var EN = {
    /* ortak */
    'dar': 'tight', 'tam': 'right', 'bol': 'loose',
    'Omuz': 'Shoulders', 'Göğüs': 'Chest', 'Bel': 'Waist', 'Basen': 'Hips',
    'Önerimiz': 'We suggest', 'Örnek.': 'Example.', 'Bedenler': 'Sizes',
    'Öneri tahmindir, garanti değildir.': 'The suggestion is an estimate, not a guarantee.',
    'Göğüste tam oturur, belde rahat kalır.': 'Sits right at the chest, easy at the waist.',
    /* uyum kartı */
    'Beden seçin': 'Choose a size',
    'S omuzda ve göğüste dar kalır.': 'S is tight at the shoulders and chest.',
    'L her yerde bol durur.': 'L is loose all over.',
    'Omuza, göğse ya da bele basın. Mezura oraya gider.': 'Tap shoulders, chest or waist. The tape goes there.',
    /* dolap rayı ve parça adları */
    'Dolaptaki parçalar': 'Clothes in the wardrobe', 'Dolabındaki parçalar': 'Clothes in the wardrobe',
    'Lacivert ceket': 'Navy jacket', 'Keten gömlek': 'Linen shirt', 'Kahve chino': 'Brown chinos', 'Örgü kazak': 'Knit sweater',
    'Kiremit elbise': 'Terracotta dress', 'Haki ceket': 'Khaki jacket', 'Siyah elbise': 'Black dress', 'Bordo kazak': 'Burgundy sweater',
    'Açık mavi gömlek': 'Light blue shirt', 'Taş rengi etek': 'Stone skirt',
    ', kullanıcının çektiği fotoğraf': ', photo taken by the user', ', mağaza görseli': ', store image',
    /* telefon: sekmeler ve ortak adlar */
    'Ana': 'Home', 'Dolap': 'Wardrobe', 'Sosyal': 'Social', 'Profil': 'Profile', 'Sekmeler': 'Tabs',
    'Geri': 'Back', 'İleri': 'Next', 'Ara': 'Search', 'Süz': 'Filter', 'Tür': 'Type', 'Seçili': 'Selected', 'Parça ekle': 'Add an item', 'Vitrin': 'Picks',
    /* telefon: ölçü */
    'Ölçülerim': 'My measurements', 'Mezurayla ölçün': 'Measure with a tape', 'Kaydet': 'Save',
    'Ölçüleriniz yalnız sayı olarak saklanır.': 'Your measurements are stored as numbers only.', 'Mezuram yok': 'I don’t have a tape',
    /* telefon: beden bul */
    'Beden bul': 'Find a size', 'Hangi ürün?': 'Which item?', 'ornekmagaza.example/keten-gomlek': 'samplestore.example/linen-shirt',
    'Bedenimi göster': 'Show my size', 'Mağazadaki ürün sayfasının bağlantısını yapıştırın.': 'Paste the link to the item’s page in the store.',
    'Son baktıklarınız': 'Recently viewed', 'Bedeniniz: M': 'Your size: M', 'Bedeniniz: 32': 'Your size: 32', 'Emin': 'Sure', 'Tahmini': 'Estimate',
    /* telefon: cevap */
    'Beden': 'Size', 'Örnek Mağaza · üst giyim': 'Sample Store · tops', 'Beden önerisi': 'Size suggestion',
    'Mezura · ürüne özel tablo · onaylı': 'Tape · item’s own chart · confirmed', 'M bedenin uyumu': 'How M fits',
    'M’nin beli ölçünüzden 4 cm geniş.': 'M is 4 cm wider than your waist.', 'M ile L arasında': 'Between M and L',
    'Göğüste tam, belde biraz bol.': 'Right at the chest, a little loose at the waist.', 'Göğüste bol, belde bol.': 'Loose at the chest, loose at the waist.',
    'Bu kalıpta genelde hangisini alırsınız? Öneri değişmez.': 'Which do you usually buy in this cut? The suggestion stays the same.',
    'Bir küçük alırım': 'One size down', 'Bir büyük alırım': 'One size up', 'Mağazaya dön': 'Back to the store',
    /* telefon: ana */
    'Bugün': 'Today', '· 3 parça': '· 3 pieces', 'Kombin öner': 'Suggest an outfit', 'İstanbul 10° · parçalı bulutlu': 'Istanbul 10° · partly cloudy',
    'Bugün ne giysem?': 'What should I wear today?', '31 Ekim · 3 ölçü': '31 October · 3 measurements',
    'Mert soruyor: Hangisi?': 'Mert asks: Which one?', 'dün · 2 kişi': 'yesterday · 2 people',
    /* telefon: dolap */
    '14 parça': '14 pieces', 'Dolabında ara': 'Search your wardrobe',
    'Hepsi': 'All', 'Üst': 'Tops', 'Alt': 'Bottoms', 'Elbise': 'Dresses', 'Dış giyim': 'Outerwear', 'Çanta': 'Bags',
    '1 seçili': '1 selected', 'Kombin kur': 'Build an outfit',
    /* markalar: mağaza örneği */
    'magazaniz.com/lacivert-ceket': 'yourstore.com/navy-jacket', 'Mağazanın beden seçicisi': 'The store’s size picker',
    'Bedenimi bul': 'Find my size', 'Sepete ekle': 'Add to cart', 'Kabin beden aracı': 'Kabin size tool',
    'Omuzda ve göğüste tam, belde rahat.': 'Right at the shoulders and chest, easy at the waist.', 'M’yi seç': 'Choose M'
  };
  var en = document.documentElement.lang === 'en';
  function cevir(s) { return en && Object.prototype.hasOwnProperty.call(EN, s) ? EN[s] : s; }
  /* baştaki ve sondaki boşluk korunur: "<b>Bugün</b> · 3 parça" gibi parçalı satırlar bozulmaz */
  function parca(s) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    return m[1] + cevir(m[2]) + m[3];
  }
  cevir.html = function (html) {
    if (!en) return html;
    return html
      .replace(/>([^<>]+)</g, function (_, t) { return '>' + parca(t) + '<'; })
      .replace(/(aria-label|alt)="([^"]+)"/g, function (_, ad, deger) { return ad + '="' + cevir(deger) + '"'; });
  };
  kok.KDIL = cevir;
})(this);
