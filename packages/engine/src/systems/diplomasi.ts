// Bölüm 18: yönlü görüş, anlaşmalar, gerekçe, savaş, koalisyon çağrısı, savaş skoru, müzakere ve barış.
import type { World } from '../state/world.ts';
import { A, cc, hc, SV_MAX } from '../state/world.ts';
import { NHUCRE, YONETIM, K, ST, YB, EKIPMAN } from '../catalog.ts';
import { S, mulDiv, clamp, approach } from '../num/index.ts';
import { savasta, savastaMi, anlasmaVar, uc, gorus, anlat, bildir, birlikIstat, tarafi, tarafYaz, savasUyeleri, savasDegisti, anlasmaEklendi, anlasmaSilindi, iddiaEkle, iddiaSil, pasif } from './ortak.ts';
import { esirIade } from './nufus.ts';
import { insanGucu } from './nufus.ts';
import { trEkK, trKucuk } from '../tr.ts';

export const TK = { ticaret: 0, saldirmazlik: 1, gecis: 2, garanti: 3, ittifak: 4, baris: 10, cagri: 11, ekipman: 14 } as const;
export const TK_AD: Record<number, string> = { 0: 'Ticaret anlaşması', 1: 'Saldırmazlık paktı', 2: 'Askerî geçiş hakkı', 3: 'Bağımsızlık garantisi', 4: 'İttifak', 10: 'Barış', 11: 'Savaşa katılım çağrısı', 14: 'Ekipman satışı' };
export const ESIK: Record<number, number> = { 0: 20_000, 1: 40_000, 2: 60_000, 3: 60_000, 4: 80_000, 14: 60_000 };
export const BARIS_TUR = ['Beyaz barış', 'Tavizli barış', 'Teslim'] as const;

export function gorusDegis(w: World, a: number, b: number, d: number): void {
  const i = cc(w, a, b);
  w.gorus[i] = clamp(w.gorus[i]! + d, 0, 100_000);
}

// ---------- Teklif ----------
export function teklifEkle(w: World, kimden: number, kime: number, tur: number, p1 = 0, p2 = 0, bolgeler: number[] = []): number {
  // aynı teklif 30 gün içinde yinelenmez
  for (const s of w.TK.rows()) {
    const T = w.TK.c;
    // reddedilen teklif 180 gün, bekleyen teklif yanıtlanana dek yinelenmez
    if (T.kimden[s] === kimden && T.kime[s] === kime && T.tur[s] === tur && T.durum[s] === 2 && w.gun - T.gun[s]! < 180 && tur !== 10) return -1;
    if (T.kimden[s] === kimden && T.kime[s] === kime && T.tur[s] === tur && T.durum[s] === 0) return -1;
  }
  const s = w.TK.alloc();
  const T = w.TK.c;
  T.kimden[s] = kimden; T.kime[s] = kime; T.tur[s] = tur; T.p1[s] = p1; T.p2[s] = p2; T.gun[s] = w.gun; T.durum[s] = 0;
  const rs = [...new Set(bolgeler)].filter((r) => r >= 0 && r < w.nR).sort((x, y) => x - y);
  if (rs.length) w.teklifBolge[String(s)] = rs; else delete w.teklifBolge[String(s)];
  if (kime === w.oyuncu) bildir(w, 'teklif', `${w.pkg.ulkeler[kimden]!.kisa}: ${TK_AD[tur]} teklifi`, kime, tur === TK.cagri || tur === TK.baris);
  return s;
}

/** Teklifteki bölge listesi (barış teklifleri için). */
export function teklifBolgeleri(w: World, s: number): number[] { return w.teklifBolge[String(s)] ?? []; }

