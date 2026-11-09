"""Beta bekleme listesi özeti: kampanya, telefon türü ve güne göre kayıt sayıları.

Kişisel veri yazdırmaz (ad/e-posta yok), yalnız sayılar.
Kullanım: sunucudan kabin-private/veri/basvurular-beta.jsonl dosyasını indirin, sonra
    python3 _kaynak/beta_ozet.py basvurular-beta.jsonl
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


def ozet(yol: Path) -> str:
    kanal: Counter[str] = Counter()
    kampanya: Counter[str] = Counter()
    platform: Counter[str] = Counter()
    gun: Counter[str] = Counter()
    toplam = 0
    for satir in yol.read_text(encoding="utf-8").splitlines():
        if not satir.strip():
            continue
        k = json.loads(satir)
        toplam += 1
        kaynak = k.get("utm_source") or "(etiketsiz)"
        kanal[kaynak] += 1
        kampanya[f"{kaynak} / {k.get('utm_medium') or '-'} / {k.get('utm_campaign') or '-'}"] += 1
        platform[k.get("platform", "?")] += 1
        gun[str(k.get("zaman", ""))[:10]] += 1

    def blok(baslik: str, sayac: Counter[str], sirali: bool = False) -> str:
        satirlar = sorted(sayac.items()) if sirali else sayac.most_common()
        return f"\n{baslik}\n" + "\n".join(f"  {ad:<45} {n:>6}" for ad, n in satirlar)

    return (
        f"Toplam kayıt: {toplam}"
        + blok("Kaynak (utm_source):", kanal)
        + blok("Kaynak / ortam / kampanya:", kampanya)
        + blok("Telefon:", platform)
        + blok("Gün (UTC):", gun, sirali=True)
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Kullanım: python3 _kaynak/beta_ozet.py basvurular-beta.jsonl")
    print(ozet(Path(sys.argv[1])))
