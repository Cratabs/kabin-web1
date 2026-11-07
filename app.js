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
    KAPALI: 'Başvurular şu an kapalı. Lütfen daha sonra tekrar dene.',
    KAYNAK: 'Başvuru bu sayfadan gönderilemedi. Sayfayı yenileyip tekrar dene.',
    BUYUK: 'Gönderilen bilgi çok uzun.',
};
const GENERIC = 'Başvuru gönderilemedi. Bağlantını kontrol edip tekrar dene.';
function errorCode(body) {
    if (typeof body !== 'object' || body === null || !('kod' in body))
        return null;
    const kod = body.kod;
    return typeof kod === 'string' ? kod : null;
}
function showDone(form) {
    const done = document.createElement('div');
    done.className = 'form-done';
    done.setAttribute('role', 'status');
    done.tabIndex = -1;
    const title = document.createElement('strong');
    title.textContent = 'Başvurun alındı.';
    const text = document.createElement('p');
    text.textContent =
        form.dataset['basvuru'] === 'pilot'
            ? 'Talebinizi kaydettik; en kısa sürede e-postayla dönüş yapacağız.'
            : 'Kapalı beta kontenjanı açıldıkça başvuruları sırayla değerlendiriyoruz. Uygun olursa davet kodunu e-postana göndereceğiz.';
    done.append(title, text);
    form.replaceWith(done);
    done.focus();
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
        const data = new FormData(form);
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
