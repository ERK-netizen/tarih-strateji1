// Toplum (şema 7): partiler ve seçimler, devrim ve darbe, rejim değişikliği; nüfus ve göç politikası, iskân, asimilasyon,
// sürgün ve soykırım (insanlığa karşı suç: ağır ve kalıcı sonuçlar); şehirlerin kendiliğinden büyümesi.
import type { World } from '../state/world.ts';
import { hc, cc } from '../state/world.ts';
import { AKTIF, NHUCRE, NKIMLIK, YB, ST } from '../catalog.ts';
import { PARTI, NPARTI, REJIM_AD, SECIMLI } from '../katalogEk.ts';
import { S, mulDiv, clamp, largestRemainder } from '../num/index.ts';
import { rng, uniformInt, AMAC } from '../rng/index.ts';
import { anlat, bildir, savastaMi, pasif, anlasmaVar } from './ortak.ts';
import { A } from '../state/world.ts';

const PK = ['parti0', 'parti1', 'parti2', 'parti3', 'parti4'] as const;
export const partiPay = (w: World, c: number, i: number): number => w.C.c[PK[i]!][c]!;
export const rejimAdi = (w: World, c: number): string => REJIM_AD[AKTIF.donem][w.C.c.rejim[c]!] ?? '?';
export const partiAdi = (w: World, c: number, i: number): string => PARTI[AKTIF.donem][i]?.ad ?? '?';

/** İktidar partisinin etkisi (modDeger'e eklenir): tür adı MOD_TUR'dan. */
export function partiEtki(w: World, c: number, tur: string): number {
  const p = PARTI[AKTIF.donem][w.C.c.iktidar[c]!];
  if (!p) return 0;
  const anahtar = tur === 'huzurAy' ? 'huzur' : tur === 'destekAy' ? 'destek' : tur === 'mesruAy' ? 'mesru' : tur;
  return (p.etki as Record<string, number>)[anahtar] ?? 0;
}

function payYaz(w: World, c: number, p: number[]): void {
  const t = largestRemainder(S, p.map((x) => Math.max(1, x)));
  for (let i = 0; i < NPARTI; i++) w.C.c[PK[i]!][c] = t[i]!;
}
/** En güçlü parti; meşruti monarşide devrimci akım seçime katılamaz (yasaklı). */
function enGuclu(w: World, c: number): number {
  const yasak = w.C.c.rejim[c] === 1 ? 4 : -1;
  let b = 0;
  for (let i = 1; i < NPARTI; i++) if (i !== yasak && partiPay(w, c, i) > partiPay(w, c, b)) b = i;
  return b;
}

