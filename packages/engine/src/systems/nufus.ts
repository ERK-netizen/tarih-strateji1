// Bölüm 10: nüfus, kohort, iş gücü, yaralı, esir, köken muhasebesi. Nüfus yaratılmaz; yalnız transfer edilir.
import type { World } from '../state/world.ts';
import { hc, ek, ck } from '../state/world.ts';
import { ST, YB, NHUCRE, NKIMLIK, ASKERLIK, K, tekIdx, NTEK, tekVar } from '../catalog.ts';
import { MT } from '../state/world.ts';
import { S, mulDiv, mulRatio, largestRemainder, clamp } from '../num/index.ts';
import { uc, birlikIhtiyac, anlat, fmtSayi, modDeger } from './ortak.ts';
import { KOL_E, KOL_OK, KOL_ON } from '../state/world.ts';
import { trEkK } from '../tr.ts';

const DOGUM_AY = 2500; // S: yıllık %3 nominal doğum / 12
const NET_AY = 830; // S: (1,01)^(1/12) − 1
const OLUM_AY = DOGUM_AY - NET_AY;
const KOHORT_AY = 833; // S: yıllık %1 / 12
const YASLANMA_AY = 2083; // S: 1/480
const OLUM_AGIRLIK = [450_000, 100_000, 150_000, 300_000]; // yaş bandı ölüm payı (S)

function bolgeToplam(w: World, r: number): number {
  let n = 0;
  for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!;
  return n;
}

/** Kimlik dağılımını nüfus toplamına eşitler (yalnız sivil değişimlerde, oransal, en büyük artık). */
export function kimlikEsitle(w: World, r: number): void {
  const hedef = bolgeToplam(w, r);
  const agirlik: number[] = [];
  let top = 0;
  for (let k = 0; k < NKIMLIK; k++) { agirlik.push(w.kim[ek(r, k)]!); top += w.kim[ek(r, k)]!; }
  if (top === hedef) return;
  const yeni = largestRemainder(hedef, top > 0 ? agirlik : [1, 0, 0, 0, 0, 0, 0]);
  for (let k = 0; k < NKIMLIK; k++) w.kim[ek(r, k)] = yeni[k]!;
}