export function anlasmaKur(w: World, tur: number, a: number, b: number, bitis = -1, miktar = 0): void {
  if (anlasmaVar(w, tur, a, b) >= 0 && tur !== A.tazminat) return;
  const s = w.AN.alloc();
  w.AN.c.tur[s] = tur; w.AN.c.a[s] = a; w.AN.c.b[s] = b; w.AN.c.baslangic[s] = w.gun; w.AN.c.bitis[s] = bitis; w.AN.c.miktar[s] = miktar;
  anlasmaEklendi(w, s);
}
export function anlasmaSil(w: World, s: number): void { const t = w.AN.c.tur[s]!; w.AN.release(s); anlasmaSilindi(w, t); }
export function anlasmaBoz(w: World, tur: number, a: number, b: number, ihlal: boolean): void {
  const s = anlasmaVar(w, tur, a, b);
  if (s < 0) return;
  anlasmaSil(w, s);
  if (ihlal) {
    const ceza = tur === A.ittifak ? 40_000 : 20_000;
    w.C.c.guvenilir[a] = Math.max(0, w.C.c.guvenilir[a]! - ceza);
  }
}

// ---------- Gerekçe ve savaş ----------
export function gerekceVar(w: World, a: number, b: number): boolean {
  for (const s of w.GR.rows()) if (w.GR.c.ulke[s] === a && w.GR.c.hedef[s] === b && w.GR.c.hazir[s]) return true;
  return false;
}
export function gerekceSurecte(w: World, a: number, b: number): number {
  for (const s of w.GR.rows()) if (w.GR.c.ulke[s] === a && w.GR.c.hedef[s] === b) return s;
  return -1;
}
export function gerekceBaslat(w: World, a: number, b: number, sure: number = K.gerekceGun): void {
  const s = w.GR.alloc();
  w.GR.c.ulke[s] = a; w.GR.c.hedef[s] = b; w.GR.c.bitis[s] = w.gun + sure; w.GR.c.hazir[s] = sure === 0 ? 1 : 0;
  gorusDegis(w, b, a, -10_000);
  w.C.c.gerginlik[a] = w.C.c.gerginlik[a]! + 3000;
  anlat(w, `${w.pkg.ulkeler[a]!.ad}, ${trEkK(w.pkg.ulkeler[b]!.kisa, 'e')} karşı savaş gerekçesi hazırlamaya başladı.`, 'diplomasi', a, 2);
  if (b === w.oyuncu) bildir(w, 'gerekce', `${w.pkg.ulkeler[a]!.kisa} size karşı gerekçe hazırlıyor`, b, true);
  if (a === w.oyuncu && sure === 0) bildir(w, 'gerekce', `${trEkK(w.pkg.ulkeler[b]!.kisa, 'e')} karşı savaş gerekçesi hazır`, a, true);
}
export function gerekceGunu(w: World): void {
  for (const s of w.GR.list()) {
    if (!w.GR.c.hazir[s] && w.GR.c.bitis[s]! <= w.gun) {
      w.GR.c.hazir[s] = 1;
      const a = w.GR.c.ulke[s]!, b = w.GR.c.hedef[s]!;
      if (a === w.oyuncu) bildir(w, 'gerekce', `${trEkK(w.pkg.ulkeler[b]!.kisa, 'e')} karşı gerekçe hazır`, a, true);
    }
    // 1 yıl kullanılmayan gerekçe düşer
    if (w.GR.c.hazir[s] && w.gun - w.GR.c.bitis[s]! > 365) w.GR.release(s);
  }
}

/** Savaş kaydını kapatır ve taraf satırını temizler. */
export function savasKapat(w: World, s: number): void {
  w.savasTaraf.fill(0, s * w.nC, (s + 1) * w.nC);
  w.SV.release(s);
  savasDegisti(w);
}