/** Aylık siyaset: parti desteklerinin kayması, seçimler, devrim ve darbe, rejim geçişi, zulüm kaydının sönümü. */
export function aylikSiyasetEk(w: World): void {
  const C = w.C.c;
  for (let c = 0; c < w.nC; c++) {
    if (pasif(w, c)) continue;
    const p = Array.from({ length: NPARTI }, (_, i) => partiPay(w, c, i));
    const d: number[] = [0, 0, 0, 0, 0];
    const ek = (i: number, v: number): void => { d[i] = d[i]! + v; };
    const yorg = C.yorgunluk[c]!, huzur = C.huzur[c]!, zafer = C.zafer[c]!;
    if (yorg > 30_000) { const k = Math.floor((yorg - 30_000) / 8); ek(2, Math.floor((k * 3) / 5)); ek(4, Math.floor((k * 2) / 5)); ek(3, -Math.floor(k / 3)); }
    if (huzur < 40_000) { ek(4, Math.floor((40_000 - huzur) / 2)); ek(3, Math.floor((40_000 - huzur) / 4)); }
    else if (huzur > 65_000) { ek(0, (8000)); ek(1, (8000)); }
    if (zafer > 0) { ek(3, (15_000)); ek(0, (5000)); } else if (zafer < 0) { ek(4, (15_000)); ek(0, -(10_000)); }
    if (C.tuketimYet[c]! > 1_050_000) ek(1, (8000)); else if (C.tuketimYet[c]! < 700_000) ek(2, (12_000));
    if (C.temerrut[c]! > w.gun) ek(4, (15_000));
    if (C.zulum[c]! > 50_000) { ek(3, (10_000)); ek(1, -(10_000)); }
    // iktidar yıpranması (temsilî rejimlerde)
    if (SECIMLI.has(C.rejim[c]!)) ek(C.iktidar[c]!, -(6000));
    // tek parti ve askerî yönetimde muhalefet bastırılır
    if (C.rejim[c] === 3 || C.rejim[c] === 4) { for (let i = 0; i < NPARTI; i++) if (i !== C.iktidar[c]) ek(i, -(4000)); ek(C.iktidar[c]!, (8000)); }
    // ortalamaya dönüş (aşırı uçlar kendiliğinden sönümlenir)
    for (let i = 0; i < NPARTI; i++) ek(i, Math.trunc((200_000 - p[i]!) / 20));
    payYaz(w, c, p.map((x, i) => x + Math.trunc(d[i]!)));
    // seçim
    if (SECIMLI.has(C.rejim[c]!) && C.secim[c]! > 0 && w.gun >= C.secim[c]!) secimYap(w, c);
    // devrim: devrimci akım güçlü, halk huzursuz
    const r4 = partiPay(w, c, 4), r3 = partiPay(w, c, 3);
    const u = uniformInt(rng(w.tohum, w.gun, 40, c, 0, AMAC.lottery, 0, 0), 100);
    if (r4 >= 330_000 && huzur < 30_000 && C.rejim[c] !== 3 && u < 25) devrim(w, c, 3, 4);
    else if (r3 >= 420_000 && (zafer < 0 || huzur < 30_000) && C.rejim[c] !== 4 && C.rejim[c] !== 3 && u < 15) devrim(w, c, 4, 3);
    // zulüm kaydı yavaş söner (uluslararası hafıza)
    if (C.zulum[c]! > 0) C.zulum[c] = Math.max(0, C.zulum[c]! - Math.max(200, Math.floor(C.zulum[c]! / 60)));
    // rejim geçişi sırasında huzursuzluk
    if (C.gecis[c]! > w.gun) C.huzur[c] = Math.max(0, C.huzur[c]! - 1500);
    // nüfus politikaları: doğum teşviki bedeli, göç teşviki (başkente yabancı göçmen), göç kısıtlaması (milliyetçi destek)
    const pol = C.nufusPol[c]!;
    if (pol === 1) C.hazine[c] = C.hazine[c]! - Math.floor(C.g1[c]! / 100);
    else if (pol === 2) {
      const bas = w.pkg.ulkeler[c]!.baskent;
      if (w.R.c.sahip[bas] === c) {
        let top = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) top += bolgeToplam(w, r);
        const g = Math.floor(top / 2000);
        if (g > 0) {
          // göçmenler: %20 çocuk, %50 askerlik çağı, %30 yetişkin (sivil statü)
          const ag = new Array<number>(NHUCRE).fill(0);
          ag[hc(0, YB.COCUK, ST.O)] = 2; ag[hc(0, YB.ASKER, ST.O)] = 5; ag[hc(0, YB.YETISKIN, ST.O)] = 3;
          const pay = largestRemainder(g, ag);
          nufusEkle(w, bas, digerHucre(w, bas), pay);
          w.sayac.dogum += g;
          C.huzur[c] = Math.max(0, C.huzur[c]! - 300);
          C.hazine[c] = C.hazine[c]! - g;
        }
      }
    } else if (pol === 3) { const ps = Array.from({ length: NPARTI }, (_, i) => partiPay(w, c, i)); ps[3] = ps[3]! + 5000; payYaz(w, c, ps); }
  }
}

