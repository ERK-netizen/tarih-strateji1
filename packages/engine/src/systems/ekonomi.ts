import { US_MAX } from './us.ts';
// Bölüm 11–13: tarım, gıda, sanayi, üretim hatları, projeler, araştırma, vergi, harcama, borç, pazar.
import type { World } from '../state/world.ts';
import { hc, ck, URUN_MUH, T_GIDA, T_MAL, T_PARA, H_EYALET, H_ULKE } from '../state/world.ts';
import { ST, YB, NHUCRE, K, EKONOMI, YONETIM, ISGAL, EKIPMAN, MUHIMMAT, TEKNOLOJI, NTEK, tekIdx, PROJE, MAL, NMAL, MALI, ASKERLIK, AKTIF, tekSeviye, tekKat, kademe } from '../catalog.ts';
import { MT, NYUVA } from '../state/world.ts';
import { KADEME_MAX, EKO_MODEL, TARIM_ODAK, PETROL_KULLANIM } from '../katalogEk.ts';
import { kuvvetBakimi, gemiSay, ucakSay } from './deniz.ts';
import { GEMI, HAVA } from '../katalogEk.ts';
import { S, mulDiv, mulRatio, clamp, largestRemainder, sqrtRatio, approach } from '../num/index.ts';
import { rng, AMAC, uniformInt } from '../rng/index.ts';
import { tarih, gunNo, haftaGunu } from '../calendar/index.ts';
import { uc, gorus, savasta, anlat, bildir, savastaMi, dostBolge, rota, eyaletUlke, kontrolB, sahipB, modDeger, sinirKomsusu } from './ortak.ts';
import { tarimIsciIhtiyac, kimlikEsitle } from './nufus.ts';
import { kapasiteAsimi, kapasiteAsimiHepsi, kontrolErisim } from './siyaset.ts';
import { KOL_E } from '../state/world.ts';
import { trEk, trKucuk } from '../tr.ts';

const tek = (w: World, c: number, kod: string) => w.tekBitti[c * NTEK + tekIdx(kod)]! >= 1;

// ---------- Hasat (11.1) ----------
export function hasatKademeSec(w: World): void {
  const y = tarih(w.gun).y;
  for (let ik = 0; ik < w.hasatKademe.length; ik++) {
    const u = rng(w.tohum, y, 11, ik, 0, AMAC.harvest, 0, 0);
    const v = uniformInt(u, S);
    let acc = 0, k = 0;
    for (; k < w.pkg.hasatP.length; k++) { acc += w.pkg.hasatP[k]!; if (v < acc) break; }
    w.hasatKademe[ik] = Math.min(k, w.pkg.hasatP.length - 1);
  }
}
export const HASAT_AD = ['Kıtlık yılı', 'Zayıf hasat', 'Olağan hasat', 'İyi hasat', 'Bereketli yıl'];
export const HASAT_KUCUK = ['kıtlık yılı', 'zayıf hasat', 'olağan hasat', 'iyi hasat', 'bereketli yıl'];

/** f(o): harcama etkisi doğrusal düğümler (12.3). o ve sonuç S ölçekli. */
export function harcamaF(o: number): number {
  if (o <= 0) return 0;
  if (o <= 500_000) return o;
  if (o <= S) return 500_000 + mulDiv(o - 500_000, 300_000, 500_000).q;
  if (o <= 2 * S) return 800_000 + mulDiv(o - S, 200_000, S).q;
  return S;
}

/** Bütçe kalemi etkisi (son ayın gerçekleşen harcamasına göre). */
export function butceEtki(w: World, c: number, kalem: number): number {
  const C = w.C.c;
  const pay = [C.b0, C.b1, C.b2, C.b3][kalem]![c]!;
  const ref = Math.max(1, mulDiv(C.g1[c]!, 150_000, S).q); // referans: aylık gelirin %15'i × pay
  const harcanan = mulDiv(mulDiv(Math.max(0, C.g1[c]! - C.giderAy[c]!), C.harcamaOran[c]!, S).q, pay, S).q;
  const refK = Math.max(1, mulDiv(ref, 250_000, S).q);
  return harcamaF(mulDiv(harcanan, S, refK).q);
}

/** Bölgenin günlük gıda üretimi (milibirim). */
export function tarimUretim(w: World, r: number): number {
  const b = w.pkg.bolgeler[r]!;
  const R = w.R.c;
  const c = R.kontrolEden[r]!;
  const ih = tarimIsciIhtiyac(w, r);
  const doluluk = ih <= 0 ? 0 : Math.min(S, mulDiv(R.isTarim[r]!, S, ih).q);
  let verim = b.verim;
  const tv = tekKat(w, c, 'tarim2', 100_000) + tekKat(w, c, 'tarim3', 100_000) + Math.max(0, tekKat(w, c, 'tarim1', 60_000) - 60_000);
  if (tv) verim = mulRatio(verim, S + Math.min(3 * S, tv)).q;
  const mt = modDeger(w, c, MT.tarim) + (c >= 0 ? TARIM_ODAK[w.C.c.tarimOdak[c]!]!.gida + Math.min(200_000, w.C.c.subTarim[c]! * 2) : 0);
  if (mt) verim = mulRatio(verim, Math.max(200_000, S + mt)).q;
  let g = mulDiv(b.alan * verim, 1, 30).q;
  g = mulRatio(g, doluluk).q;
  g = mulRatio(g, S + 150_000 * R.sulama[r]!).q;
  g = mulRatio(g, w.pkg.hasat[w.hasatKademe[b.iklim] ?? 2]!).q;
  const cephe = w.gun - R.sonMuharebe[r]! <= 7;
  const savasEtki = cephe ? 500_000 : (R.kontrolEden[r] !== R.sahip[r] ? 700_000 : S);
  g = mulRatio(g, savasEtki).q;
  g = mulRatio(g, S + mulDiv(butceEtki(w, c, 2), 100_000, S).q).q;
  g = mulRatio(g, S - R.hasar[r]!).q;
  return Math.max(0, g);
}

/** Bölgenin günlük sivil gıda ihtiyacı (milibirim), artık kanalıyla. A ve P hariç. */
function sivilIhtiyac(w: World, r: number): number {
  let n = 0;
  for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!;
  n -= w.pop[hc(r, YB.ASKER, ST.A)]! + w.pop[hc(r, YB.ASKER, ST.P)]!;
  const c = w.R.c.sahip[r]!;
  if (w.C.c.karne[c]) n = mulDiv(n, 850_000, S).q;
  const { q, rem } = mulDiv(n, 1000, K.gidaKisiGun);
  let ih = q;
  w.R.c.gidaArtik[r] = w.R.c.gidaArtik[r]! + rem;
  if (w.R.c.gidaArtik[r]! >= K.gidaKisiGun) { ih += 1; w.R.c.gidaArtik[r] = w.R.c.gidaArtik[r]! - K.gidaKisiGun; }
  return ih;
}

export function isgalErisim(w: World, r: number): number {
  const pol = ISGAL[w.C.c.isgalPol[w.R.c.kontrolEden[r]!]!]!;
  return mulDiv(pol.tavan, 250_000 + mulDiv(750_000, w.R.c.itaat[r]!, 100_000).q, S).q;
}

