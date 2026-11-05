// Bölüm 19: karar modülü. Yalnız gözlem görünümü, kamu bilgisi ve kendi verisini kullanır;
// emirlerini oyuncuyla aynı doğrulama yolundan (orders.uygula) geçirir.
import type { World } from '../state/world.ts';
import { A, URUN_MUH, ck } from '../state/world.ts';
import { KISILIK, SABLON, TEKNOLOJI, NTEK, MALI, ASKERLIK, EKIPMAN, NEKIP } from '../catalog.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { rng, AMAC, uniformInt } from '../rng/index.ts';
import { uygula, teklifSonuc, type Emir } from '../orders.ts';
import { bolgeGozlem, bolgeGozlemBolgeler, ulkeGozlem } from '../observe/index.ts';
import {
  uc, savasta, savastaMi, dusmanlar, anlasmaVar, gorus, birlikIstat, birlikIkmal, girebilir, rota, sinirKomsusu, muttefik, essavasan, iddiaVar, savasUyeleri, pasif, rotaTip, kontrolB, sahipB,
} from '../systems/ortak.ts';
import { insanGucu } from '../systems/nufus.ts';
import { ulkeGidaStok, zorunluGider, krediLimiti } from '../systems/ekonomi.ts';
import { TK, ESIK, gerekceVar, gerekceSurecte, barisKabul, savasSkoru, istekliligi, tavizButcesi, bolgeDegeri, teslimKosulu, teklifBolgeleri } from '../systems/diplomasi.ts';

const ESIK_SALDIRI = [1_300_000, 1_800_000, 1_400_000, 1_600_000, 1_500_000]; // kişiliğe göre (Atılgan/Temkinli/...)

function emir(w: World, c: number, tur: string, p: Record<string, unknown>): boolean {
  return uygula(w, { tur, ulke: c, ...p } as Emir).ok;
}

/** Gözlenen yabancı güç (temkinli: aralığın üst ucu). */
function gozlenenGuc(w: World, c: number, bolgeler?: number[]): Map<number, Map<number, number>> {
  const m = new Map<number, Map<number, number>>(); // bölge → ülke → güç üst
  for (const g of bolgeler ? bolgeGozlemBolgeler(w, c, bolgeler) : bolgeGozlem(w, c)) {
    if (g.ulke === c) continue;
    let r = m.get(g.bolge);
    if (!r) { r = new Map(); m.set(g.bolge, r); }
    r.set(g.ulke, (r.get(g.ulke) ?? 0) + g.gucUst);
  }
  return m;
}

function ulkeGucuGozlem(w: World, gozlemci: number, hedef: number): number {
  let t = 0;
  for (const g of ulkeGozlem(w, gozlemci, hedef)) t += Math.floor((g.gucAlt + g.gucUst) / 2);
  return t;
}
function kendiGuc(w: World, c: number): number {
  let t = 0;
  for (const u of ulkeBirimleri(w, c)) { const s = birlikIstat(w, u); t += s.YS + s.SV; }
  return t;
}
/** Ülkenin birlikleri (faz içinde önbellekli; birlik kurulup dağıtılınca yenilenir). */
function ulkeBirimleri(w: World, c: number): number[] {
  const d = `${w.gun}|${w.U.hw}|${w.U.free.length}|${(w.onbellek.get('faz') as number | undefined) ?? 0}`;
  let o = w.onbellek.get('ulkeBirim') as { d: string; m: number[][] } | undefined;
  if (!o || o.d !== d) {
    const U = uc(w);
    const m: number[][] = Array.from({ length: w.nC }, () => []);
    for (const u of w.U.list()) m[U.ulke![u]!]!.push(u);
    o = { d, m };
    w.onbellek.set('ulkeBirim', o);
  }
  return o.m[c]!;
}

