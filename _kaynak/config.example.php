<?php
// ÖRNEK. Bu dosyayı depoya gerçek değerlerle KOYMAYIN.
// Sunucuda şu yola kopyalayın (public_html'in BİR ÜST klasörü):
//   /home/<kullanıcı>/domains/<alan-adınız>/kabin-private/config.php   (izin: 600)
// Gizli anahtar üretmek için: python3 -c "import secrets; print(secrets.token_hex(32))"
declare(strict_types=1);

return [
    // IP özetleri (HMAC) için gizli anahtar: en az 32 karakter, rastgele. Örnek değeri mutlaka değiştirin.
    'secret' => 'DEGISTIR-en-az-32-karakter-rastgele-deger-uretin',
    // Yeni başvuru bildirimi gidecek adres. Boş bırakılırsa bildirim gönderilmez.
    'notify_to' => 'basvuru@alanadiniz.com',
    // Gönderen adres: Hostinger'de bu alan adına ait gerçek bir posta kutusu olmalı (SPF/DKIM için).
    'mail_from' => 'no-reply@alanadiniz.com',
    // İzinli alan adları (Host / Origin denetimi). www kullanıyorsanız ikisini de yazın.
    'allowed_hosts' => ['alanadiniz.com', 'www.alanadiniz.com'],
    // Başvuruları açmak için true yapın. Yasal metinlerde eksik alan varsa yine de kapalı kalır.
    'accepting' => false,
    // Beta bekleme listesini açmak için true yapın (kunye.json "beta_listesi": true da gerekir).
    // Pilot formunun hukuk kapısından bağımsızdır.
    'beta_accepting' => false,
    // Tüm site için 24 saatte kabul edilecek en fazla deneme (kötüye kullanıma karşı tavan).
    // Reklam döneminde beta listesi için yükseltin (ör. 2000); üst sınır 10000.
    'daily_cap' => 300,
    // Yalnız yerel testte false yapın.
    'require_https' => true,
];