export function savasIlan(w: World, a: number, b: number, cagri = true): number {
  if (savasta(w, a, b) || a === b) return -1;
  if (w.SV.count() >= SV_MAX) return -1;
  const gerekceli = gerekceVar(w, a, b);
  // saldırmazlık/ticaret/garanti bozulur
  anlasmaBoz(w, A.saldirmazlik, a, b, true);
  anlasmaBoz(w, A.ticaret, a, b, false);
  anlasmaBoz(w, A.gecis, b, a, false);
  anlasmaBoz(w, A.gecis, a, b, false);
  anlasmaBoz(w, A.ittifak, a, b, true);
  const s = w.SV.alloc();
  if (s >= SV_MAX) { w.SV.release(s); return -1; }
  const SV = w.SV.c;
  SV.saldiran[s] = a; SV.savunan[s] = b; SV.baslangic[s] = w.gun; SV.gerekceli[s] = gerekceli ? 1 : 0;
  w.savasTaraf.fill(0, s * w.nC, (s + 1) * w.nC);
  tarafYaz(w, s, a, 1); tarafYaz(w, s, b, 2);
  const C = w.C.c;
  if (!gerekceli) {
    C.huzur[a] = Math.max(0, C.huzur[a]! - 10_000);
    C.destek[a] = Math.max(0, C.destek[a]! - 15_000);
    C.un[a] = Math.min(100_000, C.un[a]! + 20_000);
  }
  for (const g of w.GR.list()) if (w.GR.c.ulke[g] === a && w.GR.c.hedef[g] === b) w.GR.release(g);
  C.saldiriyaUgradi[b] = 20_000;
  gorusDegis(w, b, a, -30_000);
  for (let c = 0; c < w.nC; c++) if (c !== a && c !== b) gorusDegis(w, c, a, gerekceli ? -5000 : -15_000);
  anlat(w, `${w.pkg.ulkeler[a]!.ad}, ${trEkK(w.pkg.ulkeler[b]!.ad, 'e')} savaş ilan etti${gerekceli ? '' : ' — hiçbir gerekçe gösterilmeden'}.`, 'savas', a, 3);
  bildir(w, 'savas', `${w.pkg.ulkeler[a]!.kisa} → ${w.pkg.ulkeler[b]!.kisa}: savaş ilanı`, w.oyuncu, true);
  if (cagri) {
    cagriGonder(w, s, b, 1);
    cagriGonder(w, s, a, 0);
  }
  return s;
}

/** c'nin müttefiklerine ve (savunan taraftaysa) garantörlerine katılım çağrısı. taraf: 0 saldıran tarafı, 1 savunan tarafı. */
export function cagriGonder(w: World, s: number, c: number, taraf: number): void {
  for (let d = 0; d < w.nC; d++) {
    if (d === c || tarafi(w, s, d) !== 0 || pasif(w, d)) continue;
    const ittifak = anlasmaVar(w, A.ittifak, c, d) >= 0;
    const garanti = taraf === 1 && anlasmaVar(w, A.garanti, d, c) >= 0;
    if (ittifak || garanti) teklifEkle(w, c, d, TK.cagri, s, taraf);
  }
}

export function savasaKatil(w: World, savas: number, c: number, taraf: number): void {
  if (tarafi(w, savas, c) !== 0) return;
  const SV = w.SV.c;
  const benim = taraf === 0 ? 1 : 2;
  const karsi = savasUyeleri(w, savas, benim === 1 ? 2 : 1);
  // aynı anda karşı tarafla başka bir savaşta da olmamalı: yine de taraf yazılır
  tarafYaz(w, savas, c, benim);
  for (const d of karsi) { anlasmaBoz(w, A.ticaret, c, d, false); anlasmaBoz(w, A.saldirmazlik, c, d, true); anlasmaBoz(w, A.ittifak, c, d, true); gorusDegis(w, d, c, -20_000); }
  const lider = taraf === 0 ? SV.saldiran[savas]! : SV.savunan[savas]!;
  anlat(w, `${w.pkg.ulkeler[c]!.ad}, ${trEkK(w.pkg.ulkeler[lider]!.kisa, 'in')} yanında savaşa girdi.`, 'savas', c, 3);
  bildir(w, 'savas', `${w.pkg.ulkeler[c]!.kisa} savaşa girdi`, w.oyuncu, true);
  // zincirleme çağrı: katılanın müttefikleri de çağrılır
  cagriGonder(w, savas, c, taraf);
}