export function secimYap(w: World, c: number): void {
  const C = w.C.c;
  const eski = C.iktidar[c]!;
  const yeni = enGuclu(w, c);
  C.iktidar[c] = yeni;
  C.secim[c] = w.gun + (C.rejim[c] === 2 ? 4 : 5) * 365;
  const pay = Math.floor(partiPay(w, c, yeni) / 10_000);
  if (yeni !== eski) C.huzur[c] = Math.min(100_000, C.huzur[c]! + 3000);
  anlat(w, `${w.pkg.ulkeler[c]!.kisa} seçimleri: ${partiAdi(w, c, yeni)} %${pay} oyla ${yeni === eski ? 'iktidarını korudu' : 'iktidara geldi'}.`, 'siyaset', c, yeni === eski ? 1 : 2);
  if (c === w.oyuncu) bildir(w, 'siyaset', `Seçim: ${partiAdi(w, c, yeni)} %${pay}`, c, yeni !== eski);
}

/** Devrim ya da darbe: rejim ve iktidar değişir, meşruiyet sıfırdan kurulur. */
export function devrim(w: World, c: number, rejim: number, parti: number): void {
  const C = w.C.c;
  const eski = rejimAdi(w, c);
  C.rejim[c] = rejim; C.iktidar[c] = parti; C.gecis[c] = w.gun + 180; C.secim[c] = SECIMLI.has(rejim) ? w.gun + 365 : 0;
  C.mesru[c] = 40_000; C.huzur[c] = Math.max(0, C.huzur[c]! - 10_000); C.pg[c] = Math.max(0, C.pg[c]! - 50_000);
  const p = Array.from({ length: NPARTI }, (_, i) => partiPay(w, c, i));
  p[parti] = p[parti]! + 300_000;
  payYaz(w, c, p);
  const tur = rejim === 4 ? 'Askerî darbe' : 'Devrim';
  anlat(w, `${tur}: ${w.pkg.ulkeler[c]!.ad} — ${eski} yıkıldı, ${rejimAdi(w, c)} kuruldu (${partiAdi(w, c, parti)}).`, 'siyaset', c, 3);
  bildir(w, 'siyaset', `${w.pkg.ulkeler[c]!.kisa}: ${trKucukIlk(tur)} (${rejimAdi(w, c)})`, c === w.oyuncu ? c : w.oyuncu, c === w.oyuncu);
}
const trKucukIlk = (s: string) => s;

/** Oyuncu ya da karar modülünün rejim değişikliği (reform ya da otoriter dönüş). */
export function rejimDegistir(w: World, c: number, rejim: number): void {
  const C = w.C.c;
  const eski = rejimAdi(w, c);
  C.rejim[c] = rejim; C.gecis[c] = w.gun + 180;
  C.mesru[c] = Math.max(0, C.mesru[c]! - 15_000); C.huzur[c] = Math.max(0, C.huzur[c]! - 8000); C.pg[c] = Math.max(0, C.pg[c]! - 150_000);
  C.secim[c] = SECIMLI.has(rejim) ? w.gun + 180 : 0;
  anlat(w, `${w.pkg.ulkeler[c]!.ad} rejimini değiştirdi: ${eski} → ${rejimAdi(w, c)}.`, 'siyaset', c, 3);
}

// ---------- Demografi ----------
/** Bölgede kimlik hücresi (kültür, inanç) → indeks; bulunmazsa -1. */
export function kimlikHucresi(w: World, r: number, kultur: number, inanc = -2): number {
  const a = w.pkg.bolgeler[r]!.kimlikAnahtar;
  for (let k = 0; k < a.length; k++) if (a[k]![0] === kultur && (inanc === -2 || a[k]![1] === inanc)) return k;
  return -1;
}
const digerHucre = (w: World, r: number): number => { const a = w.pkg.bolgeler[r]!.kimlikAnahtar; for (let k = 0; k < a.length; k++) if (a[k]![0] < 0) return k; return a.length - 1; };
export function kimlikAdi(w: World, r: number, k: number): string {
  const [ku, inn] = w.pkg.bolgeler[r]!.kimlikAnahtar[k] ?? [-1, -1];
  if (ku < 0) return 'diğer';
  return `${w.pkg.kultur[ku]?.ad ?? '?'}${inn >= 0 ? ` (${w.pkg.inanc[inn]?.ad ?? '?'})` : ''}`;
}
function bolgeToplam(w: World, r: number): number { let n = 0; for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!; return n; }

