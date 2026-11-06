// Deniz ve hava kuvvetleri (şema 7): ülke düzeyinde soyut filolar.
// Donanma: sınıf başına gemi sayısı, hasar ve tek görev (liman, hâkimiyet, abluka, ticaret akını, konvoy).
// Hava: tür başına uçak, hasar, görev (üstünlük, yakın destek, stratejik bombardıman, keşif) ve hedef bölge.
// Haftalık çözülür; kara muharebesi hava üstünlüğünü, deniz geçişi deniz üstünlüğünü kullanır.
import type { World, UlkeK } from '../state/world.ts';
import { AKTIF } from '../catalog.ts';
import { GEMI, HAVA, NGEMI, NHAVA, DONEM_FIYAT, PETROL_KULLANIM } from '../katalogEk.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { rng, uniformInt, AMAC } from '../rng/index.ts';
import { savasta, tarafi, savasUyeleri, pasif, anlat, bildir, uc } from './ortak.ts';

const GK = ['gs0', 'gs1', 'gs2', 'gs3', 'gs4'] as const satisfies readonly UlkeK[];
const HK = ['h0', 'h1', 'h2'] as const satisfies readonly UlkeK[];
export const gemiSay = (w: World, c: number, k: number): number => w.C.c[GK[k]!][c]!;
export const ucakSay = (w: World, c: number, k: number): number => w.C.c[HK[k]!][c]!;

/** Yakıt yeterliliği (S): petrolsüz donanma ve hava kuvveti yarı güçle (Büyük Savaş'ta %80) çalışır; barut çağı ve öncesinde petrol yok sayılır. */
export function yakitCarpan(w: World, c: number): number {
  if (PETROL_KULLANIM[AKTIF.donem].zirh === 0) return S;
  const ihtiyac = w.C.c.petrolIht[c]!;
  if (ihtiyac <= 0) return S;
  const stok = w.C.c.petrol[c]!;
  if (stok >= ihtiyac * 3) return S;
  // Büyük Savaş donanmaları çoğunlukla kömürle yanar: petrolsüzlük yalnız %20 güç kaybettirir
  const taban = AKTIF.donem === 'buyuk' ? 800_000 : 500_000;
  return taban + mulDiv(S - taban, stok, ihtiyac * 3).q;
}
/** Günlük petrol ihtiyacı (milibirim): gemiler, uçaklar, zırhlı/süvari birlikleri, fabrikalar. */
export function yakitIhtiyaci(w: World, c: number): { filo: number; hava: number; ordu: number; sanayi: number; toplam: number } {
  const d = AKTIF.donem;
  let filo = 0, hava = 0, ordu = 0, sanayi = 0;
  GEMI[d].forEach((g, k) => { filo += gemiSay(w, c, k) * g.yakit; });
  HAVA[d].forEach((h, k) => { hava += ucakSay(w, c, k) * h.yakit; });
  const pk = PETROL_KULLANIM[d];
  if (pk.zirh > 0) {
    const U = uc(w);
    for (const u of w.U.rows()) if (U.ulke![u] === c && U.sablon![u] === 1) ordu += pk.zirh;
    for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === c) sanayi += (w.R.c.sivilF[r]! + w.R.c.askeriF[r]!) * pk.fabrika;
  }
  return { filo, hava, ordu, sanayi, toplam: filo + hava + ordu + sanayi };
}

/** Donanma muharebe gücü (×10 birim): sınıf gücü × sayı × (1 − hasar) × yakıt. */
export function denizGucu(w: World, c: number): number {
  const d = AKTIF.donem;
  let g = 0;
  GEMI[d].forEach((s, k) => { g += gemiSay(w, c, k) * s.guc; });
  g = mulDiv(g, S - w.C.c.gHasar[c]!, S).q;
  return mulDiv(g, yakitCarpan(w, c), S).q;
}
export function akinGucu(w: World, c: number): number {
  let g = 0; GEMI[AKTIF.donem].forEach((s, k) => { g += gemiSay(w, c, k) * s.akin; }); return mulDiv(g, S - w.C.c.gHasar[c]!, S).q;
}
export function korumaGucu(w: World, c: number): number {
  let g = 0; GEMI[AKTIF.donem].forEach((s, k) => { g += gemiSay(w, c, k) * s.koruma; });
  g = mulDiv(g, S - w.C.c.gHasar[c]!, S).q;
  return w.C.c.donGorev[c] === 4 ? g * 2 : Math.floor(g / 2);
}
/** Hava gücü (×10 birim): tür katsayısı × uçak × (1 − hasar) × yakıt. */
export function havaGucu(w: World, c: number, alan: 'hava' | 'destek' | 'bomba'): number {
  let g = 0; HAVA[AKTIF.donem].forEach((h, k) => { g += ucakSay(w, c, k) * h[alan]; });
  g = mulDiv(g, S - w.C.c.hHasar[c]!, S).q;
  return mulDiv(g, yakitCarpan(w, c), S).q;
}