/** P5 tarım + P6 sivil gıda (11.2–11.3). İşgal altındaki bölge yerel stokla yaşar; işgalci erişim payını el koyar. */
export function gidaGunu(w: World): void {
  const R = w.R.c, E = w.E.c;
  for (let e = 0; e < w.nE; e++) { E.ihtiyacDun[e] = 0; E.karsilananDun[e] = 0; }
  for (let r = 0; r < w.nR; r++) {
    const g = tarimUretim(w, r);
    R.uretimDun[r] = g;
    const sahip = R.sahip[r]!, kontrol = R.kontrolEden[r]!;
    const e = w.pkg.bolgeler[r]!.eyalet;
    if (sahip === kontrol) E.gida[e] = E.gida[e]! + g;
    else {
      const el = mulRatio(g, isgalErisim(w, r)).q;
      R.yerelGida[r] = R.yerelGida[r]! + (g - el);
      if (el > 0) {
        // el konulan gıda işgalcinin en yakın kontrol edilen eyalet deposuna (3 gün)
        const hedefE = enYakinEyalet(w, kontrol, r);
        if (hedefE >= 0) {
          const t = w.T.alloc();
          w.T.c.tur[t] = T_GIDA; w.T.c.miktar[t] = el; w.T.c.ulke[t] = kontrol; w.T.c.hedefTip[t] = H_EYALET; w.T.c.hedefId[t] = hedefE;
          w.T.c.varis[t] = w.gun + 3; w.T.c.konum[t] = w.depo[hedefE]!;
        } else R.yerelGida[r] = R.yerelGida[r]! + el;
      }
    }
  }
  // Tüketim
  for (let r = 0; r < w.nR; r++) {
    const ih = sivilIhtiyac(w, r);
    const e = w.pkg.bolgeler[r]!.eyalet;
    let karsilanan: number;
    if (R.sahip[r] === R.kontrolEden[r]) {
      karsilanan = Math.min(ih, E.gida[e]!);
      E.gida[e] = E.gida[e]! - karsilanan;
      E.ihtiyacDun[e] = E.ihtiyacDun[e]! + ih; E.karsilananDun[e] = E.karsilananDun[e]! + karsilanan;
    } else {
      karsilanan = Math.min(ih, R.yerelGida[r]!);
      R.yerelGida[r] = R.yerelGida[r]! - karsilanan;
    }
    const guv = ih <= 0 ? S : mulDiv(karsilanan, S, ih).q;
    if (guv < 600_000) kitlikOlum(w, r, guv);
  }
  // Esirlerin tüketimi: tutan ülkenin başkent eyaleti
  for (let c = 0; c < w.nC; c++) {
    let n = 0;
    for (let d = 0; d < w.nC; d++) n += w.esir[c * w.nC + d]!;
    if (n <= 0) continue;
    const e = w.pkg.bolgeler[w.pkg.ulkeler[c]!.baskent]!.eyalet;
    const ih = mulDiv(n, 1000, K.gidaKisiGun).q;
    const k = Math.min(ih, E.gida[e]!);
    E.gida[e] = E.gida[e]! - k;
  }
  for (let e = 0; e < w.nE; e++) {
    E.ihtiyacAy[e] = E.ihtiyacAy[e]! + E.ihtiyacDun[e]!;
    E.karsilananAy[e] = E.karsilananAy[e]! + E.karsilananDun[e]!;
  }
}

export function enYakinEyalet(w: World, c: number, r: number): number {
  let o = w.onbellek.get('enYakin') as { e: number; m: Map<number, number> } | undefined;
  if (!o || o.e !== w.rotaEpoch) { o = { e: w.rotaEpoch, m: new Map() }; w.onbellek.set('enYakin', o); }
  const key = c * 8192 + r;
  const v = o.m.get(key);
  if (v !== undefined) return v;
  const b = enYakinEyaletHesap(w, c, r);
  o.m.set(key, b);
  return b;
}
function enYakinEyaletHesap(w: World, c: number, r: number): number {
  // ülkenin kullanılabilir depoları (rotaEpoch önbellekli): kendi kontrolündeki ve sahibi olduğu depo bölgeleri
  let o = w.onbellek.get('depoL') as { e: number; m: number[][] } | undefined;
  if (!o || o.e !== w.rotaEpoch) {
    const m: number[][] = Array.from({ length: w.nC }, () => []);
    for (let e = 0; e < w.nE; e++) { const d = w.depo[e]!; if (w.R.c.kontrolEden[d] === w.R.c.sahip[d]) m[w.R.c.sahip[d]!]!.push(e); }
    o = { e: w.rotaEpoch, m };
    w.onbellek.set('depoL', o);
  }
  let best = -1, bd = Infinity;
  const [x2, y2] = w.pkg.bolgeler[r]!.merkez;
  for (const e of o.m[c] ?? []) {
    const d = w.depo[e]!;
    const [x1, y1] = w.pkg.bolgeler[d]!.merkez;
    const dd = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    if (dd < bd || (dd === bd && e < best)) { bd = dd; best = e; }
  }
  return best;
}

/** Kıtlık ek ölümü (11.3): tam 30 günlük maruziyette 0,40–0,60 → %0,2; <0,40 → %1. Günlük aylıkOran/30. */
function kitlikOlum(w: World, r: number, guv: number): void {
  const oran = guv < 400_000 ? 10_000 : 2000; // S, aylık
  const st = [ST.O, ST.S, ST.Y, ST.E, ST.R, ST.W];
  let toplam = 0;
  for (let y = 0; y < 4; y++) for (const s of st) toplam += w.pop[hc(r, y, s)]!;
  const n = mulDiv(toplam, oran, S * 30).q;
  if (n <= 0) return;
  const hucreler: number[] = [], ag: number[] = [];
  for (let y = 0; y < 4; y++) for (const s of st) { hucreler.push(hc(r, y, s)); ag.push(w.pop[hc(r, y, s)]!); }
  const p = largestRemainder(n, ag);
  hucreler.forEach((h, i) => { w.pop[h] = w.pop[h]! - p[i]!; });
  kimlikEsitle(w, r); // kimlik dağılımı nüfusu izler (T103)
  w.sayac.ekOlum += n;
}

/** Aylık eyalet güvencesi ve bozulma. */
export function aylikGida(w: World): void {
  const E = w.E.c;
  for (let e = 0; e < w.nE; e++) {
    E.guvence[e] = E.ihtiyacAy[e]! <= 0 ? S : mulDiv(E.karsilananAy[e]!, S, E.ihtiyacAy[e]!).q;
    E.ihtiyacAy[e] = 0; E.karsilananAy[e] = 0;
    const c = eyaletUlke(w, e);
    const boz = mulRatio(E.gida[e]!, c >= 0 && tek(w, c, 'depo1') ? K.bozulmaAylik >> 1 : K.bozulmaAylik).q;
    E.gida[e] = E.gida[e]! - boz;
  }
  for (let r = 0; r < w.nR; r++) w.R.c.yerelGida[r] = w.R.c.yerelGida[r]! - mulRatio(w.R.c.yerelGida[r]!, K.bozulmaAylik).q;
}

export function ulkeGidaGuvence(w: World, c: number, gunluk = false): number {
  let ih = 0, k = 0;
  for (let e = 0; e < w.nE; e++) {
    if (eyaletUlke(w, e) !== c) continue;
    if (gunluk) { ih += w.E.c.ihtiyacDun[e]!; k += w.E.c.karsilananDun[e]!; }
    else { ih += S; k += w.E.c.guvence[e]!; }
  }
  return ih <= 0 ? S : mulDiv(k, S, ih).q;
}
export function ulkeGidaStok(w: World, c: number): { stok: number; gunluk: number } {
  let stok = 0, gunluk = 0;
  for (let e = 0; e < w.nE; e++) {
    if (eyaletUlke(w, e) !== c) continue;
    stok += w.E.c.gida[e]!; gunluk += w.E.c.ihtiyacDun[e]!;
  }
  return { stok, gunluk };
}