/** P2: her YZ ülkesi için acil (günlük) ve planlama kararları. */
export function kararGunu(w: World): void {
  for (let c = 0; c < w.nC; c++) {
    if (pasif(w, c) && c !== w.oyuncu) continue; // pasif topluluklar karar vermez
    const oyuncu = c === w.oyuncu && w.mod !== 2;
    if (!oyuncu || w.C.c.otoCephe[c]) cepheYonet(w, c);
    if (oyuncu) { oyuncuKalici(w, c); continue; }
    // planlama günü: 1 + hash(c) % 28, aylık
    const gunAy = ((w.gun % 30) + 30) % 30;
    if (gunAy === (1 + ((c * 7919) % 28)) % 30 || w.C.c.sonPlan[c] === 0) {
      w.C.c.sonPlan[c] = w.gun;
      ekonomiPlan(w, c);
      orduPlan(w, c);
      diplomasiPlan(w, c);
    }
    if (savastaMi(w, c) && w.gun % 15 === c) barisPlan(w, c);
  }
}

/** P3: YZ'ye gelen teklifler (en erken ertesi gün). */
export function teklifYanitlari(w: World): void {
  for (const s of w.TK.list()) {
    const T = w.TK.c;
    if (T.durum[s] !== 0) continue;
    const b = T.kime[s]!, a = T.kimden[s]!;
    if (T.gun[s]! >= w.gun) continue;
    if (b === w.oyuncu && w.mod !== 2) {
      if (w.gun - T.gun[s]! > 30) teklifSonuc(w, s, false);
      continue;
    }
    teklifSonuc(w, s, kabulEder(w, b, a, T.tur[s]!, T.p1[s]!, T.p2[s]!, teklifBolgeleri(w, s)));
  }
}

function kabulEder(w: World, b: number, a: number, tur: number, p1: number, p2: number, istenen: number[]): boolean {
  if (pasif(w, b) && tur !== TK.baris) return false;
  const g = gorus(w, b, a);
  const kis = KISILIK[w.pkg.ulkeler[b]!.kisilik]!;
  const tehdit = dusmanlar(w, b).length > 0;
  switch (tur) {
    case TK.ticaret: return g >= 20_000 && !savasta(w, a, b);
    case TK.saldirmazlik: return g >= 40_000 && (kis !== 'Yayılmacı' || tehdit);
    case TK.gecis: return g >= 65_000 || muttefik(w, a, b);
    case TK.garanti: return g >= 60_000;
    case TK.ittifak: {
      if (g < 80_000) return false;
      if (!sinirKomsusu(w, a, b) && (w.pkg.ulkeler[a]!.guc ?? 5) < 6 && (w.pkg.ulkeler[b]!.guc ?? 5) < 6) return false;
      // ortak düşman veya ortak tehdit
      for (let d = 0; d < w.nC; d++) if (d !== a && d !== b && gorus(w, a, d) < 35_000 && gorus(w, b, d) < 35_000) return true;
      return kis === 'Temkinli';
    }
    case TK.cagri: {
      const sv = p1;
      if (!w.SV.alive[sv]) return false;
      const ittifak = anlasmaVar(w, A.ittifak, a, b) >= 0;
      const garanti = anlasmaVar(w, A.garanti, b, a) >= 0;
      if (!ittifak && !garanti) return g >= 70_000;
      // karşı taraf çok güçlüyse ve sınır komşusuysa çekinebilir
      let karsiGuc = 0;
      for (const d of savasUyeleri(w, sv, p2 === 1 ? 1 : 2)) karsiGuc += ulkeGucuGozlem(w, b, d);
      const benim = kendiGuc(w, b) + ulkeGucuGozlem(w, b, a);
      return benim * 10 >= karsiGuc * 6 || g >= 75_000;
    }
    case TK.baris: return barisKabul(w, b, a, p1, istenen).kabul;
    case TK.ekipman: {
      // satıcı: kendi ihtiyacının iki katı stok varsa
      const k = p1, adet = p2;
      let ihtiyac = 0;
      const U = uc(w);
      for (const u of w.U.rows()) if (U.ulke![u] === b) ihtiyac += Math.floor(EKIPMAN[k]!.aile === 'piyade' ? 400 : 20);
      return !savastaMi(w, b) && w.ekip[ck(b, k)]! > ihtiyac / 4 + adet;
    }
  }
  return false;
}

