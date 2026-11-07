<?php
declare(strict_types=1);

/** kabin-private/veri: yalnız sahibinin okuyabildiği (0700) dizin. */
function kabin_veri_dizini(): string
{
    $d = kabin_ozel_dizin() . '/veri';
    if (!is_dir($d)) {
        $old = umask(0077);
        $ok = mkdir($d, 0700, true);
        umask($old);
        if (!$ok && !is_dir($d)) {
            throw new RuntimeException('veri dizini oluşturulamadı');
        }
    }
    return $d;
}

/**
 * Dosyayı özel kilitle (flock LOCK_EX) açar ve $fn'i çalıştırır. Yeni dosyalar 0600 oluşur.
 *
 * @template T
 * @param callable(resource): T $fn
 * @return T
 */
function kabin_kilitli(string $path, callable $fn): mixed
{
    $old = umask(0077);
    $fh = fopen($path, 'c+');
    umask($old);
    if ($fh === false) {
        throw new RuntimeException('dosya açılamadı');
    }
    try {
        if (!flock($fh, LOCK_EX)) {
            throw new RuntimeException('dosya kilitlenemedi');
        }
        return $fn($fh);
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

/**
 * Kayan pencereli hız sınırı. Anahtar, IP'nin HMAC özetidir (IP'nin kendisi yazılmaz).
 * Kayıtlar 24 saatten eskiyse silinir. Sınır aşıldıysa false döner; aksi hâlde denemeyi kaydeder.
 */
function kabin_sinir_izin(string $anahtar, int $saatlik, int $gunlukGenel): bool
{
    $path = kabin_veri_dizini() . '/sinir.json';
    return kabin_kilitli($path, static function ($fh) use ($anahtar, $saatlik, $gunlukGenel): bool {
        $raw = stream_get_contents($fh);
        $data = json_decode(is_string($raw) && $raw !== '' ? $raw : '{}', true);
        if (!is_array($data)) {
            $data = [];
        }
        $now = time();
        $temiz = [];
        foreach ($data as $k => $list) {
            if (!is_string($k) || !is_array($list)) {
                continue;
            }
            $kalan = array_values(array_filter($list, static fn ($t): bool => is_int($t) && $t > $now - 86400));
            if ($kalan !== []) {
                $temiz[$k] = $kalan;
            }
        }
        $benim = $temiz[$anahtar] ?? [];
        $sonSaat = count(array_filter($benim, static fn (int $t): bool => $t > $now - 3600));
        $genel = count($temiz['_genel'] ?? []);
        $izin = $sonSaat < $saatlik && $genel < $gunlukGenel;
        if ($izin) {
            $temiz[$anahtar][] = $now;
            $temiz['_genel'][] = $now;
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($temiz, JSON_THROW_ON_ERROR));
        fflush($fh);
        return $izin;
    });
}

/**
 * Başvuruyu JSONL dosyasına ekler. $tekil ise aynı e-postayla önceki kayıt varsa eklemez.
 *
 * @param array<string, string|bool> $kayit
 * @return bool yeni kayıt eklendiyse true
 */
function kabin_kaydet(string $tur, array $kayit, bool $tekil): bool
{
    if (!in_array($tur, ['beta', 'pilot'], true)) {
        throw new InvalidArgumentException('tür');
    }
    $path = kabin_veri_dizini() . '/basvurular-' . $tur . '.jsonl';
    return kabin_kilitli($path, static function ($fh) use ($kayit, $tekil): bool {
        if ($tekil) {
            rewind($fh);
            while (($line = fgets($fh)) !== false) {
                $r = json_decode($line, true);
                if (is_array($r) && ($r['eposta'] ?? null) === $kayit['eposta']) {
                    return false;
                }
            }
        }
        fseek($fh, 0, SEEK_END);
        $satir = json_encode($kayit, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        fwrite($fh, $satir . "\n");
        fflush($fh);
        return true;
    });
}
