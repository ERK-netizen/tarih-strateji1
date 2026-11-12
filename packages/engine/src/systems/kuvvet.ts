// Filolar ve hava kanatları (şartname v1.6, PR-08): deniz ve hava kuvvetleri ülke toplamı olmaktan çıkar.
// Her filonun tek konumu, ana limanı ve görevi; her kanadın tek üssü, görevi ve hedefi vardır. Aynı gemi iki filoda,
// aynı filo iki bölgede, aynı kanat iki görevde olamaz. Ülke sütunları (gs0–gs4, h0–h2) bu tabloların aynasıdır.
import type { World, UlkeK } from '../state/world.ts';
import { AKTIF } from '../catalog.ts';
import { GEMI, HAVA, NGEMI, NHAVA } from '../katalogEk.ts';
import { largestRemainder } from '../num/index.ts';
import { pasif } from './ortak.ts';
import { UCAK_KAPASITE, havaMenzili, kiyidaMi } from './us.ts';

export const FG = ['g0', 'g1', 'g2', 'g3', 'g4'] as const;
export const KU = ['u0', 'u1', 'u2'] as const;
const GK = ['gs0', 'gs1', 'gs2', 'gs3', 'gs4'] as const satisfies readonly UlkeK[];
const HK = ['h0', 'h1', 'h2'] as const satisfies readonly UlkeK[];
/** Ülke başına en çok filo ve kanat (bölme emriyle açılabilecek üst sınır). */
export const FILO_AZAMI = 8, KANAT_AZAMI = 10;
/** Çağa göre deniz menzili (ana limandan bölge sıçraması) ve sıçrama başına seyir günü. */
export const DENIZ_MENZIL: Record<string, number> = { orta: 8, barut: 16, buyuk: 22, ikinci: 30, modern: 60 };
export const SEYIR_GUN: Record<string, number> = { orta: 4, barut: 3, buyuk: 2, ikinci: 2, modern: 1 };
export const denizMenzili = (): number => DENIZ_MENZIL[AKTIF.donem] ?? 16;

export const filoAdi = (w: World, f: number): string => w.kuvvetAd[w.FL.c.ad[f]!] ?? `Filo ${f}`;
export const kanatAdi = (w: World, k: number): string => w.kuvvetAd[w.KN.c.ad[k]!] ?? `Kanat ${k}`;
export function ulkeFilolari(w: World, c: number): number[] { const l: number[] = []; for (const f of w.FL.rows()) if (w.FL.c.ulke[f] === c) l.push(f); return l; }
export function ulkeKanatlari(w: World, c: number): number[] { const l: number[] = []; for (const k of w.KN.rows()) if (w.KN.c.ulke[k] === c) l.push(k); return l; }
export const filoGemi = (w: World, f: number): number => { let n = 0; for (const g of FG) n += w.FL.c[g][f]!; return n; };
export const kanatUcak = (w: World, k: number): number => { let n = 0; for (const u of KU) n += w.KN.c[u][k]!; return n; };
/** Filo yolda mı? Yoldaki filo ne ayrıldığı ne varacağı bölgede etkilidir. */
export const filoYolda = (w: World, f: number): boolean => w.FL.c.hedef[f]! >= 0 && w.FL.c.varis[f]! > w.gun;

/** Ülke toplamlarını (ayna sütunlar) filo ve kanat tablolarından yeniden yazar. */
export function kuvvetEsitle(w: World, c: number): void {
  const C = w.C.c;
  for (let k = 0; k < NGEMI; k++) C[GK[k]!][c] = 0;
  for (let k = 0; k < NHAVA; k++) C[HK[k]!][c] = 0;
  let gh = 0, gn = 0, hh = 0, hn = 0;
  for (const f of w.FL.rows()) {
    if (w.FL.c.ulke[f] !== c) continue;
    for (let k = 0; k < NGEMI; k++) C[GK[k]!][c] = C[GK[k]!][c]! + w.FL.c[FG[k]!][f]!;
    const n = filoGemi(w, f); gh += w.FL.c.hasar[f]! * n; gn += n;
  }
  for (const k of w.KN.rows()) {
    if (w.KN.c.ulke[k] !== c) continue;
    for (let t = 0; t < NHAVA; t++) C[HK[t]!][c] = C[HK[t]!][c]! + w.KN.c[KU[t]!][k]!;
    const n = kanatUcak(w, k); hh += w.KN.c.hasar[k]! * n; hn += n;
  }
  // ülke hasar sütunları gösterim içindir: gemi/uçak ağırlıklı ortalama
  C.gHasar[c] = gn > 0 ? Math.floor(gh / gn) : 0;
  C.hHasar[c] = hn > 0 ? Math.floor(hh / hn) : 0;
}

