// Sistemlerin paylaştığı saf yardımcılar: ilişki, erişim, rota, birlik istatistikleri.
import type { World } from '../state/world.ts';
import { A, cc, kenarKey } from '../state/world.ts';
import { TABUR, EKIPMAN, AILE_EKIP, ARAZI, K, KIS_HAREKET, KIS_KAPASITE, CAMUR_HAREKET } from '../catalog.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { tarih } from '../calendar/index.ts';

export type Cols = Record<string, Float64Array>;
export const uc = (w: World): Cols => w.U.c as unknown as Cols;

// ---------- Savaş ve ittifak ----------
export function savasta(w: World, a: number, b: number): boolean {
  if (a === b || a < 0 || b < 0) return false;
  const ma = 1 << a, mb = 1 << b;
  for (const s of w.SV.rows()) {
    const x = w.SV.c.maskeA[s]!, y = w.SV.c.maskeB[s]!;
    if (((x & ma) && (y & mb)) || ((x & mb) && (y & ma))) return true;
  }
  return false;
}
export function savastaMi(w: World, a: number): boolean {
  const m = 1 << a;
  for (const s of w.SV.rows()) if ((w.SV.c.maskeA[s]! & m) || (w.SV.c.maskeB[s]! & m)) return true;
  return false;
}
export function dusmanlar(w: World, a: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < w.nC; b++) if (savasta(w, a, b)) out.push(b);
  return out;
}
/** Aynı tarafta savaşanlar (eş savaşan). */
export function essavasan(w: World, a: number, b: number): boolean {
  if (a === b) return true;
  const ma = 1 << a, mb = 1 << b;
  for (const s of w.SV.rows()) {
    const x = w.SV.c.maskeA[s]!, y = w.SV.c.maskeB[s]!;
    if (((x & ma) && (x & mb)) || ((y & ma) && (y & mb))) return true;
  }
  return false;
}
export function anlasmaVar(w: World, tur: number, a: number, b: number): number {
  for (const s of w.AN.rows()) {
    if (w.AN.c.tur[s] !== tur) continue;
    const x = w.AN.c.a[s]!, y = w.AN.c.b[s]!;
    if ((x === a && y === b) || (tur !== A.garanti && tur !== A.tazminat && x === b && y === a)) return s;
  }
  return -1;
}
export function muttefik(w: World, a: number, b: number): boolean {
  return anlasmaVar(w, A.ittifak, a, b) >= 0;
}
/** c'nin birlikleri r bölgesine girebilir mi (kontrol, eş savaşan, müttefik, askerî geçiş, savaş)? */
export function girebilir(w: World, c: number, r: number): boolean {
  const k = w.R.c.kontrolEden[r]!;
  if (k === c) return true;
  if (savasta(w, c, k)) return true;
  if (essavasan(w, c, k) || muttefik(w, c, k)) return true;
  if (anlasmaVar(w, A.gecis, k, c) >= 0) return true;
  return false;
}
/** İkmal ve lojistik için dost bölge (savaş hariç). */
export function dostBolge(w: World, c: number, r: number): boolean {
  const k = w.R.c.kontrolEden[r]!;
  return k === c || essavasan(w, c, k) || muttefik(w, c, k) || anlasmaVar(w, A.gecis, k, c) >= 0;
}

export function gorus(w: World, a: number, b: number): number { return w.gorus[cc(w, a, b)]!; }
/** c, r bölgesi üzerinde iddia sahibi mi (kanonik durum; barışla değişir). */
export function iddiaVar(w: World, r: number, c: number): boolean { return ((w.R.c.iddia[r]! >> c) & 1) === 1; }

// ---------- Mevsim ----------
export function ay(w: World): number { return tarih(w.gun).m - 1; }
export function kisDuzey(w: World, r: number): number { return w.pkg.bolgeler[r]!.kis[ay(w)]!; }
export function camurDuzey(w: World, r: number): number { return w.pkg.bolgeler[r]!.camur[ay(w)]!; }
export function hareketMevsim(w: World, r: number): number {
  const a = KIS_HAREKET[kisDuzey(w, r)]!, b = CAMUR_HAREKET[camurDuzey(w, r)]!;
  return Math.min(a, b);
}

// ---------- Rota ----------
/** Kenar kapasitesi (milibirim taşıma/gün). */
export function kenarKapasite(w: World, a: number, b: number): number {
  const R = w.R.c;
  const alt = Math.min(R.altyapi[a]!, R.altyapi[b]!);
  const dy = Math.min(R.demiryolu[a]!, R.demiryolu[b]!);
  const mevsim = Math.min(KIS_KAPASITE[kisDuzey(w, a)]!, KIS_KAPASITE[kisDuzey(w, b)]!);
  const hasar = S - Math.max(R.hasar[a]!, R.hasar[b]!);
  let cap = mulDiv(K.kenarKapasite, alt, 3).q;
  cap = mulDiv(cap, 1 + dy, 1).q;
  cap = mulDiv(cap, mevsim, S).q;
  cap = mulDiv(cap, hasar, S).q;
  return Math.max(0, cap);
}

