<?php
declare(strict_types=1);

/** Karakter sayısı (mbstring yoksa da çalışır). Girdi geçerli UTF-8 olmalı. */
function kabin_uzunluk(string $s): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($s, 'UTF-8');
    }
    return (int) preg_match_all('/./us', $s);
}

/**
 * Serbest metni temizler: geçersiz UTF-8 reddedilir, denetim/görünmez karakterler atılır
 * (çok satırlıda yalnız \n kalır), NFC'ye normalleştirilir, uzunluk sınırı uygulanır.
 */
function kabin_metin(mixed $v, int $min, int $max, bool $cokSatir = false): ?string
{
    if (!is_string($v) || strlen($v) > $max * 4 || preg_match('//u', $v) !== 1) {
        return null;
    }
    if ($cokSatir) {
        $v = str_replace(["\r\n", "\r"], "\n", $v);
        $v = (string) preg_replace('/(?!\n)\p{C}/u', '', $v);
        $v = (string) preg_replace("/\n{3,}/", "\n\n", $v);
    } else {
        $v = (string) preg_replace('/\p{C}/u', '', $v);
        $v = (string) preg_replace('/\s+/u', ' ', $v);
    }
    $v = trim($v);
    if (class_exists('Normalizer')) {
        $n = Normalizer::normalize($v, Normalizer::FORM_C);
        if (is_string($n)) {
            $v = $n;
        }
    }
    $len = kabin_uzunluk($v);
    return ($len < $min || $len > $max) ? null : $v;
}

function kabin_eposta(mixed $v): ?string
{
    $s = kabin_metin($v, 6, 254);
    if ($s === null || filter_var($s, FILTER_VALIDATE_EMAIL) === false) {
        return null;
    }
    return strtolower($s);
}

/** @param list<string> $izinli */
function kabin_secim(mixed $v, array $izinli): ?string
{
    return (is_string($v) && in_array($v, $izinli, true)) ? $v : null;
}

function kabin_onay(mixed $v): bool
{
    return $v === 'evet';
}

/**
 * @param array<array-key, mixed> $p
 * @return array{ad: string, sirket: string, eposta: string, kategori: string, mesaj: string, aydinlatma: bool}|null
 */
function kabin_pilot_dogrula(array $p): ?array
{
    $ad = kabin_metin($p['ad'] ?? null, 2, 100);
    $sirket = kabin_metin($p['sirket'] ?? null, 2, 120);
    $eposta = kabin_eposta($p['eposta'] ?? null);
    $kategori = kabin_secim($p['kategori'] ?? null, ['kadin', 'erkek', 'unisex', 'spor', 'diger']);
    $mesaj = kabin_metin($p['mesaj'] ?? '', 0, 1000, true);
    if ($ad === null || $sirket === null || $eposta === null || $kategori === null || $mesaj === null) {
        return null;
    }
    if (!kabin_onay($p['aydinlatma'] ?? null)) {
        return null;
    }
    return [
        'ad' => $ad,
        'sirket' => $sirket,
        'eposta' => $eposta,
        'kategori' => $kategori,
        'mesaj' => $mesaj,
        'aydinlatma' => true,
    ];
}
