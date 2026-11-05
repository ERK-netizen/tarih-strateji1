// Bölüm 9 ve 17: kontrol, işgal itaati, bütünleşme, huzur, meşruiyet, PG, yorgunluk, savaşa destek.
import type { World } from '../state/world.ts';
import { YONETIM, ISGAL, EKONOMI, NTEK, tekIdx } from '../catalog.ts';
import { S, mulDiv, clamp, approach } from '../num/index.ts';
import { rng, AMAC, bernoulli } from '../rng/index.ts';
import { yonetimMesafeleri, savastaMi, uc, anlat, bildir, birlikIstat } from './ortak.ts';
import { ulkeGidaGuvence, butceEtki } from './ekonomi.ts';

export interface Bilesen { ad: string; deger: number }

// ---------- Kontrol (9.2) ----------
export function kontrolHedefi(w: World, r: number, mesafe?: number): { hedef: number; bilesen: Bilesen[] } {
  const R = w.R.c;
  const c = R.sahip[r]!;
  const m = mesafe ?? R.mesafe[r]!;
  const anaYurt = w.pkg.bolgeler[r]!.anaYurt.includes(c) ? 1 : 0;
  const b: Bilesen[] = [{ ad: 'Taban', deger: 100_000 }];
  const uzak = -1500 * Math.max(0, m - 10);
  b.push({ ad: `Yönetim mesafesi (${m} gün)`, deger: uzak });
  if (anaYurt) b.push({ ad: 'Ana yurt', deger: 10_000 });
  if (R.valilik[r]) b.push({ ad: 'Valilik', deger: 15_000 });
  if (R.isyan[r]) b.push({ ad: 'Örgütlü isyan', deger: -20_000 });
  const a = kapasiteAsimi(w, c);
  if (a > 0) b.push({ ad: 'Yönetim kapasitesi aşımı', deger: -Math.min(20_000, mulDiv(15_000, a, S).q) });
  const top = b.reduce((s, x) => s + x.deger, 0);
  return { hedef: clamp(top, 10_000, 100_000), bilesen: b };
}

export function kontrolErisim(w: World, r: number): number {
  return mulDiv(w.R.c.kontrol[r]!, S, 100_000).q;
}

// ---------- Yönetim kapasitesi (17.2) ----------
export function yonetimKapasitesi(w: World, c: number): { kapasite: number; kullanim: number } {
  const y = YONETIM[w.pkg.ulkeler[c]!.yonetim]!;
  const tekIdare = w.tekBitti[c * NTEK + tekIdx('idare')] ? 10_000 : 0;
  const kapasite = 30_000 + mulDiv(y.idari, 50_000, S).q + tekIdare; // puan ×1000
  let kullanim = 0;
  for (let r = 0; r < w.nR; r++) {
    const s = w.R.c.sahip[r]!, k = w.R.c.kontrolEden[r]!;
    const ana = w.pkg.bolgeler[r]!.anaYurt.includes(s);
    if (s === c && k === c) kullanim += ana ? 1000 : 2000;
    else if (s === c && k !== c) kullanim += 500;
    else if (s !== c && k === c) kullanim += 1500;
  }
  return { kapasite, kullanim };
}
/** Bütün ülkelerin kapasite aşımı tek geçişte (maliye için). */
export function kapasiteAsimiHepsi(w: World): number[] {
  const kul = new Array<number>(w.nC).fill(0);
  for (let r = 0; r < w.nR; r++) {
    const s = w.R.c.sahip[r]!, k = w.R.c.kontrolEden[r]!;
    const ana = w.pkg.bolgeler[r]!.anaYurt.includes(s);
    if (s === k) kul[s]! += ana ? 1000 : 2000;
    else { kul[s]! += 500; kul[k]! += 1500; }
  }
  return kul.map((kullanim, c) => {
    const y = YONETIM[w.pkg.ulkeler[c]!.yonetim]!;
    const tekIdare = w.tekBitti[c * NTEK + tekIdx('idare')] ? 10_000 : 0;
    const kapasite = 30_000 + mulDiv(y.idari, 50_000, S).q + tekIdare;
    return Math.max(0, mulDiv(kullanim, S, Math.max(1, kapasite)).q - S);
  });
}
export function kapasiteAsimi(w: World, c: number): number {
  const { kapasite, kullanim } = yonetimKapasitesi(w, c);
  return Math.max(0, mulDiv(kullanim, S, Math.max(1, kapasite)).q - S);
}