// ---------- Ekonomi planı ----------
function ekonomiPlan(w: World, c: number): void {
  const C = w.C.c;
  const g = zorunluGider(w, c);
  const gunluk = Math.max(1, g.toplam);
  const runway = Math.floor(C.hazine[c]! / gunluk);
  // vergi
  if (runway < 45 && C.vergi[c]! < 300_000) emir(w, c, 'vergi', { oran: C.vergi[c]! + 20_000 });
  else if (runway > 300 && C.huzur[c]! < 50_000 && C.vergi[c]! > 100_000) emir(w, c, 'vergi', { oran: C.vergi[c]! - 10_000 });
  // borç
  if (C.hazine[c]! < gunluk * 20 && savastaMi(w, c)) {
    const m = Math.min(krediLimiti(w, c), gunluk * 60);
    if (m > 0) emir(w, c, 'borcAl', { miktar: m });
  } else if (C.borc[c]! > 0 && runway > 200) emir(w, c, 'borcOde', { miktar: Math.floor(C.hazine[c]! / 3) });
  // araştırma
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  const sira = kis === 'Ticari' ? ['sanayi1', 'tarim1', 'idare', 'demiryolu', 'sanayi2', 'tarim2', 'sihhiye', 'piyade2', 'kurmay', 'propaganda', 'agirtop2', 'piyade3']
    : ['piyade2', 'sanayi1', 'kurmay', 'demiryolu', 'agirtop2', 'sihhiye', 'tarim1', 'propaganda', 'sanayi2', 'piyade3', 'idare', 'tarim2'];
  for (let k = 0; k < 3; k++) {
    if (w.arastirma[c * 3 + k]! >= 0) continue;
    for (const kod of sira) {
      const t = TEKNOLOJI.findIndex((x) => x.kod === kod);
      if (w.tekBitti[c * NTEK + t]) continue;
      if (emir(w, c, 'arastir', { tek: t })) break;
    }
  }
  // ticaret: kalıcı haftalık alım/satım emirleri (gıda, çelik, kömür)
  const { stok, gunluk: gGun } = ulkeGidaStok(w, c);
  const gunStok = gGun > 0 ? Math.floor(stok / gGun) : 999;
  const birim = (milli: number) => Math.max(0, Math.floor(milli / 1000));
  kaliciSiparis(w, c, MALI.gida, 0, gunStok < 20 ? birim(gGun * 10) : gunStok < 45 ? birim(gGun * 5) : 0);
  kaliciSiparis(w, c, MALI.gida, 1, gunStok > 160 ? birim(gGun * 12) : gunStok > 110 ? birim(gGun * 5) : 0);
  const talep = hatGirdiTalebi(w, c);
  const celikAkis = C.celikDun[c]!, komurAkis = C.komurDun[c]!;
  kaliciSiparis(w, c, MALI.celik, 0, celikAkis < talep.celik && C.hazine[c]! > gunluk * 40 ? birim((talep.celik - celikAkis) * 7) : 0);
  kaliciSiparis(w, c, MALI.celik, 1, celikAkis > (talep.celik * 13) / 10 ? birim(((celikAkis - talep.celik) * 7 * 7) / 10) : 0);
  kaliciSiparis(w, c, MALI.komur, 0, komurAkis < talep.komur && C.hazine[c]! > gunluk * 40 ? birim((talep.komur - komurAkis) * 7) : 0);
  kaliciSiparis(w, c, MALI.komur, 1, komurAkis > (talep.komur * 13) / 10 ? birim(((komurAkis - talep.komur) * 7 * 7) / 10) : 0);
  // üretim: piyade silahı açığına göre
  const U = uc(w);
  let piyadeIh = 0, sahip = 0;
  for (const u of w.U.rows()) if (U.ulke![u] === c) { piyadeIh += 400; sahip += U.e0![u]! + U.e1![u]! + U.e2![u]!; }
  const acik = piyadeIh - sahip - (w.ekip[ck(c, 0)]! + w.ekip[ck(c, 1)]! + w.ekip[ck(c, 2)]!);
  const toplam = Math.max(1, Math.floor(totalFab(w, c)));
  const iyiPiyade = w.tekBitti[c * NTEK + TEKNOLOJI.findIndex((t) => t.kod === 'piyade2')] ? 1 : 0;
  const pay = savastaMi(w, c) ? [380_000, 320_000, 160_000, 80_000, 60_000] : acik > 0 ? [500_000, 200_000, 150_000, 100_000, 50_000] : [300_000, 250_000, 250_000, 100_000, 100_000];
  const urunler = [iyiPiyade, URUN_MUH, 5, 4, 6];
  // hat dengesini yalnız 3 ayda bir değiştir
  if (w.gun % 90 < 30) urunler.forEach((ur, i) => emir(w, c, 'uretim', { urun: ur, fabrika: mulDiv(toplam, pay[i]!, S).q }));
  if (iyiPiyade) emir(w, c, 'uretim', { urun: 0, fabrika: 0 });
  // proje: hazine güçlüyse sivil fabrika veya demiryolu
  if (runway > 180 && !savastaMi(w, c)) {
    const rs: number[] = [];
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.kontrolEden[r] === c) rs.push(r);
    rs.sort((a, b) => w.pkg.bolgeler[b]!.yerlesim - w.pkg.bolgeler[a]!.yerlesim || a - b);
    const secim = uniformInt(rng(w.tohum, w.gun, 19, c, 0, AMAC.aiChoice, 1, 0), 3);
    const proje = [0, 1, 3][secim]!;
    for (const r of rs) if (emir(w, c, 'insa', { proje, bolge: r })) break;
  }
  // yasa: savaşta ekonomi ve askerlik
  if (savastaMi(w, c)) {
    if (C.ekonomi[c]! < 2 && C.destek[c]! >= 60_000) emir(w, c, 'ekonomi', { yasa: 2 });
    else if (C.ekonomi[c]! < 1) emir(w, c, 'ekonomi', { yasa: 1 });
    const ig = insanGucu(w, c);
    if (ig.erisimY < 15_000 && C.askerlik[c]! < 3) emir(w, c, 'askerlik', { yasa: C.askerlik[c]! + 1 });
  }
  if (!savastaMi(w, c) && C.ekonomi[c]! >= 2) emir(w, c, 'ekonomi', { yasa: 1 });
  void ASKERLIK; void NEKIP; void clamp;
}