// ---------- Savaş skoru (18.4) ----------
export function bolgeDegeri(w: World, r: number): number {
  let n = 0;
  for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!;
  let v = Math.floor(n / 10_000) + (w.R.c.sivilF[r]! + w.R.c.askeriF[r]!) * 5;
  if (w.pkg.ulkeler.some((u) => u.baskent === r)) v += 30;
  return Math.max(1, v);
}

export function savasSkoru(w: World, a: number, b: number): number {
  // a'nın b'ye karşı skoru (−100…100, ×1000)
  let aDeger = 0, aKayip = 0, bDeger = 0, bKayip = 0;
  for (let r = 0; r < w.nR; r++) {
    const s = w.R.c.sahip[r]!, k = w.R.c.kontrolEden[r]!;
    const v = bolgeDegeri(w, r);
    if (s === a) { aDeger += v; if (k === b) aKayip += v; }
    if (s === b) { bDeger += v; if (k === a) bKayip += v; }
  }
  const hedefFark = mulDiv(bKayip, S, Math.max(1, bDeger)).q - mulDiv(aKayip, S, Math.max(1, aDeger)).q;
  const ba = w.pkg.ulkeler[a]!.baskent, bb = w.pkg.ulkeler[b]!.baskent;
  const baskentFark = (w.R.c.kontrolEden[bb] === a ? S : 0) - (w.R.c.kontrolEden[ba] === b ? S : 0);
  const yorg = mulDiv(w.C.c.yorgunluk[b]! - w.C.c.yorgunluk[a]!, S, 100_000).q;
  const ka = w.C.c.olu[a]! + w.C.c.olumAy[a]!, kb = w.C.c.olu[b]! + w.C.c.olumAy[b]!;
  const kayip = mulDiv(kb - ka, S, ka + kb + 1).q;
  const s = mulDiv(45_000, hedefFark, S).q + mulDiv(25_000, baskentFark, S).q + mulDiv(10_000, yorg, S).q + mulDiv(20_000, kayip, S).q;
  return clamp(s, -100_000, 100_000);
}

/** Müzakere istekliliği W (18.5), S ölçekli. c: kabul eden. */
export function istekliligi(w: World, c: number, karsi: number): number {
  const Sk = savasSkoru(w, c, karsi);
  const C = w.C.c;
  let savasAy = 0;
  let umut = 0;
  for (const s of w.SV.rows()) {
    const t = tarafi(w, s, c);
    if (t === 0) continue;
    savasAy = Math.max(savasAy, Math.floor((w.gun - w.SV.c.baslangic[s]!) / 30));
    // müttefik umudu: aynı tarafta savaşan başka ülke var mı
    if (savasUyeleri(w, s, t).length > 1) umut = S;
  }
  const v = mulDiv(450_000, Math.max(0, -Sk), 100_000).q
    + mulDiv(200_000, S - mulDiv(C.destek[c]!, S, 100_000).q, S).q
    + mulDiv(200_000, C.yorgunluk[c]!, 100_000).q
    + mulDiv(50_000, Math.min(S, mulDiv(savasAy, S, 36).q), S).q
    - mulDiv(200_000, umut, S).q;
  return clamp(v, 0, S);
}

export function tavizButcesi(w: World, kaybeden: number, kazanan: number): number {
  let V = 0;
  for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === kaybeden) V += bolgeDegeri(w, r);
  const Sk = savasSkoru(w, kaybeden, kazanan);
  const W = istekliligi(w, kaybeden, kazanan);
  const oran = clamp(mulDiv(750_000, Math.max(0, -Sk), 100_000).q + mulDiv(250_000, W, S).q, 0, S);
  return mulDiv(V, oran, S).q;
}


