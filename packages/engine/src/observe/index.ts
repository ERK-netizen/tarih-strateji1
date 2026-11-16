// Bölüm 19.1 ve 19.4: gözlem görünümü ve istihbarat aralığı. Karar modülü yalnız bu katmanı okur.
import type { World } from '../state/world.ts';
import { A } from '../state/world.ts';
import { tekVar } from '../catalog.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { rng, AMAC, uniformInt } from '../rng/index.ts';
import { tarih } from '../calendar/index.ts';
import { uc, birlikIstat, anlasmaVar, sinirKomsusu } from '../systems/ortak.ts';

/** Önbellek damgası: aynı faz içinde birlik/diplomasi değişmedikçe gözlem aynıdır. */
function damga(w: World): string {
  return `${w.gun}|${w.surum}|${(w.onbellek.get('faz') as number | undefined) ?? 0}|${w.diploSurum}|${w.rotaEpoch}`;
}
/** Birlik konumları faz içinde değişmez (yeni kurulan birlikler eğitimdedir): konum damgası. */
function konumDamga(w: World): string {
  return `${w.gun}|${w.surum}|${(w.onbellek.get('faz') as number | undefined) ?? 0}`;
}
/** Faz sınırında çağrılır: gözlem önbelleklerini geçersiz kılar. */
export function fazDegisti(w: World): void { w.onbellek.set('faz', ((w.onbellek.get('faz') as number | undefined) ?? 0) + 1); }

/** Gözlemcinin birliklerinin bulunduğu ve komşu bölgeler (keşif menzili). */
function kesifMenzili(w: World, gozlemci: number): Uint8Array {
  const d = konumDamga(w);
  let o = w.onbellek.get('kesif') as { d: string; m: Map<number, Uint8Array> } | undefined;
  if (!o || o.d !== d) { o = { d, m: new Map() }; w.onbellek.set('kesif', o); }
  let k = o.m.get(gozlemci);
  if (k) return k;
  k = new Uint8Array(w.nR);
  const U = uc(w);
  for (const u of w.U.rows()) {
    if (U.ulke![u] !== gozlemci) continue;
    const r = U.bolge![u]!;
    k[r] = 1;
    for (const v of w.komsuluk[r]!) k[v] = 1;
  }
  o.m.set(gozlemci, k);
  return k;
}

/** İstihbarat düzeyi I (0–100, ×1000). */
export function istihbaratDuzeyi(w: World, gozlemci: number, hedef: number, bolge = -1): number {
  if (gozlemci === hedef) return 100_000;
  let I = 20_000;
  // güvenlik bütçesi (sosyal/güvenlik kalemi payıyla, 0–30)
  I += Math.min(30_000, mulDiv(w.C.c.b3[gozlemci]!, 60_000, S).q);
  if (sinirKomsusu(w, gozlemci, hedef)) I += 20_000;
  if (anlasmaVar(w, A.ticaret, gozlemci, hedef) >= 0) I += 15_000; // diplomatik misyon
  if (anlasmaVar(w, A.ittifak, gozlemci, hedef) >= 0) I += 10_000;
  // kendi birliği aynı ya da komşu bölgedeyse keşif +20
  if (bolge >= 0 && kesifMenzili(w, gozlemci)[bolge]) I += 20_000;
  if (tekVar(w, gozlemci, 'istihbarat1')) I += 20_000;
  return clamp(I, 0, 100_000);
}

/** Aralık genişliği w = (50 − 0,45 I)/100, S ölçekli. */
export function aralikGenislik(I: number): number {
  return Math.floor((50_000 - mulDiv(450_000, I, S).q) * 10);
}

/**
 * Gösterilen aralık: merkez = gerçek × (1+δ), δ ∈ [−w/2, +w/2] (anahtarlı, ayda bir değişir);
 * aralık = [merkez(1−w), merkez(1+w)]. Gerçek değer her zaman içeridedir (T132).
 */
export function aralik(w: World, gozlemci: number, hedefVarlik: number, gercek: number, I: number, alan = 0): { alt: number; ust: number; merkez: number } {
  if (I >= 100_000) return { alt: gercek, ust: gercek, merkez: gercek };
  const g = aralikGenislik(I);
  const t = tarih(w.gun);
  const ayAnahtar = t.y * 12 + t.m;
  const u = rng(w.tohum, ayAnahtar, 19, hedefVarlik, gozlemci, AMAC.intelNoise, alan, 0);
  const delta = uniformInt(u, g + 1) - Math.floor(g / 2); // [−w/2, +w/2]
  const merkez = gercek + mulDiv(gercek, delta, S).q;
  const alt = Math.min(gercek, merkez - mulDiv(merkez, g, S).q);
  const ust = Math.max(gercek, merkez + mulDiv(merkez, g, S).q);
  return { alt: Math.max(0, alt), ust, merkez };
}

