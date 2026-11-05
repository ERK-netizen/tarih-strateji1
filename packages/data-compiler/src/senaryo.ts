// Senaryo derleyicisi: gerçek dünya haritası (harita.json) + senaryo tanımı → oyun paketi.
// Tanımlar `senaryolar/` altındadır; devlet, lider, ittifak ve olay adları tarihî kayıtlara dayanır.
// Kayan nokta yalnız burada kullanılır; pakete tamsayı yazılır.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HASAT_HAM, HASAT_P, NKIMLIK, BAYRAK } from '../../engine/src/catalog.ts';
import { DONEMLER, type DonemKod } from '../../engine/src/donem.ts';
import type { Paket, PaketBolge, PaketUlke, PaketSenaryoOlay, PaketEylem } from '../../engine/src/paket.ts';
import { ulkeNufus, DAGILIM_US, type Donem } from './veri/nufus.ts';
import { MODERN, INANC_AD, kulturGrup, kulturTablosu } from './veri/kultur.ts';

const kok = join(dirname(fileURLToPath(import.meta.url)), '../../..');
interface HBolge { ad: string; iso: string; lon: number; lat: number; x: number; y: number; alanKm2: number; nufus: number; kent: number; arazi: number; kiyi: boolean; komsu: number[] }
interface Harita { gen: number; yuk: number; bolgeler: HBolge[]; kenarlar: { a: number; b: number; km: number; sinir: number; tur: number }[]; denizler: { ad: string; x: number; y: number }[] }
const H: Harita = JSON.parse(readFileSync(join(kok, 'data/derlenmis/harita.json'), 'utf8'));
const NR = H.bolgeler.length;

// ---------- Tanım tipleri ----------
/** Yönetim: 0 mutlak monarşi, 1 meşruti monarşi, 2 cumhuriyet, 3 tek parti, 4 askerî. Kişilik: 0 yayılmacı, 1 temkinli, 2 fırsatçı, 3 ticari, 4 ideolojik. */
export interface Devlet {
  k: string; ad: string; kisa: string; sifat: string; renk: string;
  y: number; ks: number; yAd?: string; lider: string;
  bas: string; guc: number; eko: number;
  /** ISO seçiciler: "FR DE<10 RU^55" (< > boylam, ^ _ enlem) */
  t?: string;
  /** Açık bölge adları (harita adı) */
  b?: string[];
  /** ISO seçicisinden çıkarılacak bölgeler */
  haric?: string[];
  kultur?: string; inanc?: string;
  pasif?: boolean;
  /** Ordu bileşimi oranı (piyade, süvari, topçu, milis) */
  ordu?: [number, number, number, number];
  /** Zorunlu askerlik yasası (0–3) */
  askerlik?: number;
}
export type Iliski =
  | ['ittifak' | 'ticaret' | 'saldirmazlik' | 'gecis' | 'garanti', string, string]
  | ['gorus', string, string, number]
  | ['savas', string[], string[], number?];
export interface OlayTanim {
  kod: string; tarih: string | null; ulke: string; baslik: string; metin: string;
  kosul?: { savasta?: [string, string]; barista?: [string, string]; kontrol?: [string, string]; kontrolDegil?: [string, string] };
  sec: { ad: string; etki: string; yz: number; e: (string | number | boolean)[][] }[];
}
export interface SenaryoTanim {
  kimlik: string; ad: string; alt: string; aciklama: string; donem: DonemKod; nufusDonem: Donem;
  baslangic: [number, number, number]; bitis: [number, number, number]; tohum: number;
  devletler: Devlet[];
  /** Pasif topluluklar: boşta kalan bölgeleri doldurur */
  dolgu: Devlet[];
  adlar?: Record<string, string>;
  /** ISO → "Kültür/inanç" (dönemin halk dağılımı) */
  halk?: string;
  /** Bölge adı → "Kültür/inanç" */
  halkBolge?: Record<string, string>;
  iliski: Iliski[];
  isgal?: Record<string, string>;
  iddia?: Record<string, string[]>;
  olaylar?: OlayTanim[];
  oneCikan: string[];
  /** Ekonomik çağ çarpanı (fabrika) */
  sanayi: number;
  /** Demiryolu/yol ağı düzeyi (0–3) */
  ulasim: number;
  /** Kaynak bölgeleri (çelik/kömür) */
  kaynak?: string[];
}