/** En kısa yol (km), izinli bölgeler üzerinden. Eşitlik kalıcı kimlikle çözülür. */
export function rota(w: World, kaynak: number, hedef: number, izin: (r: number) => boolean): { yol: number[]; km: number } | null {
  if (kaynak === hedef) return { yol: [kaynak], km: 0 };
  const n = w.nR;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  dist[kaynak] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i]! < Infinity && (u < 0 || dist[i]! < dist[u]!)) u = i;
    if (u < 0) return null;
    if (u === hedef) break;
    done[u] = 1;
    for (const v of w.komsuluk[u]!) {
      if (done[v]) continue;
      if (v !== hedef && !izin(v)) continue;
      const d = dist[u]! + (w.kenarKm.get(kenarKey(u, v)) ?? 150);
      if (d < dist[v]!) { dist[v] = d; prev[v] = u; }
    }
  }
  const yol: number[] = [];
  for (let x = hedef; x >= 0; x = prev[x]!) yol.push(x);
  yol.reverse();
  return { yol, km: dist[hedef]! };
}

/** Yönetim mesafesi (gün): başkentten erişimli ağda taban hız ve demiryoluyla. */
export function yonetimMesafeleri(w: World, c: number): number[] {
  const n = w.nR;
  const bas = w.pkg.ulkeler[c]!.baskent;
  const dist = new Array<number>(n).fill(Infinity);
  const done = new Uint8Array(n);
  if (w.R.c.kontrolEden[bas] !== c) {
    // başkent kaybı: en yakın kontrol edilen bölge başkent sayılır
    return dist.map(() => 999);
  }
  dist[bas] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i]! < Infinity && (u < 0 || dist[i]! < dist[u]!)) u = i;
    if (u < 0) break;
    done[u] = 1;
    for (const v of w.komsuluk[u]!) {
      if (!dostBolge(w, c, v)) continue;
      const km = w.kenarKm.get(kenarKey(u, v)) ?? 150;
      const dy = Math.min(w.R.c.demiryolu[u]!, w.R.c.demiryolu[v]!);
      const hiz = dy >= 1 ? 75 : 25; // km/gün
      const d = dist[u]! + Math.floor((km * 1000) / hiz);
      if (d < dist[v]!) dist[v] = d;
    }
  }
  return dist.map((d) => (d === Infinity ? 999 : Math.floor(d / 1000)));
}

// ---------- Birlik istatistikleri ----------
export interface Istat { YS: number; SV: number; YR: number; orgMax: number; genislik: number; hiz: number; dolu: number; kisiHedef: number; aileIhtiyac: Record<string, number> }

export function birlikIhtiyac(w: World, u: number): { kisi: number; aile: Record<string, number> } {
  const U = uc(w);
  const n = U.taburSay![u]!;
  let kisi = 0;
  const aile: Record<string, number> = {};
  for (let k = 0; k < n; k++) {
    const t = TABUR[U[`t${k}`]![u]!]!;
    kisi += t.kisi;
    aile[t.aile] = (aile[t.aile] ?? 0) + t.adet;
  }
  return { kisi, aile };
}

export function deneyimCarpan(d: number): number {
  if (d < 25_000) return 750_000;
  if (d < 60_000) return S;
  if (d < 85_000) return 1_150_000;
  return 1_250_000;
}

export function birlikIstat(w: World, u: number): Istat {
  const U = uc(w);
  const ih = birlikIhtiyac(w, u);
  const n = U.taburSay![u]!;
  const kisiOran = clamp(mulDiv(U.kisi![u]!, S, Math.max(1, ih.kisi)).q, 0, S);
  let YS = 0, SV = 0, YR = 0, orgT = 0, gen = 0, hiz = 1e9;
  let dolu = 0, doluN = 0;
  const aileOran: Record<string, { oran: number; YS: number; SV: number; YR: number }> = {};
  for (const [aile, gerek] of Object.entries(ih.aile)) {
    let sahip = 0, ys = 0, sv = 0, yr = 0;
    for (const k of AILE_EKIP[aile]!) {
      const m = U[`e${k}`]![u]!;
      sahip += m; ys += m * EKIPMAN[k]!.YS; sv += m * EKIPMAN[k]!.SV; yr += m * EKIPMAN[k]!.YR;
    }
    const ilk = EKIPMAN[AILE_EKIP[aile]![0]!]!;
    const ortYS = sahip > 0 ? Math.floor(ys / sahip) : ilk.YS;
    const ortSV = sahip > 0 ? Math.floor(sv / sahip) : ilk.SV;
    const ortYR = sahip > 0 ? Math.floor(yr / sahip) : ilk.YR;
    aileOran[aile] = { oran: clamp(mulDiv(sahip, S, gerek).q, 0, S), YS: ortYS, SV: ortSV, YR: ortYR };
  }
  for (let k = 0; k < n; k++) {
    const t = TABUR[U[`t${k}`]![u]!]!;
    const a = aileOran[t.aile]!;
    // Tabur doluluğu: personel ve ağırlıklı ekipman oranının küçüğü (15.1). Referans adetle tekrar çarpılmaz.
    const e = Math.min(kisiOran, a.oran);
    YS += mulDiv(a.YS, e, S).q; SV += mulDiv(a.SV, e, S).q; YR += mulDiv(a.YR, e, S).q;
    orgT += t.org * t.kisi; gen += t.genislik; hiz = Math.min(hiz, t.hiz);
    dolu += e; doluN++;
  }
  return {
    YS, SV, YR, orgMax: ih.kisi > 0 ? Math.floor(orgT / ih.kisi) : 0, genislik: gen, hiz,
    dolu: doluN > 0 ? Math.floor(dolu / doluN) : 0, kisiHedef: ih.kisi, aileIhtiyac: ih.aile,
  };
}