/** (ülke, mal, yön) için tek kalıcı sipariş satırını günceller; 0 → kaldırır. */
function kaliciSiparis(w: World, c: number, mal: number, yon: number, haftalik: number): void {
  let s = -1;
  for (const x of w.SP.rows()) if (w.SP.c.ulke[x] === c && w.SP.c.mal[x] === mal && w.SP.c.yon[x] === yon && w.SP.c.kalici[x]! > 0) s = x;
  if (haftalik <= 0) { if (s >= 0) w.SP.release(s); return; }
  if (s >= 0) { w.SP.c.kalici[s] = haftalik; w.SP.c.miktar[s] = haftalik * 1000; return; }
  emir(w, c, yon === 0 ? 'satinAl' : 'sat', { mal, miktar: haftalik, kalici: 1 });
}

/** Üretim hatlarının günlük çelik/kömür talebi tahmini (milibirim). */
function hatGirdiTalebi(w: World, c: number): { celik: number; komur: number } {
  let celik = 0, komur = 0;
  for (const s of w.HT.rows()) {
    if (w.HT.c.ulke[s] !== c) continue;
    const sp = mulDiv(mulDiv(w.HT.c.fabrika[s]!, 4500, 1000).q, w.HT.c.verim[s]!, S).q;
    const u = w.HT.c.urun[s]!;
    if (u === URUN_MUH) { celik += mulDiv(sp, 600, 1200).q; komur += mulDiv(sp, 300, 1200).q; }
    else celik += mulDiv(sp, EKIPMAN[u]!.celik, EKIPMAN[u]!.sp).q;
  }
  return { celik, komur };
}

function totalFab(w: World, c: number): number {
  let n = 0;
  for (const r of kontrolB(w, c)) n += w.R.c.askeriF[r]!;
  return n * 1000;
}