// ---------- Yardımcılar ----------
function hashR(k: number): number {
  let a = (k * 2654435761) | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const adIdx = new Map<string, number>();
H.bolgeler.forEach((b, i) => { adIdx.set(b.ad, i); adIdx.set(`${b.iso}:${b.ad}`, i); });
function bolgeAd(ad: string, ctx: string): number {
  const i = adIdx.get(ad);
  if (i === undefined) throw new Error(`${ctx}: bölge bulunamadı: "${ad}"`);
  return i;
}
function secici(t: string | undefined): (b: HBolge) => boolean {
  if (!t) return () => false;
  const parca = t.trim().split(/\s+/).filter(Boolean).map((tok) => {
    const m = /^([A-Z]{2})(?:([<>^_])(-?[\d.]+))?$/.exec(tok);
    if (!m) throw new Error(`geçersiz seçici: ${tok}`);
    const iso = m[1]!, op = m[2], v = m[3] ? Number(m[3]) : 0;
    return (b: HBolge) => b.iso === iso && (!op || (op === '<' ? b.lon < v : op === '>' ? b.lon >= v : op === '^' ? b.lat >= v : b.lat < v));
  });
  return (b) => parca.some((f) => f(b));
}

function hasatNormal(): number[] {
  const ham = HASAT_HAM, pp = HASAT_P, S = 1_000_000;
  let bek = 0; for (let i = 0; i < ham.length; i++) bek += ham[i]! * pp[i]!;
  bek /= S;
  const h = ham.map((x) => Math.floor((x * S) / bek));
  let b2 = 0; for (let i = 0; i < h.length; i++) b2 += h[i]! * pp[i]!;
  let fark = S * S - b2;
  h[2] = h[2]! + Math.floor(fark / pp[2]!);
  fark = S * S - h.reduce((s, x, i) => s + x * pp[i]!, 0);
  if (fark !== 0 && Number.isInteger(fark / pp[0]!)) h[0] = h[0]! + fark / pp[0]!;
  return h;
}

const ARAZI_TARIM = [1.15, 0.95, 1.0, 0.8, 0.85, 0.55, 0.6];
const ARAZI_NUFUS = [1.0, 0.8, 0.9, 0.6, 0.6, 0.35, 1.0];

// ---------- Derleme ----------
export function derle(t: SenaryoTanim): { paket: Paket; ozet: string } {
  const uyarilar: string[] = [];
  const devletler = [...t.devletler, ...t.dolgu.map((d) => ({ ...d, pasif: true }))];
  const nC = devletler.length;
  const kodIdx = new Map(devletler.map((d, i) => [d.k, i]));
  if (kodIdx.size !== nC) throw new Error(`${t.kimlik}: yinelenen devlet kodu`);
  const K = (k: string, ctx: string): number => { const i = kodIdx.get(k); if (i === undefined) throw new Error(`${t.kimlik} ${ctx}: devlet yok: ${k}`); return i; };

  // 1) toprak dağıtımı
  const sahip = new Int32Array(NR).fill(-1);
  devletler.forEach((d, c) => {
    for (const ad of d.b ?? []) {
      const r = bolgeAd(ad, `${t.kimlik}/${d.k}`);
      if (sahip[r]! >= 0) throw new Error(`${t.kimlik}: ${ad} iki kez açık atanmış (${devletler[sahip[r]!]!.k}, ${d.k})`);
      sahip[r] = c;
    }
  });
  devletler.forEach((d, c) => {
    const f = secici(d.t);
    const har = new Set((d.haric ?? []).map((a) => bolgeAd(a, `${t.kimlik}/${d.k} haric`)));
    H.bolgeler.forEach((b, r) => { if (sahip[r]! < 0 && !har.has(r) && f(b)) sahip[r] = c; });
  });
  const bos = H.bolgeler.map((b, r) => ({ b, r })).filter(({ r }) => sahip[r]! < 0);
  if (bos.length) throw new Error(`${t.kimlik}: sahipsiz bölgeler: ${bos.map(({ b }) => `${b.iso}:${b.ad}`).join(', ')}`);
  // başkentler
  const baskent = devletler.map((d, c) => {
    // '*': devletin ilk ISO'sunun ilk bölgesi (harita derleyicisi başkenti öne koyar)
    const r = d.bas === '*' ? H.bolgeler.findIndex((b, i) => sahip[i] === c && b.iso === (d.t ?? '').trim().split(/\s+/)[0]!.slice(0, 2)) : bolgeAd(d.bas, `${t.kimlik}/${d.k} başkent`);
    if (r < 0) throw new Error(`${t.kimlik}: ${d.k} başkenti bulunamadı`);
    if (sahip[r] !== devletler.indexOf(d)) throw new Error(`${t.kimlik}: ${d.k} başkenti ${d.bas} kendi toprağında değil (${devletler[sahip[r]!]?.k})`);
    return r;
  });
  for (let c = 0; c < nC; c++) if (!H.bolgeler.some((_, r) => sahip[r] === c)) throw new Error(`${t.kimlik}: ${devletler[c]!.k} topraksız`);

  // 2) adlar
  const ad = H.bolgeler.map((b) => t.adlar?.[b.ad] ?? b.ad);
  if (t.adlar) for (const k of Object.keys(t.adlar)) bolgeAd(k, `${t.kimlik} adlar`);

  // 3) halk ve inanç
  const halk = { ...MODERN, ...(t.halk ? kulturTablosu(t.halk) : {}) };
  const bolgeHalk: [string, string][] = H.bolgeler.map((b): [string, string] => {
    const o = t.halkBolge?.[b.ad];
    if (o) { const [k, i] = o.split('/'); return [k!, i!]; }
    return halk[b.iso] ?? ['Yerli', 'yerel'];
  });
  const devletHalk: [string, string][] = devletler.map((d, c): [string, string] => [d.kultur ?? bolgeHalk[baskent[c]!]![0], d.inanc ?? bolgeHalk[baskent[c]!]![1]]);
  const kulturler: string[] = [], inanclar: string[] = [];
  const kI = (k: string) => { let i = kulturler.indexOf(k); if (i < 0) { i = kulturler.length; kulturler.push(k); } return i; };
  const iI = (k: string) => { if (!INANC_AD[k]) throw new Error(`${t.kimlik}: bilinmeyen inanç ${k}`); let i = inanclar.indexOf(k); if (i < 0) { i = inanclar.length; inanclar.push(k); } return i; };
  devletHalk.forEach(([k, i]) => { kI(k); iI(i); });
  bolgeHalk.forEach(([k, i]) => { kI(k); iI(i); });

  // 4) nüfus
  const isoGrup = new Map<string, number[]>();
  H.bolgeler.forEach((b, r) => (isoGrup.get(b.iso) ?? isoGrup.set(b.iso, []).get(b.iso)!).push(r));
  const nufus = new Float64Array(NR);
  const us = DAGILIM_US[t.nufusDonem];
  for (const [iso, rs] of isoGrup) {
    const top = ulkeNufus(t.nufusDonem, iso);
    const w = rs.map((r) => Math.pow(Math.max(1000, H.bolgeler[r]!.nufus), us) * ARAZI_NUFUS[H.bolgeler[r]!.arazi]!);
    const ws = w.reduce((s, x) => s + x, 0);
    rs.forEach((r, i) => { nufus[r] = (top * w[i]!) / ws; });
  }
  baskent.forEach((r) => { nufus[r] = nufus[r]! * 1.15; });
  for (let r = 0; r < NR; r++) nufus[r] = Math.max(t.nufusDonem === '750' ? 800 : 2000, Math.round(nufus[r]!));

  // 5) devlet büyüklükleri
  const dBolge = devletler.map((_, c) => H.bolgeler.map((_, r) => r).filter((r) => sahip[r] === c));
  const dNufus = dBolge.map((rs) => rs.reduce((s, r) => s + nufus[r]!, 0));
  const hedefOrdu = devletler.map((d, c) => d.pasif ? Math.max(1, Math.round(dBolge[c]!.length / 3)) : Math.max(1, Math.round(1.2 * Math.pow(d.guc, 1.6))));

  // 6) bölgeler
  const yerlesim = H.bolgeler.map((b, r) => (baskent.includes(r) ? 2 : (b.kent * (t.nufusDonem === '2026' ? 1 : 0.4)) > 1_500_000 ? 2 : b.kent > 400_000 ? 1 : 0));
  const sivilF = new Array<number>(NR).fill(0), askeriF = new Array<number>(NR).fill(0);
  devletler.forEach((d, c) => {
    const rs = dBolge[c]!;
    const ekoF = 0.4 + d.eko / 6;
    const popM = dNufus[c]! / 1e6;
    const sTop = d.pasif ? rs.length * 0.3 : (hedefOrdu[c]! * 1.4 * ekoF + popM * 0.08 * d.eko / 5) * t.sanayi;
    const aTop = d.pasif ? 0 : hedefOrdu[c]! * 1.25 * (0.5 + d.eko / 10) * t.sanayi;
    const w = rs.map((r) => Math.pow(Math.max(1000, H.bolgeler[r]!.kent + nufus[r]! * 0.2), 0.6) * (baskent[c] === r ? 1.6 : 1));
    const ws = w.reduce((s, x) => s + x, 0) || 1;
    // en büyük kalan yöntemiyle tamsayı dağıtım
    for (const [top, hedef] of [[sTop, sivilF], [aTop, askeriF]] as const) {
      const n = Math.round(top);
      const pay = rs.map((_, i) => (n * w[i]!) / ws);
      const tam = pay.map(Math.floor);
      let kalan = n - tam.reduce((s, x) => s + x, 0);
      const sira = pay.map((p, i) => [p - Math.floor(p), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
      for (const [, i] of sira) { if (kalan <= 0) break; tam[i]!++; kalan--; }
      rs.forEach((r, i) => { hedef[r] = tam[i]!; });
    }
  });
  const kaynakSet = new Set((t.kaynak ?? []).map((a) => bolgeAd(a, `${t.kimlik} kaynak`)));
  const bolgeler: PaketBolge[] = H.bolgeler.map((b, r) => {
    const c = sahip[r]!;
    const d = devletler[c]!;
    const n = nufus[r]!;
    const hs = hashR(r * 31 + t.tohum);
    // tarım: ülke oranı 1,02–1,18 (çöl ülkeleri ithalatçı); mevsimsel çeşitlilik
    const oran = d.pasif ? 1.12 : 1.04 + (d.eko >= 7 ? -0.03 : 0.04) + (hs - 0.5) * 0.06;
    const alan = Math.max(10, Math.round((oran * n / 2000) * ARAZI_TARIM[b.arazi]! / (b.arazi === 5 ? 1 : 0.98)));
    // kaynak
    const kaynak = kaynakSet.has(r) ? 1 : 0;
    const dagli = b.arazi === 2 || b.arazi === 3 ? 1 : 0;
    const sanayiDuzey = d.pasif ? 0 : Math.max(0.2, d.eko / 5) * t.sanayi;
    const celik = Math.round((kaynak * 4000 + (dagli && hs > 0.45 ? 1200 + hs * 1800 : 0)) * sanayiDuzey);
    const komur = Math.round((kaynak * 4500 + ((b.arazi <= 2) && hashR(r * 7 + 3) > 0.55 ? 1000 + hs * 2200 : 0)) * sanayiDuzey);
    // yaş × statü (fixture yöntemi)
    const cells = new Array<number>(32).fill(0);
    const tarihi = t.nufusDonem !== '2026';
    const cocuk = Math.floor(n * (tarihi ? 0.38 : 0.26)), asker = Math.floor(n * (tarihi ? 0.30 : 0.28)), yetiskin = Math.floor(n * (tarihi ? 0.26 : 0.30));
    const yasli = n - cocuk - asker - yetiskin;
    const yedekOran = d.pasif ? 0.03 : 0.04 + d.guc / 250;
    const R = Math.floor(asker * 0.15);
    const E = Math.floor(asker * yedekOran);
    const kalan = asker - R - E;
    const askerlik = d.askerlik ?? 1;
    const Y = Math.floor(kalan * [0.075, 0.125, 0.25, 0.5][askerlik]!);
    cells[0] = cocuk;
    cells[8 + 1] = kalan - Y; cells[8 + 2] = Y; cells[8 + 3] = E; cells[8 + 7] = R;
    cells[16] = yetiskin; cells[24] = yasli;
    // kimlik
    const [nk, ni] = bolgeHalk[r]!;
    const [ok, oi] = devletHalk[c]!;
    const anahtar: [number, number][] = [];
    const kimlik: number[] = [];
    if (nk === ok && ni === oi) { anahtar.push([kI(nk), iI(ni)]); kimlik.push(n); }
    else {
      const pay = baskent[c] === r ? 0.7 : 0.12;
      const a = Math.floor(n * (1 - pay));
      anahtar.push([kI(nk), iI(ni)]); kimlik.push(a);
      anahtar.push([kI(ok), iI(oi)]); kimlik.push(n - a);
    }
    while (anahtar.length < NKIMLIK) { anahtar.push([-1, -1]); kimlik.push(0); }
    // mevsim
    const lat = b.lat, kuzey = lat >= 0;
    const kaydir = (a: number[]) => (kuzey ? a : [...a.slice(6), ...a.slice(0, 6)]);
    const al = Math.abs(lat);
    let kis = al > 55 ? [3, 3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3] : al > 45 ? [2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2] : al > 36 ? [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] : new Array(12).fill(0);
    if (b.arazi === 3 && al > 25) kis = kis.map((v, i) => Math.min(3, v + ([0, 1, 2, 10, 11].includes(i) ? 1 : 0)));
    const camur = al > 45 ? [0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 1, 0] : al < 23 && b.arazi !== 5 ? [0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0] : [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0];
    const altyapi = Math.max(1, Math.min(6, Math.round(1 + (d.pasif ? 0 : d.eko / 3) + yerlesim[r]! * 0.7 + t.ulasim * 0.4)));
    const demiryolu = t.ulasim === 0 || d.pasif ? 0 : Math.max(0, Math.min(3, Math.round((t.ulasim * (d.eko / 10)) + (yerlesim[r]! > 0 ? 0.6 : 0) - 0.3)));
    return {
      kod: `R${String(r + 1).padStart(3, '0')}`, ad: ad[r]!, eyalet: r, sahip: c, arazi: b.arazi, yerlesim: yerlesim[r]!,
      merkez: [Math.round(b.x), Math.round(b.y)], poligon: [], komsu: b.komsu,
      iso: b.iso, lon: Math.round(b.lon * 10) / 10, lat: Math.round(b.lat * 10) / 10,
      alan, verim: 2000, isciYog: 420, sulama: yerlesim[r]! > 0 || ['EG', 'IQ'].includes(b.iso) ? 1 : 0, altyapi, demiryolu,
      sivilF: sivilF[r]!, askeriF: askeriF[r]!, celik, komur, nufus: cells, kimlik, kimlikAnahtar: anahtar, kis: kaydir(kis), camur: kaydir(camur),
      anaYurt: [], iddia: [], iklim: al > 45 ? 1 : 0,
    };
  });
  // ana yurt ve iddialar: aynı halktan tek etkin devlet varsa o halkın ana yurdudur
  const halkDevlet = new Map<string, number[]>();
  devletler.forEach((d, c) => { if (!d.pasif) { const k = devletHalk[c]![0]; (halkDevlet.get(k) ?? halkDevlet.set(k, []).get(k)!).push(c); } });
  bolgeler.forEach((b, r) => {
    const c = b.sahip;
    const nk = bolgeHalk[r]![0];
    if (nk === devletHalk[c]![0] || devletler[c]!.pasif) b.anaYurt.push(c);
    const sahipler = halkDevlet.get(nk) ?? [];
    if (sahipler.length === 1 && sahipler[0] !== c) { b.anaYurt.push(sahipler[0]!); b.iddia.push(sahipler[0]!); }
  });
  for (const [bAd, l] of Object.entries(t.iddia ?? {})) {
    const r = bolgeAd(bAd, `${t.kimlik} iddia`);
    for (const k of l) { const c = K(k, 'iddia'); if (!bolgeler[r]!.iddia.includes(c)) bolgeler[r]!.iddia.push(c); if (!bolgeler[r]!.anaYurt.includes(c)) bolgeler[r]!.anaYurt.push(c); }
  }
  for (const [bAd, k] of Object.entries(t.isgal ?? {})) {
    const r = bolgeAd(bAd, `${t.kimlik} isgal`);
    bolgeler[r]!.kontrol = K(k, 'isgal');
  }

  // 7) ilişkiler
  const anlasmalar: Paket['anlasmalar'] = [];
  const savaslar: NonNullable<Paket['savaslar']> = [];
  const G: number[][] = devletler.map((_, a) => devletler.map((_, b) => (a === b ? 100_000 : 50_000)));
  devletler.forEach((da, a) => devletler.forEach((db, b) => {
    if (a === b) return;
    let g = 50_000;
    const [ka, ia] = devletHalk[a]!, [kb, ib] = devletHalk[b]!;
    if (ka === kb) g += 8000; else if (kulturGrup(ka) === kulturGrup(kb)) g += 4000;
    if (ia === ib) g += 5000; else g -= 5000;
    if (da.pasif || db.pasif) g = 45_000;
    G[a]![b] = g;
  }));
  // komşuluk gerginliği
  const komsuU = new Set<number>();
  for (const k of H.kenarlar) { const a = sahip[k.a]!, b = sahip[k.b]!; if (a !== b) { komsuU.add(a * 1000 + b); komsuU.add(b * 1000 + a); } }
  for (const x of komsuU) { const a = Math.floor(x / 1000), b = x % 1000; if (!devletler[a]!.pasif && !devletler[b]!.pasif) G[a]![b] = G[a]![b]! - 4000; }
  const savasta = new Set<number>();
  for (const il of t.iliski) {
    if (il[0] === 'gorus') { const a = K(il[1], 'gorus'), b = K(il[2], 'gorus'); G[a]![b] = il[3] * 1000; continue; }
    if (il[0] === 'savas') {
      const A_ = il[1].map((k) => K(k, 'savas')), B_ = il[2].map((k) => K(k, 'savas'));
      savaslar.push({ a: A_, b: B_, gun: il[3] ?? 0, gerekceli: true });
      for (const a of A_) for (const b of B_) { savasta.add(a * 1000 + b); savasta.add(b * 1000 + a); G[a]![b] = 8000; G[b]![a] = 5000; }
      for (const l of [A_, B_]) for (const a of l) for (const b of l) if (a !== b) G[a]![b] = Math.max(G[a]![b]!, 78_000);
      continue;
    }
    const a = K(il[1], il[0]), b = K(il[2], il[0]);
    anlasmalar.push({ tur: il[0], a, b });
    if (il[0] === 'ittifak') { G[a]![b] = Math.max(G[a]![b]!, 85_000); G[b]![a] = Math.max(G[b]![a]!, 85_000); }
    if (il[0] === 'garanti') { G[b]![a] = Math.max(G[b]![a]!, 75_000); G[a]![b] = Math.max(G[a]![b]!, 65_000); }
    if (il[0] === 'saldirmazlik') { G[a]![b] = Math.max(G[a]![b]!, 52_000); G[b]![a] = Math.max(G[b]![a]!, 52_000); }
  }

  // 8) birlikler
  const donem = DONEMLER[t.donem];
  const sab = donem.sablon;
  const birlikler: Paket['birlikler'] = [];
  const sayac = new Array<number>(nC).fill(0);
  // kara bağlantısı: başkentten kendi toprağı üzerinden kara kenarlarıyla ulaşılan bölgeler (denizaşırı olmayan)
  const karaKomsu: number[][] = H.bolgeler.map(() => []);
  for (const k of H.kenarlar) if (!k.tur) { karaKomsu[k.a]!.push(k.b); karaKomsu[k.b]!.push(k.a); }
  devletler.forEach((d, c) => {
    const tum = dBolge[c]!.filter((r) => (bolgeler[r]!.kontrol ?? c) === c);
    const bagli = new Set<number>([baskent[c]!]);
    const yig = [baskent[c]!];
    while (yig.length) { const x = yig.pop()!; for (const y of karaKomsu[x]!) if (!bagli.has(y) && sahip[y] === c && (bolgeler[y]!.kontrol ?? c) === c) { bagli.add(y); yig.push(y); } }
    const denizasiri = tum.filter((r) => !bagli.has(r));
    const rs = tum.filter((r) => bagli.has(r));
    // denizaşırı topraklara milis garnizonları
    if (!d.pasif) {
      const ms = sab[3]!;
      for (let i = 0; i < denizasiri.length; i += 3) { sayac[c]!++; birlikler.push({ ulke: c, sablon: ms.kod, bolge: [...denizasiri].sort((a, b) => nufus[b]! - nufus[a]! || a - b)[Math.floor(i / 3)]!, ad: `${sayac[c]}. ${ms.ad}` }); }
    }
    const isgalci = bolgeler.map((b, r) => ({ b, r })).filter(({ b }) => b.kontrol === c).map(({ r }) => r);
    const savasVar = [...savasta].some((x) => Math.floor(x / 1000) === c);
    const n = d.pasif ? hedefOrdu[c]! : Math.max(1, Math.round(hedefOrdu[c]! * (savasVar ? 1 : 0.85)) - Math.ceil(denizasiri.length / 3));
    // cephe: düşman veya soğuk komşuya bakan bölgeler
    const dusmanMi = (k: number) => k !== c && !devletler[k]!.pasif && (savasta.has(c * 1000 + k) || G[c]![k]! < 40_000);
    const cephe = [...rs, ...isgalci].filter((r) => H.bolgeler[r]!.komsu.some((v) => { const k = bolgeler[v]!.kontrol ?? sahip[v]!; return dusmanMi(k); }));
    const sinir = rs.filter((r) => H.bolgeler[r]!.komsu.some((v) => { const k = bolgeler[v]!.kontrol ?? sahip[v]!; return k !== c && !devletler[k]!.pasif; }));
    const buyuk = [...rs].sort((a, b) => nufus[b]! - nufus[a]! || a - b);
    const oran = d.ordu ?? (d.pasif ? [0, 0, 0, 1] : t.donem === 'orta' ? [0.62, 0.25, 0.05, 0.08] : t.donem === 'barut' ? [0.65, 0.2, 0.1, 0.05] : [0.72, 0.1, 0.12, 0.06]);
    const tipler: string[] = [];
    const say = oran.map((o) => Math.floor(o * n));
    let eksik = n - say.reduce((s, x) => s + x, 0);
    for (let i = 0; eksik > 0; i = (i + 1) % 4) { if (oran[i]! > 0) { say[i]!++; eksik--; } }
    say.forEach((m, i) => { for (let j = 0; j < m; j++) tipler.push(sab[i]!.kod); });
    // dağılım: piyade/topçu cepheye, süvari yarı yarıya, milis başkent ve büyük şehirlere
    tipler.forEach((tip, i) => {
      sayac[c]!++;
      let r: number;
      const havuz = savasVar && cephe.length ? cephe : sinir.length ? sinir : buyuk;
      if (tip === sab[3]!.kod || d.pasif) r = (d.pasif ? tum : buyuk)[i % Math.max(1, (d.pasif ? tum : buyuk).length)]!;
      else if (i % 3 === 2 && !savasVar) r = buyuk[i % Math.min(3, buyuk.length)]!;
      else r = (cephe.length ? cephe : havuz)[(i * 7 + c) % (cephe.length ? cephe : havuz).length]!;
      if (r === undefined) r = baskent[c]!;
      const sAd = sab.find((s) => s.kod === tip)!.ad;
      birlikler.push({ ulke: c, sablon: tip, bolge: r, ad: `${sayac[c]}. ${sAd}` });
    });
  });

  // 9) devletler
  const ulkeler: PaketUlke[] = devletler.map((d, c) => {
    const popM = dNufus[c]! / 1e6;
    const n = hedefOrdu[c]!;
    const ekoF = 0.6 + d.eko / 10;
    const savasVar = [...savasta].some((x) => Math.floor(x / 1000) === c);
    const ekip = new Array<number>(8).fill(0);
    if (!d.pasif) {
      ekip[0] = Math.round(n * 180 * ekoF); ekip[1] = Math.round(n * 30 * (d.eko / 10)); ekip[3] = Math.round(n * 22); ekip[4] = Math.round(n * 7);
      ekip[5] = Math.round(n * 6 * ekoF); ekip[6] = Math.round(n * 1.2 * ekoF);
    }
    return {
      kod: d.k, ad: d.ad, kisa: d.kisa, sifat: d.sifat, renk: d.renk, yonetim: d.y, kisilik: d.ks, baskent: baskent[c]!,
      hazine: Math.round(d.pasif ? popM * 100_000 : n * 450_000 * ekoF + popM * 350_000 * (d.eko / 5)),
      pg: d.pasif ? 0 : 50_000 + d.guc * 2000, vergi: d.pasif ? 80_000 : 110_000 + d.eko * 5000, askerlik: d.askerlik ?? 1, ekonomi: savasVar ? 2 : d.guc >= 7 ? 1 : 0,
      huzur: d.pasif ? 60_000 : 58_000 + (d.eko - 5) * 1000, mesru: 60_000, kultur: kI(devletHalk[c]![0]), inanc: iI(devletHalk[c]![1]),
      yedekOran: Math.round((d.pasif ? 0.03 : 0.04 + d.guc / 250) * 1_000_000), tekler: d.eko >= 8 && !d.pasif ? ['tarim1', 'sanayi1'] : d.eko >= 6 && !d.pasif ? ['tarim1'] : [],
      lider: d.lider, pasif: d.pasif || undefined, yonetimAd: d.yAd, guc: d.guc, ordu: n,
      depo: { muhimmat: d.pasif ? 2000 : Math.round(n * 6500 * ekoF), ekip },
    } as PaketUlke;
  });

  // 10) olaylar
  const gunNo = (s: string): number => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return gunHesap(y, m, d);
  };
  const olaylar: PaketSenaryoOlay[] = (t.olaylar ?? []).map((o) => ({
    kod: o.kod, gun: o.tarih ? gunNo(o.tarih) : -1, ulke: K(o.ulke, `olay ${o.kod}`), baslik: o.baslik, metin: o.metin,
    kosul: o.kosul ? {
      savasta: o.kosul.savasta ? [K(o.kosul.savasta[0], o.kod), K(o.kosul.savasta[1], o.kod)] : undefined,
      barista: o.kosul.barista ? [K(o.kosul.barista[0], o.kod), K(o.kosul.barista[1], o.kod)] : undefined,
      kontrol: o.kosul.kontrol ? [bolgeAd(o.kosul.kontrol[0], o.kod), K(o.kosul.kontrol[1], o.kod)] : undefined,
      kontrolDegil: o.kosul.kontrolDegil ? [bolgeAd(o.kosul.kontrolDegil[0], o.kod), K(o.kosul.kontrolDegil[1], o.kod)] : undefined,
    } : undefined,
    secenekler: o.sec.map((s) => ({ ad: s.ad, etki: s.etki, yz: s.yz, e: s.e.map((x) => eylem(x, K, o.kod)) })),
  }));
  for (const o of olaylar) for (const s of o.secenekler) for (const e of s.e) if (e.t === 'olay' && !olaylar.some((x) => x.kod === e.olay)) throw new Error(`${t.kimlik}: zincir olayı yok: ${e.olay}`);

  const paket: Paket = {
    kimlik: t.kimlik, surum: '2.0.0', donem: t.donem, alt: t.alt, aciklama: t.aciklama,
    senaryo: { ad: t.ad, baslangic: { y: t.baslangic[0], m: t.baslangic[1], d: t.baslangic[2] }, bitis: { y: t.bitis[0], m: t.bitis[1], d: t.bitis[2] } },
    tohum: t.tohum,
    bayraklar: Object.fromEntries(BAYRAK.map((b) => [b, b === 'istihbarat'])) as Paket['bayraklar'],
    hasat: hasatNormal(), hasatP: [...HASAT_P],
    kultur: kulturler.map((k, i) => ({ kod: `k${i}`, ad: k, grup: kulturGrup(k) })),
    inanc: inanclar.map((k) => ({ kod: k, ad: INANC_AD[k]! })),
    ulkeler,
    eyaletler: bolgeler.map((b, r) => ({ kod: `E${r + 1}`, ad: b.ad, ulke: b.sahip, merkez: r, bolgeler: [r] })),
    bolgeler,
    kenarlar: H.kenarlar.map((k) => ({ a: k.a, b: k.b, km: k.km, sinir: k.sinir, tur: k.tur || undefined })),
    gorus: G,
    anlasmalar, savaslar, birlikler,
    olaylar, oneCikan: t.oneCikan.map((k) => K(k, 'öne çıkan')),
    harita: { gen: H.gen, yuk: H.yuk, deniz: [], cizgiler: [], denizAdlari: H.denizler, gercek: true },
    uyarilar,
  };
  const etkin = devletler.filter((d) => !d.pasif).length;
  const ozet = `${t.kimlik}: ${etkin} etkin devlet, ${nC - etkin} topluluk, ${birlikler.length} birlik, nüfus ${(dNufus.reduce((s, x) => s + x, 0) / 1e6).toFixed(0)} M, ${olaylar.length} olay`;
  return { paket, ozet };
}

/** Takvim gün numarası (motorla aynı: proleptik Gregoryen, 1 Ocak 1 = 0'dan sayılmaz; motorun gunNo'su kullanılır). */
import { gunNo as motorGunNo } from '../../engine/src/calendar/index.ts';
function gunHesap(y: number, m: number, d: number): number { return motorGunNo({ y, m, d }); }

function eylem(x: (string | number | boolean)[], K: (k: string, c: string) => number, ctx: string): PaketEylem {
  const [t, ...p] = x as [string, ...(string | number | boolean)[]];
  const c = (v: unknown) => K(String(v), `${ctx}/${t}`);
  switch (t) {
    case 'savas': return { t, a: c(p[0]), b: c(p[1]), cagri: p[2] === false ? false : undefined };
    case 'katil': return { t, a: c(p[0]), b: c(p[1]), d: p[2] !== undefined ? c(p[2]) : undefined };
    case 'baris': case 'ittifak': case 'ticaret': case 'saldirmazlik': case 'garanti': case 'gecis': case 'gerekce': return { t, a: c(p[0]), b: c(p[1]) };
    case 'gorus': return { t, a: c(p[0]), b: c(p[1]), v: Number(p[2]) * 1000, olay: p[3] ? 'karsilikli' : undefined };
    case 'huzur': case 'mesru': case 'destek': case 'pg': case 'gerginlik': return { t, a: c(p[0]), v: Number(p[1]) * 1000 };
    case 'hazine': return { t, a: c(p[0]), v: Number(p[1]) };
    case 'boz': return { t, a: c(p[0]), b: c(p[1]), v: Number(p[2]) };
    case 'bolge': return { t, a: bolgeAd(String(p[0]), ctx), b: c(p[1]) };
    case 'olay': return { t, olay: String(p[0]), gecikme: Number(p[1] ?? 0) };
  }
  throw new Error(`${ctx}: bilinmeyen eylem ${t}`);
}

// ---------- Çalıştırma ----------
export function yaz(tanimlar: SenaryoTanim[]): void {
  mkdirSync(join(kok, 'data/derlenmis'), { recursive: true });
  const liste: unknown[] = [];
  for (const t of tanimlar) {
    const { paket, ozet } = derle(t);
    writeFileSync(join(kok, `data/derlenmis/${t.kimlik}.json`), JSON.stringify(paket));
    console.log(ozet);
    liste.push({
      kimlik: t.kimlik, ad: t.ad, alt: t.alt, aciklama: t.aciklama, donem: t.donem, yil: t.baslangic[0],
      tarih: `${t.baslangic[2]}.${t.baslangic[1]}.${t.baslangic[0]}`,
      oneCikan: paket.oneCikan!.map((i) => ({ i, ad: paket.ulkeler[i]!.ad, kisa: paket.ulkeler[i]!.kisa, renk: paket.ulkeler[i]!.renk, lider: paket.ulkeler[i]!.lider })),
      ulkeSayi: paket.ulkeler.filter((u) => !u.pasif).length,
    });
  }
  writeFileSync(join(kok, 'data/derlenmis/senaryolar.json'), JSON.stringify(liste, null, 1));
}