/** Bir savaş tarafının deniz hâkimiyeti gücü: hâkimiyet/abluka görevindekiler tam, limandakiler (mevcut filo) %40. */
function tarafDeniz(w: World, uyeler: number[]): number {
  let h = 0;
  for (const c of uyeler) { const g = denizGucu(w, c); h += w.C.c.donGorev[c] === 1 || w.C.c.donGorev[c] === 2 ? g : Math.floor((g * 2) / 5); }
  return h;
}

/** Gemi kaybı uygular (hat gemisi, kruvazör, muhrip; oranla). */
function gemiKayip(w: World, c: number, f: number, siniflar: number[], tohum: number, hasarPay = 2): number {
  let top = 0;
  for (const k of siniflar) {
    const n = gemiSay(w, c, k);
    if (n <= 0) continue;
    let kay = mulDiv(n, f, S).q;
    // kesir: olasılıkla bir gemi daha
    const art = mulDiv(n, f, S).rem;
    if (art > 0 && uniformInt(rng(w.tohum, w.gun, 31, c, k, AMAC.combatRoll, tohum, 0), S) < art) kay++;
    kay = Math.min(n, kay);
    w.C.c[GK[k]!][c] = n - kay;
    top += kay;
  }
  w.C.c.gHasar[c] = Math.min(600_000, w.C.c.gHasar[c]! + Math.floor(f / hasarPay));
  return top;
}

/** Haftalık deniz harekâtı: muharebe, abluka, ticaret akını, onarım. */
export function denizHaftasi(w: World): void {
  const C = w.C.c;
  const yeniAbluka = new Float64Array(w.nC), yeniAkin = new Float64Array(w.nC);
  for (const s of w.SV.rows()) {
    const A1 = savasUyeleri(w, s, 1).filter((c) => !pasif(w, c)), A2 = savasUyeleri(w, s, 2).filter((c) => !pasif(w, c));
    if (!A1.length || !A2.length) continue;
    const H1 = tarafDeniz(w, A1), H2 = tarafDeniz(w, A2);
    // filo muharebesi: bir taraf hâkimiyet ararken karşı tarafın filosu denizdeyse (hâkimiyet ya da abluka) haftada %8 olasılık
    const denizde = (c: number): boolean => (C.donGorev[c] === 1 || C.donGorev[c] === 2) && denizGucu(w, c) > 0;
    const arar1 = A1.some((c) => C.donGorev[c] === 1 && denizGucu(w, c) > 0), arar2 = A2.some((c) => C.donGorev[c] === 1 && denizGucu(w, c) > 0);
    const acik1 = A1.some(denizde), acik2 = A2.some(denizde);
    // zayıf filonun bilerek denize çıkması (baskın: Dogger Bank, Jutland) çatışmayı büyük olasılıkla doğurur
    const ihtimal = Math.max(arar1 && acik2 ? (H1 < H2 ? 40 : 8) : 0, arar2 && acik1 ? (H2 < H1 ? 40 : 8) : 0);
    if (ihtimal > 0 && uniformInt(rng(w.tohum, w.gun, 30, s, 0, AMAC.combatRoll, 0, 0), 100) < ihtimal) {
      const f1 = clamp(mulDiv(40_000, H2, Math.max(1, H1)).q, 10_000, 150_000), f2 = clamp(mulDiv(40_000, H1, Math.max(1, H2)).q, 10_000, 150_000);
      let k1 = 0, k2 = 0;
      for (const c of A1) if (denizde(c)) k1 += gemiKayip(w, c, f1, [0, 1, 2], s);
      for (const c of A2) if (denizde(c)) k2 += gemiKayip(w, c, f2, [0, 1, 2], s + 1000);
      // anlatıda her tarafın en büyük denizde olan donanması
      const enBuyuk = (A: number[]) => { let b = A[0]!, g = -1; for (const c of A) if (denizde(c) && denizGucu(w, c) > g) { g = denizGucu(w, c); b = c; } return b; };
      const l1 = w.pkg.ulkeler[enBuyuk(A1)]!.kisa, l2 = w.pkg.ulkeler[enBuyuk(A2)]!.kisa;
      const kazanan = k1 < k2 ? l1 : k2 < k1 ? l2 : null;
      anlat(w, `Deniz muharebesi: ${l1} ve ${l2} donanmaları çarpıştı; ${l1} ${k1}, ${l2} ${k2} gemi yitirdi${kazanan ? ` — üstünlük ${kazanan} tarafında` : ''}.`, 'savas', A1[0]!, 2);
      if (A1.includes(w.oyuncu) || A2.includes(w.oyuncu)) bildir(w, 'savas', `Deniz muharebesi: ${l1} ${k1}, ${l2} ${k2} gemi kaybı`, w.oyuncu, false);
    }
    // abluka: üstün taraf abluka görevindeyse karşı tarafın ticareti ve gelirleri boğulur
    for (const [Ust, Alt, Hu, Ha] of [[A1, A2, H1, H2], [A2, A1, H2, H1]] as const) {
      if (Hu * 4 <= Ha * 5) continue;
      let ab = 0; for (const c of Ust) if (C.donGorev[c] === 2) ab += denizGucu(w, c);
      if (ab <= 0) continue;
      const v = Math.min(600_000, mulDiv(600_000, ab, ab + Ha + 1).q);
      for (const b of Alt) yeniAbluka[b] = Math.max(yeniAbluka[b]!, v);
    }
    // ticaret akını: akıncılar karşı tarafın deniz ticaretini vurur, eskortlar akıncıları avlar
    for (const [Sald, Hedef] of [[A1, A2], [A2, A1]] as const) {
      let ra = 0; for (const c of Sald) if (C.donGorev[c] === 3) ra += akinGucu(w, c);
      if (ra <= 0) continue;
      let es = 0; for (const b of Hedef) es += korumaGucu(w, b);
      const kayip = Math.min(400_000, mulDiv(400_000, ra, ra + es + 1).q);
      for (const b of Hedef) {
        yeniAkin[b] = Math.max(yeniAkin[b]!, kayip);
        const n4 = gemiSay(w, b, 4);
        if (n4 > 0) C.gs4[b] = n4 - Math.min(n4, mulDiv(n4, Math.floor(kayip / 10), S).q);
      }
      const fa = clamp(mulDiv(6_000, es, ra + 1).q, 2_000, 40_000); // akıncı kaybı: haftada en çok %4
      // akıncı kayıpları dağınık: filonun geneline daha az hasar
      for (const c of Sald) if (C.donGorev[c] === 3) gemiKayip(w, c, fa, [3, 1], s + 2000, 5);
    }
  }
  denizUstunlukGuncelle(w);
  for (let c = 0; c < w.nC; c++) {
    C.abluka[c] = Math.max(yeniAbluka[c]!, Math.floor(C.abluka[c]! / 2));
    C.akinKayip[c] = Math.max(yeniAkin[c]!, Math.floor(C.akinKayip[c]! / 2));
    // onarım: limanda hızlı, denizde yavaş
    const h = C.gHasar[c]!;
    if (h > 0) C.gHasar[c] = Math.max(0, h - (C.donGorev[c] === 0 ? 60_000 : 15_000));
    const hh = C.hHasar[c]!;
    if (hh > 0) C.hHasar[c] = Math.max(0, hh - (C.havaGorev[c] === 0 ? 80_000 : 25_000));
  }
}

