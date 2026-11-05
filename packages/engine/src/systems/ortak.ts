// Sistemlerin paylaştığı saf yardımcılar: ilişki, erişim, rota, birlik istatistikleri.
import type { World } from '../state/world.ts';
import { A, cc, kenarKey, IDDIA_MAX } from '../state/world.ts';
import { AKTIF, TABUR, EKIPMAN, AILE_EKIP, ARAZI, K, KIS_HAREKET, KIS_KAPASITE, CAMUR_HAREKET } from '../catalog.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { tarih } from '../calendar/index.ts';
import { KOL_E, KOL_T } from '../state/world.ts';

export type Cols = Record<string, Float64Array>;
export const uc = (w: World): Cols => w.U.c as unknown as Cols;

// ---------- Savaş ve ittifak ----------
// Savaş tarafları kanonik `savasTaraf` tablosundadır; aşağıdaki matris ve indeksler türetilmiş önbellektir.
/** Savaş veya anlaşma değiştiğinde çağrılır: önbellekleri ve rota ağaçlarını geçersiz kılar. */
export function diploDegisti(w: World): void { w.diploSurum++; w.savasSurum++; w.anSurum++; w.rotaEpoch++; }
/** Savaş tarafı değişti: savaş matrisi ve rota ağaçları geçersiz. */
export function savasDegisti(w: World): void { w.diploSurum++; w.savasSurum++; w.rotaEpoch++; }
/** Yeni anlaşma: indekse yerinde eklenir; yalnız ittifak ve geçiş rotaları etkiler. */
export function anlasmaEklendi(w: World, s: number): void {
  w.diploSurum++;
  const o = w.onbellek.get('anIdx') as { s: number; m: Map<number, number> } | undefined;
  const t = w.AN.c.tur[s]!;
  if (o && o.s === w.anSurum) anahtarEkle(w, o.m, s); else w.anSurum++;
  if (t === A.ittifak || t === A.gecis) w.rotaEpoch++;
}
export function anlasmaSilindi(w: World, tur: number): void {
  w.diploSurum++; w.anSurum++;
  if (tur === A.ittifak || tur === A.gecis) w.rotaEpoch++;
}

export function tarafi(w: World, s: number, c: number): number { return w.savasTaraf[s * w.nC + c]!; }
export function tarafYaz(w: World, s: number, c: number, t: number): void { w.savasTaraf[s * w.nC + c] = t; savasDegisti(w); }
export function savasUyeleri(w: World, s: number, t: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < w.nC; c++) if (w.savasTaraf[s * w.nC + c] === t) out.push(c);
  return out;
}