/** c'nin deniz üssü olabilecek bölgeleri: sahip olup kontrol ettiği kıyı bölgeleri; tersaneliler önce. */
export function limanlar(w: World, c: number): number[] {
  const R = w.R.c, l: number[] = [];
  for (let r = 0; r < w.nR; r++) if (R.sahip[r] === c && R.kontrolEden[r] === c && kiyidaMi(w, r)) l.push(r);
  return l.sort((a, b) => R.tersane[b]! - R.tersane[a]! || R.kent[b]! - R.kent[a]! || a - b);
}
/** c'nin hava üsleri (düzeyi > 0, sahip ve kontrol); büyük üs önce. */
export function usler(w: World, c: number): number[] {
  const R = w.R.c, l: number[] = [];
  for (let r = 0; r < w.nR; r++) if (R.sahip[r] === c && R.kontrolEden[r] === c && R.havaUs[r]! > 0) l.push(r);
  return l.sort((a, b) => R.havaUs[b]! - R.havaUs[a]! || a - b);
}
/** İki bölge arası sıçrama sayısı (bölge çizgesi, deniz kenarları dahil); sinir aşılırsa 999. */
export function sicrama(w: World, a: number, b: number, sinir: number): number {
  if (a === b) return 0;
  const gor = new Uint8Array(w.nR); gor[a] = 1;
  let k = [a];
  for (let d = 1; d <= sinir && k.length; d++) {
    const y: number[] = [];
    for (const q of k) for (const z of w.komsuluk[q]!) { if (gor[z]) continue; if (z === b) return d; gor[z] = 1; y.push(z); }
    k = y;
  }
  return 999;
}

function adEkle(w: World, ad: string): number { w.kuvvetAd.push(ad); return w.kuvvetAd.length - 1; }
function siraNo(w: World, c: number, filo: boolean): number {
  // ad çakışmasın: ülkenin o türdeki en büyük sıra numarası + 1
  let en = 0;
  const son = filo ? '. Filo' : '. Hava Kanadı';
  const l = filo ? ulkeFilolari(w, c).map((f) => filoAdi(w, f)) : ulkeKanatlari(w, c).map((k) => kanatAdi(w, k));
  for (const a of l) if (a.endsWith(son)) { const n = Number(a.slice(0, a.length - son.length)); if (Number.isSafeInteger(n) && n > en) en = n; }
  return en + 1;
}
export function filoKur(w: World, c: number, us: number, gemi: number[]): number {
  const f = w.FL.alloc(), F = w.FL.c;
  F.ulke[f] = c; F.ad[f] = adEkle(w, `${siraNo(w, c, true)}. Filo`); F.us[f] = us; F.konum[f] = us; F.hedef[f] = -1; F.varis[f] = 0; F.gorev[f] = 0; F.hasar[f] = 0;
  for (let k = 0; k < NGEMI; k++) F[FG[k]!][f] = gemi[k] ?? 0;
  return f;
}
export function kanatKur(w: World, c: number, us: number, ucak: number[]): number {
  const k = w.KN.alloc(), K = w.KN.c;
  K.ulke[k] = c; K.ad[k] = adEkle(w, `${siraNo(w, c, false)}. Hava Kanadı`); K.us[k] = us; K.gorev[k] = 0; K.hedef[k] = -1; K.hasar[k] = 0;
  for (let t = 0; t < NHAVA; t++) K[KU[t]!][k] = ucak[t] ?? 0;
  return k;
}

/**
 * Ülke toplamlarından filo ve kanat kurar (senaryo başlangıcı ve şema ≤ 9 kayıtlarının göçü). Gemiler limanlara,
 * uçaklar hava üslerine en büyük artıkla dağıtılır; toplamlar tam korunur. Eski ülke görevi bütün birimlere geçer.
 */