/**
 * Deniz üstünlüğü durumu (C.denizK): savaştaki düşman ittifakının donanması bizimkinin 1,25 katını aşarsa (ve kayda değerse)
 * açık deniz geçişi kapanır. Haftalık ve savaş değişince güncellenir; değişirse rota önbelleği geçersizlenir.
 */
export function denizUstunlukGuncelle(w: World): void {
  const n = w.nC;
  const g = new Int32Array(n);
  for (let c = 0; c < n; c++) g[c] = pasif(w, c) ? 0 : denizGucu(w, c);
  let degisti = false;
  for (let x = 0; x < n; x++) {
    let biz = g[x]!, onlar = 0;
    for (const s of w.SV.rows()) {
      const t = tarafi(w, s, x);
      if (!t) continue;
      // aynı anda başka bir savaşta düşmanımız olan "müttefik" filosu bizi korumaz
      for (const y of savasUyeleri(w, s, t)) if (y === x || !savasta(w, x, y)) biz = Math.max(biz, g[y]!);
      for (const y of savasUyeleri(w, s, t === 1 ? 2 : 1)) onlar = Math.max(onlar, g[y]!);
    }
    const v = onlar >= 300 && onlar * 4 > biz * 5 ? 1 : 0;
    if (w.C.c.denizK[x] !== v) { w.C.c.denizK[x] = v; degisti = true; }
  }
  if (degisti) w.rotaEpoch++;
}

/** Hava gücünün etkilediği bölgeler: hedef bölge ve komşuları. */
function havaKapsar(w: World, c: number, r: number): boolean {
  const h = w.C.c.havaBolge[c]!;
  return h >= 0 && (h === r || w.komsuluk[h]!.includes(r));
}

/**
 * Hava üstünlüğü (S, −S…S): c'nin tarafı ile düşmanlarının r üzerindeki avcı güçlerinin dengesi. Üstünlük ve yakın destek
 * görevindeki filolar sayılır; günde bir kez ülke çiftleri için önbelleğe alınır.
 */
