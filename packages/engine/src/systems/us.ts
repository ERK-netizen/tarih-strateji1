// Hava üsleri, tersaneler, aktif cepheler ve menzil (şema 8).
import type { World } from '../state/world.ts';
import { AKTIF } from '../catalog.ts';
import { HAVA } from '../katalogEk.ts';
import { savasta, ulkeBolgeleri } from './ortak.ts';

/** Üs düzeyi başına barındırılabilen uçak sayısı. */
export const UCAK_KAPASITE = 24;
/** Hava üssü düzeyi üst sınırı (bölge başına). */
export const US_MAX = 5;
/** Çağa göre hava menzili (bölge sıçraması). */
export const HAVA_MENZIL: Record<string, number> = { orta: 0, barut: 0, buyuk: 3, ikinci: 6, modern: 12 };
export const havaMenzili = (): number => HAVA_MENZIL[AKTIF.donem] ?? 0;

export function ucakToplam(w: World, c: number): number {
  const C = w.C.c as unknown as Record<string, Float64Array>;
  let t = 0; for (let k = 0; k < HAVA[AKTIF.donem].length; k++) t += C[`h${k}`]![c]!;
  return t;
}
export function ucakKapasitesi(w: World, c: number): number {
  let l = 0; for (const r of ulkeBolgeleri(w, c, true)) l += w.R.c.havaUs[r]!;
  return l * UCAK_KAPASITE;
}
const kiyiMi = (w: World, r: number): boolean => !!w.pkg.bolgeler[r]?.kiyi || w.komsuluk[r]!.some((q) => (w.pkg.kenarlar.find((k) => (k.a === r && k.b === q) || (k.a === q && k.b === r))?.tur ?? 0) > 0);
export const kiyidaMi = kiyiMi;

/** Aktif cepheler: savaş hâlindeki tarafların son iki haftada çarpıştığı veya karşılıklı sınır olan bölgeler. */
export function cepheler(w: World, c: number): number[] {
  const dusman: number[] = [];
  for (let d = 0; d < w.nC; d++) if (d !== c && savasta(w, c, d)) dusman.push(d);
  if (!dusman.length) return [];
  const R = w.R.c, out: number[] = [];
  for (let r = 0; r < w.nR; r++) {
    const k = R.kontrolEden[r]!;
    const benim = k === c, onlar = dusman.includes(k);
    if (!benim && !onlar) continue;
    if (w.gun - R.sonMuharebe[r]! <= 14) { out.push(r); continue; }
    if (w.komsuluk[r]!.some((q) => (benim ? dusman.includes(R.kontrolEden[q]!) : R.kontrolEden[q] === c))) out.push(r);
  }
  return out;
}

/** c'nin hava üslerinden r'ye en kısa bölge sıçraması (üs yoksa 999). */
export function usMesafesi(w: World, c: number, r: number): number {
  const R = w.R.c;
  const mes = new Map<number, number>();
  let k: number[] = [];
  for (let q = 0; q < w.nR; q++) if (R.sahip[q] === c && R.kontrolEden[q] === c && R.havaUs[q]! > 0) { mes.set(q, 0); k.push(q); }
  for (let d = 0; k.length > 0; d++) {
    if (mes.has(r)) return mes.get(r)!;
    if (d >= 14) break;
    const y: number[] = [];
    for (const q of k) for (const z of w.komsuluk[q]!) if (!mes.has(z)) { mes.set(z, d + 1); y.push(z); }
    k = y;
  }
  return mes.get(r) ?? 999;
}

/** Senaryo başında (ve eski kayıt göçünde) üs ve tersane düzeylerini mevcut güçle uyumlu kurar. */
export function usTersaneKur(w: World): void {
  const R = w.R.c;
  const hava = HAVA[AKTIF.donem].length > 0;
  for (let c = 0; c < w.nC; c++) {
    const bol = ulkeBolgeleri(w, c, true);
    if (!bol.length) continue;
    const puan = (r: number) => R.askeriF[r]! * 2 + R.sivilF[r]! + R.kent[r]!;
    const sirali = [...bol].sort((a, b) => puan(b) - puan(a) || a - b);
    // tersane: sanayili kıyı bölgeleri
    let var1 = false;
    for (const r of sirali) if (kiyiMi(w, r) && (R.kent[r]! >= 2 || R.sivilF[r]! + R.askeriF[r]! >= 3)) { R.tersane[r] = R.sivilF[r]! + R.askeriF[r]! >= 8 ? 2 : 1; var1 = true; }
    if (!var1) { const k = sirali.find((r) => kiyiMi(w, r)); if (k !== undefined) R.tersane[k] = 1; }
    if (!hava) continue;
    // hava üssü: mevcut uçak sayısını barındıracak kadar düzey, en güçlü bölgelerden başlayarak
    let gerek = Math.max(1, Math.ceil((ucakToplam(w, c) * 3) / (2 * UCAK_KAPASITE)) + 1);
    const bas = w.pkg.ulkeler[c]!.baskent;
    if (R.sahip[bas] === c) { R.havaUs[bas] = 1; gerek--; }
    for (const r of sirali) {
      if (gerek <= 0) break;
      const ek = Math.min(US_MAX - R.havaUs[r]!, gerek);
      R.havaUs[r] = R.havaUs[r]! + ek; gerek -= ek;
    }
  }
}