export interface BolgeGozlem { bolge: number; ulke: number; birlik: number; gucAlt: number; gucUst: number; kisiAlt: number; kisiUst: number; kesin: boolean }

/** Bölge başına yabancı birlik özeti (gözlemci için). Kesin değer sis altındaysa sızmaz. */
interface Topluluk { ulke: number; bolge: number; birlik: number; guc: number; kisi: number }
/** Bölge × ülke birlik toplamları (bütün gözlemciler için ortak). */
function topluluklar(w: World): Topluluk[] {
  const d = konumDamga(w);
  const o = w.onbellek.get('toplu') as { d: string; l: Topluluk[] } | undefined;
  if (o && o.d === d) return o.l;
  const U = uc(w);
  const top = new Map<number, Topluluk>();
  for (const u of w.U.rows()) {
    const c = U.ulke![u]!, r = U.bolge![u]!;
    const key = r * 4096 + c;
    const s = birlikIstat(w, u);
    let t = top.get(key);
    if (!t) { t = { ulke: c, bolge: r, birlik: 0, guc: 0, kisi: 0 }; top.set(key, t); }
    t.birlik++; t.guc += s.YS + s.SV; t.kisi += U.kisi![u]!;
  }
  const l = [...top.values()].sort((a, b) => a.bolge - b.bolge || a.ulke - b.ulke);
  w.onbellek.set('toplu', { d, l });
  return l;
}

function topluBolge(w: World): Map<number, Topluluk[]> {
  const d = konumDamga(w);
  const o = w.onbellek.get('topluB') as { d: string; m: Map<number, Topluluk[]> } | undefined;
  if (o && o.d === d) return o.m;
  const m = new Map<number, Topluluk[]>();
  for (const t of topluluklar(w)) (m.get(t.bolge) ?? m.set(t.bolge, []).get(t.bolge)!).push(t);
  w.onbellek.set('topluB', { d, m });
  return m;
}
function tabanI(w: World, gozlemci: number, hedef: number): number {
  const d = damga(w);
  let o = w.onbellek.get('tabanI') as { d: string; m: Map<number, number> } | undefined;
  if (!o || o.d !== d) { o = { d, m: new Map() }; w.onbellek.set('tabanI', o); }
  const k = gozlemci * 4096 + hedef;
  let v = o.m.get(k);
  if (v === undefined) { v = istihbaratDuzeyi(w, gozlemci, hedef); o.m.set(k, v); }
  return v;
}
function gozlemYap(w: World, gozlemci: number, o: Topluluk, kesif: Uint8Array): BolgeGozlem | null {
  const dost = o.ulke === gozlemci || anlasmaVar(w, A.ittifak, gozlemci, o.ulke) >= 0;
  if (dost) return { bolge: o.bolge, ulke: o.ulke, birlik: o.birlik, gucAlt: o.guc, gucUst: o.guc, kisiAlt: o.kisi, kisiUst: o.kisi, kesin: true };
  const I = Math.min(100_000, tabanI(w, gozlemci, o.ulke) + (kesif[o.bolge] ? 20_000 : 0));
  if (I < 25_000) return null; // görülmeyen
  const g = aralik(w, gozlemci, o.bolge * 256 + o.ulke, o.guc, I, 1);
  const k = aralik(w, gozlemci, o.bolge * 256 + o.ulke, o.kisi, I, 2);
  return { bolge: o.bolge, ulke: o.ulke, birlik: o.birlik, gucAlt: g.alt, gucUst: g.ust, kisiAlt: k.alt, kisiUst: k.ust, kesin: false };
}
function topluUlke(w: World): Map<number, Topluluk[]> {
  const d = konumDamga(w);
  const o = w.onbellek.get('topluU') as { d: string; m: Map<number, Topluluk[]> } | undefined;
  if (o && o.d === d) return o.m;
  const m = new Map<number, Topluluk[]>();
  for (const t of topluluklar(w)) (m.get(t.ulke) ?? m.set(t.ulke, []).get(t.ulke)!).push(t);
  w.onbellek.set('topluU', { d, m });
  return m;
}
/** Bir ülkenin gözlemciye görünen birlikleri (bölge sırasıyla). */
export function ulkeGozlem(w: World, gozlemci: number, hedef: number): BolgeGozlem[] {
  const kesif = kesifMenzili(w, gozlemci);
  const out: BolgeGozlem[] = [];
  for (const o of topluUlke(w).get(hedef) ?? []) { const g = gozlemYap(w, gozlemci, o, kesif); if (g) out.push(g); }
  return out;
}
/** Yalnız verilen bölgelerdeki gözlem (bölge sırasıyla). */
export function bolgeGozlemBolgeler(w: World, gozlemci: number, bolgeler: number[]): BolgeGozlem[] {
  const tb = topluBolge(w), kesif = kesifMenzili(w, gozlemci);
  const out: BolgeGozlem[] = [];
  for (const r of [...bolgeler].sort((a, b) => a - b)) for (const o of tb.get(r) ?? []) { const g = gozlemYap(w, gozlemci, o, kesif); if (g) out.push(g); }
  return out;
}