export function kuvvetKur(w: World, c: number): void {
  const C = w.C.c;
  for (const f of ulkeFilolari(w, c)) w.FL.release(f);
  for (const k of ulkeKanatlari(w, c)) w.KN.release(k);
  const gemi = Array.from({ length: NGEMI }, (_, k) => C[GK[k]!][c]!), ucak = Array.from({ length: NHAVA }, (_, k) => C[HK[k]!][c]!);
  const gTop = gemi.reduce((s, x) => s + x, 0), uTop = ucak.reduce((s, x) => s + x, 0);
  const gh = C.gHasar[c]!, hh = C.hHasar[c]!;
  if (gTop > 0) {
    let l = limanlar(w, c);
    if (!l.length) l = [w.pkg.ulkeler[c]!.baskent];
    const n = Math.max(1, Math.min(l.length, 4, 1 + Math.floor(gTop / 40)));
    const pay = Array.from({ length: NGEMI }, (_, k) => largestRemainder(gemi[k]!, new Array<number>(n).fill(1)));
    const hedef = C.donBolge[c]! - 1;
    for (let i = 0; i < n; i++) {
      const f = filoKur(w, c, l[i]!, pay.map((p) => p[i]!));
      w.FL.c.gorev[f] = C.donGorev[c]!; w.FL.c.hasar[f] = gh;
      if (hedef >= 0 && w.FL.c.gorev[f]! > 0) w.FL.c.konum[f] = hedef;
    }
  }
  if (uTop > 0) {
    let l = usler(w, c);
    if (!l.length) l = [w.pkg.ulkeler[c]!.baskent];
    l = l.slice(0, KANAT_AZAMI - 2);
    const agirlik = l.map((r) => Math.max(1, w.R.c.havaUs[r]!));
    const pay = Array.from({ length: NHAVA }, (_, t) => largestRemainder(ucak[t]!, agirlik));
    for (let i = 0; i < l.length; i++) {
      const u = pay.map((p) => p[i]!);
      if (u.reduce((s, x) => s + x, 0) <= 0) continue;
      const k = kanatKur(w, c, l[i]!, u);
      w.KN.c.gorev[k] = C.havaGorev[c]!; w.KN.c.hedef[k] = C.havaGorev[c]! > 0 ? C.havaBolge[c]! : -1; w.KN.c.hasar[k] = hh;
    }
  }
  kuvvetEsitle(w, c);
}
export function kuvvetKurHepsi(w: World): void {
  w.FL.hw = 0; w.FL.free = []; w.FL.alive.fill(0); w.FL.gen.fill(0);
  w.KN.hw = 0; w.KN.free = []; w.KN.alive.fill(0); w.KN.gen.fill(0);
  w.kuvvetAd = [];
  for (let c = 0; c < w.nC; c++) kuvvetKur(w, c);
}

/** Üsteki kanatların uçak toplamı ve üs kapasitesi (düzey × 24). */
export function usDoluluk(w: World, r: number): { ucak: number; kapasite: number } {
  let n = 0;
  for (const k of w.KN.rows()) if (w.KN.c.us[k] === r) n += kanatUcak(w, k);
  return { ucak: n, kapasite: w.R.c.havaUs[r]! * UCAK_KAPASITE };
}
/** Kanadın görev bölgesi r'yi kapsıyor mu? Hedef ve komşuları; hedef üssün menzilinde olmalı (emirde denetlenir). */
export function kanatKapsar(w: World, k: number, r: number): boolean {
  const h = w.KN.c.hedef[k]!;
  return h >= 0 && (h === r || w.komsuluk[h]!.includes(r));
}
/** Hedef, kanadın kendi üssünün menzilinde mi? */
export function kanatMenzilde(w: World, k: number, hedef: number): boolean {
  return sicrama(w, w.KN.c.us[k]!, hedef, havaMenzili()) <= havaMenzili();
}
/** Filoyu hedef kıyı bölgesine yola çıkarır; seyir günü sıçrama × çağ hızı. Varış gününü döndürür. */
export function filoYolaCikar(w: World, f: number, hedef: number): number {
  const F = w.FL.c;
  const nereden = filoYolda(w, f) ? F.konum[f]! : F.konum[f]!;
  if (hedef === nereden) { F.hedef[f] = -1; F.varis[f] = 0; return w.gun; }
  const d = sicrama(w, nereden, hedef, 200);
  const gun = Math.max(1, (d >= 999 ? denizMenzili() : d) * (SEYIR_GUN[AKTIF.donem] ?? 2));
  F.hedef[f] = hedef; F.varis[f] = w.gun + gun;
  return F.varis[f]!;
}