/** Birlik günlük gıda ihtiyacı (milibirim): muharebede 2, aksi 1,5 sivil eşdeğeri. */
export function birlikGidaGun(w: World, u: number): number {
  const U = uc(w);
  const kat = U.muharebe![u]! ? 2 : 1.5;
  void kat;
  const esdeger = U.muharebe![u]! ? U.kisi![u]! * 2 : Math.floor((U.kisi![u]! * 3) / 2);
  return mulDiv(esdeger, 1000, K.gidaKisiGun).q;
}

export function araziBilgi(w: World, r: number) { return ARAZI[w.pkg.bolgeler[r]!.arazi]!; }

/** İkmal oranı (S): taşınan gıda ve mühimmatın hedefe oranı. */
export function birlikIkmal(w: World, u: number): { gida: number; muh: number; oran: number } {
  const U = uc(w);
  const gHedef = Math.max(1, birlikGidaGun(w, u) * K.birlikErzakGun);
  const mGun = mulDiv(birlikMuhimmatGunU(w, u), 1, 1).q;
  const mHedef = Math.max(1, mGun * 7);
  const g = clamp(mulDiv(U.gida![u]!, S, gHedef).q, 0, S);
  const m = clamp(mulDiv(U.muhimmatS![u]!, S, mHedef).q, 0, S);
  return { gida: g, muh: m, oran: Math.min(g, m) };
}
export function birlikMuhimmatGunU(w: World, u: number): number {
  const U = uc(w);
  let m = 0;
  for (let k = 0; k < U.taburSay![u]!; k++) m += TABUR[U[`t${k}`]![u]!]!.muhimmat;
  // personel oranına göre
  const ih = birlikIhtiyac(w, u).kisi;
  return mulDiv(m, U.kisi![u]!, Math.max(1, ih)).q;
}

export function birlikAdi(w: World, u: number): string {
  return w.birlikAd[uc(w).adNo![u]!] ?? `Birlik ${u}`;
}

export function ulkeBirlikleri(w: World, c: number): number[] {
  const U = uc(w);
  return w.U.list().filter((u) => U.ulke![u] === c);
}
export function bolgeBirlikleri(w: World, r: number): number[] {
  const U = uc(w);
  return w.U.list().filter((u) => U.bolge![u] === r);
}

/** Bir ülkenin kara gücü (saldırı + savunma) özeti, istihbarat dışı gerçek değer. */
export function kuvvet(w: World, c: number): number {
  let t = 0;
  for (const u of ulkeBirlikleri(w, c)) {
    const s = birlikIstat(w, u);
    t += s.YS + s.SV;
  }
  return t;
}

export function sinirKomsusu(w: World, a: number, b: number): boolean {
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.kontrolEden[r] !== a) continue;
    for (const v of w.komsuluk[r]!) if (w.R.c.kontrolEden[v] === b) return true;
  }
  return false;
}

export function ulkeBolgeleri(w: World, c: number, kontrol = true): number[] {
  const out: number[] = [];
  for (let r = 0; r < w.nR; r++) if ((kontrol ? w.R.c.kontrolEden[r] : w.R.c.sahip[r]) === c) out.push(r);
  return out;
}

export function ulkeNufus(w: World, c: number): number {
  let n = 0;
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== c) continue;
    for (let k = 0; k < 32; k++) n += w.pop[r * 32 + k]!;
  }
  return n;
}

export function bildir(w: World, tur: string, metin: string, ulke: number, durdur: boolean): void {
  w.bildirim.push({ tur, metin, ulke, durdur, gun: w.gun, kimlik: w.bildirim.length });
}

export function anlat(w: World, metin: string, tur: string, ulke: number, onem = 1): void {
  w.anlati.push({ gun: w.gun, metin, tur, ulke, onem });
  if (w.anlati.length > 600) w.anlati.splice(0, w.anlati.length - 600);
}

/** Binlik ayırıcılı metin (anlatı için; Intl/toLocaleString motorda yasaktır). */
export function fmtSayi(x: number): string {
  const neg = x < 0;
  let t = String(Math.trunc(Math.abs(x)));
  let out = '';
  while (t.length > 3) { out = '.' + t.slice(-3) + out; t = t.slice(0, -3); }
  return (neg ? '−' : '') + t + out;
}