// ---------- Ordu planı ----------
function orduPlan(w: World, c: number): void {
  const C = w.C.c;
  const U = uc(w);
  const birlik = ulkeBirimleri(w, c).length;
  const ig = insanGucu(w, c);
  const savas = savastaMi(w, c);
  const tehdit = w.pkg.ulkeler.some((_, d) => d !== c && !pasif(w, d) && (gerekceSurecte(w, d, c) >= 0 || (gorus(w, c, d) < 30_000 && sinirKomsusu(w, c, d))));
  let nufus = 0;
  for (const r of sahipB(w, c)) for (let k = 0; k < 32; k++) nufus += w.pop[r * 32 + k]!;
  const hedefPkg = w.pkg.ulkeler[c]!.ordu;
  const taban = hedefPkg !== undefined ? Math.max(1, hedefPkg) : Math.max(3, Math.floor(nufus / 400_000));
  const hedef = savas ? Math.floor((taban * 18) / 10) : tehdit ? Math.floor((taban * 13) / 10) : taban;
  const gider = zorunluGider(w, c).toplam;
  const tufek = w.ekip[ck(c, 0)]! + w.ekip[ck(c, 1)]! + w.ekip[ck(c, 2)]!;
  const { stok, gunluk } = ulkeGidaStok(w, c);
  const gidaGun = gunluk > 0 ? Math.floor(stok / gunluk) : 999;
  if (birlik < hedef && ig.erisimY > 25_000 && C.hazine[c]! > gider * 60 + 120_000 && tufek >= 300 && gidaGun >= 30) {
    const sab = savas && birlik % 5 === 4 && w.ekip[ck(c, 5)]! >= 24 ? 2 : 0;
    emir(w, c, 'birlikKur', { sablon: sab, adet: savas && tufek >= 700 ? 2 : 1 });
  }
  void SABLON;
}