// ---------- Sanayi (13.1) ----------
export function fabrikaCarpan(w: World, c: number): number {
  let m = S;
  m += Math.min(3 * S, tekKat(w, c, 'sanayi1', 100_000) + tekKat(w, c, 'sanayi2', 100_000) + tekKat(w, c, 'sanayi3', 50_000));
  m += modDeger(w, c, MT.uretim) + EKO_MODEL[w.C.c.model[c]!]!.sanayi + Math.min(150_000, mulDiv(w.C.c.tarife[c]!, 1, 3).q) + Math.min(200_000, mulDiv(w.C.c.subSanayi[c]!, 8, 5).q);
  // petrol açığı: çağdaş sanayi yakıt bekler
  if (PETROL_KULLANIM[AKTIF.donem].fabrika > 0 && w.C.c.petrolIht[c]! > 0 && w.C.c.petrol[c]! < w.C.c.petrolIht[c]!) m -= mulDiv(250_000, w.C.c.petrolIht[c]! - w.C.c.petrol[c]!, w.C.c.petrolIht[c]!).q;
  return Math.max(200_000, m);
}
/** Bölgenin fabrika işçi doluluğu (S). */
export function fabrikaDoluluk(w: World, r: number): number {
  const gerek = (w.R.c.sivilF[r]! + w.R.c.askeriF[r]!) * K.fabrikaIsci;
  return gerek <= 0 ? 0 : Math.min(S, mulDiv(w.R.c.isSanayi[r]!, S, gerek).q);
}
export function etkinFabrika(w: World, c: number): { sivil: number; askeri: number } {
  let sivil = 0, askeri = 0; // milifabrika
  for (const r of kontrolB(w, c)) {
    const d = mulRatio(fabrikaDoluluk(w, r), S - w.R.c.hasar[r]!).q;
    const erisim = w.R.c.sahip[r] === c ? S : isgalErisim(w, r);
    sivil += mulDiv(w.R.c.sivilF[r]! * 1000, mulRatio(d, erisim).q, S).q;
    askeri += mulDiv(w.R.c.askeriF[r]! * 1000, mulRatio(d, erisim).q, S).q;
  }
  return { sivil, askeri };
}

/** P5 sanayi: tüketim malı, inşaat, üretim hatları. */
export function sanayiGunu(w: World): void {
  const C = w.C.c;
  const yil = tarih(w.gun).y;
  const zirhSay = new Int32Array(w.nC);
  for (const u of w.U.rows()) if (w.U.c.sablon[u] === 1) zirhSay[w.U.c.ulke[u]!]!++;
  const hatGrup: number[][] = Array.from({ length: w.nC }, () => []);
  for (const s of w.HT.list()) hatGrup[w.HT.c.ulke[s]!]!.push(s);
  for (let c = 0; c < w.nC; c++) {
    const law = EKONOMI[C.ekonomi[c]!]!;
    const fc = fabrikaCarpan(w, c);
    const ef = etkinFabrika(w, c);
    const spSivil = mulRatio(mulDiv(ef.sivil, K.fabrikaSP, 1000).q, fc).q; // milipuan
    const tuketim = mulRatio(spSivil, law.tuketim).q;
    const insaat = mulRatio(mulRatio(spSivil - tuketim, law.insaat).q, S + EKO_MODEL[C.model[c]!]!.insa).q;
    // tüketim malı yeterliliği: ihtiyaç nüfus/100 milipuan
    let nufus = 0;
    for (const r of sahipB(w, c)) for (let k = 0; k < NHUCRE; k++) nufus += w.pop[r * NHUCRE + k]!;
    C.tuketimYet[c] = clamp(mulDiv(tuketim, S, Math.max(1, Math.floor(nufus / 100))).q, 0, 1_500_000);
    // kaynak akışı
    let celik = 0, komur = 0, petrol = 0, fabSay = 0;
    for (const r of kontrolB(w, c)) {
      const b = w.pkg.bolgeler[r]!;
      const erisim = w.R.c.sahip[r] === c ? S : isgalErisim(w, r);
      // maden ocağı düzeyi her kademede çıkarmayı %25 artırır
      const h = mulRatio(mulRatio(S - w.R.c.hasar[r]!, erisim).q, S + 250_000 * w.R.c.maden[r]!).q;
      celik += mulRatio(b.celik, h).q; komur += mulRatio(b.komur, h).q;
      if (b.petrol && yil >= b.petrol[1]) petrol += mulRatio(b.petrol[0], h).q;
      fabSay += w.R.c.sivilF[r]! + w.R.c.askeriF[r]!;
    }
    const mk = Math.min(2 * S, tekKat(w, c, 'maden1', 200_000));
    if (mk) { celik = mulRatio(celik, S + mk).q; komur = mulRatio(komur, S + mk).q; petrol = mulRatio(petrol, S + mk).q; }
    // petrol dengesi: donanma, hava, zırhlı birlikler ve çağdaş sanayi tüketir
    const pk = PETROL_KULLANIM[AKTIF.donem];
    let ih = zirhSay[c]! * pk.zirh + fabSay * pk.fabrika;
    GEMI[AKTIF.donem].forEach((g, k) => { ih += gemiSay(w, c, k) * g.yakit; });
    HAVA[AKTIF.donem].forEach((hv, k) => { ih += ucakSay(w, c, k) * hv.yakit; });
    // ilk ölçümde devlet 120 günlük stratejik yedekle başlar (senaryo başı ya da eski kayıt)
    if (C.petrolIht[c] === 0 && C.petrolDun[c] === 0 && ih > 0) C.petrol[c] = Math.max(C.petrol[c]!, ih * 120);
    C.petrolDun[c] = petrol; C.petrolIht[c] = ih;
    C.petrol[c] = clamp(C.petrol[c]! + petrol - ih, 0, Math.max(20_000, (petrol + ih) * 180));
    C.celikDun[c] = celik; C.komurDun[c] = komur;
    C.celik[c] = C.celik[c]! + celik; C.komur[c] = C.komur[c]! + komur;
    // hatlar
    const hatlar = (hatGrup[c] ?? []).sort((a, b) => w.HT.c.oncelik[a]! - w.HT.c.oncelik[b]! || a - b);
    let atanan = 0;
    for (const s of hatlar) atanan += w.HT.c.fabrika[s]!;
    const olcek = atanan > ef.askeri && atanan > 0 ? mulDiv(ef.askeri, S, atanan).q : S;
    let spAsk = 0;
    for (const s of hatlar) {
      const H = w.HT.c;
      const F = mulRatio(H.fabrika[s]!, olcek).q;
      let Cg = mulDiv(F, K.fabrikaSP, 1000).q;
      Cg = mulRatio(Cg, fc).q; Cg = mulRatio(Cg, H.verim[s]!).q; Cg = mulRatio(Cg, law.askeri).q;
      const urun = H.urun[s]!;
      const tarifSP = urun === URUN_MUH ? MUHIMMAT.sp : EKIPMAN[urun]!.sp;
      const tarifCelik = urun === URUN_MUH ? MUHIMMAT.celik : EKIPMAN[urun]!.celik;
      const tarifKomur = urun === URUN_MUH ? MUHIMMAT.komur : 0;
      const ihCelik = mulDiv(Cg, tarifCelik, tarifSP).q;
      const ihKomur = mulDiv(Cg, tarifKomur, tarifSP).q;
      let q = S;
      if (ihCelik > 0) q = Math.min(q, mulDiv(C.celik[c]!, S, ihCelik).q);
      if (ihKomur > 0) q = Math.min(q, mulDiv(C.komur[c]!, S, ihKomur).q);
      q = clamp(q, 0, S);
      // teknoloji kilidi
      if (urun !== URUN_MUH && EKIPMAN[urun]!.tek && !tek(w, c, EKIPMAN[urun]!.tek!)) q = 0;
      const uretilen = mulRatio(Cg, q).q;
      C.celik[c] = C.celik[c]! - mulRatio(ihCelik, q).q;
      C.komur[c] = C.komur[c]! - mulRatio(ihKomur, q).q;
      spAsk += uretilen;
      H.wip[s] = H.wip[s]! + uretilen;
      if (urun === URUN_MUH) {
        // mühimmat milibirim: wip (milipuan) / sp × 1000
        const m = mulDiv(H.wip[s]!, 1000, tarifSP);
        C.muhimmat[c] = C.muhimmat[c]! + m.q;
        H.wip[s] = mulDiv(m.rem, 1, 1000).q;
      } else {
        const adet = Math.floor(H.wip[s]! / tarifSP);
        if (adet > 0) { w.ekip[ck(c, urun)] = w.ekip[ck(c, urun)]! + adet; H.wip[s] = H.wip[s]! - adet * tarifSP; }
      }
      // verim (13.1): Δ = 0,01 × (tavan − mevcut) × çalışmaOranı
      const tavan = (tek(w, c, 'sanayi2') ? 600_000 : 500_000) + (tek(w, c, 'sanayi3') ? 50_000 : 0);
      if (q > 0 && H.verim[s]! < tavan) H.verim[s] = H.verim[s]! + mulDiv(mulDiv(tavan - H.verim[s]!, tek(w, c, 'sanayi3') ? 15_000 : 10_000, S).q, q, S).q;
    }
    C.spDun[c] = spSivil + spAsk;
    // aylık olmayan kaynak kaybı: stok tavanı 30 günlük akış (akış soyutlaması)
    C.celik[c] = Math.min(C.celik[c]!, Math.max(20_000, celik * 30));
    C.komur[c] = Math.min(C.komur[c]!, Math.max(20_000, komur * 30));
    projeGunu(w, c, insaat);
  }
}