/** nC × nC: 1 = savaşta, 2 = aynı tarafta. */
function savasMatris(w: World): Uint8Array {
  const o = w.onbellek.get('savasM') as { s: number; m: Uint8Array } | undefined;
  if (o && o.s === w.savasSurum) return o.m;
  const n = w.nC;
  const m = new Uint8Array(n * n);
  for (const s of w.SV.rows()) {
    const A_: number[] = [], B_: number[] = [];
    for (let c = 0; c < n; c++) { const t = w.savasTaraf[s * n + c]; if (t === 1) A_.push(c); else if (t === 2) B_.push(c); }
    for (const x of A_) { for (const y of B_) { m[x * n + y] = 1; m[y * n + x] = 1; } for (const y of A_) if (x !== y && m[x * n + y] !== 1) m[x * n + y] = 2; }
    for (const x of B_) for (const y of B_) if (x !== y && m[x * n + y] !== 1) m[x * n + y] = 2;
  }
  w.onbellek.set('savasM', { s: w.savasSurum, m });
  return m;
}
export function savasta(w: World, a: number, b: number): boolean {
  if (a === b || a < 0 || b < 0) return false;
  return savasMatris(w)[a * w.nC + b] === 1;
}
export function savastaMi(w: World, a: number): boolean {
  const m = savasMatris(w), n = w.nC;
  for (let b = 0; b < n; b++) if (m[a * n + b] === 1) return true;
  return false;
}
export function dusmanlar(w: World, a: number): number[] {
  const m = savasMatris(w), n = w.nC;
  const out: number[] = [];
  for (let b = 0; b < n; b++) if (m[a * n + b] === 1) out.push(b);
  return out;
}
/** Aynı tarafta savaşanlar (eş savaşan). */
export function essavasan(w: World, a: number, b: number): boolean {
  if (a === b) return true;
  return savasMatris(w)[a * w.nC + b] === 2;
}
function anahtarEkle(w: World, m: Map<number, number>, s: number): void {
  const n = w.nC;
  const t = w.AN.c.tur[s]!, x = w.AN.c.a[s]!, y = w.AN.c.b[s]!;
  const k1 = (t * n + x) * n + y;
  if (!m.has(k1)) m.set(k1, s);
  if (t !== A.garanti && t !== A.tazminat) { const k2 = (t * n + y) * n + x; if (!m.has(k2)) m.set(k2, s); }
}
function anlasmaIndeks(w: World): Map<number, number> {
  const o = w.onbellek.get('anIdx') as { s: number; m: Map<number, number> } | undefined;
  if (o && o.s === w.anSurum) return o.m;
  const m = new Map<number, number>();
  for (const s of w.AN.rows()) anahtarEkle(w, m, s);
  w.onbellek.set('anIdx', { s: w.anSurum, m });
  return m;
}
export function anlasmaVar(w: World, tur: number, a: number, b: number): number {
  return anlasmaIndeks(w).get((tur * w.nC + a) * w.nC + b) ?? -1;
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
export function iddiaVar(w: World, r: number, c: number): boolean {
  for (let i = 0; i < IDDIA_MAX; i++) if (w.iddia[r * IDDIA_MAX + i] === c + 1) return true;
  return false;
}
export function iddiaEkle(w: World, r: number, c: number): void {
  if (iddiaVar(w, r, c)) return;
  for (let i = 0; i < IDDIA_MAX; i++) if (w.iddia[r * IDDIA_MAX + i] === 0) { w.iddia[r * IDDIA_MAX + i] = c + 1; return; }
  // dolu: en eski iddia düşer
  for (let i = 0; i + 1 < IDDIA_MAX; i++) w.iddia[r * IDDIA_MAX + i] = w.iddia[r * IDDIA_MAX + i + 1]!;
  w.iddia[r * IDDIA_MAX + IDDIA_MAX - 1] = c + 1;
}
export function iddiaSil(w: World, r: number, c: number): void {
  for (let i = 0; i < IDDIA_MAX; i++) if (w.iddia[r * IDDIA_MAX + i] === c + 1) w.iddia[r * IDDIA_MAX + i] = 0;
}
export function pasif(w: World, c: number): boolean { return w.C.c.pasif[c] === 1; }
/** Eyaletin bugünkü sahibi: merkez bölgesinin sahibi (barışla el değiştirir). */
export function eyaletUlke(w: World, e: number): number { return w.R.c.sahip[w.pkg.eyaletler[e]!.merkez]!; }

// ---------- Mevsim ----------
export function ay(w: World): number { return tarih(w.gun).m - 1; }
export function kisDuzey(w: World, r: number): number { return w.pkg.bolgeler[r]!.kis[ay(w)]!; }
export function camurDuzey(w: World, r: number): number { return w.pkg.bolgeler[r]!.camur[ay(w)]!; }
export function hareketMevsim(w: World, r: number): number {
  const a = KIS_HAREKET[kisDuzey(w, r)]!, b = CAMUR_HAREKET[camurDuzey(w, r)]!;
  return Math.min(a, b);
}

// ---------- Rota ----------
/** Kenar türü: 0 kara, 1 boğaz, 2 okyanus. */
export function kenarTur(w: World, a: number, b: number): number {
  let m = w.onbellek.get('kenarTur') as Map<number, number> | undefined;
  if (!m) { m = new Map(); for (const k of w.pkg.kenarlar) if (k.tur) m.set(kenarKey(k.a, k.b), k.tur); w.onbellek.set('kenarTur', m); }
  return m.get(kenarKey(a, b)) ?? 0;
}
/** Kenar kapasitesi (milibirim taşıma/gün). */
export function kenarKapasite(w: World, a: number, b: number): number {
  const R = w.R.c;
  if (kenarTur(w, a, b) > 0) return mulDiv(K.kenarKapasite, 3, 2).q; // deniz yolu: sabit
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

/** İkili yığınlı Dijkstra; eşitlik (uzaklık, kalıcı kimlik) ile çözülür. izin yalnız ara düğümlere uygulanır. */
function dijkstra(w: World, kaynak: number, izin: (r: number) => boolean): { dist: Float64Array; prev: Int32Array } {
  const n = w.nR;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const hd: number[] = [], hn: number[] = [];
  const it = (i: number, j: number) => hd[i]! < hd[j]! || (hd[i] === hd[j] && hn[i]! < hn[j]!);
  const push = (d: number, v: number) => {
    hd.push(d); hn.push(v);
    let i = hd.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!it(i, p)) break; [hd[i], hd[p]] = [hd[p]!, hd[i]!]; [hn[i], hn[p]] = [hn[p]!, hn[i]!]; i = p; }
  };
  const pop = (): number => {
    const v = hn[0]!;
    const ld = hd.pop()!, ln = hn.pop()!;
    if (hd.length) {
      hd[0] = ld; hn[0] = ln;
      let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hd.length && it(l, m)) m = l; if (r < hd.length && it(r, m)) m = r; if (m === i) break; [hd[i], hd[m]] = [hd[m]!, hd[i]!]; [hn[i], hn[m]] = [hn[m]!, hn[i]!]; i = m; }
    }
    return v;
  };
  dist[kaynak] = 0; push(0, kaynak);
  while (hd.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u !== kaynak && !izin(u)) continue; // izinsiz düğüme varılır ama içinden geçilmez
    for (const v of w.komsuluk[u]!) {
      if (done[v]) continue;
      const d = dist[u]! + (w.kenarKm.get(kenarKey(u, v)) ?? 150);
      if (d < dist[v]! || (d === dist[v] && u < prev[v]!)) { dist[v] = d; prev[v] = u; push(d, v); }
    }
  }
  return { dist, prev };
}