// ---------- İşgal itaati (9.3) ----------
export function kulturYakinlik(w: World, r: number, c: number): number {
  const U = w.pkg.ulkeler[c]!;
  const anahtar = w.pkg.bolgeler[r]!.kimlikAnahtar;
  let top = 0, kul = 0;
  for (let k = 0; k < anahtar.length; k++) {
    const ku = anahtar[k]![0];
    const n = w.kim[r * 7 + k]!;
    top += n;
    if (ku < 0) continue;
    if (ku === U.kultur) kul += n;
    else if (w.pkg.kultur[ku]!.grup === w.pkg.kultur[U.kultur]!.grup) kul += Math.floor(n / 2);
  }
  if (top <= 0) return 0;
  return mulDiv(kul, S, top).q;
}
export function inancYakinlik(w: World, r: number, c: number): number {
  const U = w.pkg.ulkeler[c]!;
  const anahtar = w.pkg.bolgeler[r]!.kimlikAnahtar;
  let top = 0, inn = 0;
  for (let k = 0; k < anahtar.length; k++) {
    const n = w.kim[r * 7 + k]!;
    top += n;
    if (anahtar[k]![1] === U.inanc) inn += n;
  }
  return top <= 0 ? 0 : mulDiv(inn, S, top).q;
}

export function baslangicItaat(w: World, r: number, isgalci: number): number {
  const sahip = w.R.c.sahip[r]!;
  const kul = kulturYakinlik(w, r, isgalci), inn = inancYakinlik(w, r, isgalci);
  const g = w.gorus[sahip * w.nC + isgalci]!;
  const v = 5000 + mulDiv(25_000, kul, S).q + mulDiv(15_000, inn, S).q + Math.floor((g - 50_000) / 5);
  return clamp(v, 0, 40_000);
}

function garnizonKapsama(w: World, r: number): number {
  const U = uc(w);
  const c = w.R.c.kontrolEden[r]!;
  let g = 0;
  for (const u of w.U.rows()) if (U.ulke![u] === c && U.bolge![u] === r) g += U.kisi![u]!;
  const ihtiyac = 3000; // bölge başına garnizon ihtiyacı (kişi)
  const pol = ISGAL[w.C.c.isgalPol[c]!]!;
  return clamp(mulDiv(g, S, Math.max(1, mulDiv(ihtiyac, pol.garnizon, S).q)).q, 0, S);
}