/** Projeler (13.6): sırayla, proje başına en fazla 10 fabrika (45 SP/gün). */
function projeGunu(w: World, c: number, insaatSP: number): void {
  const P = w.PR.c;
  let kalan = insaatSP;
  const list = w.PR.list().filter((s) => P.ulke[s] === c).sort((a, b) => P.sira[a]! - P.sira[b]! || a - b);
  for (const s of list) {
    if (kalan <= 0) break;
    const tavan = 10 * K.fabrikaSP;
    const spIst = Math.min(kalan, tavan, P.spTop[s]! - P.spKul[s]!);
    const nakitIst = mulDiv(P.nakitTop[s]!, spIst, Math.max(1, P.spTop[s]!)).q;
    let q = S;
    if (nakitIst > 0) q = Math.min(q, mulDiv(Math.max(0, w.C.c.hazine[c]!), S, nakitIst).q);
    const sp = mulRatio(spIst, q).q, nakit = mulRatio(nakitIst, q).q;
    P.spKul[s] = P.spKul[s]! + sp; P.nakitKul[s] = P.nakitKul[s]! + nakit;
    w.C.c.hazine[c] = w.C.c.hazine[c]! - nakit;
    w.C.c.giderAy[c] = w.C.c.giderAy[c]! + nakit;
    kalan -= sp;
    if (P.spKul[s]! >= P.spTop[s]!) projeTamamla(w, s);
  }
}

function projeTamamla(w: World, s: number): void {
  const P = w.PR.c, R = w.R.c;
  const r = P.bolge[s]!, c = P.ulke[s]!;
  const kod = PROJE[P.tur[s]!]!.kod;
  // tesis ertesi gün kullanılır: değişiklik bugün yazılır ama üretim fazı geçti (T043)
  if (kod === 'sivil') R.sivilF[r] = R.sivilF[r]! + 1;
  else if (kod === 'askeri') R.askeriF[r] = R.askeriF[r]! + 1;
  else if (kod === 'sulama') R.sulama[r] = Math.min(3, R.sulama[r]! + 1);
  else if (kod === 'demiryolu') { R.demiryolu[r] = Math.min(3, R.demiryolu[r]! + 1); w.rotaEpoch++; }
  else if (kod === 'altyapi') { R.altyapi[r] = Math.min(6, R.altyapi[r]! + 1); w.rotaEpoch++; }
  else if (kod === 'valilik') R.valilik[r] = 1;
  else if (kod === 'havaus') R.havaUs[r] = Math.min(US_MAX, R.havaUs[r]! + 1);
  else if (kod === 'tersane') R.tersane[r] = Math.min(3, R.tersane[r]! + 1);
  else if (kod === 'kent') {
    // v1.6 (K-45): şehir düzeyi yalnız yapı kapasitesini (+4 yuva) artırır; bedelsiz fabrika yoktur (T21)
    R.kent[r] = Math.min(10, R.kent[r]! + 1);
  } else if (kod === 'maden') R.maden[r] = Math.min(5, R.maden[r]! + 1);
  else if (kod === 'gemi') { const k = P.alt[s]!; const C = w.C.c as unknown as Record<string, Float64Array>; C[`gs${k}`]![c] = C[`gs${k}`]![c]! + P.adet[s]!; }
  else if (kod === 'ucak') { const k = P.alt[s]!; const C = w.C.c as unknown as Record<string, Float64Array>; C[`h${k}`]![c] = C[`h${k}`]![c]! + P.adet[s]!; }
  if (kod === 'gemi' || kod === 'ucak') {
    const ad = kod === 'gemi' ? GEMI[AKTIF.donem][P.alt[s]!]?.ad ?? 'gemi' : HAVA[AKTIF.donem][P.alt[s]!]?.ad ?? 'uçak';
    const m = kod === 'gemi' ? `${w.pkg.bolgeler[r]!.ad} tersanesinde ${P.adet[s]} ${trKucuk(ad)} denize indirildi.` : `${P.adet[s]} ${trKucuk(ad)} hizmete girdi.`;
    anlat(w, `${w.pkg.ulkeler[c]!.kisa}: ${m}`, 'proje', c, 0);
    bildir(w, 'proje', m, c, false);
  } else {
    anlat(w, `${trEk(w.pkg.bolgeler[r]!.ad, 'de')} ${trKucuk(PROJE[P.tur[s]!]!.ad)} tamamlandı.`, 'proje', c, 0);
    bildir(w, 'proje', `${w.pkg.bolgeler[r]!.ad}: ${PROJE[P.tur[s]!]!.ad} tamamlandı`, c, false);
  }
  w.PR.release(s);
}

// ---------- Araştırma (13.7) ----------
/**
 * Bir sonraki kademenin maliyeti. Kademe L: temel × (L+1)(L+2)/6; zamanından önce araştırma yıl başına +%5
 * (dönem yıl ölçeğiyle), geç kalan ve müttefikleri bilen ülke indirim alır. Tarih bugünden ölçülür: ceza zamanla azalır (K-38).
 */