export function havaUstunluk(w: World, c: number, r: number): number {
  if (HAVA[AKTIF.donem].length === 0) return 0;
  const anahtar = `hu${w.gun}`;
  let o = w.onbellek.get('havaU') as { k: string; m: Map<number, number> } | undefined;
  if (!o || o.k !== anahtar) { o = { k: anahtar, m: new Map() }; w.onbellek.set('havaU', o); }
  const key = c * 65536 + r;
  const v0 = o.m.get(key);
  if (v0 !== undefined) return v0;
  let biz = 0, onlar = 0;
  for (let d = 0; d < w.nC; d++) {
    const g = w.C.c.havaGorev[d]!;
    if ((g !== 1 && g !== 2) || !havaKapsar(w, d, r)) continue;
    const p = havaGucu(w, d, 'hava');
    if (p <= 0) continue;
    if (d === c || esTaraf(w, c, d)) biz += p;
    else if (savasta(w, c, d)) onlar += p;
  }
  const v = biz + onlar === 0 ? 0 : mulDiv(biz - onlar, S, biz + onlar).q;
  o.m.set(key, v);
  return v;
}
function esTaraf(w: World, a: number, b: number): boolean {
  for (const s of w.SV.rows()) { const ta = tarafi(w, s, a); if (ta && ta === tarafi(w, s, b)) return true; }
  return false;
}
/** Yakın destek: c'nin destek görevindeki bombardıman gücünün r'deki muharebeye katkısı (S, en çok %25). */
export function yakinDestek(w: World, c: number, r: number): number {
  if (w.C.c.havaGorev[c] !== 2 || !havaKapsar(w, c, r)) return 0;
  const p = havaGucu(w, c, 'destek');
  return Math.min(250_000, mulDiv(p, 1000, 1).q);
}

/** Haftalık hava harekâtı: hava muharebesi yıpranması ve stratejik bombardıman. */
export function havaHaftasi(w: World): void {
  if (HAVA[AKTIF.donem].length === 0) return;
  const C = w.C.c;
  const aktif: number[] = [];
  for (let c = 0; c < w.nC; c++) if (C.havaGorev[c]! > 0 && C.havaBolge[c]! >= 0 && !pasif(w, c)) aktif.push(c);
  for (const c of aktif) {
    let dusman = 0;
    for (const d of aktif) if (d !== c && savasta(w, c, d) && (havaKapsar(w, d, C.havaBolge[c]!) || havaKapsar(w, c, C.havaBolge[d]!))) dusman += havaGucu(w, d, 'hava');
    const biz = havaGucu(w, c, 'hava') + 1;
    if (dusman > 0) {
      const f = clamp(mulDiv(30_000, dusman, biz).q, 10_000, 150_000);
      for (let k = 0; k < NHAVA; k++) { const n = ucakSay(w, c, k); if (n > 0) C[HK[k]!][c] = n - Math.min(n, Math.max(1, mulDiv(n, f, S).q)); }
      C.hHasar[c] = Math.min(500_000, C.hHasar[c]! + Math.floor(f / 2));
    }
    // stratejik bombardıman: düşman bölgesinde sanayi hasarı ve huzursuzluk
    const r = C.havaBolge[c]!;
    const k = w.R.c.kontrolEden[r]!;
    if (C.havaGorev[c] === 3 && k >= 0 && savasta(w, c, k)) {
      const b = havaGucu(w, c, 'bomba');
      const zarar = Math.min(150_000, mulDiv(b, 200, 1).q);
      w.R.c.hasar[r] = Math.min(700_000, w.R.c.hasar[r]! + zarar);
      C.huzur[k] = Math.max(0, C.huzur[k]! - Math.min(1500, Math.floor(zarar / 100)));
      C.yorgunluk[k] = Math.min(100_000, C.yorgunluk[k]! + Math.min(1000, Math.floor(zarar / 150)));
      // uçaksavar ve avcı savunması: bombardıman uçağı kaybı
      const n1 = ucakSay(w, c, 1);
      if (n1 > 0) C.h1[c] = n1 - Math.min(n1, Math.max(1, Math.floor(n1 / 40)));
    }
  }
}

/** Haftalık bakım bedeli (altın/gün): gemiler ve uçaklar, dönem fiyat ölçeğiyle. */
export function kuvvetBakimi(w: World, c: number): number {
  const d = AKTIF.donem;
  let b = 0;
  GEMI[d].forEach((g, k) => { b += gemiSay(w, c, k) * g.bakim; });
  HAVA[d].forEach((h, k) => { b += ucakSay(w, c, k) * h.bakim; });
  return mulDiv(b, DONEM_FIYAT[d], 1000).q;
}
export { NGEMI, GK, HK };
