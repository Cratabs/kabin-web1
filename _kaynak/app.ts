/**
 * Site etkileşimleri: mobil menü, temsili beden demosu, pilot formunun JS ile gönderimi ve
 * yapay zekâ ajanları için salt-okunur WebMCP araçları (tarayıcı destekliyorsa).
 * Çerez, yerel depolama ya da izleme yok. Ağ isteği yalnız kullanıcı formu gönderdiğinde, aynı kökene
 * (/api/basvuru.php) yapılır. JS kapalıysa form normal HTML gönderimiyle aynı ucu kullanır.
 * Sunucudan gelen metin DOM'a yalnız textContent ile yazılır.
 */

const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.querySelector<HTMLElement>('#nav-links');

function closeMenu(): void {
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

interface FitExample {
  title: string;
  description: string;
  chest: string;
  waist: string;
}

const examples: Record<string, FitExample> = {
  S: { title: 'S · Daha yakın bir kalıp', description: 'Örnek profilde hareket payı sınırlı; katmanlı kullanım için dar olabilir.', chest: 'Yakın / sınırlı pay', waist: 'Daha yakın' },
  M: { title: 'M · Dengeli bir seçenek', description: 'Örnek ölçü profilinde günlük kullanım için rahat pay.', chest: 'Rahat', waist: 'Dengeli' },
  L: { title: 'L · Daha bol bir görünüm', description: 'Örnek profilde daha fazla bolluk; bol kesim tercihi için düşünülebilir.', chest: 'Bol', waist: 'Bol' },
};

const sizes = document.querySelectorAll<HTMLButtonElement>('[data-size]');
sizes.forEach((button) =>
  button.addEventListener('click', () => {
    const example = examples[button.dataset['size'] ?? ''];
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

/** Sunucunun bilinen hata kodları → kullanıcıya gösterilecek Türkçe mesaj. */
const ERRORS: Record<string, string> = {
  GECERSIZ: 'Lütfen zorunlu alanları kontrol et; e-posta adresi geçerli olmalı.',
  SINIR: 'Kısa sürede çok fazla deneme yapıldı. Lütfen bir saat sonra tekrar dene.',
  KAPALI: 'Talepler şu an bu formdan alınamıyor. Lütfen bize e-postayla yaz.',
  KAYNAK: 'Başvuru bu sayfadan gönderilemedi. Sayfayı yenileyip tekrar dene.',
  BUYUK: 'Gönderilen bilgi çok uzun.',
};
const GENERIC = 'Talep gönderilemedi. Bağlantını kontrol edip tekrar dene.';

function errorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('kod' in body)) return null;
  const kod: unknown = body.kod;
  return typeof kod === 'string' ? kod : null;
}

function showDone(form: HTMLFormElement): void {
  const done = document.createElement('div');
  done.className = 'form-done';
  done.setAttribute('role', 'status');
  done.tabIndex = -1;
  const title = document.createElement('strong');
  title.textContent = 'Talebiniz alındı.';
  const text = document.createElement('p');
  text.textContent = 'Talebinizi kaydettik; en kısa sürede e-postayla dönüş yapacağız.';
  done.append(title, text);
  form.replaceWith(done);
  done.focus();
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
    const data = new FormData(form);
    if (body) body.disabled = true;
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
        setStatus((kod !== null ? ERRORS[kod] : undefined) ?? GENERIC, true);
        if (body) body.disabled = false;
      })
      .catch(() => {
        setStatus(GENERIC, true);
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