export function tekMaliyetHesapla(w: World, c: number, t: number): number {
  const T = TEKNOLOJI[t]!;
  const L = Math.min(KADEME_MAX, w.tekBitti[c * NTEK + t]! + 1);
  const kd = kademe(t, L);
  const bas = w.gun;
  const tgun = gunNo({ y: kd.yil, m: 1, d: 1 });
  // Δy = (başlangıçGünü − teknolojiGünü)/365,2425 → rasyonel: ×10000/3652425
  const dyS = mulDiv(bas - tgun, S * 10_000, 3_652_425).q; // S ölçekli yıl
  const olcek = AKTIF.yilOlcek;
  const ileri = Math.floor(Math.max(0, -dyS) / olcek);
  const geri = Math.floor(Math.max(0, dyS) / olcek);
  let paylasan = 0;
  for (let d = 0; d < w.nC; d++) if (d !== c && w.tekBitti[d * NTEK + t]! >= L && anlasmaIttifak(w, c, d)) paylasan++;
  const pay = S + mulDiv(50_000, ileri, S).q; // çağın önündeki her yıl +%5 (K-38)
  const payda = S + Math.min(600_000, mulDiv(200_000, geri, S).q) + Math.min(300_000, 100_000 * paylasan);
  // kademe bedeli (L+1)(L+2)/6: 1, 2, 3⅓, 5, 7, 9⅓ … 30⅓ (K-38)
  const taban = mulDiv(T.maliyet, (L + 1) * (L + 2), 6).q;
  return mulDiv(taban, pay, payda).q;
}
function anlasmaIttifak(w: World, a: number, b: number): boolean {
  for (const s of w.AN.rows()) if (w.AN.c.tur[s] === 4 && ((w.AN.c.a[s] === a && w.AN.c.b[s] === b) || (w.AN.c.a[s] === b && w.AN.c.b[s] === a))) return true;
  return false;
}

/**
 * Bilim yatırımı oranı (S): bilime giden gerçek harcamanın referansa oranı, doygunluksuz, en çok 4×.
 * Diğer kalemlerin aksine bilim azalan getiriye uğramaz: araştırmaya yatırım yapan ülke çağının önüne geçebilir (K-38).
 */
export function bilimOrani(w: World, c: number): number {
  const C = w.C.c;
  const ref = Math.max(1, mulDiv(C.g1[c]!, 150_000, S).q);
  const harcanan = mulDiv(mulDiv(Math.max(0, C.g1[c]! - C.giderAy[c]!), C.harcamaOran[c]!, S).q, C.b0[c]!, S).q;
  const refK = Math.max(1, mulDiv(ref, 250_000, S).q);
  return Math.min(4 * S, mulDiv(harcanan, S, refK).q);
}
export function arastirmaHizi(w: World, c: number): number {
  // bilimsiz ülke yarı hızla araştırır; oran 1 → +%10, 2 → +%70, 4 (tavan) → +%190 (K-38)
  const bilim = mulDiv(bilimOrani(w, c), 600_000, S).q - 500_000;
  const egitim = mulDiv(w.C.c.egitim[c]!, S, 200_000).q;
  const ek = Math.min(500_000, tekKat(w, c, 'egitim1', 100_000)) + modDeger(w, c, MT.arastirma);
  return Math.max(0, mulRatio(w.C.c.arastirmaHizi[c]!, S + bilim + egitim + ek).q);
}

/** Açık araştırma yuvası: 3 + eğitim hattının her 3 kademesi + bilime bütçenin %35 ve %50'sinden fazlası için birer yuva (en çok NYUVA). */
export function acikYuva(w: World, c: number): number {
  const b0 = w.C.c.b0[c]!;
  return Math.min(NYUVA, 3 + Math.floor(tekSeviye(w, c, 'egitim1') / 3) + (b0 >= 350_000 ? 1 : 0) + (b0 >= 500_000 ? 1 : 0));
}
export function arastirmaGunu(w: World): void {
  for (let c = 0; c < w.nC; c++) {
    const v = arastirmaHizi(w, c);
    const n = acikYuva(w, c);
    for (let k = 0; k < NYUVA; k++) {
      const t = w.arastirma[c * NYUVA + k]!;
      if (t < 0) continue;
      if (k >= n) continue; // kapanan yuva bekler (ilerleme korunur)
      const i = c * NTEK + t;
      if (w.tekMaliyet[i]! <= 0) w.tekMaliyet[i] = tekMaliyetHesapla(w, c, t);
      w.tekIlerleme[i] = w.tekIlerleme[i]! + v;
      if (w.tekIlerleme[i]! >= w.tekMaliyet[i]!) {
        const L = Math.min(KADEME_MAX, w.tekBitti[i]! + 1);
        w.tekBitti[i] = L;
        w.tekIlerleme[i] = 0;
        w.tekMaliyet[i] = L < KADEME_MAX ? tekMaliyetHesapla(w, c, t) : 0;
        w.C.c.tekSay[c] = w.C.c.tekSay[c]! + 1;
        w.arastirma[c * NYUVA + k] = -1;
        teknolojiEtki(w, c, t);
        const ad = kademe(t, L).ad;
        anlat(w, `${w.pkg.ulkeler[c]!.kisa} araştırmacıları ${ad} çalışmasını tamamladı${L > 1 ? ` (${L}. kademe)` : ''}.`, 'arastirma', c, 0);
        bildir(w, 'arastirma', `Araştırma tamamlandı: ${ad}`, c, false);
      }
    }
  }
}
/** Aylık: süren araştırmaların maliyeti bugünün tarihine göre yeniden hesaplanır (zamanından önce cezası azalır). */
export function aylikArastirma(w: World): void {
  for (let c = 0; c < w.nC; c++) for (let k = 0; k < NYUVA; k++) {
    const t = w.arastirma[c * NYUVA + k]!;
    if (t >= 0) w.tekMaliyet[c * NTEK + t] = tekMaliyetHesapla(w, c, t);
  }
}
function teknolojiEtki(w: World, c: number, t: number): void {
  const kod = TEKNOLOJI[t]!.kod;
  if (kod === 'demiryolu') w.rotaEpoch++;
  if (kod === 'propaganda') w.C.c.propaganda[c] = w.C.c.propaganda[c]! + 5000;
}

// ---------- Vergi, harcama, borç (12.2–12.4) ----------
export function idariVerim(w: World, c: number, r: number): number {
  const taban = YONETIM[w.C.c.rejim[c]!]!.idari + Math.min(250_000, tekKat(w, c, 'idare', 50_000) + tekKat(w, c, 'maliye1', 50_000)) + modDeger(w, c, MT.vergi) + EKO_MODEL[w.C.c.model[c]!]!.vergi;
  return clamp(taban + mulDiv(w.C.c.egitim[c]!, S, 400_000).q + mulDiv(w.R.c.altyapi[r]!, S, 40).q, 100_000, S);
}