/** Aylık doğal akış: doğum, doğal ölüm, kohort giriş/çıkış, yaşlanma (10.4, 10.7). */
export function aylikNufus(w: World): void {
  const nR = w.nR;
  const toplamlar: number[] = [];
  let dunya = 0;
  // doğum ağırlığı: doğum teşviki uygulayan ülkelerde %25 fazla (şema 7)
  const agirlik: number[] = [];
  let dunyaAg = 0;
  for (let r = 0; r < nR; r++) {
    const t = bolgeToplam(w, r); toplamlar.push(t); dunya += t;
    const c0 = w.R.c.sahip[r]!;
    const a = c0 >= 0 && w.C.c.nufusPol[c0] === 1 ? t + (t >> 2) : t;
    agirlik.push(a); dunyaAg += a;
  }
  // Doğum: dünya toplamı, artık kanalıyla
  const dg = mulRatio(dunyaAg, DOGUM_AY);
  let dogum = dg.q;
  w.artik.dogum += dg.rem;
  if (w.artik.dogum >= S) { dogum += 1; w.artik.dogum -= S; }
  const dogumPay = largestRemainder(dogum, agirlik);
  // Doğal ölüm
  const og = mulRatio(dunya, OLUM_AY);
  let olum = og.q;
  w.artik.olum += og.rem;
  if (w.artik.olum >= S) { olum += 1; w.artik.olum -= S; }
  const olumPay = largestRemainder(olum, toplamlar);
  let gercekOlum = 0;
  for (let r = 0; r < nR; r++) {
    w.pop[hc(r, YB.COCUK, ST.O)] = w.pop[hc(r, YB.COCUK, ST.O)]! + dogumPay[r]!;
    // ölüm yaş bandına; band içinde sivil statülere oransal (A, W, P hariç)
    const bandPay = largestRemainder(olumPay[r]!, OLUM_AGIRLIK);
    for (let y = 0; y < 4; y++) {
      const st = [ST.O, ST.S, ST.Y, ST.E, ST.R];
      const ag = st.map((s) => w.pop[hc(r, y, s)]!);
      const mevcut = ag.reduce((a, b) => a + b, 0);
      const n = Math.min(bandPay[y]!, mevcut);
      const p = largestRemainder(n, ag);
      st.forEach((s, i) => { w.pop[hc(r, y, s)] = w.pop[hc(r, y, s)]! - p[i]!; });
      gercekOlum += n;
    }
    // kohort girişi: çocuk → askerlik çağı (yasa payıyla Y, kalanı S)
    const c = w.R.c.sahip[r]!;
    let yPay: number = ASKERLIK[w.C.c.askerlik[c]!]!.y;
    if (c >= 0 && tekVar(w, c, 'dok_kitle')) yPay = Math.min(S, mulDiv(yPay, 11, 10).q);
    const mi = c >= 0 ? modDeger(w, c, MT.insan) : 0;
    if (mi) yPay = clamp(mulRatio(yPay, S + mi).q, 0, S);
    const g = Math.min(mulRatio(toplamlar[r]!, KOHORT_AY).q, w.pop[hc(r, YB.COCUK, ST.O)]!);
    w.pop[hc(r, YB.COCUK, ST.O)] = w.pop[hc(r, YB.COCUK, ST.O)]! - g;
    const gy = mulRatio(g, yPay).q;
    w.pop[hc(r, YB.ASKER, ST.Y)] = w.pop[hc(r, YB.ASKER, ST.Y)]! + gy;
    w.pop[hc(r, YB.ASKER, ST.S)] = w.pop[hc(r, YB.ASKER, ST.S)]! + (g - gy);
    // kohort çıkışı: askerlik çağı → diğer yetişkin (S,Y,E → O; R → R)
    for (const s of [ST.S, ST.Y, ST.E, ST.R]) {
      const x = mulRatio(w.pop[hc(r, YB.ASKER, s)]!, K.kohortCikisAylik).q;
      w.pop[hc(r, YB.ASKER, s)] = w.pop[hc(r, YB.ASKER, s)]! - x;
      const hedef = s === ST.R ? ST.R : ST.O;
      w.pop[hc(r, YB.YETISKIN, hedef)] = w.pop[hc(r, YB.YETISKIN, hedef)]! + x;
    }
    // yaşlanma
    for (const s of [ST.O, ST.R]) {
      const x = mulRatio(w.pop[hc(r, YB.YETISKIN, s)]!, YASLANMA_AY).q;
      w.pop[hc(r, YB.YETISKIN, s)] = w.pop[hc(r, YB.YETISKIN, s)]! - x;
      w.pop[hc(r, YB.YASLI, s)] = w.pop[hc(r, YB.YASLI, s)]! + x;
    }
    // yedeklik süresi dolanlar E → S (yıllık 1/12 → aylık 1/144)
    const ed = mulDiv(w.pop[hc(r, YB.ASKER, ST.E)]!, 1, 144).q;
    w.pop[hc(r, YB.ASKER, ST.E)] = w.pop[hc(r, YB.ASKER, ST.E)]! - ed;
    w.pop[hc(r, YB.ASKER, ST.S)] = w.pop[hc(r, YB.ASKER, ST.S)]! + ed;
    kimlikEsitle(w, r);
  }
  w.sayac.dogum += dogum;
  w.sayac.dogalOlum += gercekOlum;
}

/** Askerlik yasası değişimi (10.4): S ↔ Y aktarımı. */
export function askerlikAktar(w: World, c: number, y0: number, y1: number): void {
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== c) continue;
    const hs = hc(r, YB.ASKER, ST.S), hy = hc(r, YB.ASKER, ST.Y);
    if (y1 > y0 && y0 < S) {
      const a = mulDiv(w.pop[hs]!, y1 - y0, S - y0).q;
      w.pop[hs] = w.pop[hs]! - a; w.pop[hy] = w.pop[hy]! + a;
    } else if (y1 < y0 && y0 > 0) {
      const a = mulDiv(w.pop[hy]!, y0 - y1, y0).q;
      w.pop[hy] = w.pop[hy]! - a; w.pop[hs] = w.pop[hs]! + a;
    }
  }
}

/** Sivil iş gücü (10.8). */
export function isGucu(w: World, r: number): number {
  const p = (y: number, s: number) => w.pop[hc(r, y, s)]!;
  const asker = p(YB.ASKER, ST.S) + p(YB.ASKER, ST.Y) + p(YB.ASKER, ST.E);
  const yet = mulDiv(p(YB.YETISKIN, ST.O), 750_000, S).q;
  const r50 = mulDiv(p(YB.ASKER, ST.R) + p(YB.YETISKIN, ST.R), 500_000, S).q;
  return asker + yet + r50;
}