function yolCikar(agac: { dist: Float64Array; prev: Int32Array }, kaynak: number, hedef: number): { yol: number[]; km: number } | null {
  if (agac.dist[hedef] === Infinity) return null;
  const yol: number[] = [];
  for (let x = hedef; x >= 0; x = agac.prev[x]!) { yol.push(x); if (x === kaynak) break; }
  yol.reverse();
  return { yol, km: agac.dist[hedef]! };
}

/** En kısa yol (km), izinli ara bölgeler üzerinden (hedef izinsiz olabilir). Önbelleksiz genel sürüm. */
export function rota(w: World, kaynak: number, hedef: number, izin: (r: number) => boolean): { yol: number[]; km: number } | null {
  if (kaynak === hedef) return { yol: [kaynak], km: 0 };
  return yolCikar(dijkstra(w, kaynak, izin), kaynak, hedef);
}

/** Önbellekli rota. tip: 0 girebilir (hareket), 1 dost bölge (ikmal), 2 barışçıl intikal (savaş bölgesine girmeden). */
export function rotaTip(w: World, c: number, tip: number, kaynak: number, hedef: number): { yol: number[]; km: number } | null {
  if (kaynak === hedef) return { yol: [kaynak], km: 0 };
  if (w.ayarlar.onbellekKapali) return rota(w, kaynak, hedef, izinFn(w, c, tip));
  let o = w.onbellek.get('rota') as { e: number; m: Map<number, { dist: Float64Array; prev: Int32Array }> } | undefined;
  if (!o || o.e !== w.rotaEpoch || o.m.size > 4000) { o = { e: w.rotaEpoch, m: new Map() }; w.onbellek.set('rota', o); }
  const key = (c * 4 + tip) * 8192 + kaynak;
  let agac = o.m.get(key);
  if (!agac) { agac = dijkstra(w, kaynak, izinFn(w, c, tip)); o.m.set(key, agac); }
  return yolCikar(agac, kaynak, hedef);
}
function izinFn(w: World, c: number, tip: number): (r: number) => boolean {
  if (tip === 0) return (r) => girebilir(w, c, r);
  if (tip === 1) return (r) => dostBolge(w, c, r);
  return (r) => girebilir(w, c, r) && !savasta(w, c, w.R.c.kontrolEden[r]!);
}