/** Bölge katma değeri (altın/gün). */
export function katmaDeger(w: World, r: number): number {
  const R = w.R.c;
  // tarım katma değeri oynak dünya fiyatını değil yerel değeri izler: taban fiyat ağırlıklı (çeyrek pay piyasadan)
  const p0 = MAL[MALI.gida]!.p0;
  const agri = mulDiv(R.uretimDun[r]!, Math.floor((3 * p0 + w.fiyat[MALI.gida]!) / 4), 1000).q;
  const f = mulRatio(mulRatio((R.sivilF[r]! + R.askeriF[r]!) * K.fabrikaSP, fabrikaDoluluk(w, r)).q, S - R.hasar[r]!).q;
  const sanayi = mulDiv(f, K.spDeger, 1000).q;
  const kc = R.kontrolEden[r]!;
  // hizmet: şehir düzeyi, ticaret teknolojisi, ekonomi modeli, nakit ürünleri; gümrük duvarı ticareti daraltır
  let hv = S + 40_000 * Math.min(10, R.kent[r]!);
  if (kc >= 0) {
    const C = w.C.c;
    hv += Math.min(2 * S, tekKat(w, kc, 'ticaret1', 100_000)) + EKO_MODEL[C.model[kc]!]!.hizmet + TARIM_ODAK[C.tarimOdak[kc]!]!.ticaret - mulDiv(C.tarife[kc]!, 6, 10).q;
    hv -= Math.floor((C.abluka[kc]! + C.akinKayip[kc]!) / 3);
    if (anlasmaSayisi(w, kc, 8) > 0) hv -= 50_000; // ambargo altında
  }
  const hizmet = mulRatio(mulDiv(R.isHizmet[r]!, K.hizmetVerim, 1000).q, Math.max(300_000, hv)).q;
  return Math.max(0, agri + sanayi + hizmet);
}

export interface VergiDetay { taban: number; oran: number; idari: number; huzur: number; erisim: number; kapasite: number; vergi: number }
export function bolgeVergi(w: World, c: number, r: number, asim?: number): VergiDetay {
  const taban = katmaDeger(w, r);
  const oran = w.C.c.vergi[c]!;
  const idari = idariVerim(w, c, r);
  const huzur = 500_000 + mulDiv(w.C.c.huzur[c]!, S, 200_000).q;
  const erisim = w.R.c.sahip[r] === c ? kontrolErisim(w, r) : isgalErisim(w, r);
  const kapasite = Math.max(600_000, S - mulDiv(500_000, asim ?? kapasiteAsimi(w, c), S).q);
  let v = mulRatio(taban, oran).q;
  v = mulRatio(v, idari).q; v = mulRatio(v, huzur).q; v = mulRatio(v, erisim).q; v = mulRatio(v, kapasite).q;
  return { taban, oran, idari, huzur, erisim, kapasite, vergi: v };
}

export interface Gider { borc: number; personel: number; bakim: number; idari: number; politika: number; toplam: number }

/** Bütün ülkelerin personel, ekipman değeri ve nüfus toplamları (tek geçiş). */
export function giderTabani(w: World): { personel: number[]; ekipDeger: number[]; nufus: number[] } {
  const U = uc(w);
  const personel = new Array<number>(w.nC).fill(0), ekipDeger = new Array<number>(w.nC).fill(0), nufus = new Array<number>(w.nC).fill(0);
  for (const u of w.U.rows()) {
    const c = U.ulke![u]!;
    personel[c]! += U.kisi![u]!;
    let d = 0;
    for (let k = 0; k < EKIPMAN.length; k++) d += U[KOL_E[k]!]![u]! * EKIPMAN[k]!.sp;
    ekipDeger[c]! += d;
  }
  for (let r = 0; r < w.nR; r++) { let n = 0; for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!; nufus[w.R.c.sahip[r]!]! += n; }
  return { personel, ekipDeger, nufus };
}

/**
 * Asker maaşı (mili-altın/kişi/gün): ülkenin kişi başı vergi gelirine bağlıdır, böylece her dönemde ve her ekonomide
 * orduyu beslemek aynı ağırlıktadır (barışta ordu payı × 40). Savaşta seferber ordu iki kat pahalıdır (savaş fişi).
 */
export const MAAS_KAT = 40;
export function maasHesap(gelirAy: number, nufus: number): number {
  if (nufus <= 0 || gelirAy <= 0) return K.maasGun;
  return clamp(mulDiv(gelirAy, 1000 * MAAS_KAT, 30 * nufus).q, 20, 20_000);
}
export function askerMaasi(w: World, c: number): number {
  const m = w.C.c.maas[c]! || K.maasGun;
  return savastaMi(w, c) ? m * 2 : m;
}

export function zorunluGider(w: World, c: number, taban?: { personel: number[]; ekipDeger: number[]; nufus: number[] }): Gider {
  let personel = 0, ekipDeger = 0, nufus = 0;
  if (taban) { personel = taban.personel[c]!; ekipDeger = taban.ekipDeger[c]!; nufus = taban.nufus[c]!; }
  else {
    const U = uc(w);
    for (const u of w.U.rows()) {
      if (U.ulke![u] !== c) continue;
      personel += U.kisi![u]!;
      for (let k = 0; k < EKIPMAN.length; k++) ekipDeger += U[KOL_E[k]!]![u]! * EKIPMAN[k]!.sp;
    }
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) for (let k = 0; k < NHUCRE; k++) nufus += w.pop[r * NHUCRE + k]!;
  }
  const bakimHedef = w.C.c.bakimHedef[c]!;
  const per = mulRatio(mulDiv(personel, askerMaasi(w, c), 1000).q, bakimHedef).q;
  const bak = mulRatio(mulDiv(ekipDeger, K.spDeger * K.ekipBakim, 1000 * 1000 * 10).q + kuvvetBakimi(w, c), bakimHedef).q;
  const idari = mulDiv(nufus, K.idariGider, 1000 * 365).q;
  const borc = mulDiv(w.C.c.borc[c]!, w.C.c.faiz[c]!, S * 365).q;
  return { borc, personel: per, bakim: bak, idari, politika: 0, toplam: borc + per + bak + idari };
}

/** P7 günlük vergi, ödeme sırası: borç servisi → bakım/personel → politika (12.3). */
function anlasmaSayisi(w: World, c: number, tur: number): number {
  let n = 0;
  for (const s of w.AN.rows()) if (w.AN.c.tur[s] === tur && w.AN.c.b[s] === c) n++;
  return n;
}