/** Aylık kontrol, itaat, direniş, bütünleşme, ana yurt. */
export function aylikKontrol(w: World): void {
  const R = w.R.c;
  const mesafe: number[][] = [];
  for (let c = 0; c < w.nC; c++) mesafe.push(yonetimMesafeleri(w, c));
  for (let r = 0; r < w.nR; r++) {
    const s = R.sahip[r]!, k = R.kontrolEden[r]!;
    R.mesafe[r] = mesafe[s]![r]!;
    if (s === k) {
      const { hedef } = kontrolHedefi(w, r);
      R.kontrol[r] = approach(R.kontrol[r]!, hedef, 3000, 10_000);
      R.isgalGun[r] = 0;
      // bütünleşme hedefe aylık 0,1
      const hedefB = mulDiv(60_000, kulturYakinlik(w, r, s), S).q + Math.floor(w.C.c.egitim[s]! / 10);
      R.butunlesme[r] = approach(R.butunlesme[r]!, Math.min(100_000, hedefB), 100, 100);
      // ana yurt: 25 yıl kesintisiz + bütünleşme ≥ 50
      R.anaYurtGun[r] = R.anaYurtGun[r]! + 30;
    } else {
      const pol = ISGAL[w.C.c.isgalPol[k]!]!;
      const gk = garnizonKapsama(w, r);
      const hedefI = Math.min(100_000, pol.hedef + mulDiv(15_000, gk, S).q);
      R.itaat[r] = approach(R.itaat[r]!, hedefI, pol.hiz, pol.hiz);
      let hedefD = pol.direnis - mulDiv(20_000, gk, S).q;
      if (w.C.c.isgalPol[k] === 2 && R.isgalGun[r]! < 90) hedefD -= 15_000;
      R.direnis[r] = approach(R.direnis[r]!, clamp(hedefD, 0, 100_000), 5000, 5000);
      R.isgalGun[r] = R.isgalGun[r]! + 30;
      if (R.direnis[r]! > 60_000) {
        const u = rng(w.tohum, w.gun, 9, r, 0, AMAC.sabotage, 0, 0);
        if (bernoulli(u, 200_000)) {
          R.hasar[r] = Math.min(500_000, R.hasar[r]! + 100_000);
          anlat(w, `${w.pkg.bolgeler[r]!.ad}'da direnişçiler demiryolu ve fabrikalara sabotaj düzenledi.`, 'isgal', k, 1);
          w.rotaEpoch++;
        }
      }
    }
    // hasar onarımı: aylık %5
    if (R.hasar[r]! > 0) R.hasar[r] = Math.max(0, R.hasar[r]! - 50_000);
  }
}

// ---------- Siyaset (17.1–17.3) ----------
export function huzurHedefi(w: World, c: number): { hedef: number; bilesen: Bilesen[] } {
  const C = w.C.c;
  const y = YONETIM[w.pkg.ulkeler[c]!.yonetim]!;
  const b: Bilesen[] = [{ ad: `Yönetim tabanı (${y.ad})`, deger: y.huzur }];
  const g = ulkeGidaGuvence(w, c);
  let gida = 0;
  if (g >= S) gida = 2000; else if (g >= 800_000) gida = 0; else if (g >= 600_000) gida = -5000; else if (g >= 400_000) gida = -15_000; else gida = -25_000;
  b.push({ ad: 'Gıda güvencesi', deger: gida });
  const yasam = yasamDuzeyi(w, c);
  b.push({ ad: 'Yaşam düzeyi', deger: Math.floor((yasam - 50_000) / 10) });
  const vergi = C.vergi[c]!;
  if (vergi > 200_000) b.push({ ad: 'Yüksek vergi', deger: -mulDiv(vergi - 200_000, 40_000, S).q });
  const sosyal = mulDiv(butceEtki(w, c, 3), 8000, S).q;
  if (sosyal) b.push({ ad: 'Sosyal harcama', deger: sosyal });
  b.push({ ad: 'Savaş yorgunluğu', deger: -Math.floor(C.yorgunluk[c]! / 10) });
  b.push({ ad: 'Meşruiyet', deger: Math.floor((C.mesru[c]! - 50_000) / 10) });
  const law = EKONOMI[C.ekonomi[c]!]!;
  if (law.huzur) b.push({ ad: `Ekonomi yasası (${law.ad})`, deger: law.huzur });
  if (C.karne[c]) b.push({ ad: 'Karne', deger: -5000 });
  const a = kapasiteAsimi(w, c);
  if (a > 0) b.push({ ad: 'Yönetim kapasitesi aşımı', deger: -Math.min(30_000, mulDiv(20_000, a, S).q) });
  // işgal yükü: kendi ana yurdunun işgal altındaki payı
  let ana = 0, isgal = 0;
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== c) continue;
    const n = w.pop[r * 32]! + w.pop[r * 32 + 8]!;
    ana += n;
    if (w.R.c.kontrolEden[r] !== c) isgal += n;
  }
  if (isgal > 0) b.push({ ad: 'Topraklarımızın işgali', deger: -mulDiv(20_000, isgal, Math.max(1, ana)).q });
  if (C.yasakGun[c]! > w.gun) b.push({ ad: 'Olay etkisi', deger: -8000 });
  const top = b.reduce((s, x) => s + x.deger, 0);
  return { hedef: clamp(top, 0, 100_000), bilesen: b };
}