// ---------- Diplomasi planı ----------
function diplomasiPlan(w: World, c: number): void {
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  // anlaşma önerileri
  // ilişki çevresi: komşular ve büyük güçler (uzak küçük devletler birbiriyle anlaşma kurmaz)
  const guc = (x: number) => w.pkg.ulkeler[x]!.guc ?? 5;
  let teklifSay = 0;
  for (let d = 0; d < w.nC; d++) {
    if (d === c || savasta(w, c, d) || pasif(w, d)) continue;
    if (teklifSay >= 3) break; // ayda en çok üç yeni teklif
    const komsu = sinirKomsusu(w, c, d);
    const buyuk = guc(c) >= 6 || guc(d) >= 6;
    if (!komsu && !buyuk) continue;
    const g = gorus(w, d, c), benim = gorus(w, c, d);
    if (benim < 25_000) continue;
    if (g >= ESIK[TK.ticaret]! && anlasmaVar(w, A.ticaret, c, d) < 0) { if (emir(w, c, 'teklif', { kime: d, tip: TK.ticaret })) teklifSay++; continue; }
    if (komsu && g >= ESIK[TK.saldirmazlik]! && benim >= 45_000 && anlasmaVar(w, A.saldirmazlik, c, d) < 0 && kis !== 'Yayılmacı') { if (emir(w, c, 'teklif', { kime: d, tip: TK.saldirmazlik })) teklifSay++; continue; }
    if (g >= ESIK[TK.ittifak]! && benim >= 80_000 && anlasmaVar(w, A.ittifak, c, d) < 0) {
      // ittifak yalnız ortak bir rakibe karşı: komşu ya da ortak komşu düşmanı
      let ortak = false;
      for (let x = 0; x < w.nC && !ortak; x++) if (x !== c && x !== d && !pasif(w, x) && gorus(w, c, x) < 35_000 && gorus(w, d, x) < 45_000 && (sinirKomsusu(w, c, x) || sinirKomsusu(w, d, x))) ortak = true;
      if ((komsu || ortak) && emir(w, c, 'teklif', { kime: d, tip: TK.ittifak })) teklifSay++;
    }
  }
  // tutum
  for (let d = 0; d < w.nC; d++) {
    if (d === c || (pasif(w, d) && !savasta(w, c, d))) continue;
    const istenen = savasta(w, c, d) || gerekceSurecte(w, d, c) >= 0 ? 3 : gorus(w, c, d) >= 70_000 ? 0 : gorus(w, c, d) < 30_000 ? 2 : 1;
    if (w.tutum[c * w.nC + d] !== istenen) emir(w, c, 'tutum', { kime: d, tutum: istenen });
  }
  // gerekçe ve savaş: yayılmacı ve fırsatçı her zaman; diğerleri yalnız kaybettikleri toprak (intikam) için
  const benimGuc = kendiGuc(w, c);
  if (savastaMi(w, c)) return;
  if (w.C.c.yorgunluk[c]! > 25_000) return;
  for (let d = 0; d < w.nC; d++) {
    if (d === c || pasif(w, d) || anlasmaVar(w, A.ateskes, c, d) >= 0 || anlasmaVar(w, A.ittifak, c, d) >= 0) continue;
    if (!sinirKomsusu(w, c, d)) continue;
    let onunGuc = ulkeGucuGozlem(w, c, d);
    // garantör ve müttefiklerin gücü
    for (let x = 0; x < w.nC; x++) if (x !== c && x !== d && (anlasmaVar(w, A.ittifak, d, x) >= 0 || anlasmaVar(w, A.garanti, x, d) >= 0)) onunGuc += Math.floor(ulkeGucuGozlem(w, c, x) * 7 / 10);
    const oran = mulDiv(benimGuc, S, Math.max(1, onunGuc)).q;
    const iddia = w.pkg.bolgeler.some((_, r) => w.R.c.sahip[r] === d && iddiaVar(w, r, c));
    const firsat = savastaMi(w, d);
    let gerekli: number | null = null;
    if (kis === 'Yayılmacı') gerekli = iddia ? 1_200_000 : 1_700_000;
    else if (kis === 'Fırsatçı') gerekli = iddia && firsat ? 1_100_000 : iddia ? 1_500_000 : firsat ? 1_400_000 : null;
    else if (iddia) gerekli = kis === 'Temkinli' || kis === 'Ticari' ? 1_600_000 : 1_300_000;
    if (gerekli === null) continue;
    if (gerekceVar(w, c, d)) {
      if (oran >= Math.max(ESIK_SALDIRI[0]!, gerekli - 100_000) && w.C.c.destek[c]! >= 25_000) { emir(w, c, 'savasIlan', { hedef: d }); return; }
    } else if (gerekceSurecte(w, c, d) < 0 && oran >= gerekli && gorus(w, c, d) < 45_000 && w.C.c.pg[c]! >= 80_000) {
      emir(w, c, 'gerekce', { hedef: d });
      return;
    }
  }
}

// ---------- Barış planı ----------
function barisPlan(w: World, c: number): void {
  for (const d of dusmanlar(w, c)) {
    // yalnız savaş liderleri ya da iki taraflı
    const skor = savasSkoru(w, c, d);
    if (skor >= 25_000) {
      // tavizli barış: işgal ettiğimiz bölgeleri iste (iddialar önce), kaybedenin bütçesi kadar
      const butce = tavizButcesi(w, d, c);
      const aday: number[] = [];
      for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === d && w.R.c.kontrolEden[r] === c) aday.push(r);
      aday.sort((a, b) => (Number(iddiaVar(w, b, c)) - Number(iddiaVar(w, a, c))) || bolgeDegeri(w, b) - bolgeDegeri(w, a) || a - b);
      const sec: number[] = [];
      let top = 0;
      // ölçülü talep: bütçenin %60'ı ve en çok 3 bölge (teslimde 5)
      const sinir = Math.floor((butce * 6) / 10);
      for (const r of aday) { const v = bolgeDegeri(w, r); if (sec.length < 3 && top + v <= sinir) { sec.push(r); top += v; } }
      if (teslimKosulu(w, d)) emir(w, c, 'baris', { kime: d, barisTur: 2, bolgeler: aday.slice(0, 5) });
      else if (sec.length > 0) emir(w, c, 'baris', { kime: d, barisTur: 1, bolgeler: sec });
    } else if (istekliligi(w, c, d) >= 250_000 || (skor <= -20_000 && w.C.c.yorgunluk[c]! > 40_000)) {
      emir(w, c, 'baris', { kime: d, barisTur: 0, bolgeler: [] });
    }
  }
  void barisKabul;
}