export function tarimIsciIhtiyac(w: World, r: number): number {
  const b = w.pkg.bolgeler[r]!;
  const c = w.R.c.kontrolEden[r]!;
  let yog = b.isciYog;
  if (w.tekBitti[c * NTEK + tekIdx('tarim1')]) yog = mulDiv(yog, 850_000, S).q;
  return b.alan * yog;
}

/** Aylık iş gücü yeniden dağıtımı; toplam değişim iş gücünün %3'ü ile sınırlı. ilk=true başlangıç dağıtımı. */
export function isDagit(w: World, ilk = false): void {
  const R = w.R.c;
  for (let r = 0; r < w.nR; r++) {
    const L = isGucu(w, r);
    const yer = w.pkg.bolgeler[r]!.yerlesim;
    const tarimIh = tarimIsciIhtiyac(w, r);
    const sanayiIh = (R.sivilF[r]! + R.askeriF[r]!) * K.fabrikaIsci;
    const hizmetTavan = mulDiv(L, [300_000, 420_000, 560_000][yer]!, S).q;
    const t = Math.min(tarimIh, L);
    const s = Math.min(sanayiIh, L - t);
    const h = Math.min(hizmetTavan, L - t - s);
    if (ilk) { R.isTarim[r] = t; R.isSanayi[r] = s; R.isHizmet[r] = h; }
    else {
      const butce = mulDiv(L, 30_000, S).q;
      const fark = [t - R.isTarim[r]!, s - R.isSanayi[r]!, h - R.isHizmet[r]!];
      const top = fark.reduce((a, b) => a + Math.abs(b), 0);
      const oran = top > butce ? mulDiv(butce, S, top).q : S;
      R.isTarim[r] = R.isTarim[r]! + mulRatio(fark[0]!, oran).q;
      R.isSanayi[r] = R.isSanayi[r]! + mulRatio(fark[1]!, oran).q;
      R.isHizmet[r] = R.isHizmet[r]! + mulRatio(fark[2]!, oran).q;
    }
    gunlukIsOlcekle(w, r, L);
  }
}

/** Askere alma vb. sonrasında sektörleri mevcut iş gücüne ölçekler. */
export function gunlukIsOlcekle(w: World, r: number, L = isGucu(w, r)): void {
  const R = w.R.c;
  const top = R.isTarim[r]! + R.isSanayi[r]! + R.isHizmet[r]!;
  if (top > L && top > 0) {
    R.isTarim[r] = mulDiv(R.isTarim[r]!, L, top).q;
    R.isSanayi[r] = mulDiv(R.isSanayi[r]!, L, top).q;
    R.isHizmet[r] = mulDiv(R.isHizmet[r]!, L, top).q;
  }
  R.isGucu[r] = L;
  R.issiz[r] = Math.max(0, L - R.isTarim[r]! - R.isSanayi[r]! - R.isHizmet[r]!);
}

// ---------- Kayıp muhasebesi (10.6, 10.9) ----------

/** Bir eyaletin bölgelerindeki A hücrelerinden n kişiyi hedef statüye aktarır (hedef=-1 ölüm). */
function eyaletAAktar(w: World, e: number, n: number, hedef: number): number {
  if (n <= 0) return 0;
  const rs = w.pkg.eyaletler[e]!.bolgeler;
  const ag = rs.map((r) => w.pop[hc(r, YB.ASKER, ST.A)]!);
  const mevcut = ag.reduce((a, b) => a + b, 0);
  const m = Math.min(n, mevcut);
  const p = largestRemainder(m, ag);
  rs.forEach((r, i) => {
    const h = hc(r, YB.ASKER, ST.A);
    w.pop[h] = w.pop[h]! - p[i]!;
    if (hedef >= 0) w.pop[hc(r, YB.ASKER, hedef)] = w.pop[hc(r, YB.ASKER, hedef)]! + p[i]!;
  });
  if (hedef < 0) for (const r of rs) kimlikEsitle(w, r);
  return m;
}

