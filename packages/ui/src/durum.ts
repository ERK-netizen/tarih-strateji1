// Arayüz durumu (sinyaller). Kanonik oyun durumu Worker'dadır; burada yalnız görünümler ve arayüz tercihleri tutulur.
import { signal, computed } from '@preact/signals';
import type { HaritaVeri, HaritaModu, Geo } from '@ts/map';
import { Istemci } from './istemci.ts';
import type { Paket } from '@ts/engine';
import senaryolarJson from '../../../data/derlenmis/senaryolar.json';
import simgelerJson from '../../../data/derlenmis/simgeler.json';

export interface SenaryoOzet {
  kimlik: string; ad: string; alt: string; aciklama: string; donem: string; yil: number; tarih: string; ulkeSayi: number;
  oneCikan: { i: number; ad: string; kisa: string; renk: string; lider: string }[];
}
export const SENARYOLAR = senaryolarJson as SenaryoOzet[];
/** game-icons.net yol verisi (512×512, CC BY 3.0). */
export const SIMGE = simgelerJson as Record<string, string>;

const PAKETLER: Record<string, () => Promise<{ default: unknown }>> = {
  s750: () => import('../../../data/derlenmis/s750.json'),
  s1600: () => import('../../../data/derlenmis/s1600.json'),
  s1914: () => import('../../../data/derlenmis/s1914.json'),
  s1939: () => import('../../../data/derlenmis/s1939.json'),
  s2026: () => import('../../../data/derlenmis/s2026.json'),
  'fixture-1a': () => import('../../../data/derlenmis/fixture-1a.json'),
};

/** Etkin senaryo paketi (canlı bağ: yüklenince bütün modüller yenisini görür). */
export let pkg: Paket = null as unknown as Paket;
export let geo: Geo | null = null;
export const paketKimlik = signal<string | null>(null);
const onbellek = new Map<string, Paket>();

export async function geoYukle(): Promise<Geo> {
  if (!geo) geo = (await import('../../../data/derlenmis/dunya-geo.json')).default as unknown as Geo;
  return geo;
}
export async function paketGetir(kimlik: string): Promise<Paket> {
  let p = onbellek.get(kimlik);
  if (!p) {
    const y = PAKETLER[kimlik];
    if (!y) throw new Error(`Bilinmeyen senaryo: ${kimlik}`);
    p = (await y()).default as Paket;
    onbellek.set(kimlik, p);
  }
  await geoYukle();
  return p;
}
export async function paketSec(kimlik: string): Promise<Paket> {
  const p = await paketGetir(kimlik);
  pkg = p; paketKimlik.value = kimlik;
  return p;
}

export const istemci = new Istemci();

export type Panel = 'devlet' | 'ordu' | 'ekonomi' | 'diplomasi' | 'arastirma' | 'istatistik' | 'kronik' | 'kayit';
/** Sağ çekmece: aynı anda tek pencere (panel, bölge ya da tur raporu). */
export type Cekmece = null | { tur: 'panel'; panel: Panel } | { tur: 'bolge'; r: number } | { tur: 'rapor' };

export const ekran = signal<'baslangic' | 'oyun'>('baslangic');
export const ozet = signal<any>(null);
export const harita = signal<HaritaVeri | null>(null);
export const cekmece = signal<Cekmece>(null);
export const panel = computed(() => (cekmece.value?.tur === 'panel' ? cekmece.value.panel : null));
export const haritaModu = signal<HaritaModu>('siyasi');
export const seciliBolge = signal<number>(-1);
export const seciliBirlik = signal<Set<number>>(new Set());
/** Haritadan bölge seçme kipi (ör. yeni birliklerin konuşlanacağı şehir). */
export const bolgeSecimi = signal<null | { baslik: string; uygun: (r: number) => boolean; sec: (r: number) => void }>(null);
/** Ordu panelinde seçilen konuşlanma bölgesi (−1: başkent). */
export const konuslanma = signal<number>(-1);
export const ilerliyor = signal(false);
export const ilerleme = signal<{ yuzde: number; tarih: string } | null>(null);
export const rapor = signal<{ neden: string; gecen: number; olaylar: { tarih: string; metin: string; onem: number }[]; durmalar: any[] } | null>(null);
export const komutSonuc = signal<any>(null);
export const nedenAcik = signal<any>(null);
export const tostlar = signal<{ id: number; metin: string; tur: string }[]>([]);
export const komutMetni = signal('');
export const panelSurum = signal(0); // panelleri tazele

export const oyuncu = computed(() => ozet.value?.oyuncu ?? 0);

export function panelAc(p: Panel) {
  cekmece.value = panel.value === p ? null : { tur: 'panel', panel: p };
}
export function bolgeAc(r: number) {
  seciliBolge.value = r;
  cekmece.value = r >= 0 ? { tur: 'bolge', r } : null;
}

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

/** Oyunu başlatır ya da kaydı açar; kayıt başka senaryoya aitse o paketi yükleyip yeniden dener. */
export async function oyunAc(istek: { tur: 'yeni'; kimlik: string; oyuncu: number; mod: number } | { tur: 'kayit'; yuva?: string; bayt?: ArrayBuffer }) {
  if (istek.tur === 'yeni') {
    const p = await paketSec(istek.kimlik);
    await istemci.istek('init', { oyuncu: istek.oyuncu, mod: istek.mod, paket: p });
  } else {
    try {
      await istemci.istek('load', istek.bayt ? { bayt: istek.bayt } : { yuva: istek.yuva }, undefined, [], istek.bayt ? [istek.bayt] : []);
    } catch (e: any) {
      if (e?.kod !== 'paket' || !e.paket) throw e;
      const p = await paketSec(e.paket);
      await istemci.istek('load', istek.bayt ? { bekleyen: true, paket: p } : { yuva: istek.yuva, paket: p });
    }
  }
  seciliBirlik.value = new Set(); seciliBolge.value = -1; cekmece.value = null; komutSonuc.value = null; rapor.value = null; konuslanma.value = -1;
  await tazele();
  ekran.value = 'oyun';
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
export const buyukHarf = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
