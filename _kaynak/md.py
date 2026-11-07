"""Sayfa gövdesini (bizim ürettiğimiz, güvenilir HTML) sade Markdown'a çevirir.

Yapay zekâ ajanları `Accept: text/markdown` ile istediğinde ya da llms.txt bağlantılarından okunur.
Yalnız sitede kullanılan etiketleri tanır; bilinmeyen etiketlerin metni korunur.
Dekoratif öğeler (aria-hidden="true", data-md="atla", svg, form vb.) atlanır.
"""
from __future__ import annotations

import re
from html.parser import HTMLParser

ATLA = {"svg", "script", "style", "button", "form", "noscript", "select", "textarea", "img"}
BOS_ETIKET = {"br", "img", "input", "meta", "link", "hr", "source", "wbr"}
BLOK = {"p", "section", "article", "div", "header", "footer", "aside", "nav", "dl", "details"}


class _Cevirici(HTMLParser):
    def __init__(self, kok_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.kok = kok_url.rstrip("/")
        self.out: list[str] = []
        self.atla = 0  # atlanan alt ağacın derinliği
        self.liste: list[str] = []
        self.link: str | None = None
        self.baslik = False
        self.tablo: list[list[str]] | None = None
        self.hucre: list[str] | None = None

    def _yaz(self, s: str) -> None:
        (self.hucre if self.hucre is not None else self.out).append(s)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if self.atla:
            if tag not in BOS_ETIKET:
                self.atla += 1
            return
        if tag in ATLA or a.get("aria-hidden") == "true" or a.get("data-md") == "atla":
            if tag == "form":
                self.out.append("\n\n_(Web sayfasında bu bölümde bir form yer alır.)_\n\n")
            if tag not in BOS_ETIKET:
                self.atla = 1
            return
        if tag in ("h1", "h2", "h3"):
            self.baslik = True
            self._yaz("\n\n" + "#" * int(tag[1]) + " ")
        elif tag in BLOK and self.tablo is None:
            self._yaz("\n\n")
        elif tag == "br":
            self._yaz(" " if self.baslik or self.hucre is not None else "\n")
        elif tag in ("ul", "ol"):
            self.liste.append(tag)
            self._yaz("\n")
        elif tag == "li":
            girinti = "  " * (len(self.liste) - 1)
            self._yaz("\n" + girinti + ("1. " if self.liste and self.liste[-1] == "ol" else "- "))
        elif tag in ("strong", "b"):
            self._yaz("**")
        elif tag == "em":
            self._yaz("*")
        elif tag == "summary":
            self._yaz("\n\n### ")
        elif tag == "dt":
            self._yaz("\n- **")
        elif tag == "dd":
            self._yaz(": ")
        elif tag == "a":
            href = a.get("href") or ""
            if href.startswith("/"):
                href = self.kok + href
            self.link = href
            hedef = self.hucre if self.hucre is not None else self.out
            self._yaz(" [" if hedef and hedef[-1].endswith(")") else "[")
        elif tag == "table":
            self.tablo = []
        elif tag == "tr" and self.tablo is not None:
            self.tablo.append([])
        elif tag in ("td", "th") and self.tablo is not None:
            self.hucre = []

    def handle_endtag(self, tag: str) -> None:
        if self.atla:
            self.atla -= 1
            return
        if tag in ("strong", "b"):
            self._yaz("**")
        elif tag == "em":
            self._yaz("*")
        elif tag == "dt":
            self._yaz("**")
        elif tag == "span":
            self._yaz(" ")
        elif tag == "summary":
            self._yaz("\n\n")
        elif tag in ("ul", "ol"):
            if self.liste:
                self.liste.pop()
            self._yaz("\n")
        elif tag == "a" and self.link is not None:
            self._yaz(f"]({self.link})")
            self.link = None
        elif tag in ("td", "th") and self.tablo is not None and self.hucre is not None:
            hucre = re.sub(r"\s+", " ", "".join(self.hucre)).strip().replace("|", "\\|")
            if self.tablo:
                self.tablo[-1].append(hucre)
            self.hucre = None
        elif tag == "table" and self.tablo is not None:
            satirlar = [r for r in self.tablo if r]
            self.tablo = None
            if satirlar:
                n = max(len(r) for r in satirlar)
                md = ["| " + " | ".join(r + [""] * (n - len(r))) + " |" for r in satirlar]
                md.insert(1, "|" + " --- |" * n)
                self.out.append("\n\n" + "\n".join(md) + "\n")
        elif tag in ("h1", "h2", "h3"):
            self.baslik = False
            self._yaz("\n\n")
        elif tag in BLOK:
            self._yaz("\n\n")

    def handle_data(self, data: str) -> None:
        if not self.atla:
            self._yaz(re.sub(r"\s+", " ", data))


def html_to_md(govde: str, kok_url: str) -> str:
    c = _Cevirici(kok_url)
    c.feed(govde)
    c.close()
    metin = "".join(c.out)
    metin = re.sub(r"\[ +", "[", metin)
    metin = re.sub(r" +\]", "]", metin)
    metin = re.sub(r"[ \t]{2,}", " ", metin)
    metin = re.sub(r"[ \t]+\n", "\n", metin)
    metin = re.sub(r"\n[ \t]+(?=[^ \t-]|-(?! ))", "\n", metin)
    metin = re.sub(r"\n{3,}", "\n\n", metin)
    return metin.strip() + "\n"