/** Günlük: varan filolar konum değiştirir; üssünü yitiren filo ve kanatlar en yakın kendi limanına/üssüne çekilir. */
export function kuvvetGunu(w: World): void {
  const F = w.FL.c, K = w.KN.c, R = w.R.c;
  for (const f of w.FL.rows()) {
    if (F.hedef[f]! >= 0 && F.varis[f]! <= w.gun) { F.konum[f] = F.hedef[f]!; F.hedef[f] = -1; F.varis[f] = 0; }
    const c = F.ulke[f]!;
    if (R.kontrolEden[F.us[f]!] !== c) {
      const l = limanlar(w, c);
      if (l.length) { F.us[f] = l[0]!; if (F.gorev[f] === 0) filoYolaCikar(w, f, l[0]!); }
    }
  }
  for (const k of w.KN.rows()) {
    const c = K.ulke[k]!;
    if (R.kontrolEden[K.us[k]!] === c && R.havaUs[K.us[k]!]! > 0) continue;
    const l = usler(w, c);
    K.gorev[k] = 0; K.hedef[k] = -1;
    if (l.length) K.us[k] = l[0]!;
  }
}

/** Yeni gemiler: o limanı üs edinmiş limandaki filoya, yoksa ülkenin ilk filosuna, o da yoksa yeni filoya katılır. */
export function gemiTeslim(w: World, c: number, liman: number, sinif: number, adet: number): void {
  const fl = ulkeFilolari(w, c);
  let f = fl.find((x) => w.FL.c.us[x] === liman && w.FL.c.konum[x] === liman && !filoYolda(w, x)) ?? fl.find((x) => w.FL.c.us[x] === liman) ?? fl[0];
  if (f === undefined) f = filoKur(w, c, w.R.c.kontrolEden[liman] === c ? liman : (limanlar(w, c)[0] ?? w.pkg.ulkeler[c]!.baskent), []);
  w.FL.c[FG[sinif]!][f] = w.FL.c[FG[sinif]!][f]! + adet;
  kuvvetEsitle(w, c);
}
/** Yeni uçaklar: en boş hava üssündeki kanada, kanat yoksa yeni kanada katılır. */
export function ucakTeslim(w: World, c: number, tip: number, adet: number): void {
  const kl = ulkeKanatlari(w, c);
  let k = [...kl].sort((a, b) => { const x = usDoluluk(w, w.KN.c.us[a]!), y = usDoluluk(w, w.KN.c.us[b]!); return (y.kapasite - y.ucak) - (x.kapasite - x.ucak) || a - b; })[0];
  if (k === undefined) k = kanatKur(w, c, usler(w, c)[0] ?? w.pkg.ulkeler[c]!.baskent, []);
  w.KN.c[KU[tip]!][k] = w.KN.c[KU[tip]!][k]! + adet;
  kuvvetEsitle(w, c);
}

/** Bütünlük: ayna sütunlar tabloların toplamına eşit, hiçbir sayı negatif değil, her birim tek ülkeye ait (V16-T66). */
export function kuvvetDenetim(w: World): string | null {
  const g = new Float64Array(w.nC * NGEMI), u = new Float64Array(w.nC * NHAVA);
  for (const f of w.FL.rows()) for (let k = 0; k < NGEMI; k++) { const n = w.FL.c[FG[k]!][f]!; if (n < 0 || !Number.isSafeInteger(n)) return `filo ${f} sınıf ${k}: ${n}`; g[w.FL.c.ulke[f]! * NGEMI + k] = g[w.FL.c.ulke[f]! * NGEMI + k]! + n; }
  for (const k of w.KN.rows()) for (let t = 0; t < NHAVA; t++) { const n = w.KN.c[KU[t]!][k]!; if (n < 0 || !Number.isSafeInteger(n)) return `kanat ${k} tür ${t}: ${n}`; u[w.KN.c.ulke[k]! * NHAVA + t] = u[w.KN.c.ulke[k]! * NHAVA + t]! + n; }
  for (let c = 0; c < w.nC; c++) {
    for (let k = 0; k < NGEMI; k++) if (g[c * NGEMI + k] !== w.C.c[GK[k]!][c]) return `ülke ${c} gemi sınıfı ${k}: filolar ${g[c * NGEMI + k]} ≠ toplam ${w.C.c[GK[k]!][c]}`;
    for (let t = 0; t < NHAVA; t++) if (u[c * NHAVA + t] !== w.C.c[HK[t]!][c]) return `ülke ${c} uçak türü ${t}: kanatlar ${u[c * NHAVA + t]} ≠ toplam ${w.C.c[HK[t]!][c]}`;
  }
  return null;
}
void GEMI; void HAVA; void pasif;
