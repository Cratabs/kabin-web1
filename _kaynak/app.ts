/**
 * Site etkileşimleri: mobil menü, temsili beden demosu, pilot formunun JS ile gönderimi ve
 * yapay zekâ ajanları için salt-okunur WebMCP araçları (tarayıcı destekliyorsa).
 * Çerez, yerel depolama ya da izleme yok. Ağ isteği yalnız kullanıcı formu gönderdiğinde, aynı kökene
 * (/api/basvuru.php) yapılır. Beta penceresi reklam etiketlerini (utm_*) yalnız sayfa adresinden okur. JS kapalıysa form normal HTML gönderimiyle aynı ucu kullanır.
 * Sunucudan gelen metin DOM'a yalnız textContent ile yazılır.
 * Kullanıcıya görünen metinler sayfa diline (<html lang>) göre TEXT sözlüğünden gelir: tr (varsayılan) ya da en.
 */

interface FitExample {
  title: string;
  description: string;
  chest: string;
  waist: string;
}

interface SiteText {
  menuOpen: string;
  menuClose: string;
  examples: Record<string, FitExample>;
  /** Sunucunun bilinen hata kodları → kullanıcıya gösterilecek mesaj. */
  errors: Record<string, string>;
  generic: string;
  sending: string;
  pilotDone: readonly [string, string];
  betaDone: readonly [string, string];
}

const TEXT: { tr: SiteText; en: SiteText } = {
  tr: {
    menuOpen: 'Menüyü aç',
    menuClose: 'Menüyü kapat',
    examples: {
      S: { title: 'S · Daha yakın bir kalıp', description: 'Örnek profilde hareket payı sınırlı; katmanlı kullanım için dar olabilir.', chest: 'Yakın / sınırlı pay', waist: 'Daha yakın' },
      M: { title: 'M · Dengeli bir seçenek', description: 'Örnek ölçü profilinde günlük kullanım için rahat pay.', chest: 'Rahat', waist: 'Dengeli' },
      L: { title: 'L · Daha bol bir görünüm', description: 'Örnek profilde daha fazla bolluk; bol kesim tercihi için düşünülebilir.', chest: 'Bol', waist: 'Bol' },
    },
    errors: {
      GECERSIZ: 'Lütfen zorunlu alanları kontrol et; e-posta adresi geçerli olmalı.',
      SINIR: 'Kısa sürede çok fazla deneme yapıldı. Lütfen bir saat sonra tekrar dene.',
      KAPALI: 'Talepler şu an bu formdan alınamıyor. Lütfen bize e-postayla yaz.',
      KAYNAK: 'Başvuru bu sayfadan gönderilemedi. Sayfayı yenileyip tekrar dene.',
      BUYUK: 'Gönderilen bilgi çok uzun.',
    },
    generic: 'Talep gönderilemedi. Bağlantını kontrol edip tekrar dene.',
    sending: 'Gönderiliyor…',
    pilotDone: ['Talebiniz alındı.', 'Talebinizi kaydettik; en kısa sürede e-postayla dönüş yapacağız.'],
    betaDone: ['Listedesin.', 'Kapalı beta açıldığında e-posta adresine davet göndereceğiz.'],
  },
  en: {
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    examples: {
      S: { title: 'S · A closer fit', description: 'Limited room to move in the sample profile; may feel tight for layering.', chest: 'Close / limited ease', waist: 'Closer' },
      M: { title: 'M · A balanced option', description: 'Comfortable ease for everyday wear in the sample measurement profile.', chest: 'Comfortable', waist: 'Balanced' },
      L: { title: 'L · A looser look', description: 'More room in the sample profile; worth considering if you prefer a loose cut.', chest: 'Loose', waist: 'Loose' },
    },
    errors: {
      GECERSIZ: 'Please check the required fields; the email address must be valid.',
      SINIR: 'Too many attempts in a short time. Please try again in an hour.',
      KAPALI: 'Requests can’t be received through this form right now. Please email us instead.',
      KAYNAK: 'The request couldn’t be sent from this page. Please refresh the page and try again.',
      BUYUK: 'The information you sent is too long.',
    },
    generic: 'The request couldn’t be sent. Please check your connection and try again.',
    sending: 'Sending…',
    pilotDone: ['Your request has been received.', 'We’ve recorded your request and will get back to you by email as soon as possible.'],
    betaDone: ['You’re on the list.', 'We’ll send an invitation to your email address when the closed beta opens.'],
  },
};
const T: SiteText = document.documentElement.lang === 'en' ? TEXT.en : TEXT.tr;

const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.querySelector<HTMLElement>('#nav-links');

function closeMenu(): void {
  nav?.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', T.menuOpen);
}

menu?.addEventListener('click', () => {
  const isOpen = menu.getAttribute('aria-expanded') !== 'true';
  nav?.classList.toggle('open', isOpen);
  menu.setAttribute('aria-expanded', String(isOpen));
  menu.setAttribute('aria-label', isOpen ? T.menuClose : T.menuOpen);
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});

const sizes = document.querySelectorAll<HTMLButtonElement>('[data-size]');
sizes.forEach((button) =>
  button.addEventListener('click', () => {
    const example = T.examples[button.dataset['size'] ?? ''];
    if (example === undefined) return;
    sizes.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const values: Record<string, string> = {
      'fit-title': example.title,
      'fit-description': example.description,
      'fit-chest': example.chest,
      'fit-waist': example.waist,
    };
    for (const [id, value] of Object.entries(values)) {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    }
  }),
);

function errorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('kod' in body)) return null;
  const kod: unknown = body.kod;
  return typeof kod === 'string' ? kod : null;
}