export function yasamDuzeyi(w: World, c: number): number {
  const g = Math.min(S, ulkeGidaGuvence(w, c));
  const t = Math.min(S, w.C.c.tuketimYet[c]!);
  let L = 0, issiz = 0;
  for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) { L += w.R.c.isGucu[r]!; issiz += w.R.c.issiz[r]!; }
  const isOran = L > 0 ? S - mulDiv(issiz, S, L).q : S;
  const sosyal = butceEtki(w, c, 3);
  const v = mulDiv(450_000, g, S).q + mulDiv(350_000, t, S).q + mulDiv(150_000, isOran, S).q + mulDiv(50_000, sosyal, S).q;
  return clamp(Math.floor(v / 10), 0, 100_000);
}

export function mesruHedefi(w: World, c: number): { hedef: number; bilesen: Bilesen[] } {
  const C = w.C.c;
  const y = YONETIM[w.pkg.ulkeler[c]!.yonetim]!;
  const b: Bilesen[] = [{ ad: 'Yönetim tabanı', deger: y.mesru }, { ad: 'Düzenli yönetim', deger: 5000 }];
  b.push({ ad: 'Huzur', deger: Math.floor((C.huzur[c]! - 50_000) / 5) });
  if (C.zafer[c]) b.push({ ad: 'Zafer/yenilgi', deger: C.zafer[c]! });
  if (C.temerrut[c]! > w.gun) b.push({ ad: 'Temerrüt', deger: -10_000 });
  const top = b.reduce((s, x) => s + x.deger, 0);
  return { hedef: clamp(top, 0, 100_000), bilesen: b };
}

export function destekHedefi(w: World, c: number): { hedef: number; bilesen: Bilesen[] } {
  const C = w.C.c;
  const y = YONETIM[w.pkg.ulkeler[c]!.yonetim]!;
  const b: Bilesen[] = [{ ad: 'Yönetim tabanı', deger: y.destek }, { ad: 'Yorgunluk', deger: -Math.floor(C.yorgunluk[c]! / 2) }];
  if (C.saldiriyaUgradi[c]! > 0) b.push({ ad: 'Saldırıya uğradık', deger: C.saldiriyaUgradi[c]! });
  if (C.zafer[c]) b.push({ ad: 'Zafer/propaganda', deger: Math.floor(C.zafer[c]! / 2) });
  if (C.propaganda[c]) b.push({ ad: 'Kitle basını', deger: C.propaganda[c]! });
  const top = b.reduce((s, x) => s + x.deger, 0);
  return { hedef: clamp(top, 0, 100_000), bilesen: b };
}

export function pgGeliri(w: World, c: number): { gelir: number; bilesen: Bilesen[] } {
  const C = w.C.c;
  const y = YONETIM[w.pkg.ulkeler[c]!.yonetim]!;
  const mesruC = 800_000 + mulDiv(400_000, C.mesru[c]!, 100_000).q;
  let huzurC = S;
  if (C.huzur[c]! < 60_000 && C.huzur[c]! >= 40_000) huzurC = 750_000;
  else if (C.huzur[c]! < 40_000) huzurC = 600_000;
  const a = kapasiteAsimi(w, c);
  const kapC = Math.max(100_000, S - Math.min(900_000, mulDiv(900_000, a, S).q));
  let g = mulDiv(y.pg, mesruC, S).q;
  g = mulDiv(g, huzurC, S).q; g = mulDiv(g, kapC, S).q;
  return { gelir: g, bilesen: [{ ad: 'Taban', deger: y.pg }, { ad: 'Meşruiyet çarpanı', deger: mesruC }, { ad: 'Huzur çarpanı', deger: huzurC }, { ad: 'Kapasite çarpanı', deger: kapC }] };
}