/** Birlik kişilerinin köken eyaletlerine göre çıkarılması; dönüş: eyalet → kişi (seyrek, artan eyalet sırası). */
export function birlikKisiCikarSeyrek(w: World, u: number, n: number): Map<number, number> {
  const U = uc(w);
  const c = U.ulke![u]!;
  const say: number[] = [];
  for (let k = 0; k < 9; k++) say.push(U[KOL_ON[k]!]![u]!);
  const top = say.reduce((a, b) => a + b, 0);
  const m = Math.min(n, top);
  const pay = largestRemainder(m, say);
  const eyalet = new Map<number, number>();
  const ekle = (e: number, v: number) => { if (v > 0) eyalet.set(e, (eyalet.get(e) ?? 0) + v); };
  for (let k = 0; k < 8; k++) {
    if (pay[k]! === 0) continue;
    U[KOL_ON[k]!]![u] = U[KOL_ON[k]!]![u]! - pay[k]!;
    ekle(U[KOL_OK[k]!]![u]! - 1, pay[k]!);
    if (U[KOL_ON[k]!]![u] === 0) U[KOL_OK[k]!]![u] = 0;
  }
  if (pay[8]! > 0) {
    U.on8![u] = U.on8![u]! - pay[8]!;
    // yalnız sıfır olmayan defter kalemleri (sıfır ağırlık pay almaz; sıralama korunur)
    const ix: number[] = [], def: number[] = [];
    for (let e = 0; e < w.nE; e++) { const v = w.kokenDefter[c * w.nE + e]!; if (v !== 0) { ix.push(e); def.push(v); } }
    const dp = largestRemainder(pay[8]!, def);
    ix.forEach((e, i) => { w.kokenDefter[c * w.nE + e] = w.kokenDefter[c * w.nE + e]! - dp[i]!; ekle(e, dp[i]!); });
  }
  U.kisi![u] = U.kisi![u]! - m;
  return eyalet;
}
/** Yoğun dönüşlü sürüm (geriye uyum). */
export function birlikKisiCikar(w: World, u: number, n: number): number[] {
  const out = new Array<number>(w.nE).fill(0);
  for (const [e, v] of birlikKisiCikarSeyrek(w, u, n)) out[e]! += v;
  return out;
}

/** Muharebe kaybı: ölü, yaralı, esir (tutan ülke). */
export function kayipYaz(w: World, u: number, olu: number, yarali: number, esir: number, tutan: number): void {
  const U = uc(w);
  const c = U.ulke![u]!;
  const eO = birlikKisiCikarSeyrek(w, u, olu);
  const eY = birlikKisiCikarSeyrek(w, u, yarali);
  const eE = birlikKisiCikarSeyrek(w, u, esir);
  const anahtar = [...new Set([...eO.keys(), ...eY.keys(), ...eE.keys()])].sort((a, b) => a - b);
  // aynı gün aynı eyaletin yaralıları tek kayıtta birleşir
  let yb = w.onbellek.get('yaraliGun') as { g: number; m: Map<number, number> } | undefined;
  if (!yb || yb.g !== w.gun) { yb = { g: w.gun, m: new Map() }; w.onbellek.set('yaraliGun', yb); }
  let topOlu = 0;
  for (const e of anahtar) {
    topOlu += eyaletAAktar(w, e, eO.get(e) ?? 0, -1);
    const y = eyaletAAktar(w, e, eY.get(e) ?? 0, ST.W);
    if (y > 0) {
      const k = c * w.nE + e;
      const var_ = yb.m.get(k);
      if (var_ !== undefined && w.YR.alive[var_] && w.YR.c.gun[var_] === w.gun + K.yaraliGun) w.YR.c.kisi[var_] = w.YR.c.kisi[var_]! + y;
      else {
        const s = w.YR.alloc();
        w.YR.c.ulke[s] = c; w.YR.c.eyalet[s] = e; w.YR.c.kisi[s] = y; w.YR.c.gun[s] = w.gun + K.yaraliGun;
        yb.m.set(k, s);
      }
    }
    const p = eyaletAAktar(w, e, eE.get(e) ?? 0, ST.P);
    if (p > 0 && tutan >= 0) w.esir[tutan * w.nC + c] = w.esir[tutan * w.nC + c]! + p;
  }
  w.sayac.askerOlum += topOlu;
  w.C.c.olumAy[c] = w.C.c.olumAy[c]! + topOlu;
}