export function maliyeGunu(w: World): void {
  const C = w.C.c, R = w.R.c;
  for (let r = 0; r < w.nR; r++) { R.vergiDun[r] = 0; R.vaDun[r] = katmaDeger(w, r); }
  const grup: number[][] = Array.from({ length: w.nC }, () => []);
  for (let r = 0; r < w.nR; r++) grup[R.kontrolEden[r]!]!.push(r);
  const asim = kapasiteAsimiHepsi(w);
  const tazminat: number[][] = Array.from({ length: w.nC }, () => []);
  for (const s of w.AN.list()) if (w.AN.c.tur[s] === 6) tazminat[w.AN.c.a[s]!]!.push(s);
  const tabanG = giderTabani(w);
  for (let c = 0; c < w.nC; c++) {
    let gelir = 0;
    for (const r of grup[c]!) {
      const v = bolgeVergi(w, c, r, asim[c]).vergi;
      R.vergiDun[r] = v; gelir += v;
    }
    // tazminat gelir/gider anlaşmaları
    for (const s of tazminat[c] ?? []) {
      const alan = w.AN.c.b[s]!;
      const m = Math.min(w.AN.c.miktar[s]!, Math.max(0, C.hazine[c]!));
      C.hazine[c] = C.hazine[c]! - m; C.hazine[alan] = C.hazine[alan]! + m;
      C.giderAy[c] = C.giderAy[c]! + m; C.gelirAy[alan] = C.gelirAy[alan]! + m;
    }
    // gümrük geliri (ticaret hacmine bağlı: hizmet payı) ve sübvansiyon gideri
    gelir += mulDiv(gelir, Math.min(300_000, mulDiv(C.tarife[c]!, 3, 10).q), S).q;
    const sub = mulDiv(gelir, C.subTarim[c]! + C.subSanayi[c]!, S).q;
    C.hazine[c] = C.hazine[c]! + gelir - sub;
    C.gelirAy[c] = C.gelirAy[c]! + gelir; C.gelirDun[c] = gelir; C.giderAy[c] = C.giderAy[c]! + sub;
    if (C.maas[c] === 0 && gelir > 0) C.maas[c] = maasHesap(gelir * 30, tabanG.nufus[c]!);
    const g = zorunluGider(w, c, tabanG);
    // 1) borç servisi (kısmi ödenirse kalan nakit bakım ve personele kalmaz)
    let odenen = 0;
    if (g.borc > 0) {
      const od = Math.min(g.borc, Math.max(0, C.hazine[c]!));
      C.hazine[c] = C.hazine[c]! - od; odenen += od;
      if (od >= g.borc) C.odenmeyenGun[c] = 0;
      else {
        C.odenmeyenGun[c] = C.odenmeyenGun[c]! + 1;
        if (C.odenmeyenGun[c] === 30 && C.temerrut[c]! < w.gun) temerrutIlan(w, c);
      }
    }
    // 2) personel + bakım
    const pb = g.personel + g.bakim + g.idari;
    const pay = pb <= 0 ? S : clamp(mulDiv(Math.max(0, C.hazine[c]!), S, pb).q, 0, S);
    const od = mulRatio(pb, pay).q;
    C.hazine[c] = C.hazine[c]! - od; odenen += od;
    C.bakimOdenen[c] = pay;
    // 3) politika zarfı: kalan gelirin harcamaOran'ı (güvenlik rezervi: 30 günlük zorunlu gider)
    const rezerv = g.toplam * 30;
    const zarf = Math.max(0, gelir - g.toplam);
    const pol = C.hazine[c]! > rezerv ? mulRatio(zarf, C.harcamaOran[c]!).q : 0;
    C.hazine[c] = C.hazine[c]! - pol; odenen += pol;
    C.giderAy[c] = C.giderAy[c]! + odenen; C.giderDun[c] = odenen;
  }
}

function temerrutIlan(w: World, c: number): void {
  const C = w.C.c;
  C.mesru[c] = Math.max(0, C.mesru[c]! - 15_000);
  C.guvenilir[c] = Math.max(0, C.guvenilir[c]! - 20_000);
  C.temerrut[c] = w.gun + 5 * 365;
  anlat(w, `${w.pkg.ulkeler[c]!.ad} borç servisini 30 gündür ödeyemiyor: temerrüt ilan edildi.`, 'ekonomi', c, 3);
  bildir(w, 'temerrut', `${w.pkg.ulkeler[c]!.kisa} temerrüde düştü`, c, true);
}

export function krediLimiti(w: World, c: number): number {
  const C = w.C.c;
  const yillik = (C.g1[c]! + C.g2[c]! + C.g3[c]!) * 4;
  const carpan = clamp(500_000 + mulDiv(C.mesru[c]!, S, 100_000).q - (savastaMi(w, c) ? 200_000 : 0), 200_000, 1_500_000);
  let lim = mulRatio(yillik, carpan).q;
  const bk = tekKat(w, c, 'banka1', 500_000);
  if (bk) lim = mulRatio(lim, S + Math.min(3 * S, bk)).q;
  if (C.temerrut[c]! > w.gun) lim = Math.floor(lim / 2);
  return Math.max(0, lim - C.borc[c]!);
}

/** Aylık maliye kapanışı: gelir tarihçesi, faiz primi, eğitim. */
export function aylikMaliye(w: World): void {
  const C = w.C.c;
  const nufusU = giderTabani(w).nufus;
  for (let c = 0; c < w.nC; c++) {
    C.g3[c] = C.g2[c]!; C.g2[c] = C.g1[c]!; C.g1[c] = C.gelirAy[c]!;
    C.gelirAy[c] = 0; C.giderAy[c] = 0;
    const yillik = Math.max(1, C.g1[c]! * 12);
    const oran = mulDiv(C.borc[c]!, S, yillik).q;
    C.faiz[c] = (tek(w, c, 'banka1') ? 40_000 : 50_000) + (oran > S ? Math.min(50_000, mulDiv(oran - S, 50_000, S).q) : 0);
    // eğitim: yılda en çok 2 puan (aylık 0,1667)
    // asker maaşı: kişi başı gelirin yavaş izlenmesi (aylık %25)
    if (C.g1[c]! > 0) { const hedef = maasHesap(C.g1[c]!, nufusU[c]!); C.maas[c] = C.maas[c]! > 0 ? C.maas[c]! + Math.trunc((hedef - C.maas[c]!) / 4) : hedef; }
    const ef = butceEtki(w, c, 1);
    C.egitim[c] = Math.min(100_000, C.egitim[c]! + mulDiv(167 + Math.min(500, Math.floor(tekKat(w, c, 'egitim1', 83_000) / 1000)), ef, S).q);
  }
}

// ---------- Dünya pazarı (14.4) ----------
/** Ticaret izni (18.1): temel kaynak/gıda ≥ 20, mühimmat ≥ 60; savaş ve ambargo yok. */
export function ticaretIzni(w: World, a: number, b: number, mal: number): boolean {
  if (a === b || savasta(w, a, b)) return false;
  const esik = mal === MALI.muhimmat ? 60_000 : 20_000;
  return gorus(w, a, b) >= esik && gorus(w, b, a) >= esik;
}