/** Bölgeden m kişi çıkarır (kimlik hücresi k'den; yaş/statü hücrelerinden oransal). Dönüş: hücre başına çıkan kişi. */
function nufusCikar(w: World, r: number, k: number, m: number): number[] {
  const kim = w.kim[r * NKIMLIK + k]!;
  const n = Math.min(m, kim);
  const ag: number[] = [];
  for (let h = 0; h < NHUCRE; h++) { const y = Math.floor(h / 8), st = h % 8; ag.push(st === ST.A || st === ST.W || st === ST.P ? 0 : w.pop[r * NHUCRE + h]!); void y; }
  const top = ag.reduce((a, b) => a + b, 0);
  const pay = largestRemainder(Math.min(n, top), top > 0 ? ag : [1]);
  for (let h = 0; h < NHUCRE; h++) w.pop[r * NHUCRE + h] = w.pop[r * NHUCRE + h]! - (pay[h] ?? 0);
  w.kim[r * NKIMLIK + k] = kim - Math.min(n, top);
  return pay;
}
function nufusEkle(w: World, r: number, k: number, pay: number[]): void {
  let n = 0;
  for (let h = 0; h < NHUCRE; h++) { w.pop[r * NHUCRE + h] = w.pop[r * NHUCRE + h]! + (pay[h] ?? 0); n += pay[h] ?? 0; }
  w.kim[r * NKIMLIK + k] = w.kim[r * NKIMLIK + k]! + n;
}

/** Haftalık demografi politikaları: asimilasyon (kimlik dönüşümü) ve iskân (ana kimlikten yerleşimci). */
export function demografiHaftasi(w: World): void {
  const R = w.R.c, C = w.C.c;
  for (let r = 0; r < w.nR; r++) {
    const pol = R.demPol[r]!;
    if (!pol) continue;
    const c = R.sahip[r]!;
    if (c < 0 || R.kontrolEden[r] !== c) { R.demPol[r] = 0; continue; }
    const U = w.pkg.ulkeler[c]!;
    const hedefK = kimlikHucresi(w, r, U.kultur);
    if (hedefK < 0) { R.demPol[r] = 0; continue; }
    if (pol === 1) {
      // asimilasyon: hedef kimliğin haftada %0,3'ü devletin kültürüne geçer (okul, dil yasağı, ad değişikliği)
      const k = R.demKim[r]!;
      if (k === hedefK) { R.demPol[r] = 0; continue; }
      const n = Math.floor(w.kim[r * NKIMLIK + k]! * 3 / 1000);
      if (n <= 0) { R.demPol[r] = 0; anlat(w, `${w.pkg.bolgeler[r]!.ad}: asimilasyon politikası tamamlandı.`, 'demografi', c, 1); continue; }
      w.kim[r * NKIMLIK + k] = w.kim[r * NKIMLIK + k]! - n; w.kim[r * NKIMLIK + hedefK] = w.kim[r * NKIMLIK + hedefK]! + n;
      R.direnis[r] = Math.min(100_000, R.direnis[r]! + 1500);
      C.huzur[c] = Math.max(0, C.huzur[c]! - 100);
    } else if (pol === 2) {
      // iskân: başkentten (ya da en kalabalık ana yurt bölgesinden) haftada %0,05 yerleşimci; bedeli hazineden
      const kaynak = U.baskent;
      const kk = kimlikHucresi(w, kaynak, U.kultur);
      if (kk < 0 || kaynak === r) { R.demPol[r] = 0; continue; }
      const n = Math.floor(bolgeToplam(w, kaynak) / 2000);
      const bedel = mulDiv(n, 2000, 1000).q;
      if (n <= 0 || C.hazine[c]! < bedel) continue;
      C.hazine[c] = C.hazine[c]! - bedel;
      nufusEkle(w, r, hedefK, nufusCikar(w, kaynak, kk, n));
      R.direnis[r] = Math.min(100_000, R.direnis[r]! + 500);
    }
  }
}