function showDone(form: HTMLFormElement): void {
  const [baslik, metin] = form.dataset['basvuru'] === 'beta' ? T.betaDone : T.pilotDone;
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

/**
 * Beta bekleme listesi penceresi. Reklam bağlantısı `...?utm_source=x#beta` ise pencere kendiliğinden açılır.
 * Kampanya etiketleri yalnız bu sayfa adresinden okunur, formla birlikte gönderilir; hiçbir yerde saklanmaz.
 */
const UTM = /^[a-z0-9._-]{1,60}$/;
const betaDialog = document.querySelector<HTMLDialogElement>('dialog#beta');
if (betaDialog) {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = (params.get(key) ?? '').trim().toLowerCase();
    const input = betaDialog.querySelector<HTMLInputElement>(`input[name="${key}"]`);
    if (input && UTM.test(value)) input.value = value;
  }
  const open = (): void => {
    if (betaDialog.open) return;
    // Adresteki #beta kalırsa geri tuşu/yenileme pencereyi yine açar; kampanya parametreleri adreste kalır.
    if (window.location.hash === '#beta') history.replaceState(null, '', window.location.pathname + window.location.search);
    betaDialog.showModal();
    betaDialog.querySelector<HTMLInputElement>('input[name="ad"]')?.focus();
  };
  document.querySelectorAll<HTMLAnchorElement>('a[data-beta-ac]').forEach((a) =>
    a.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    }),
  );
  betaDialog.querySelector('[data-beta-kapat]')?.addEventListener('click', () => betaDialog.close());
  // Pencere dışına (arka plana) tıklamak kapatır.
  betaDialog.addEventListener('click', (event) => {
    if (event.target === betaDialog) betaDialog.close();
  });
  if (window.location.hash === '#beta') open();
}

document.querySelectorAll<HTMLFormElement>('form[data-basvuru]').forEach((form) => {
  const body = form.querySelector<HTMLFieldSetElement>('.form-body');
  const status = form.querySelector<HTMLElement>('.form-status');
  const setStatus = (text: string, isError: boolean): void => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('err', isError);
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (body?.disabled === true) return;
    if (!form.reportValidity()) return;
    // Önce veriyi topla: devre dışı bırakılan alanlar FormData'ya girmez.
    const data = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string') data.append(key, value);
    }
    if (body) body.disabled = true;
    setStatus(T.sending, false);
    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    })
      .then(async (res) => {
        let parsed: unknown = null;
        try {
          parsed = await res.json();
        } catch {
          parsed = null;
        }
        if (res.ok) {
          showDone(form);
          return;
        }
        const kod = errorCode(parsed);
        setStatus((kod !== null ? T.errors[kod] : undefined) ?? T.generic, true);
        if (body) body.disabled = false;
      })
      .catch(() => {
        setStatus(T.generic, true);
        if (body) body.disabled = false;
      });
  });
});

/*
 * WebMCP (https://webmachinelearning.github.io/webmcp/): tarayıcıdaki yapay zekâ ajanlarına salt-okunur
 * araçlar sunar. Araçlar yalnız bu sitenin herkese açık Markdown dosyalarını aynı kökenden okur; kişisel
 * veri okumaz, form göndermez, durum değiştirmez. Desteklemeyen tarayıcıda hiçbir şey yapılmaz.
 */
interface WebMcpText {
  type: 'text';
  text: string;
}
interface WebMcpResult {
  content: WebMcpText[];
  isError?: boolean;
}
interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<WebMcpResult>;
}
interface ModelContext {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<undefined> | undefined;
}

const MD_YOLU = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.md$/;

function metinSonuc(text: string, isError = false): WebMcpResult {
  return isError ? { content: [{ type: 'text', text }], isError } : { content: [{ type: 'text', text }] };
}

async function yerelMetin(yol: string): Promise<WebMcpResult> {
  try {
    const res = await fetch(yol, { credentials: 'omit', headers: { Accept: 'text/markdown, text/plain' } });
    if (!res.ok) return metinSonuc(`Bulunamadı: ${yol}`, true);
    return metinSonuc(await res.text());
  } catch {
    return metinSonuc('Sayfa okunamadı.', true);
  }
}

function sayfaMdYolu(pathname: string): string {
  const yol = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  return yol.replace(/\.html$/, '.md');
}

const ARACLAR: WebMcpTool[] = [
  {
    name: 'kabin_site_ozeti',
    title: 'Kabin site özeti',
    description:
      'Kabin hakkında kısa özet, iletişim adresleri ve sitedeki tüm sayfaların Markdown bağlantılarını (llms.txt) döndürür.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => yerelMetin('/llms.txt'),
  },
  {
    name: 'kabin_sayfa_oku',
    title: 'Kabin sayfasını oku',
    description:
      'Bu sitedeki bir sayfanın Markdown sürümünü döndürür. "yol" verilmezse açık olan sayfa okunur. Örnek: /yasal/gizlilik.md',
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
      if (!MD_YOLU.test(yol)) return Promise.resolve(metinSonuc('Geçersiz yol: /… .md biçiminde olmalı.', true));
      return yerelMetin(yol);
    },
  },
];

function modelContext(): ModelContext | undefined {
  const doc = document as Document & { modelContext?: ModelContext };
  const nav = navigator as Navigator & { modelContext?: ModelContext };
  return doc.modelContext ?? nav.modelContext;
}

const mc = modelContext();
if (mc !== undefined && typeof mc.registerTool === 'function') {
  for (const arac of ARACLAR) {
    try {
      void Promise.resolve(mc.registerTool(arac)).catch(() => undefined);
    } catch {
      // Eski ya da farklı bir WebMCP sürümü: araç kaydı atlanır, site normal çalışır.
    }
  }
}