/** Teslim koşulu (18.5): başkent kaybı + ana yurt değerinin yarısı + organize savunmanın %20 altı. */
export function teslimKosulu(w: World, c: number): boolean {
  const bas = w.pkg.ulkeler[c]!.baskent;
  const baskentDustu = w.R.c.kontrolEden[bas] !== c;
  let top = 0, kayip = 0;
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== c || !w.pkg.bolgeler[r]!.anaYurt.includes(c)) continue;
    const v = bolgeDegeri(w, r); top += v; if (w.R.c.kontrolEden[r] !== c) kayip += v;
  }
  // ana yurdun dörtte üçü düştüyse başkent elde olsa da direniş biter
  if (top > 0 && kayip * 4 >= top * 3) return true;
  if (!baskentDustu) return false;
  // başkent düştü ve halk savaştan bıktı: iç çöküş
  if (w.C.c.huzur[c]! < 20_000 && w.C.c.yorgunluk[c]! > 60_000) return true;
  if (kayip * 2 < top) return false;
  const U = uc(w);
  let ordu = 0;
  for (const u of w.U.rows()) if (U.ulke![u] === c) ordu += U.kisi![u]!;
  return ordu < 20_000;
}

/** Barış teklifi kabul edilir mi? (karşı taraf: kabul eden). */
export function barisKabul(w: World, kabulEden: number, oneren: number, tur: number, istenen: number[]): { kabul: boolean; neden: string } {
  if (!savasta(w, kabulEden, oneren)) return { kabul: false, neden: 'Savaşta değilsiniz.' };
  // savaşın ilk aylarında taraflar kolay barışmaz (teslim hariç)
  let sure = 0;
  for (const s of w.SV.rows()) { const ta = tarafi(w, s, kabulEden), tb = tarafi(w, s, oneren); if (ta && tb && ta !== tb) sure = Math.max(sure, w.gun - w.SV.c.baslangic[s]!); }
  if (tur !== 2 && sure < (tur === 0 ? 90 : 150) && !teslimKosulu(w, kabulEden)) return { kabul: false, neden: `Savaş yeni başladı (${sure} gün); ${tur === 0 ? '90' : '150'} günden önce ${tur === 0 ? 'beyaz' : 'tavizli'} barış kabul edilmez.` };
  const W = istekliligi(w, kabulEden, oneren);
  const istek = istenen.filter((r) => w.R.c.sahip[r] === kabulEden).reduce((s, r) => s + bolgeDegeri(w, r), 0);
  if (tur === 0) {
    // beyaz barış: W ≥ 0,15 veya kabul edenin skoru negatif değil ve öneren de yorgun
    const skor = savasSkoru(w, kabulEden, oneren);
    if (W >= 150_000 || (skor <= 10_000 && w.C.c.yorgunluk[kabulEden]! > 30_000)) return { kabul: true, neden: 'Beyaz barış kabul edildi.' };
    return { kabul: false, neden: `İsteklilik %${Math.floor(W / 10_000)}; beyaz barış için %15 gerekiyor.` };
  }
  if (tur === 2) {
    if (teslimKosulu(w, kabulEden)) return { kabul: true, neden: 'Teslim koşulları oluştu.' };
    return { kabul: false, neden: 'Teslim koşulu yok: başkent, ana yurdun yarısı ve organize ordu düşmeli.' };
  }
  const butce = tavizButcesi(w, kabulEden, oneren);
  if (W < 250_000) return { kabul: false, neden: `İsteklilik %${Math.floor(W / 10_000)}; tavizli barış için %25 gerekiyor.` };
  if (istek > butce) return { kabul: false, neden: `İstenen değer ${istek}, kabul edilebilir taviz bütçesi ${butce}.` };
  return { kabul: true, neden: 'Tavizli barış kabul edildi.' };
}

