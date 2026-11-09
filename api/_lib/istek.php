<?php
declare(strict_types=1);

require_once __DIR__ . '/ayar.php';
require_once __DIR__ . '/dogrula.php';
require_once __DIR__ . '/depo.php';

const KABIN_SAATLIK_DENEME = 10;
const KABIN_GOVDE_SINIRI = 16384;

/** Otomatik multipart ayrıştırması kapalıyken yalnız sınırlı metin gövdesini RAM'de okur. */
function kabin_form_oku(bool $json): array
{
    // .user.ini uygulanmamışsa fail closed. Bu ayar ini_set ile geç değiştirilemez.
    if (filter_var(ini_get('enable_post_data_reading'), FILTER_VALIDATE_BOOLEAN)) {
        throw new RuntimeException('gövde yapılandırması');
    }
    $type = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
    if ($type !== 'application/x-www-form-urlencoded') {
        kabin_yanit(415, 'GECERSIZ', $json);
    }
    $raw = file_get_contents('php://input', false, null, 0, KABIN_GOVDE_SINIRI + 1);
    if (!is_string($raw)) {
        throw new RuntimeException('gövde okunamadı');
    }
    if (strlen($raw) > KABIN_GOVDE_SINIRI || substr_count($raw, '&') >= 12) {
        kabin_yanit(413, 'BUYUK', $json);
    }
    parse_str($raw, $form);
    unset($raw);
    foreach ($form as $value) {
        if (!is_string($value)) kabin_yanit(400, 'GECERSIZ', $json);
    }
    return $form;
}

function kabin_json_istiyor(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return is_string($accept) && str_contains($accept, 'application/json');
}

/** Yanıtı yazar ve çıkar. JS isteğine JSON; düz HTML formuna 303 ile sonuç sayfası. Çerez yazılmaz. */
function kabin_yanit(int $status, string $kod, bool $json): never
{
    header_remove('X-Powered-By');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    if ($status === 429) {
        header('Retry-After: 3600');
    }
    if ($status === 405) {
        header('Allow: POST');
    }
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $status === 200, 'kod' => $kod]);
        exit;
    }
    header('Location: ' . ($status === 200 ? '/basvuru-alindi.html' : '/basvuru-hata.html'), true, 303);
    exit;
}

/**
 * İsteğin bu sitenin kendi sayfasından geldiğini doğrular (siteler arası form gönderimine karşı).
 *
 * @param list<string> $hosts
 */
function kabin_kaynak_gecerli(array $hosts, bool $requireHttps): bool
{
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $host = (string) preg_replace('/:\d+$/', '', $host);
    if (!in_array($host, $hosts, true)) {
        return false;
    }
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? null;
    if (is_string($site) && !in_array($site, ['same-origin', 'none'], true)) {
        return false;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if (is_string($origin)) {
        $p = parse_url($origin);
        if (!is_array($p) || !isset($p['host'], $p['scheme'])) {
            return false;
        }
        if (!in_array($p['scheme'], ['http', 'https'], true) || ($requireHttps && $p['scheme'] !== 'https')) {
            return false;
        }
        // İzinli iki alan adı bile farklı origin'dir; port dahil tam eşleşme gerekir.
        $authority = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $target = parse_url($p['scheme'] . '://' . $authority);
        $defaultPort = $p['scheme'] === 'https' ? 443 : 80;
        if (!is_array($target) || strtolower($p['host']) !== $host
            || ($p['port'] ?? $defaultPort) !== ($target['port'] ?? $defaultPort)
            || isset($p['user']) || isset($p['pass']) || isset($p['query']) || isset($p['fragment'])
            || isset($p['path'])) {
            return false;
        }
    }
    return true;
}

function kabin_bildir(array $ayar, string $tur, string $id): void
{
    if ($ayar['notify_to'] === '') {
        return;
    }
    // Bildirim kişisel veri içermez; e-posta başlıklarına kullanıcı girdisi hiç girmez.
    $konu = 'Kabin: yeni marka pilot talebi';
    $govde = "Yeni bir kayıt alındı.\r\nTür: {$tur}\r\nKimlik: {$id}\r\nZaman (UTC): " . gmdate('Y-m-d H:i')
        . "\r\n\r\nKişisel veriler bu e-postaya eklenmez. Ayrıntılar sunucuda: kabin-private/veri/basvurular-{$tur}.jsonl\r\n";
    $basliklar = [
        'From' => $ayar['mail_from'],
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
    ];
    if (!mail($ayar['notify_to'], $konu, $govde, $basliklar)) {
        error_log('kabin-basvuru: bildirim e-postası gönderilemedi');
    }
}

function kabin_istek(): void
{
    $json = kabin_json_istiyor();
    try {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            kabin_yanit(405, 'YONTEM', $json);
        }
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > KABIN_GOVDE_SINIRI || count($_POST) > 12) {
            kabin_yanit(413, 'BUYUK', $json);
        }
        $_POST = kabin_form_oku($json);
        $ayar = kabin_ayar();
        $yasal = require __DIR__ . '/yasal-durum.php';
        $tur = $_POST['tur'] ?? null;
        // Yalnız iki tür; başka tür aydınlatma metninin kapsamında değildir.
        if ($tur !== 'pilot' && $tur !== 'beta') {
            kabin_yanit(400, 'GECERSIZ', $json);
        }
        // Kapı: ayar yoksa ya da tür kapalıysa veri kabul edilmez. Pilot: künye eksiksiz + hukuk onayı.
        // Beta listesi: künyedeki ayrı bayrak (aydınlatma metninde bölümü var) + sunucu ayarı.
        $acik = $ayar !== null && is_array($yasal) && ($tur === 'pilot'
            ? $ayar['accepting'] && ($yasal['eksik'] ?? 1) === 0
            : $ayar['beta_accepting'] && ($yasal['beta'] ?? false) === true);
        if (!$acik) {
            kabin_yanit(503, 'KAPALI', $json);
        }
        if (!kabin_kaynak_gecerli($ayar['allowed_hosts'], $ayar['require_https'])) {
            kabin_yanit(403, 'KAYNAK', $json);
        }
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $anahtar = hash_hmac('sha256', $ip, $ayar['secret']);
        if (!kabin_sinir_izin($anahtar, KABIN_SAATLIK_DENEME, $ayar['daily_cap'])) {
            kabin_yanit(429, 'SINIR', $json);
        }
        // Tuzak alan doluysa bot: başarı gibi davran, hiçbir şey kaydetme.
        if (($_POST['web_sitesi'] ?? '') !== '') {
            kabin_yanit(200, 'TAMAM', $json);
        }
        $alanlar = $tur === 'pilot' ? kabin_pilot_dogrula($_POST) : kabin_beta_dogrula($_POST);
        if ($alanlar === null) {
            kabin_yanit(400, 'GECERSIZ', $json);
        }
        $kayit = [
            'id' => bin2hex(random_bytes(8)),
            'tur' => $tur,
            'zaman' => gmdate('c'),
            'aydinlatma_surumu' => (string) ($yasal['surum'] ?? ''),
        ] + $alanlar;
        // Beta listesi reklamla büyüyebilir: kayıt başına bildirim e-postası gönderilmez.
        if (kabin_kaydet($tur, $kayit) && $tur === 'pilot') {
            kabin_bildir($ayar, $tur, $kayit['id']);
        }
        kabin_yanit(200, 'TAMAM', $json);
    } catch (Throwable $e) {
        error_log('kabin-basvuru: ' . get_class($e));
        kabin_yanit(500, 'HATA', $json);
    }
}
