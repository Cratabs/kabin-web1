"use strict";
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav-links');
function closeMenu() {
    nav?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Menüyü aç');
}
menu?.addEventListener('click', () => {
    const isOpen = menu.getAttribute('aria-expanded') !== 'true';
    nav?.classList.toggle('open', isOpen);
    menu.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-label', isOpen ? 'Menüyü kapat' : 'Menüyü aç');
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menu.focus();
    }
});
const examples = {
    S: { title: 'S · Daha yakın bir kalıp', description: 'Örnek profilde hareket payı sınırlı; katmanlı kullanım için dar olabilir.', chest: 'Yakın / sınırlı pay', waist: 'Daha yakın' },
    M: { title: 'M · Dengeli bir seçenek', description: 'Örnek ölçü profilinde günlük kullanım için rahat pay.', chest: 'Rahat', waist: 'Dengeli' },
    L: { title: 'L · Daha bol bir görünüm', description: 'Örnek profilde daha fazla bolluk; bol kesim tercihi için düşünülebilir.', chest: 'Bol', waist: 'Bol' },
};
const sizes = document.querySelectorAll('[data-size]');
sizes.forEach((button) => button.addEventListener('click', () => {
    const example = examples[button.dataset['size'] ?? ''];
    if (example === undefined)
        return;
    sizes.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const values = {
        'fit-title': example.title,
        'fit-description': example.description,
        'fit-chest': example.chest,
        'fit-waist': example.waist,
    };
    for (const [id, value] of Object.entries(values)) {
        const node = document.getElementById(id);
        if (node)
            node.textContent = value;
    }
}));
const ERRORS = {
    GECERSIZ: 'Lütfen zorunlu alanları kontrol et; e-posta adresi geçerli olmalı.',
    SINIR: 'Kısa sürede çok fazla deneme yapıldı. Lütfen bir saat sonra tekrar dene.',
    KAPALI: 'Talepler şu an bu formdan alınamıyor. Lütfen bize e-postayla yaz.',
    KAYNAK: 'Başvuru bu sayfadan gönderilemedi. Sayfayı yenileyip tekrar dene.',
    BUYUK: 'Gönderilen bilgi çok uzun.',
};
const GENERIC = 'Talep gönderilemedi. Bağlantını kontrol edip tekrar dene.';
function errorCode(body) {
    if (typeof body !== 'object' || body === null || !('kod' in body))
        return null;
    const kod = body.kod;
    return typeof kod === 'string' ? kod : null;
}
const PILOT_DONE = ['Talebiniz alındı.', 'Talebinizi kaydettik; en kısa sürede e-postayla dönüş yapacağız.'];
const BETA_DONE = ['Listedesin.', 'Kapalı beta açıldığında e-posta adresine davet göndereceğiz.'];
function showDone(form) {
    const [baslik, metin] = form.dataset['basvuru'] === 'beta' ? BETA_DONE : PILOT_DONE;
    const done = document.createElement('div');
    done.className = 'form-done';
    done.setAttribute('role', 'status');
    done.tabIndex = -1;
    const title = document.createElement('strong');
    title.textContent = baslik;
    const text = document.createElement('p');
    text.textContent = metin;
    done.append(title, text);
    form.replaceWith(done);
    done.focus();
}
const UTM = /^[a-z0-9._-]{1,60}$/;
const betaDialog = document.querySelector('dialog#beta');
if (betaDialog) {
    const params = new URLSearchParams(window.location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
        const value = (params.get(key) ?? '').trim().toLowerCase();
        const input = betaDialog.querySelector(`input[name="${key}"]`);
        if (input && UTM.test(value))
            input.value = value;
    }
    const open = () => {
        if (betaDialog.open)
            return;
        if (window.location.hash === '#beta')
            history.replaceState(null, '', window.location.pathname + window.location.search);
        betaDialog.showModal();
        betaDialog.querySelector('input[name="ad"]')?.focus();
    };
    document.querySelectorAll('a[data-beta-ac]').forEach((a) => a.addEventListener('click', (event) => {
        event.preventDefault();
        open();
    }));
    betaDialog.querySelector('[data-beta-kapat]')?.addEventListener('click', () => betaDialog.close());
    betaDialog.addEventListener('click', (event) => {
        if (event.target === betaDialog)
            betaDialog.close();
    });
    if (window.location.hash === '#beta')
        open();
}
document.querySelectorAll('form[data-basvuru]').forEach((form) => {
    const body = form.querySelector('.form-body');
    const status = form.querySelector('.form-status');
    const setStatus = (text, isError) => {
        if (!status)
            return;
        status.textContent = text;
        status.classList.toggle('err', isError);
    };
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (body?.disabled === true)
            return;
        if (!form.reportValidity())
            return;
        const data = new URLSearchParams();
        for (const [key, value] of new FormData(form)) {
            if (typeof value === 'string')
                data.append(key, value);
        }
        if (body)
            body.disabled = true;
        setStatus('Gönderiliyor…', false);
        fetch(form.action, {
            method: 'POST',
            body: data,
            headers: { Accept: 'application/json' },
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'error',
        })
            .then(async (res) => {
            let parsed = null;
            try {
                parsed = await res.json();
            }
            catch {
                parsed = null;
            }
            if (res.ok) {
                showDone(form);
                return;
            }
            const kod = errorCode(parsed);
            setStatus((kod !== null ? ERRORS[kod] : undefined) ?? GENERIC, true);
            if (body)
                body.disabled = false;
        })
            .catch(() => {
            setStatus(GENERIC, true);
            if (body)
                body.disabled = false;
        });
    });
});
const MD_YOLU = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.md$/;
function metinSonuc(text, isError = false) {
    return isError ? { content: [{ type: 'text', text }], isError } : { content: [{ type: 'text', text }] };
}
async function yerelMetin(yol) {
    try {
        const res = await fetch(yol, { credentials: 'omit', headers: { Accept: 'text/markdown, text/plain' } });
        if (!res.ok)
            return metinSonuc(`Bulunamadı: ${yol}`, true);
        return metinSonuc(await res.text());
    }
    catch {
        return metinSonuc('Sayfa okunamadı.', true);
    }
}
function sayfaMdYolu(pathname) {
    const yol = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    return yol.replace(/\.html$/, '.md');
}
const ARACLAR = [
    {
        name: 'kabin_site_ozeti',
        title: 'Kabin site özeti',
        description: 'Kabin hakkında kısa özet, iletişim adresleri ve sitedeki tüm sayfaların Markdown bağlantılarını (llms.txt) döndürür.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: () => yerelMetin('/llms.txt'),
    },
    {
        name: 'kabin_sayfa_oku',
        title: 'Kabin sayfasını oku',
        description: 'Bu sitedeki bir sayfanın Markdown sürümünü döndürür. "yol" verilmezse açık olan sayfa okunur. Örnek: /yasal/gizlilik.md',
        inputSchema: {
            type: 'object',
            properties: {
                yol: { type: 'string', description: 'Sitedeki .md yolu, ör. /index.md, /markalar.md, /yasal/kvkk-aydinlatma.md' },
            },
        },
        annotations: { readOnlyHint: true },
        execute: (input) => {
            const istenen = input['yol'];
            const yol = typeof istenen === 'string' && istenen !== '' ? istenen : sayfaMdYolu(location.pathname);
            if (!MD_YOLU.test(yol))
                return Promise.resolve(metinSonuc('Geçersiz yol: /… .md biçiminde olmalı.', true));
            return yerelMetin(yol);
        },
    },
];
function modelContext() {
    const doc = document;
    const nav = navigator;
    return doc.modelContext ?? nav.modelContext;
}
const mc = modelContext();
if (mc !== undefined && typeof mc.registerTool === 'function') {
    for (const arac of ARACLAR) {
        try {
            void Promise.resolve(mc.registerTool(arac)).catch(() => undefined);
        }
        catch {
        }
    }
}
