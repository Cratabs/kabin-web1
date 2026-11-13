/**
 * Form gönderimi ve yapay zekâ ajanları için salt-okunur WebMCP araçları (tarayıcı destekliyorsa).
 * Menü /js/menu.js'te, sahneler ve örnek ekranlar /js/site.js'tedir; bu dosya onlara dokunmaz.
 * Çerez, yerel depolama ya da izleme yok. Ağ isteği yalnız kullanıcı formu gönderdiğinde, aynı kökene
 * (/api/basvuru.php) yapılır. Davet formu reklam etiketlerini (utm_*) yalnız sayfa adresinden okur.
 * JS kapalıysa form normal HTML gönderimiyle aynı ucu kullanır.
 * Sunucudan gelen metin DOM'a yalnız textContent ile yazılır.
 * Kullanıcıya görünen metinler sayfa diline (<html lang>) göre TEXT sözlüğünden gelir: tr (varsayılan) ya da en.
 */

interface SiteText {
  /** Sunucunun bilinen hata kodları → kullanıcıya gösterilecek mesaj. */
  errors: Record<string, string>;
  generic: string;
  sending: string;
  pilotDone: readonly [string, string];
  betaDone: readonly [string, string];
}

const TEXT: { tr: SiteText; en: SiteText } = {
  tr: {
    errors: {
      GECERSIZ: 'Alanları kontrol edin. E-posta adresi doğru olmalı.',
      SINIR: 'Kısa sürede çok deneme yapıldı. Bir saat sonra yeniden deneyin.',
      KAPALI: 'Form şu an kapalı. Bize e-posta yazın.',
      KAYNAK: 'Bu sayfadan gönderilemedi. Sayfayı yenileyip yeniden deneyin.',
      BUYUK: 'Yazdıklarınız çok uzun.',
    },
    generic: 'Gönderilemedi. Bağlantınızı kontrol edip yeniden deneyin.',
    sending: 'Gönderiliyor…',
    pilotDone: ['Yazdıklarınızı aldık.', 'Size e-postayla döneceğiz.'],
    betaDone: ['Listedesiniz.', 'Yer açılınca e-postayla davet göndeririz.'],
  },
  en: {
    errors: {
      GECERSIZ: 'Check the fields. The email address has to be valid.',
      SINIR: 'Too many tries in a short time. Try again in an hour.',
      KAPALI: 'The form is closed right now. Email us instead.',
      KAYNAK: 'It couldn’t be sent from this page. Refresh and try again.',
      BUYUK: 'What you wrote is too long.',
    },
    generic: 'It wasn’t sent. Check your connection and try again.',
    sending: 'Sending…',
    pilotDone: ['We got your message.', 'We’ll get back to you by email.'],
    betaDone: ['You’re on the list.', 'We’ll email you an invite when a spot opens.'],
  },
};
const T: SiteText = document.documentElement.lang === 'en' ? TEXT.en : TEXT.tr;

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
 * Davet formu: reklam bağlantısı `...?utm_source=x#beta` biçimindedir; `#beta` sayfadaki forma götürür.
 * Kampanya etiketleri yalnız bu sayfa adresinden okunur, formla birlikte gönderilir; hiçbir yerde saklanmaz.
 */
const UTM = /^[a-z0-9._-]{1,60}$/;
const betaForm = document.querySelector<HTMLFormElement>('form[data-basvuru="beta"]');
if (betaForm) {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = (params.get(key) ?? '').trim().toLowerCase();
    const input = betaForm.querySelector<HTMLInputElement>(`input[name="${key}"]`);
    if (input && UTM.test(value)) input.value = value;
  }
}

document.querySelectorAll<HTMLFormElement>('form[data-basvuru]').forEach((form) => {
  const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
    'input, select, textarea, button',
  );
  const lock = (locked: boolean): void => controls.forEach((control) => (control.disabled = locked));
  const status = form.querySelector<HTMLElement>('.form-status');
  const setStatus = (text: string, isError: boolean): void => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('err', isError);
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // Kapalı form (yasal kapı): gizli üretilir; yine de gönderilmeye çalışılırsa hiçbir şey yapılmaz.
    if (form.hidden) return;
    if (!form.reportValidity()) return;
    // Önce veriyi topla: devre dışı bırakılan alanlar FormData'ya girmez.
    const data = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string') data.append(key, value);
    }
    lock(true);
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
        lock(false);
      })
      .catch(() => {
        setStatus(T.generic, true);
        lock(false);
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