export function bolgeGozlem(w: World, gozlemci: number): BolgeGozlem[] {
  const d = damga(w);
  let oc = w.onbellek.get('gozlem') as { d: string; m: Map<number, BolgeGozlem[]> } | undefined;
  if (!oc || oc.d !== d) { oc = { d, m: new Map() }; w.onbellek.set('gozlem', oc); }
  const hazir = oc.m.get(gozlemci);
  if (hazir) return hazir;
  const out: BolgeGozlem[] = [];
  const kesif = kesifMenzili(w, gozlemci);
  for (const o of topluluklar(w)) { const g = gozlemYap(w, gozlemci, o, kesif); if (g) out.push(g); }
  oc.m.set(gozlemci, out);
  return out;
}

/** Hazine kademesi (sis): zayıf / orta / güçlü. */
export function hazineKademe(w: World, c: number): string {
  const h = w.C.c.hazine[c]!;
  const aylik = Math.max(1, w.C.c.g1[c]!);
  if (h < aylik) return 'zayıf';
  if (h < aylik * 4) return 'orta';
  return 'güçlü';
}

// ---------- İstihbarat raporları (şema 9, v1.6 PR-12) ----------
/** Rapor geçerlilik süresi (gün) ve ajan ağının istihbarat düzeyine katkısı. */
export const RAPOR_OMUR = 180, AJAN_KATKI = 40_000;
/**
 * Ajan raporu: hedef devletin hazinesi, birlik sayısı, ordu mevcudu, huzuru ve meşruiyeti için gözlem günlü tahmin aralıkları
 * yazar. Gerçek değer aralığın içindedir ama raporda yer almaz; aynı konudaki eski rapor yenisiyle değişir (V16-T46).
 */
export function istihbaratRaporu(w: World, c: number, d: number): number[] {
  const I = Math.min(95_000, istihbaratDuzeyi(w, c, d) + AJAN_KATKI);
  let birlik = 0, kisi = 0;
  for (const u of w.U.rows()) if (w.U.c.ulke[u] === d) { birlik++; kisi += w.U.c.kisi[u]!; }
  const gercek = [Math.max(0, w.C.c.hazine[d]!), birlik, kisi, w.C.c.huzur[d]!, w.C.c.mesru[d]!];
  const yeni: number[] = [];
  gercek.forEach((v, konu) => {
    for (const s of w.IR.list()) if (w.IR.c.ulke[s] === c && w.IR.c.hedef[s] === d && w.IR.c.konu[s] === konu) w.IR.release(s);
    const a = aralik(w, c, d, v, I, 20 + konu);
    const s = w.IR.alloc();
    const R = w.IR.c;
    R.ulke[s] = c; R.hedef[s] = d; R.konu[s] = konu; R.gozlem[s] = w.gun; R.alt[s] = a.alt; R.ust[s] = a.ust;
    R.guven[s] = 500_000 + I * 4; R.bitis[s] = w.gun + RAPOR_OMUR;
    yeni.push(s);
  });
  return yeni;
}
/** Bir devletin bir hedef hakkındaki geçerli raporları (konu sırasıyla). */
export function raporlar(w: World, c: number, d: number): number[] {
  return w.IR.list().filter((s) => w.IR.c.ulke[s] === c && w.IR.c.hedef[s] === d && w.IR.c.bitis[s]! >= w.gun).sort((a, b) => w.IR.c.konu[a]! - w.IR.c.konu[b]!);
}
/** Aylık: süresi dolan raporlar silinir (eski bilgi kesinmiş gibi kalmaz). */
export function istihbaratAy(w: World): void {
  for (const s of w.IR.list()) if (w.IR.c.bitis[s]! < w.gun) w.IR.release(s);
}