/** Yönetim mesafesi (gün): başkentten erişimli ağda taban hız ve demiryoluyla. */
export function yonetimMesafeleri(w: World, c: number): number[] {
  const n = w.nR;
  const bas = w.pkg.ulkeler[c]!.baskent;
  if (w.R.c.kontrolEden[bas] !== c) return new Array<number>(n).fill(999);
  const dist = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  const hd: number[] = [], hn: number[] = [];
  const push = (d: number, v: number) => { hd.push(d); hn.push(v); let i = hd.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hd[p]! < hd[i]! || (hd[p] === hd[i] && hn[p]! <= hn[i]!)) break; [hd[i], hd[p]] = [hd[p]!, hd[i]!]; [hn[i], hn[p]] = [hn[p]!, hn[i]!]; i = p; } };
  const pop = () => { const v = hn[0]!; const ld = hd.pop()!, ln = hn.pop()!; if (hd.length) { hd[0] = ld; hn[0] = ln; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hd.length && (hd[l]! < hd[m]! || (hd[l] === hd[m] && hn[l]! < hn[m]!))) m = l; if (r < hd.length && (hd[r]! < hd[m]! || (hd[r] === hd[m] && hn[r]! < hn[m]!))) m = r; if (m === i) break; [hd[i], hd[m]] = [hd[m]!, hd[i]!]; [hn[i], hn[m]] = [hn[m]!, hn[i]!]; i = m; } } return v; };
  dist[bas] = 0; push(0, bas);
  while (hd.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    for (const v of w.komsuluk[u]!) {
      if (done[v] || !dostBolge(w, c, v)) continue;
      const km = w.kenarKm.get(kenarKey(u, v)) ?? 150;
      const tur = kenarTur(w, u, v);
      const dy = Math.min(w.R.c.demiryolu[u]!, w.R.c.demiryolu[v]!);
      const hiz = tur > 0 ? 200 : dy >= 1 ? 75 : 25; // km/gün
      const d = dist[u]! + Math.floor((km * 1000) / hiz);
      if (d < dist[v]!) { dist[v] = d; push(d, v); }
    }
  }
  return Array.from(dist, (d) => (d === Infinity ? 999 : Math.floor(d / 1000)));
}

// ---------- Birlik istatistikleri ----------
export interface Istat { YS: number; SV: number; YR: number; orgMax: number; genislik: number; hiz: number; dolu: number; kisiHedef: number; aileIhtiyac: Record<string, number> }

const ihtiyacOn = new Map<number, { kisi: number; aile: Record<string, number> }>();
let ihtiyacSurum = -1;
/** Tabur dizilişinden ihtiyaç (dizilişe göre önbellekli; dönen nesne değiştirilmez). */
export function birlikIhtiyac(w: World, u: number): { kisi: number; aile: Record<string, number> } {
  const U = uc(w);
  const n = U.taburSay![u]!;
  let key = n;
  for (let k = 0; k < n; k++) key = key * 16 + U[KOL_T[k]!]![u]!;
  if (ihtiyacSurum !== AKTIF.surum) { ihtiyacOn.clear(); ihtiyacSurum = AKTIF.surum; }
  const o = ihtiyacOn.get(key);
  if (o) return o;
  let kisi = 0;
  const aile: Record<string, number> = {};
  for (let k = 0; k < n; k++) {
    const t = TABUR[U[KOL_T[k]!]![u]!]!;
    kisi += t.kisi;
    aile[t.aile] = (aile[t.aile] ?? 0) + t.adet;
  }
  const r = { kisi, aile };
  ihtiyacOn.set(key, r);
  return r;
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
      const m = U[KOL_E[k]!]![u]!;
      sahip += m; ys += m * EKIPMAN[k]!.YS; sv += m * EKIPMAN[k]!.SV; yr += m * EKIPMAN[k]!.YR;
    }
    const ilk = EKIPMAN[AILE_EKIP[aile]![0]!]!;
    const ortYS = sahip > 0 ? Math.floor(ys / sahip) : ilk.YS;
    const ortSV = sahip > 0 ? Math.floor(sv / sahip) : ilk.SV;
    const ortYR = sahip > 0 ? Math.floor(yr / sahip) : ilk.YR;
    aileOran[aile] = { oran: clamp(mulDiv(sahip, S, gerek).q, 0, S), YS: ortYS, SV: ortSV, YR: ortYR };
  }
  for (let k = 0; k < n; k++) {
    const t = TABUR[U[KOL_T[k]!]![u]!]!;
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
  for (let k = 0; k < U.taburSay![u]!; k++) m += TABUR[U[KOL_T[k]!]![u]!]!.muhimmat;
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

/** nC × nC kontrol komşuluğu (rotaEpoch ile önbellekli; kontrol devri epoch'u artırır). */
function komsuMatris(w: World): Uint8Array {
  const o = w.onbellek.get('komsuM') as { e: number; m: Uint8Array } | undefined;
  if (o && o.e === w.rotaEpoch) return o.m;
  const n = w.nC, m = new Uint8Array(n * n), K_ = w.R.c.kontrolEden;
  for (let r = 0; r < w.nR; r++) {
    const a = K_[r]!;
    for (const v of w.komsuluk[r]!) { const b = K_[v]!; if (a !== b) { m[a * n + b] = 1; m[b * n + a] = 1; } }
  }
  w.onbellek.set('komsuM', { e: w.rotaEpoch, m });
  return m;
}
export function sinirKomsusu(w: World, a: number, b: number): boolean {
  if (a < 0 || b < 0 || a === b) return false;
  return komsuMatris(w)[a * w.nC + b] === 1;
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