/** Barış paketini tek atomik işlemle uygular (18.5). kazanan maskeli bölgeleri alır. */
export function barisUygula(w: World, kazanan: number, kaybeden: number, tur: number, istenen: number[]): void {
  const R = w.R.c;
  const bolgeler = tur === 0 ? [] : istenen.filter((r) => R.sahip[r] === kaybeden);
  for (const r of bolgeler) {
    R.sahip[r] = kazanan; R.kontrolEden[r] = kazanan; R.kontrol[r] = 20_000; R.itaat[r] = 0; R.direnis[r] = 10_000; R.anaYurtGun[r] = 0;
    R.isyan[r] = 0;
    // kaybeden, yitirdiği toprak üzerinde iddia kazanır (intikam); kazananın iddiası düşer
    iddiaEkle(w, r, kaybeden); iddiaSil(w, r, kazanan);
  }
  // diğer işgaller iade
  for (let r = 0; r < w.nR; r++) {
    const s = R.sahip[r]!, k = R.kontrolEden[r]!;
    if ((s === kazanan && k === kaybeden) || (s === kaybeden && k === kazanan)) { R.kontrolEden[r] = s; R.itaat[r] = 0; R.direnis[r] = 0; }
  }
  // savaş kaydından çıkış
  for (const s of w.SV.list()) {
    const SV = w.SV.c;
    const ta = tarafi(w, s, kazanan), tb = tarafi(w, s, kaybeden);
    if (ta === 0 || tb === 0 || ta === tb) continue;
    const liderler = [SV.saldiran[s]!, SV.savunan[s]!];
    if (liderler.includes(kazanan) && liderler.includes(kaybeden)) {
      // liderler barıştı: savaş biter (diğer üyeler de çıkar)
      savasKapat(w, s);
    } else {
      // ayrı barış: lider olmayan taraf çıkar
      const cikan = liderler.includes(kaybeden) ? kazanan : kaybeden;
      tarafYaz(w, s, cikan, 0);
      // bir taraf boşaldıysa savaş biter
      if (savasUyeleri(w, s, 1).length === 0 || savasUyeleri(w, s, 2).length === 0) savasKapat(w, s);
    }
  }
  anlasmaKur(w, A.ateskes, kazanan, kaybeden, w.gun + K.ateskesGun);
  if (tur === 2) {
    // tazminat: kaybedenin aylık gelirinin %10'u, 5 yıl
    const aylik = Math.max(1, w.C.c.g1[kaybeden]!);
    anlasmaKur(w, A.tazminat, kaybeden, kazanan, w.gun + 5 * 365, Math.floor(mulDiv(aylik, 100_000, S).q / 30));
  }
  esirIade(w, kazanan, kaybeden);
  // yabancı topraktaki birlikler en yakın kendi bölgesine
  const U = uc(w);
  for (const u of w.U.list()) {
    const c = U.ulke![u]!;
    const r = U.bolge![u]!;
    if (R.kontrolEden[r] === c) continue;
    if (savasta(w, c, R.kontrolEden[r]!)) continue;
    const k = R.kontrolEden[r]!;
    if (anlasmaVar(w, A.ittifak, c, k) >= 0 || anlasmaVar(w, A.gecis, k, c) >= 0) continue;
    let best = -1, bd = Infinity;
    for (let x = 0; x < w.nR; x++) {
      if (R.kontrolEden[x] !== c) continue;
      const [x1, y1] = w.pkg.bolgeler[x]!.merkez, [x2, y2] = w.pkg.bolgeler[r]!.merkez;
      const d = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
      if (d < bd) { bd = d; best = x; }
    }
    if (best >= 0) { U.bolge![u] = best; U.hedef![u] = -1; U.sonraki![u] = -1; }
  }
  const ad = BARIS_TUR[tur]!;
  const kazAd = w.pkg.ulkeler[kazanan]!.ad, kayAd = w.pkg.ulkeler[kaybeden]!.ad;
  const bAd = bolgeler.map((r) => w.pkg.bolgeler[r]!.ad);
  anlat(w, `${kazAd} ile ${kayAd} arasında ${trKucuk(ad)} imzalandı${bAd.length ? `: ${bAd.join(', ')} el değiştirdi` : ''}.`, 'baris', kazanan, 3);
  bildir(w, 'baris', `${ad}: ${w.pkg.ulkeler[kazanan]!.kisa}–${w.pkg.ulkeler[kaybeden]!.kisa}`, w.oyuncu, true);
  if (tur > 0) { w.C.c.zafer[kazanan] = 15_000; w.C.c.zafer[kaybeden] = -15_000; }
  w.rotaEpoch++;
}