// ---------- Oyuncunun kalıcı emirleri ----------
function oyuncuKalici(w: World, c: number): void {
  if (w.C.c.kaliciGida[c] && ((w.gun % 7) + 7) % 7 === 6) {
    const { stok, gunluk } = ulkeGidaStok(w, c);
    if (gunluk > 0 && stok < gunluk * 20) emir(w, c, 'satinAl', { mal: MALI.gida, miktar: Math.floor((gunluk * 14) / 1000) + 1 });
  }
}

// ---------- Cephe yönetimi (19.5) ----------
function cepheYonet(w: World, c: number): void {
  const U = uc(w);
  const kis = w.pkg.ulkeler[c]!.kisilik;
  const esik = c === w.oyuncu ? 1_500_000 : ESIK_SALDIRI[kis]!;
  const birimler = ulkeBirimleri(w, c).filter((u) => U.egitimBitis![u]! <= w.gun);
  if (birimler.length === 0) return;
  const dusman = dusmanlar(w, c);
  const savas = dusman.length > 0;
  const R = w.R.c;
  // sınır bölgeleri: önce gözlemsiz tarama (barış içindeki ülkeler için erken çıkış)
  const sinirlarHam: { r: number; v: number[] }[] = [];
  const sicak = new Map<number, boolean>();
  const hasim = (k: number): boolean => {
    let h = sicak.get(k);
    if (h === undefined) { h = savasta(w, c, k) || (!pasif(w, k) && (gerekceSurecte(w, k, c) >= 0 || gorus(w, c, k) < 30_000)); sicak.set(k, h); }
    return h;
  };
  const benimB = kontrolB(w, c);
  for (const r of benimB) {
    const vs: number[] = [];
    for (const v of w.komsuluk[r]!) {
      const k = R.kontrolEden[v]!;
      if (k === c || essavasan(w, c, k)) continue;
      if (hasim(k)) vs.push(v);
    }
    if (vs.length) sinirlarHam.push({ r, v: vs });
  }
  if (sinirlarHam.length === 0) return;
  // yalnız kendi bölgelerine komşu yabancı bölgeler gözlenir
  const gerek = new Set<number>();
  for (const r of benimB) for (const v of w.komsuluk[r]!) if (R.kontrolEden[v] !== c) gerek.add(v);
  const gerekL = [...gerek].sort((a, b) => a - b);
  const gozlem = gozlenenGuc(w, c, gerekL);
  const tehdit = new Map<number, number>();
  for (const { r, v: vs } of sinirlarHam) {
    let t = 0;
    for (const v of vs) {
      const k = R.kontrolEden[v]!;
      const dus = savasta(w, c, k);
      const o = gozlem.get(v);
      if (o) for (const [u2, gg] of o) if (u2 === k || savasta(w, c, u2)) t += gg;
      t += dus ? 20_000 : 5000;
    }
    tehdit.set(r, t);
  }
  if (tehdit.size === 0) {
    // barış ve tehdit yok: birlikler başkent ve eyalet merkezlerinde beklesin
    return;
  }
  // taarruz adayları (yalnız savaşta)
  const atanmis = new Set<number>();
  if (savas) {
    const adaylar: { hedef: number; deger: number; kaynak: number[]; oran: number }[] = [];
    for (const r of gerekL) {
      const k = R.kontrolEden[r]!;
      if (!savasta(w, c, k)) continue;
      const komsuDost = w.komsuluk[r]!.filter((v) => R.kontrolEden[v] === c);
      if (komsuDost.length === 0) continue;
      const kaynak = birimler.filter((u) => komsuDost.includes(U.bolge![u]!) && U.org![u]! > mulDiv(birlikIstat(w, u).orgMax, 600_000, S).q && birlikIkmal(w, u).oran >= 400_000);
      if (kaynak.length === 0) continue;
      let benim = 0;
      for (const u of kaynak) { const s = birlikIstat(w, u); benim += s.YS + s.SV; }
      let onlar = 0;
      const o = gozlem.get(r);
      if (o) for (const [, gg] of o) onlar += gg;
      const oran = onlar <= 0 ? 10 * S : mulDiv(benim, S, onlar).q;
      let deger = bolgeDegeri(w, r) * 1000;
      if (iddiaVar(w, r, c) || R.sahip[r] === c) deger *= 2;
      if (w.pkg.ulkeler[k]?.baskent === r) deger *= 2;
      adaylar.push({ hedef: r, deger, kaynak, oran });
    }
    adaylar.sort((a, b) => b.oran - a.oran || b.deger - a.deger || a.hedef - b.hedef);
    let say = 0;
    for (const a of adaylar) {
      if (say >= 3) break;
      if (a.oran < esik) continue;
      // savunmayı boşaltmamak için kaynak bölgesinde en az bir birlik kalsın (tehdit varsa)
      const kullan = a.kaynak.filter((u) => !atanmis.has(u));
      const kalsin = new Set<number>();
      for (const u of kullan) {
        const r = U.bolge![u]!;
        const ayni = kullan.filter((x) => U.bolge![x] === r);
        if ((tehdit.get(r) ?? 0) > 0 && ayni.length > 1 && !kalsin.has(r)) kalsin.add(r);
      }
      const giden = kullan.filter((u, i) => !(kalsin.has(U.bolge![u]!) && kullan.findIndex((x) => U.bolge![x] === U.bolge![u]) === i));
      if (giden.length === 0) continue;
      for (const u of giden) { atanmis.add(u); if (U.hedef![u] !== a.hedef) { U.hedef![u] = a.hedef; U.durus![u] = 2; U.atamaGun![u] = w.gun; } }
      say++;
    }
  }
  // savunma dağılımı: tehdit oranında
  const serbest = birimler.filter((u) => !atanmis.has(u) && U.muharebe![u]! === 0 && (w.gun - U.atamaGun![u]! >= 7 || U.hedef![u]! < 0));
  const sinirlar = [...tehdit.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const yedek = Math.floor(serbest.length * 15 / 100);
  const ihtiyac = new Map<number, number>();
  const tTop = sinirlar.reduce((s, [, t]) => s + t, 0);
  const dagit = serbest.length - yedek;
  for (const [r, t] of sinirlar) ihtiyac.set(r, Math.max(1, Math.floor((dagit * t) / Math.max(1, tTop))));
  // mevcut yerleşimi say
  const mevcut = new Map<number, number>();
  for (const u of birimler) { const h = U.hedef![u]! >= 0 ? U.hedef![u]! : U.bolge![u]!; mevcut.set(h, (mevcut.get(h) ?? 0) + 1); }
  let yedekKalan = yedek;
  for (const u of serbest) {
    const r = U.hedef![u]! >= 0 ? U.hedef![u]! : U.bolge![u]!;
    const bura = ihtiyac.get(r) ?? 0;
    if ((mevcut.get(r) ?? 0) <= bura && bura > 0) continue; // yerinde kalsın
    if (yedekKalan > 0 && !tehdit.has(r)) { yedekKalan--; continue; }
    // en açık sınır bölgesine
    let best = -1, bestAcik = 0;
    for (const [s, ih] of ihtiyac) {
      const acik = ih - (mevcut.get(s) ?? 0);
      if (acik > bestAcik || (acik === bestAcik && acik > 0 && s < best)) {
        if (!rotaTip(w, c, 2, U.bolge![u]!, s)) continue;
        best = s; bestAcik = acik;
      }
    }
    if (best >= 0 && best !== U.bolge![u]) {
      mevcut.set(r, (mevcut.get(r) ?? 1) - 1); mevcut.set(best, (mevcut.get(best) ?? 0) + 1);
      U.hedef![u] = best; U.durus![u] = 0; U.atamaGun![u] = w.gun;
    }
  }
}