/** En yakın yabancı bölgede aynı kimliği barındıran hücre (sürgün varış yeri). */
function surgunHedef(w: World, r: number, c: number, kultur: number, inanc: number): [number, number] {
  let best = -1, bk = -1, bd = Infinity;
  const [x1, y1] = w.pkg.bolgeler[r]!.merkez;
  for (let q = 0; q < w.nR; q++) {
    const s = w.R.c.sahip[q]!;
    if (s === c || s < 0 || pasif(w, s)) continue;
    const k = kimlikHucresi(w, q, kultur, inanc);
    const k2 = k >= 0 ? k : -1;
    const [x2, y2] = w.pkg.bolgeler[q]!.merkez;
    const d = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (k2 >= 0 ? 0 : 4_000_000);
    if (d < bd) { bd = d; best = q; bk = k2 >= 0 ? k2 : digerHucre(w, q); }
  }
  return [best, bk];
}

/**
 * Sürgün ve soykırım (tek seferlik emirler): hedef kimliğin bölgedeki nüfusu zorla sürülür ya da yok edilir.
 * Dünya bunu unutmaz: görüş çöküşü, savaş gerekçesi, ambargo, meşruiyet ve huzur kaybı, kalıcı direniş.
 */
export function zulumUygula(w: World, c: number, r: number, k: number, tur: 'surgun' | 'soykirim'): number {
  const C = w.C.c, R = w.R.c;
  const [ku, inn] = w.pkg.bolgeler[r]!.kimlikAnahtar[k] ?? [-1, -1];
  const mevcut = w.kim[r * NKIMLIK + k]!;
  if (mevcut <= 0) return 0;
  const oran = tur === 'surgun' ? 700_000 : 850_000;
  const m = mulDiv(mevcut, oran, S).q;
  const pay = nufusCikar(w, r, k, m);
  const cikan = pay.reduce((a, b) => a + b, 0);
  let olu = 0;
  if (tur === 'surgun') {
    // yolda ölümler: %15; kalanlar sınır ötesine
    const olumPay = pay.map((x) => mulDiv(x, 150_000, S).q);
    olu = olumPay.reduce((a, b) => a + b, 0);
    const kalan = pay.map((x, i) => x - olumPay[i]!);
    const [q, qk] = surgunHedef(w, r, c, ku, inn);
    if (q >= 0) nufusEkle(w, q, qk, kalan); else olu = cikan;
  } else olu = cikan;
  w.sayac.ekOlum += olu;
  // sonuçlar
  const agir = tur === 'soykirim';
  C.zulum[c] = Math.min(500_000, C.zulum[c]! + (agir ? 150_000 : 40_000));
  C.mesru[c] = Math.max(0, C.mesru[c]! - (agir ? 30_000 : 10_000));
  C.huzur[c] = Math.max(0, C.huzur[c]! - (agir ? 15_000 : 5000));
  R.direnis[r] = Math.min(100_000, R.direnis[r]! + (agir ? 80_000 : 40_000));
  for (let d = 0; d < w.nC; d++) {
    if (d === c || pasif(w, d)) continue;
    const U = w.pkg.ulkeler[d]!;
    const akraba = U.kultur === ku || (agir && U.inanc === inn && inn >= 0);
    const g = w.gorus[cc(w, d, c)]!;
    w.gorus[cc(w, d, c)] = clamp(g - (akraba ? (agir ? 80_000 : 40_000) : (agir ? 30_000 : 10_000)), 0, 100_000);
    // savaş gerekçesi: akraba devletler ve (soykırımda) ilişkisi zayıf her devlet
    if (akraba || (agir && w.gorus[cc(w, d, c)]! < 40_000)) {
      const s = w.GR.alloc();
      w.GR.c.ulke[s] = d; w.GR.c.hedef[s] = c; w.GR.c.bitis[s] = w.gun; w.GR.c.hazir[s] = 1;
    }
    // soykırım: ticaret anlaşmaları kopar, demokrasiler ambargo uygular
    if (agir) {
      for (const sa of w.AN.list()) if (w.AN.c.tur[sa] === A.ticaret && ((w.AN.c.a[sa] === c && w.AN.c.b[sa] === d) || (w.AN.c.a[sa] === d && w.AN.c.b[sa] === c))) { w.AN.release(sa); w.anSurum++; }
      if (w.C.c.rejim[d] === 2 && anlasmaVar(w, A.ambargo, d, c) < 0) { const s = w.AN.alloc(); w.AN.c.tur[s] = A.ambargo; w.AN.c.a[s] = d; w.AN.c.b[s] = c; w.AN.c.baslangic[s] = w.gun; w.AN.c.bitis[s] = w.gun + 3650; w.anSurum++; }
    }
  }
  // aynı kimliğin ülkenin öteki bölgelerinde direnişi
  for (let q = 0; q < w.nR; q++) if (q !== r && w.R.c.sahip[q] === c && kimlikHucresi(w, q, ku, inn) >= 0) R.direnis[q] = Math.min(100_000, R.direnis[q]! + (agir ? 30_000 : 10_000));
  const ad = kimlikAdi(w, r, k), bolge = w.pkg.bolgeler[r]!.ad;
  if (agir) anlat(w, `İnsanlığa karşı suç: ${w.pkg.ulkeler[c]!.ad}, ${bolge} bölgesindeki ${ad} halkına karşı soykırım uyguladı; ${fmtKisi(olu)} kişi öldürüldü. Dünya ${w.pkg.ulkeler[c]!.kisa} yönetimini lanetliyor.`, 'demografi', c, 3);
  else anlat(w, `${w.pkg.ulkeler[c]!.ad}, ${bolge} bölgesindeki ${ad} halkını sürgün etti: ${fmtKisi(cikan)} kişi yurdundan koparıldı, ${fmtKisi(olu)} kişi yolda öldü.`, 'demografi', c, 3);
  bildir(w, 'demografi', agir ? `${w.pkg.ulkeler[c]!.kisa}: soykırım (${bolge})` : `${w.pkg.ulkeler[c]!.kisa}: sürgün (${bolge})`, w.oyuncu, true);
  w.rotaEpoch++;
  return cikan;
}
function fmtKisi(n: number): string {
  const s = String(Math.max(0, Math.floor(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Yıllık: kalabalıklaşan ve huzurlu şehirler kendiliğinden büyür (yalnız yapı kapasitesi; K-45). */
export function yillikKent(w: World): void {
  const R = w.R.c;
  for (let r = 0; r < w.nR; r++) {
    const c = R.sahip[r]!;
    if (c < 0 || R.kontrolEden[r] !== c || pasif(w, c)) continue;
    const L = R.kent[r]!;
    if (L >= 10 || R.hasar[r]! > 100_000 || w.C.c.huzur[c]! < 50_000 || savastaMi(w, c)) continue;
    const esik = (L + 1) * (L + 1) * 250_000;
    if (bolgeToplam(w, r) >= esik && w.R.c.isHizmet[r]! * 4 >= bolgeToplam(w, r) / 5) {
      R.kent[r] = L + 1;
      if (c === w.oyuncu) anlat(w, `${w.pkg.bolgeler[r]!.ad} büyüyerek ${L + 1}. düzey şehir oldu; dört yeni yapı yuvası açıldı.`, 'proje', c, 1);
    }
  }
  void YB; void hc;
}