/** Yaralı iyileşmesi (10.9): %50 E (sıhhiye ile %60), kalan R. */
export function yaraliIyilestir(w: World): void {
  for (const s of w.YR.list()) {
    if (w.YR.c.gun[s]! > w.gun) continue;
    const c = w.YR.c.ulke[s]!, e = w.YR.c.eyalet[s]!, n = w.YR.c.kisi[s]!;
    const oran = w.tekBitti[c * NTEK + tekIdx('sihhiye')] ? 600_000 : 500_000;
    const iyi = mulDiv(n, oran, S).q;
    const rs = w.pkg.eyaletler[e]!.bolgeler;
    const ag = rs.map((r) => w.pop[hc(r, YB.ASKER, ST.W)]!);
    const iyiPay = largestRemainder(iyi, ag);
    const sakatPay = largestRemainder(n - iyi, ag.map((a, i) => a - iyiPay[i]!));
    rs.forEach((r, i) => {
      const iy = Math.min(iyiPay[i]!, w.pop[hc(r, YB.ASKER, ST.W)]!);
      w.pop[hc(r, YB.ASKER, ST.W)] = w.pop[hc(r, YB.ASKER, ST.W)]! - iy;
      w.pop[hc(r, YB.ASKER, ST.E)] = w.pop[hc(r, YB.ASKER, ST.E)]! + iy;
      const sk = Math.min(sakatPay[i]!, w.pop[hc(r, YB.ASKER, ST.W)]!);
      w.pop[hc(r, YB.ASKER, ST.W)] = w.pop[hc(r, YB.ASKER, ST.W)]! - sk;
      w.pop[hc(r, YB.ASKER, ST.R)] = w.pop[hc(r, YB.ASKER, ST.R)]! + sk;
    });
    w.C.c.sakatAy[c] = w.C.c.sakatAy[c]! + (n - iyi);
    w.YR.release(s);
  }
}

/** Esir iadesi (barışta): iki taraf tek transferle; P → E. */
export function esirIade(w: World, a: number, b: number): void {
  for (const [tutan, koken] of [[a, b], [b, a]] as const) {
    const n = w.esir[tutan * w.nC + koken]!;
    if (n <= 0) continue;
    w.esir[tutan * w.nC + koken] = 0;
    // köken ülkenin bütün bölgelerindeki P hücrelerinden orantılı
    const rs: number[] = [];
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === koken || w.pop[hc(r, YB.ASKER, ST.P)]! > 0) rs.push(r);
    const ag = rs.map((r) => w.pop[hc(r, YB.ASKER, ST.P)]!);
    const p = largestRemainder(Math.min(n, ag.reduce((x, y) => x + y, 0)), ag);
    rs.forEach((r, i) => {
      w.pop[hc(r, YB.ASKER, ST.P)] = w.pop[hc(r, YB.ASKER, ST.P)]! - p[i]!;
      w.pop[hc(r, YB.ASKER, ST.E)] = w.pop[hc(r, YB.ASKER, ST.E)]! + p[i]!;
    });
    anlat(w, `${w.pkg.ulkeler[tutan]!.kisa}, ${fmtSayi(n)} esiri ${trEkK(w.pkg.ulkeler[koken]!.kisa, 'e')} iade etti.`, 'diplomasi', koken, 1);
  }
}

/** Terhis: personel E'ye (köken eyaletlerinde), ekipman başkent deposuna transit. */
export function terhis(w: World, u: number): void {
  const U = uc(w);
  const c = U.ulke![u]!;
  const eyl = birlikKisiCikar(w, u, U.kisi![u]!);
  for (let e = 0; e < w.nE; e++) eyaletAAktar(w, e, eyl[e]!, ST.E);
  for (let k = 0; k < 8; k++) {
    const m = U[KOL_E[k]!]?.[u] ?? 0;
    if (m > 0) w.ekip[ck(c, k)] = w.ekip[ck(c, k)]! + m;
  }
  w.U.release(u);
  void birlikIhtiyac;
}

/** Ülkenin askerlik çağı havuzları (gösterim ve karar için). */
export function insanGucu(w: World, c: number): { Y: number; E: number; S: number; A: number; W: number; P: number; R: number; erisimY: number } {
  const o = { Y: 0, E: 0, S: 0, A: 0, W: 0, P: 0, R: 0, erisimY: 0 };
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== c) continue;
    o.Y += w.pop[hc(r, YB.ASKER, ST.Y)]!; o.E += w.pop[hc(r, YB.ASKER, ST.E)]!; o.S += w.pop[hc(r, YB.ASKER, ST.S)]!;
    o.A += w.pop[hc(r, YB.ASKER, ST.A)]!; o.W += w.pop[hc(r, YB.ASKER, ST.W)]!; o.P += w.pop[hc(r, YB.ASKER, ST.P)]!;
    o.R += w.pop[hc(r, YB.ASKER, ST.R)]!;
    if (w.R.c.kontrolEden[r] === c) o.erisimY += mulDiv(w.pop[hc(r, YB.ASKER, ST.Y)]!, w.R.c.kontrol[r]!, 100_000).q;
  }
  return o;
}
