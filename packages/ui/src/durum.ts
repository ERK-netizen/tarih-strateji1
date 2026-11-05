// Arayüz durumu (sinyaller). Kanonik oyun durumu Worker'dadır; burada yalnız görünümler ve arayüz tercihleri tutulur.
import { signal, computed } from '@preact/signals';
import type { HaritaVeri, HaritaModu } from '@ts/map';
import { Istemci } from './istemci.ts';
import paketJson from '../../../data/derlenmis/fixture-1a.json';
import type { Paket } from '@ts/engine';

export const pkg = paketJson as unknown as Paket;
export const istemci = new Istemci();

export type Panel = null | 'devlet' | 'ordu' | 'ekonomi' | 'diplomasi' | 'arastirma' | 'istatistik' | 'kronik' | 'kayit';

export const ekran = signal<'baslangic' | 'oyun'>('baslangic');
export const ozet = signal<any>(null);
export const harita = signal<HaritaVeri | null>(null);
export const panel = signal<Panel>(null);
export const haritaModu = signal<HaritaModu>('siyasi');
export const seciliBolge = signal<number>(-1);
export const seciliBirlik = signal<Set<number>>(new Set());
export const ilerliyor = signal(false);
export const ilerleme = signal<{ yuzde: number; tarih: string } | null>(null);
export const rapor = signal<{ neden: string; gecen: number; olaylar: { tarih: string; metin: string; onem: number }[]; durmalar: any[] } | null>(null);
export const komutSonuc = signal<any>(null);
export const nedenAcik = signal<any>(null);
export const tostlar = signal<{ id: number; metin: string; tur: string }[]>([]);
export const komutMetni = signal('');
export const panelSurum = signal(0); // panelleri tazele

export const oyuncu = computed(() => ozet.value?.oyuncu ?? 0);

function oku<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }
function yaz(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* depolama kapalı */ } }

export const sessiz = signal<string[]>(oku('ts.sessiz', []));
export function sessizDegis(tur: string) {
  const s = new Set(sessiz.value);
  if (s.has(tur)) s.delete(tur); else s.add(tur);
  sessiz.value = [...s]; yaz('ts.sessiz', sessiz.value);
}
export const sonKomutlar = signal<string[]>(oku('ts.sonKomutlar', []));
export function komutHatirla(m: string) {
  const l = [m, ...sonKomutlar.value.filter((x) => x !== m)].slice(0, 10);
  sonKomutlar.value = l; yaz('ts.sonKomutlar', l);
}
/** C03: tanınmayan komut günlüğü (cihazda tutulur; katalog büyütme döngüsü için dışa aktarılır). */
export const taninmayan = signal<{ metin: string; sayi: number; son: string }[]>(oku('ts.taninmayan', []));
export function taninmayanEkle(m: string) {
  const l = [...taninmayan.value];
  const i = l.findIndex((x) => x.metin === m);
  if (i >= 0) l[i] = { ...l[i]!, sayi: l[i]!.sayi + 1, son: new Date().toISOString() };
  else l.unshift({ metin: m, sayi: 1, son: new Date().toISOString() });
  taninmayan.value = l.slice(0, 200); yaz('ts.taninmayan', taninmayan.value);
}

let tostId = 1;
export function tost(metin: string, tur = 'bilgi') {
  const id = tostId++;
  tostlar.value = [...tostlar.value, { id, metin, tur }].slice(-4);
  setTimeout(() => { tostlar.value = tostlar.value.filter((t) => t.id !== id); }, tur === 'hata' ? 7000 : 4200);
}

export async function tazele() {
  const [o, h] = await Promise.all([istemci.istek('query', { gorunum: 'ozet' }), istemci.istek('query', { gorunum: 'harita' })]);
  ozet.value = o.veri; harita.value = h.veri; panelSurum.value++;
}

export const fmt = (x: number) => (x < 0 ? '−' : '') + String(Math.trunc(Math.abs(x))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const kisalt = (x: number) => {
  const a = Math.abs(x);
  if (a >= 1e9) return `${(x / 1e9).toFixed(1).replace('.', ',')} mr`;
  if (a >= 1e6) return `${(x / 1e6).toFixed(1).replace('.', ',')} mn`;
  if (a >= 1e4) return `${Math.round(x / 1e3)} bin`;
  return fmt(x);
};
export const puan = (p: number) => (p / 1000).toFixed(0);
export const yuzde = (s: number) => `%${Math.round(s / 10_000)}`;