// ---------- Aylık görüş ----------
export function aylikDiplomasi(w: World): void {
  for (let a = 0; a < w.nC; a++) for (let b = 0; b < w.nC; b++) {
    if (a === b) continue;
    const i = cc(w, a, b);
    let taban = w.pkg.gorus[a]![b]!;
    if (savasta(w, a, b)) taban = 10_000;
    if (anlasmaVar(w, A.ittifak, a, b) >= 0) taban += 10_000;
    const fark = taban - w.gorus[i]!;
    let d = mulDiv(fark, 20_000, S).q;
    if (anlasmaVar(w, A.ticaret, a, b) >= 0) d += 500;
    const tutum = w.tutum[cc(w, b, a)]!; // b'nin a'ya tutumu a'nın görüşünü etkiler
    if (tutum === 0) d += 500; else if (tutum === 3) d -= 1000;
    w.gorus[i] = clamp(w.gorus[i]! + d, 0, 100_000);
  }
  // eski ret kayıtları
  for (const s of w.TK.list()) if (w.TK.c.durum[s] === 2 && w.gun - w.TK.c.gun[s]! >= 180) w.TK.release(s);
  // biten anlaşmalar
  for (const s of w.AN.list()) if (w.AN.c.bitis[s]! >= 0 && w.AN.c.bitis[s]! <= w.gun) anlasmaSil(w, s);
  for (let c = 0; c < w.nC; c++) w.C.c.gerginlik[c] = approach(w.C.c.gerginlik[c]!, 0, 500, 500);
}

/** Rakip niyet göstergesi (18.6): yalnız kamu sinyali ve istihbarat aralığı. Dönüş ×1000 puan. */
export function tehditPuani(w: World, gozlemci: number, hedef: number, yigınakOran: number): { puan: number; bilesen: { ad: string; deger: number }[] } {
  const b: { ad: string; deger: number }[] = [];
  if (gerekceSurecte(w, hedef, gozlemci) >= 0) b.push({ ad: 'Size karşı gerekçe', deger: 30_000 });
  if (w.C.c.gerginlik[hedef]! > 5000) b.push({ ad: 'Askerî hazırlık / gerginlik', deger: 20_000 });
  b.push({ ad: 'Sınır yığınağı', deger: mulDiv(15_000, Math.min(S, yigınakOran), S).q });
  if (w.tutum[cc(w, hedef, gozlemci)] === 3) b.push({ ad: 'Düşmanca tutum', deger: 15_000 });
  if (savastaMi(w, hedef) && !savasta(w, hedef, gozlemci)) b.push({ ad: 'Başka bir savaşta', deger: 0 });
  if (anlasmaVar(w, A.ittifak, hedef, gozlemci) < 0 && gorus(w, hedef, gozlemci) < 30_000) b.push({ ad: 'Karşı blokta', deger: 10_000 });
  b.push({ ad: 'Saldırganlık ünü', deger: Math.floor(w.C.c.un[hedef]! / 10) });
  if (savasta(w, hedef, gozlemci)) b.push({ ad: 'Savaştayız', deger: 100_000 });
  return { puan: Math.min(100_000, b.reduce((s, x) => s + x.deger, 0)), bilesen: b };
}

/** Ekipman satışı fiyatı: SP değeri × 1,2 (altın). */
export function ekipmanFiyat(k: number, adet: number): number {
  return mulDiv(EKIPMAN[k]!.sp * adet, K.spDeger * 1200, 1000 * 1000).q;
}

export function ulkeGucOzet(w: World, c: number): number {
  const U = uc(w);
  let g = 0;
  for (const u of w.U.rows()) if (U.ulke![u] === c) { const s = birlikIstat(w, u); g += s.YS + s.SV; }
  return g;
}
void YONETIM; void hc; void ST; void YB; void insanGucu;