export function aylikSiyaset(w: World): void {
  const C = w.C.c;
  for (let c = 0; c < w.nC; c++) {
    // yorgunluk (17.3): o ayın askerî ölüsü + kalıcı sakat
    let nufus = 0;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) for (let k = 0; k < 32; k++) nufus += w.pop[r * 32 + k]!;
    let ana = 0, isgal = 0;
    for (let r = 0; r < w.nR; r++) {
      if (w.R.c.sahip[r] !== c || !w.pkg.bolgeler[r]!.anaYurt.includes(c)) continue;
      let n = 0; for (let k = 0; k < 32; k++) n += w.pop[r * 32 + k]!;
      ana += n; if (w.R.c.kontrolEden[r] !== c) isgal += n;
    }
    const savasta = savastaMi(w, c);
    let d = savasta ? 500 : -5000;
    d += mulDiv(2_000_000, C.olumAy[c]! + C.sakatAy[c]!, Math.max(1, nufus)).q;
    d += mulDiv(10_000, isgal, Math.max(1, ana)).q;
    C.yorgunluk[c] = clamp(C.yorgunluk[c]! + d, 0, 100_000);
    C.olu[c] = C.olu[c]! + C.olumAy[c]!;
    C.olumAy[c] = 0; C.sakatAy[c] = 0;
    // saldırıya uğrama etkisi 12 ayda söner
    if (C.saldiriyaUgradi[c]! > 0) C.saldiriyaUgradi[c] = Math.max(0, C.saldiriyaUgradi[c]! - 1667);
    if (C.zafer[c]! > 0) C.zafer[c] = Math.max(0, C.zafer[c]! - 417); else if (C.zafer[c]! < 0) C.zafer[c] = Math.min(0, C.zafer[c]! + 417);
    C.huzur[c] = approach(C.huzur[c]!, huzurHedefi(w, c).hedef, 3000, 3000);
    C.mesru[c] = approach(C.mesru[c]!, mesruHedefi(w, c).hedef, 3000, 3000);
    C.destek[c] = approach(C.destek[c]!, destekHedefi(w, c).hedef, 5000, 5000);
    C.pg[c] = Math.min(500_000, Math.max(0, C.pg[c]! + pgGeliri(w, c).gelir));
    // ün yıllık %20 söner (aylık ~%1,84)
    C.un[c] = C.un[c]! - mulDiv(C.un[c]!, 18_400, S).q;
    // güvenilirlik 50'ye yılda en çok 5 (aylık 0,4167)
    C.guvenilir[c] = approach(C.guvenilir[c]!, 50_000, 417, 417);
    huzurEtkileri(w, c);
  }
}

function huzurEtkileri(w: World, c: number): void {
  const h = w.C.c.huzur[c]!;
  const ad = w.pkg.ulkeler[c]!.kisa;
  if (h < 25_000) {
    // örgütlü isyan: en düşük kontrollü bölgede
    let r0 = -1;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.kontrolEden[r] === c && !w.R.c.isyan[r] && (r0 < 0 || w.R.c.kontrol[r]! < w.R.c.kontrol[r0]!)) r0 = r;
    if (r0 >= 0) {
      w.R.c.isyan[r0] = 1;
      anlat(w, `${ad}: ${w.pkg.bolgeler[r0]!.ad}'da örgütlü isyan başladı; vergi ve asker toplama aksıyor.`, 'ic', c, 3);
      bildir(w, 'isyan', `${w.pkg.bolgeler[r0]!.ad}'da isyan`, c, true);
    }
  } else if (h > 40_000) {
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.isyan[r]) { w.R.c.isyan[r] = 0; anlat(w, `${w.pkg.bolgeler[r]!.ad}'da isyan yatıştı.`, 'ic', c, 1); }
  }
}

/** Ülke gücü özeti (ekranlar ve karar modülü). */
export function orduGucu(w: World, c: number): { ys: number; sv: number; kisi: number; tumen: number } {
  const U = uc(w);
  let ys = 0, sv = 0, kisi = 0, tumen = 0;
  for (const u of w.U.rows()) {
    if (U.ulke![u] !== c) continue;
    const s = birlikIstat(w, u);
    ys += s.YS; sv += s.SV; kisi += U.kisi![u]!; tumen++;
  }
  return { ys, sv, kisi, tumen };
}