export function pazarTemizle(w: World): void {
  if (haftaGunu(w.gun) !== 0) return;
  const SPc = w.SP.c, C = w.C.c;
  for (let m = 0; m < NMAL; m++) {
    const alis = w.SP.list().filter((s) => SPc.mal[s] === m && SPc.yon[s] === 0 && SPc.miktar[s]! > 0);
    const satis = w.SP.list().filter((s) => SPc.mal[s] === m && SPc.yon[s] === 1 && SPc.miktar[s]! > 0);
    // arz: satıcı stoğuyla sınırlı
    const arz = satis.map((s) => Math.min(SPc.miktar[s]!, malStok(w, SPc.ulke[s]!, m)));
    const talep = alis.map((s) => SPc.miktar[s]!);
    const ta = talep.reduce((a, b) => a + b, 0), ar = arz.reduce((a, b) => a + b, 0);
    const p0 = MAL[m]!.p0;
    const eps = 1000;
    const q = mulDiv(ta + eps, S, ar + eps).q;
    const hedef = mulRatio(p0, sqrtRatio(q)).q;
    const eski = w.fiyat[m]!;
    const adim = mulDiv(eski, 100_000, S).q;
    let yeni = approach(eski, hedef, adim, adim);
    yeni = clamp(yeni, Math.floor(p0 / 4), p0 * 4);
    w.fiyat[m] = yeni;
    // eşzamanlı orantılı eşleşme: her alıcının talebi uygun satıcılara arz oranında; satıcı aşımında ölçeklenir
    const istek: number[][] = alis.map(() => satis.map(() => 0));
    alis.forEach((sa, i) => {
      const uygun = satis.map((ss, j) => (ticaretIzni(w, SPc.ulke[sa]!, SPc.ulke[ss]!, m) ? arz[j]! : 0));
      // her alıcı en çok dört satıcıyla eşleşir (en büyük arz; eşitlikte küçük kimlik)
      const secili = uygun.map((v, j) => [v, j] as const).filter(([v]) => v > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 4).map(([, j]) => j);
      for (let j = 0; j < uygun.length; j++) if (!secili.includes(j)) uygun[j] = 0;
      const top = uygun.reduce((a, b) => a + b, 0);
      if (top <= 0) return;
      const pay = largestRemainder(Math.min(talep[i]!, top), uygun);
      pay.forEach((v, j) => { istek[i]![j] = v; });
    });
    let hacim = 0;
    satis.forEach((ss, j) => {
      const top = istek.reduce((a, row) => a + row[j]!, 0);
      const oran = top > arz[j]! && top > 0 ? mulDiv(arz[j]!, S, top).q : S;
      alis.forEach((sa, i) => {
        const alici = SPc.ulke[sa]!, satici = SPc.ulke[ss]!;
        let miktar = mulRatio(istek[i]![j]!, oran).q;
        // deniz ablukası ve ticaret akını: kara komşusu olmayan satıcıdan gelen mal kısmen ulaşamaz (sipariş o kadar küçülür)
        const ab = Math.min(900_000, C.abluka[alici]! + Math.floor(C.akinKayip[alici]! / 2));
        if (ab > 0 && !sinirKomsusu(w, alici, satici)) miktar = mulRatio(miktar, S - ab).q;
        if (miktar <= 0) return;
        const bedel = mulDiv(miktar, yeni, 1000).q;
        if (C.hazine[alici]! < bedel) return;
        // emanet: alıcıdan çekilir, teslimde satıcıya
        C.hazine[alici] = C.hazine[alici]! - bedel;
        C.giderAy[alici] = C.giderAy[alici]! + bedel;
        malDus(w, satici, m, miktar);
        const t = w.T.alloc();
        w.T.c.tur[t] = T_MAL; w.T.c.alt[t] = m; w.T.c.miktar[t] = miktar; w.T.c.ulke[t] = alici; w.T.c.hedefTip[t] = H_ULKE; w.T.c.hedefId[t] = alici;
        w.T.c.varis[t] = w.gun + 7; w.T.c.karsi[t] = satici; w.T.c.konum[t] = w.pkg.ulkeler[alici]!.baskent;
        const p = w.T.alloc();
        w.T.c.tur[p] = T_PARA; w.T.c.miktar[p] = bedel; w.T.c.ulke[p] = satici; w.T.c.hedefTip[p] = H_ULKE; w.T.c.hedefId[p] = satici;
        w.T.c.varis[p] = w.gun + 7; w.T.c.karsi[p] = alici; w.T.c.konum[p] = -1;
        SPc.miktar[sa] = SPc.miktar[sa]! - miktar;
        SPc.miktar[ss] = SPc.miktar[ss]! - miktar;
        hacim += miktar;
      });
    });
    w.pazarHacim[m] = hacim;
  }
  // tek seferlik siparişler temizlenir; kalıcılar yenilenir
  for (const s of w.SP.list()) {
    if (SPc.kalici[s]) SPc.miktar[s] = SPc.kalici[s]! * 1000;
    else w.SP.release(s);
  }
}

export function malStok(w: World, c: number, m: number): number {
  if (m === MALI.gida) {
    // ihracata uygun fazla: 90 günlük ihtiyacın üstü
    const { stok, gunluk } = ulkeGidaStok(w, c);
    return Math.max(0, stok - gunluk * 90);
  }
  if (m === MALI.celik) return w.C.c.celik[c]!;
  if (m === MALI.komur) return w.C.c.komur[c]!;
  if (m === MALI.petrol) return Math.max(0, w.C.c.petrol[c]! - w.C.c.petrolIht[c]! * 30); // 30 günlük ihtiyacın üstü
  return Math.max(0, w.C.c.muhimmat[c]! - 20_000);
}
function malDus(w: World, c: number, m: number, n: number): void {
  if (m === MALI.gida) {
    let kalan = n;
    const ey = w.pkg.eyaletler.map((e, i) => ({ e, i })).filter(({ i }) => eyaletUlke(w, i) === c);
    const ag = ey.map(({ i }) => w.E.c.gida[i]!);
    const p = largestRemainder(kalan, ag);
    ey.forEach(({ i }, k) => { const d = Math.min(p[k]!, w.E.c.gida[i]!); w.E.c.gida[i] = w.E.c.gida[i]! - d; kalan -= d; });
  } else if (m === MALI.celik) w.C.c.celik[c] = w.C.c.celik[c]! - n;
  else if (m === MALI.komur) w.C.c.komur[c] = w.C.c.komur[c]! - n;
  else if (m === MALI.petrol) w.C.c.petrol[c] = w.C.c.petrol[c]! - n;
  else w.C.c.muhimmat[c] = w.C.c.muhimmat[c]! - n;
}
export function malEkle(w: World, c: number, m: number, n: number): void {
  if (m === MALI.gida) {
    const e = w.pkg.bolgeler[w.pkg.ulkeler[c]!.baskent]!.eyalet;
    w.E.c.gida[e] = w.E.c.gida[e]! + n;
  } else if (m === MALI.celik) w.C.c.celik[c] = w.C.c.celik[c]! + n;
  else if (m === MALI.komur) w.C.c.komur[c] = w.C.c.komur[c]! + n;
  else if (m === MALI.petrol) w.C.c.petrol[c] = w.C.c.petrol[c]! + n;
  else w.C.c.muhimmat[c] = w.C.c.muhimmat[c]! + n;
}

/** Ülke içi eyaletler arası gıda dengeleme talebi üretir (lojistik fazına girdi). */
export function eyaletDengeTalepleri(w: World): { c: number; kaynakE: number; hedefE: number; miktar: number }[] {
  const out: { c: number; kaynakE: number; hedefE: number; miktar: number }[] = [];
  const grup: number[][] = Array.from({ length: w.nC }, () => []);
  for (let e = 0; e < w.nE; e++) { const c = eyaletUlke(w, e); if (w.R.c.kontrolEden[w.depo[e]!] === c) grup[c]!.push(e); }
  for (let c = 0; c < w.nC; c++) {
    const eys = grup[c]!;
    if (eys.length < 2) continue;
    const gun = (i: number) => (w.E.c.ihtiyacDun[i]! <= 0 ? 999 : Math.floor(w.E.c.gida[i]! / w.E.c.ihtiyacDun[i]!));
    const fakir = eys.filter((i) => gun(i) < 20).sort((a, b) => gun(a) - gun(b) || a - b);
    const zengin = eys.filter((i) => gun(i) > 45).sort((a, b) => gun(b) - gun(a) || a - b);
    for (const h of fakir) {
      const z = zengin[0];
      if (z === undefined) break;
      const fazla = w.E.c.gida[z]! - w.E.c.ihtiyacDun[z]! * 45;
      const acik = w.E.c.ihtiyacDun[h]! * 30 - w.E.c.gida[h]!;
      const m = Math.min(fazla, acik, w.E.c.ihtiyacDun[h]! * 5);
      if (m > 0) out.push({ c, kaynakE: z, hedefE: h, miktar: m });
    }
  }
  void dostBolge; void rota; void ASKERLIK;
  return out;
}
