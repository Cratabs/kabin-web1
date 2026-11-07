<?php
declare(strict_types=1);

/**
 * Sunucuya özel ayarlar ve veriler web kökünün DIŞINDA durur:
 *   <alan adı klasörü>/public_html/api/_lib  → __DIR__
 *   <alan adı klasörü>/kabin-private/config.php
 * Yerel test için KABIN_PRIVATE_DIR ortam değişkeni bu yolu değiştirebilir.
 */
function kabin_ozel_dizin(): string
{
    $env = getenv('KABIN_PRIVATE_DIR');
    if (is_string($env) && $env !== '') {
        return rtrim($env, '/');
    }
    return dirname(__DIR__, 3) . '/kabin-private';
}

function kabin_eposta_gecerli(mixed $v): bool
{
    return is_string($v) && strlen($v) <= 254 && filter_var($v, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Ayar dosyasını okur ve doğrular. Dosya yoksa ya da geçersizse null döner: uç kapalı kalır (fail closed).
 *
 * @return array{secret: string, notify_to: string, mail_from: string, allowed_hosts: list<string>,
 *               accepting: bool, daily_cap: int, require_https: bool}|null
 */
function kabin_ayar(): ?array
{
    $path = kabin_ozel_dizin() . '/config.php';
    if (!is_file($path) || !is_readable($path)) {
        return null;
    }
    $c = require $path;
    if (!is_array($c)) {
        return null;
    }
    $secret = $c['secret'] ?? null;
    if (!is_string($secret) || strlen($secret) < 32 || str_contains($secret, 'DEGISTIR')) {
        return null;
    }
    $notify = $c['notify_to'] ?? '';
    if ($notify !== '' && !kabin_eposta_gecerli($notify)) {
        return null;
    }
    $from = $c['mail_from'] ?? '';
    if ($notify !== '' && !kabin_eposta_gecerli($from)) {
        return null;
    }
    $hosts = $c['allowed_hosts'] ?? null;
    if (!is_array($hosts) || $hosts === []) {
        return null;
    }
    $cleanHosts = [];
    foreach ($hosts as $h) {
        if (!is_string($h) || preg_match('/^[a-z0-9.-]{1,253}$/', $h) !== 1) {
            return null;
        }
        $cleanHosts[] = $h;
    }
    $cap = $c['daily_cap'] ?? 300;
    if (!is_int($cap) || $cap < 1 || $cap > 10000) {
        return null;
    }
    return [
        'secret' => $secret,
        'notify_to' => is_string($notify) ? $notify : '',
        'mail_from' => is_string($from) ? $from : '',
        'allowed_hosts' => $cleanHosts,
        'accepting' => ($c['accepting'] ?? false) === true,
        'daily_cap' => $cap,
        'require_https' => ($c['require_https'] ?? true) !== false,
    ];
}
