// Bölüm 19: karar modülü. Yalnız gözlem görünümü, kamu bilgisi ve kendi verisini kullanır;
// emirlerini oyuncuyla aynı doğrulama yolundan (orders.uygula) geçirir.
import type { World } from '../state/world.ts';
import { A, URUN_MUH, ck, BK, NYUVA } from '../state/world.ts';
import { KISILIK, SABLON, TEKNOLOJI, NTEK, MALI, MAL, ASKERLIK, EKIPMAN, NEKIP, AKTIF, projeIdx, NKIMLIK } from '../catalog.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { rng, AMAC, uniformInt } from '../rng/index.ts';
import { uygula, teklifSonuc, type Emir } from '../orders.ts';
import { bolgeGozlem, bolgeGozlemBolgeler, ulkeGozlem } from '../observe/index.ts';
import {
  uc, savasta, savastaMi, dusmanlar, anlasmaVar, gorus, birlikIstat, birlikIkmal, sinirKomsusu, muttefik, essavasan, iddiaVar, savasUyeleri, pasif, rotaTip, kontrolB, sahipB, denizGecer, efendi,
} from '../systems/ortak.ts';
import { insanGucu } from '../systems/nufus.ts';
import { ulkeGidaStok, zorunluGider, krediLimiti, acikYuva } from '../systems/ekonomi.ts';
import { denizGucu, akinGucu, korumaGucu, havaGucu, havaUstunluk } from '../systems/deniz.ts';
import { HAVA } from '../katalogEk.ts';
import { savunmaCarpan, topcuBaski } from '../systems/kara.ts';
import { TK, ESIK, gerekceVar, gerekceSurecte, barisKabul, savasSkoru, istekliligi, tavizButcesi, bolgeDegeri, teslimKosulu, teklifBolgeleri } from '../systems/diplomasi.ts';

const ESIK_SALDIRI = [1_300_000, 1_800_000, 1_400_000, 1_600_000, 1_500_000]; // kişiliğe göre (Atılgan/Temkinli/...)

/** Karar modülünün emirleri bakan emri olarak işaretlenir (oyuncu adına verilen emir bakanı görevden almaz). */
let bakanCagri = false;
function emir(w: World, c: number, tur: string, p: Record<string, unknown>): boolean {
  return uygula(w, { tur, ulke: c, ...p, ...(bakanCagri || c !== w.oyuncu ? { yz: 1 } : {}) } as Emir).ok;
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
    if (oyuncu) {
      oyuncuKalici(w, c);
      // bakanlar: oyuncunun devrettiği alanlar aylık planlanır (oyuncunun elle emri bakanı görevden alır: orders)
      const m = w.C.c.bakan[c]!;
      const gunAy = ((w.gun % 30) + 30) % 30;
      if (m && (gunAy === 3 || w.C.c.sonPlan[c] === 0)) { w.C.c.sonPlan[c] = w.gun; ekonomiPlan(w, c, m); if (m & BK.ordu) { bakanCagri = true; try { orduPlan(w, c); } finally { bakanCagri = false; } } }
      continue;
    }
    // planlama günü: 1 + hash(c) % 28, aylık
    const gunAy = ((w.gun % 30) + 30) % 30;
    if (gunAy === (1 + ((c * 7919) % 28)) % 30 || w.C.c.sonPlan[c] === 0) {
      w.C.c.sonPlan[c] = w.gun;
      ekonomiPlan(w, c);
      orduPlan(w, c);
      diplomasiPlan(w, c);
    }
    // barış değerlendirmesi: her ülke 15 günde bir (eskiden yalnız ilk 15 ülke değerlendiriyordu)
    if (savastaMi(w, c) && w.gun % 15 === c % 15) barisPlan(w, c);
    if (gunAy === (5 + ((c * 4513) % 24)) % 30) { kuvvetPlan(w, c); kuklaPlan(w, c); }
    if (((w.gun % 7) + 7) % 7 === c % 7) kuvvetGorev(w, c);
    if (gunAy === (9 + ((c * 2851) % 20)) % 30) siyasetPlan(w, c);
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
    case TK.devir: {
      // toprak satışı: iyi ilişki, ana yurt dışı bölge ve en az üç yıllık katma değer kadar bedel (kuklalar efendiye itiraz etmez)
      if (savasta(w, a, b)) return false;
      if (efendi(w, b) === a) return true;
      if (g < 30_000) return false;
      let deger = 0;
      for (const r of istenen) { if (w.pkg.bolgeler[r]!.anaYurt.includes(b)) return false; deger += w.R.c.vaDun[r]!; }
      return p1 >= deger * 365 * 3;
    }
    case TK.ultimatom: {
      // zayıf ve yalnız devlet boyun eğer; ana yurttan büyük parça istenirse direnir
      if (savastaMi(w, b)) return false;
      const ben = kendiGuc(w, b), o = ulkeGucuGozlem(w, b, a);
      let destek = 0;
      for (let d = 0; d < w.nC; d++) if (d !== a && d !== b && (anlasmaVar(w, A.ittifak, b, d) >= 0 || anlasmaVar(w, A.garanti, d, b) >= 0)) destek += kendiGuc(w, d);
      let istek = 0, top = 0;
      for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === b) { const v = bolgeDegeri(w, r); top += v; if (istenen.includes(r)) istek += v * (w.pkg.bolgeler[r]!.anaYurt.includes(b) ? 2 : 1); }
      return (ben + destek) * 10 < o * 3 && istek * 5 < top;
    }
    case TK.kuklaOl: {
      // küçük ve tehdit altındaki devlet güçlü bir hamiye sığınır
      if (efendi(w, b) >= 0 || savasta(w, a, b)) return false;
      const ben = kendiGuc(w, b), o = kendiGuc(w, a);
      return g >= 50_000 && ben * 10 < o * 2 && (tehdit || kis === 'Temkinli');
    }
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
/** Kişiliğe göre araştırma önceliği; doktrin kişilikten seçilir, kalan teknolojiler katalog sırasıyla gelir. */
const SIRA_ON: Record<string, string[]> = {
  Askeri: ['piyade2', 'taktik1', 'sanayi1', 'kurmay', 'DOK', 'topcu1', 'demiryolu', 'tahkimat1', 'agirtop2', 'sihhiye', 'seferberlik', 'ikmal1', 'tarim1', 'zirh1', 'propaganda', 'sanayi2', 'taktik2', 'piyade3', 'topcu2', 'tahkimat2', 'ikmal2', 'idare', 'maliye1', 'maden1'],
  Temkinli: ['tahkimat1', 'sanayi1', 'piyade2', 'kurmay', 'DOK', 'topcu1', 'demiryolu', 'tarim1', 'tahkimat2', 'sihhiye', 'agirtop2', 'idare', 'maliye1', 'ikmal1', 'taktik1', 'sanayi2', 'depo1', 'egitim1', 'propaganda', 'seferberlik'],
  Ticari: ['sanayi1', 'ticaret1', 'tarim1', 'maliye1', 'idare', 'demiryolu', 'insaat1', 'sanayi2', 'maden1', 'tarim2', 'banka1', 'egitim1', 'depo1', 'sihhiye', 'piyade2', 'kurmay', 'tahkimat1', 'DOK'],
};
const DOK_KIS: Record<string, string> = { 'Yayılmacı': 'dok_manevra', Temkinli: 'dok_ates', 'Fırsatçı': 'dok_manevra', Ticari: 'dok_ates', 'İdeolojik': 'dok_kitle' };
function arastirmaSirasi(kis: string): string[] {
  const on = (SIRA_ON[kis] ?? SIRA_ON.Askeri!).map((k) => (k === 'DOK' ? DOK_KIS[kis] ?? 'dok_manevra' : k));
  return [...on, ...TEKNOLOJI.map((t) => t.kod).filter((k) => !on.includes(k) && !k.startsWith('dok_'))];
}

function ekonomiPlan(w: World, c: number, mask = -1): void {
  bakanCagri = true;
  try { ekonomiPlanIc(w, c, mask); } finally { bakanCagri = false; }
}
function ekonomiPlanIc(w: World, c: number, mask: number): void {
  const ac = (b: number) => (mask & b) !== 0;
  const C = w.C.c;
  const g = zorunluGider(w, c);
  const gunluk = Math.max(1, g.toplam);
  const runway = Math.floor(C.hazine[c]! / gunluk);
  if (ac(BK.ekonomi)) {
  // vergi
  if (runway < 45 && C.vergi[c]! < 300_000) emir(w, c, 'vergi', { oran: C.vergi[c]! + 20_000 });
  else if (runway > 300 && C.huzur[c]! < 50_000 && C.vergi[c]! > 100_000) emir(w, c, 'vergi', { oran: C.vergi[c]! - 10_000 });
  // borç
  if (C.hazine[c]! < gunluk * 20 && savastaMi(w, c)) {
    const m = Math.min(krediLimiti(w, c), gunluk * 60);
    if (m > 0) emir(w, c, 'borcAl', { miktar: m });
  } else if (C.borc[c]! > 0 && runway > 200) emir(w, c, 'borcOde', { miktar: Math.floor(C.hazine[c]! / 3) });
  }
  // araştırma
  if (ac(BK.arastirma)) {
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  const sira = arastirmaSirasi(kis);
  // önce bilinmeyen hatlar (kişilik sırası), sonra en düşük kademeli hat yükseltilir
  const nY = acikYuva(w, c);
  for (let k = 0; k < nY; k++) {
    if (w.arastirma[c * NYUVA + k]! >= 0) continue;
    let tamam = false;
    for (const kod of sira) {
      const t = TEKNOLOJI.findIndex((x) => x.kod === kod);
      if (w.tekBitti[c * NTEK + t]) continue;
      if (emir(w, c, 'arastir', { tek: t })) { tamam = true; break; }
    }
    if (tamam) continue;
    const yuk = sira.map((kod) => TEKNOLOJI.findIndex((x) => x.kod === kod)).filter((t) => t >= 0 && w.tekBitti[c * NTEK + t]! > 0)
      .sort((a, b) => w.tekBitti[c * NTEK + a]! - w.tekBitti[c * NTEK + b]! || sira.indexOf(TEKNOLOJI[a]!.kod) - sira.indexOf(TEKNOLOJI[b]!.kod));
    for (const t of yuk) if (emir(w, c, 'arastir', { tek: t })) break;
  }
  }
  // ticaret
  // kalıcı haftalık alım/satım emirleri (gıda, çelik, kömür)
  if (ac(BK.ekonomi)) {
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
  // petrol: stok 20 günden azsa ve üretim ihtiyacı karşılamıyorsa alım; 90 günü aşan üretim fazlası satılır
  if (MAL.length > MALI.petrol) {
    const pi = C.petrolIht[c]!, pd = C.petrolDun[c]!, ps = C.petrol[c]!;
    kaliciSiparis(w, c, MALI.petrol, 0, pi > 0 && pd < pi && ps < pi * 20 && C.hazine[c]! > gunluk * 40 ? birim((pi - pd) * 7) : 0);
    kaliciSiparis(w, c, MALI.petrol, 1, pd > pi && ps > pi * 90 ? birim(((pd - pi) * 7 * 7) / 10) : 0);
  }
  }
  // üretim
  // piyade silahı açığına göre
  if (ac(BK.uretim)) {
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
  }
  // proje
  // hazine güçlüyse sivil fabrika veya demiryolu
  if (ac(BK.insa)) {
  if (runway > 180 && !savastaMi(w, c)) {
    const rs: number[] = [];
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.kontrolEden[r] === c) rs.push(r);
    rs.sort((a, b) => w.pkg.bolgeler[b]!.yerlesim - w.pkg.bolgeler[a]!.yerlesim || a - b);
    // seçenekler: sivil, askerî, demiryolu, şehir imarı (kalabalık bölge), maden ocağı (yataklı bölge)
    const secim = uniformInt(rng(w.tohum, w.gun, 19, c, 0, AMAC.aiChoice, 1, 0), 5);
    const proje = [0, 1, 3, projeIdx('kent'), projeIdx('maden')][secim]!;
    const sira = secim === 4 ? rs.filter((r) => w.pkg.bolgeler[r]!.celik + w.pkg.bolgeler[r]!.komur > 0 || !!w.pkg.bolgeler[r]!.petrol).sort((a, b) => w.R.c.maden[a]! - w.R.c.maden[b]! || w.pkg.bolgeler[b]!.celik + w.pkg.bolgeler[b]!.komur - w.pkg.bolgeler[a]!.celik - w.pkg.bolgeler[a]!.komur || a - b)
      : secim === 3 ? [...rs].sort((a, b) => w.R.c.kent[a]! - w.R.c.kent[b]! || w.pkg.bolgeler[b]!.yerlesim - w.pkg.bolgeler[a]!.yerlesim || a - b).slice(0, 6) : rs;
    for (const r of sira) if (emir(w, c, 'insa', { proje, bolge: r })) break;
  }
  }
  // yasa: savaşta ekonomi ve askerlik
  if (ac(BK.ekonomi) && savastaMi(w, c)) {
    if (C.ekonomi[c]! < 2 && C.destek[c]! >= 60_000) emir(w, c, 'ekonomi', { yasa: 2 });
    else if (C.ekonomi[c]! < 1) emir(w, c, 'ekonomi', { yasa: 1 });
    const ig = insanGucu(w, c);
    if (ig.erisimY < 15_000 && C.askerlik[c]! < 3) emir(w, c, 'askerlik', { yasa: C.askerlik[c]! + 1 });
  }
  if (ac(BK.ekonomi) && !savastaMi(w, c) && C.ekonomi[c]! >= 2) emir(w, c, 'ekonomi', { yasa: 1 });
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
  // barışta ordu gelirle karşılanabilmeli; savaşta açık bütçe ve borç göze alınır
  const karsilanir = savas || C.gelirDun[c]! > gider + Math.floor(gider / 6);
  if (birlik < hedef && karsilanir && ig.erisimY > 25_000 && C.hazine[c]! > gider * 60 + 120_000 && tufek >= 300 && gidaGun >= 30) {
    const sab = savas && birlik % 5 === 4 && w.ekip[ck(c, 5)]! >= 24 ? 2 : 0;
    emir(w, c, 'birlikKur', { sablon: sab, adet: savas && tufek >= 700 ? 2 : 1 });
  } else if (!savas && !tehdit && birlik > taban && C.gelirDun[c]! < gider && C.hazine[c]! < gider * 90) {
    // barışta taşınamayan ordu: en zayıf birlik terhis edilir
    const U = uc(w);
    const zayif = ulkeBirimleri(w, c).filter((u) => U.egitimBitis![u]! <= w.gun).sort((a, b) => U.kisi![a]! - U.kisi![b]! || a - b)[0];
    if (zayif !== undefined) emir(w, c, 'terhis', { birlikler: [w.U.id(zayif)] });
  }
  void SABLON;
}

// ---------- Diplomasi planı ----------
/** Nükleer güçler (çağdaş senaryo): karar modülü bunlara savaş açmaz. */
const NUKLEER = new Set(['USA', 'RUS', 'CHN', 'GBR', 'FRA', 'IND', 'PAK', 'ISR', 'PRK']);

function diplomasiPlan(w: World, c: number): void {
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  // anlaşma önerileri
  // ilişki çevresi: komşular ve büyük güçler (uzak küçük devletler birbiriyle anlaşma kurmaz)
  const guc = (x: number) => w.pkg.ulkeler[x]!.guc ?? 5;
  let teklifSay = 0;
  // oyuncunun önüne yığılan teklifler: uzak küçük devletler oyuncuya yazmaz, bekleyen teklif sayısı sınırlı
  const insan = w.mod !== 2 ? w.oyuncu : -1;
  let oyuncuyaBekleyen = 0;
  if (insan >= 0) for (const s of w.TK.rows()) if (w.TK.c.kime[s] === insan && w.TK.c.durum[s] === 0) oyuncuyaBekleyen++;
  for (let d = 0; d < w.nC; d++) {
    if (d === c || savasta(w, c, d) || pasif(w, d)) continue;
    if (teklifSay >= 3) break; // ayda en çok üç yeni teklif
    const komsu = sinirKomsusu(w, c, d);
    const buyuk = guc(c) >= 6 || guc(d) >= 6;
    if (!komsu && !buyuk) continue;
    if (d === insan && ((!komsu && guc(c) < 6) || oyuncuyaBekleyen >= 4)) continue;
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
    // çağdaş dönem: nükleer caydırıcılık (savaşta değilse saldırılmaz), demokrasilerde savaş eşiği yüksek
    if (AKTIF.donem === 'modern') {
      if (NUKLEER.has(w.pkg.ulkeler[d]!.kod)) continue;
      if (w.C.c.rejim[c] === 2) gerekli += 400_000;
      gerekli += 200_000;
    }
    if (gerekceVar(w, c, d)) {
      if (oran >= Math.max(ESIK_SALDIRI[0]!, gerekli - 100_000) && w.C.c.destek[c]! >= 25_000) { emir(w, c, 'savasIlan', { hedef: d }); return; }
    } else if (gerekceSurecte(w, c, d) < 0 && oran >= gerekli && gorus(w, c, d) < 45_000 && w.C.c.pg[c]! >= 80_000) {
      // yayılmacı ve siyasi gücü bol devlet bahaneyi beklemez: sınır olayı tertipler (ifşa riskini göze alır)
      if (kis === 'Yayılmacı' && w.C.c.pg[c]! >= 160_000 && emir(w, c, 'sinirOlayi', { hedef: d })) return;
      emir(w, c, 'gerekce', { hedef: d });
      return;
    }
  }
}

// ---------- Barış planı ----------
function barisPlan(w: World, c: number): void {
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  // kaybeden taraf: teslim koşulları oluştuysa en çok toprağını tutan düşmana kendisi teslim olur
  if (teslimKosulu(w, c)) {
    let enIyi = -1, enCok = 0;
    for (const d of dusmanlar(w, c)) {
      let n = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.kontrolEden[r] === d) n += bolgeDegeri(w, r);
      if (n > enCok) { enCok = n; enIyi = d; }
    }
    if (enIyi >= 0) {
      const rs: number[] = [];
      for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.kontrolEden[r] === enIyi && r !== w.pkg.ulkeler[c]!.baskent) rs.push(r);
      if (emir(w, c, 'baris', { kime: enIyi, barisTur: 5, bolgeler: rs })) return;
    }
  }
  for (const d of dusmanlar(w, c)) {
    const skor = savasSkoru(w, c, d);
    if (skor >= 25_000) {
      const aday: number[] = [];
      for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === d && w.R.c.kontrolEden[r] === c) aday.push(r);
      aday.sort((a, b) => (Number(iddiaVar(w, b, c)) - Number(iddiaVar(w, a, c))) || bolgeDegeri(w, b) - bolgeDegeri(w, a) || a - b);
      if (teslimKosulu(w, d)) {
        // toprağını tutmadığımız çöken devletle teslim imzalamayız (asıl galibe bırakılır)
        if (aday.length === 0) continue;
        // çöken devlet: yayılmacılar tamamını ilhak eder, ideolojik/temkinliler kukla kurar, diğerleri işgal ettiğini alır
        let sahip = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === d) sahip++;
        if ((kis === 'Yayılmacı' || kis === 'Fırsatçı') && sahip <= 8 && barisKabul(w, d, c, 3, []).kabul) { emir(w, c, 'baris', { kime: d, barisTur: 3, bolgeler: [] }); continue; }
        // kukla yalnız başka cephesi olmayan galip için (büyük savaşın ortasında küçük devleti kukla yapmak cephe açar)
        if ((kis === 'İdeolojik' || kis === 'Temkinli') && dusmanlar(w, c).length === 1 && barisKabul(w, d, c, 4, []).kabul) { emir(w, c, 'baris', { kime: d, barisTur: 4, bolgeler: aday.filter((r) => iddiaVar(w, r, c)) }); continue; }
        emir(w, c, 'baris', { kime: d, barisTur: 2, bolgeler: aday });
        continue;
      }
      // tavizli barış: işgal ettiğimiz bölgeleri iste (iddialar önce), kaybedenin bütçesi kadar
      const butce = tavizButcesi(w, d, c);
      const sec: number[] = [];
      let top = 0;
      const sinir = Math.floor((butce * 6) / 10);
      for (const r of aday) { const v = bolgeDegeri(w, r); if (sec.length < 4 && top + v <= sinir) { sec.push(r); top += v; } }
      if (sec.length > 0) emir(w, c, 'baris', { kime: d, barisTur: 1, bolgeler: sec });
    } else if (istekliligi(w, c, d) >= 250_000 || (skor <= -20_000 && w.C.c.yorgunluk[c]! > 40_000)) {
      emir(w, c, 'baris', { kime: d, barisTur: 0, bolgeler: [] });
    }
  }
}

/** Donanma ve hava kuvvetlerinin görevleri ve yeni siparişler (aylık). */
/** Haftalık: donanma ve hava görevleri (savaş başlayınca bir hafta içinde atanır). */
function kuvvetGorev(w: World, c: number): void {
  const C = w.C.c;
  const dus = dusmanlar(w, c);
  const ben = denizGucu(w, c);
  let onlar = 0; for (const d of dus) onlar = Math.max(onlar, denizGucu(w, d));
  let gorev = 0;
  if (dus.length && ben > 0) {
    if (ben * 2 >= onlar * 3) gorev = 2; // açık üstünlük: abluka
    else if (ben * 5 >= onlar * 3) gorev = 1; // denke yakın: hâkimiyet için meydan okur
    else if (akinGucu(w, c) > 0) gorev = 3; // zayıf: ticaret akını
    if (C.akinKayip[c]! > 80_000 && korumaGucu(w, c) > 0 && gorev !== 2) gorev = 4;
    // akıncı donanma ara sıra ana filoyla baskına çıkar (haftada %8; düşmanın en az %25'i kadar güçlü ve sağlamsa)
    if (gorev === 3 && ben * 100 >= onlar * 25 && C.gHasar[c]! < 200_000 && uniformInt(rng(w.tohum, w.gun, 45, c, 0, AMAC.aiChoice, 0, 0), 100) < 8) gorev = 1;
    if (C.gHasar[c]! > (gorev === 3 ? 400_000 : 250_000)) gorev = 0; // ağır hasarlı filo onarım için limana döner
  }
  if (C.donGorev[c] !== gorev) emir(w, c, 'donanmaGorev', { gorev });
  // hava: en sıcak cephe bölgesinde üstünlük ya da yakın destek
  if (HAVA[AKTIF.donem].length && havaGucu(w, c, 'hava') + havaGucu(w, c, 'destek') > 0) {
    if (dus.length) {
      const U = uc(w);
      const say = new Map<number, number>();
      for (const u of w.U.rows()) if (U.ulke![u] === c && U.muharebe![u]) say.set(U.bolge![u]!, (say.get(U.bolge![u]!) ?? 0) + 1);
      // muharebe yoksa düşmana komşu en kalabalık cephe bölgesi
      if (say.size === 0) for (const u of w.U.rows()) if (U.ulke![u] === c && w.komsuluk[U.bolge![u]!]!.some((q) => dus.includes(w.R.c.kontrolEden[q]!))) say.set(U.bolge![u]!, (say.get(U.bolge![u]!) ?? 0) + 1);
      let r = -1, m = 0; for (const [b, v] of [...say.entries()].sort((x, y) => x[0] - y[0])) if (v > m) { m = v; r = b; }
      if (r < 0) r = w.pkg.ulkeler[c]!.baskent;
      // önce gökyüzü: üstünlük kurulmadan yakın destek boşa gider
      const g = havaGucu(w, c, 'destek') > 0 && havaUstunluk(w, c, r) >= 300_000 ? 2 : 1;
      if (C.havaGorev[c] !== g || C.havaBolge[c] !== r) emir(w, c, 'havaGorev', { gorev: g, bolge: r });
    } else if (C.havaGorev[c] !== 0) emir(w, c, 'havaGorev', { gorev: 0, bolge: -1 });
  }
}

/** Aylık: yeni gemi ve uçak siparişleri. */
function kuvvetPlan(w: World, c: number): void {
  const C = w.C.c;
  const dus = dusmanlar(w, c);
  const ben = denizGucu(w, c);
  // sipariş: hazine güçlü ve gelir bakımı taşıyorsa (savaşta ya da donanma tabanının altına düşünce)
  const gelir = C.gelirDun[c]!;
  const gider = zorunluGider(w, c).toplam;
  if (gelir <= gider * 1.2 || C.hazine[c]! < gelir * 90) return;
  const d0 = w.pkg.ulkeler[c]!.deniz ?? 0;
  // tersane: ana yurdun en sanayileşmiş kıyısı
  let kiyi = -1, kp = -1;
  for (let r = 0; r < w.nR; r++) {
    const b = w.pkg.bolgeler[r]!;
    if (!b.kiyi || w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c) continue;
    const p = (b.anaYurt.includes(c) ? 1000 : 0) + w.R.c.sivilF[r]! + w.R.c.askeriF[r]!;
    if (p > kp) { kp = p; kiyi = r; }
  }
  if (kiyi >= 0 && d0 >= 2 && (dus.length || ben < d0 * 120)) emir(w, c, 'gemiInsa', { sinif: dus.length ? 2 : 1, adet: Math.max(1, Math.floor(d0 / 2)), bolge: kiyi });
  if (HAVA[AKTIF.donem].length && (dus.length || havaGucu(w, c, 'hava') < (w.pkg.ulkeler[c]!.guc ?? 4) * 60)) emir(w, c, 'ucakUret', { tip: dus.length ? 1 : 0, adet: Math.max(1, Math.floor((w.pkg.ulkeler[c]!.guc ?? 4) / 3)) });
}

/**
 * Aylık toplum ve ekonomi politikası: iktidar partisi ve rejime uygun ekonomi modeli, tarife, sübvansiyon, tarım odağı,
 * nüfus politikası; barışçıl demografi (asimilasyon); müttefike yardım; ideolojik devletlerin darbe girişimi; ambargo kaldırma.
 * YZ sürgün ve soykırım uygulamaz: bu seçenekler yalnız oyuncunundur (K-41).
 */
function siyasetPlan(w: World, c: number): void {
  const C = w.C.c;
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  const savas = savastaMi(w, c);
  const ip = C.iktidar[c]!, rj = C.rejim[c]!;
  // ekonomi modeli: yılda bir değerlendirilir
  if (((w.gun + c * 37) % 360) < 30 && C.pg[c]! >= 120_000) {
    const model = rj === 3 && ip === 4 ? 3 : rj === 3 || rj === 4 || ip === 3 ? 2 : ip === 1 && !savas ? 0 : 1;
    if (C.model[c] !== model) emir(w, c, 'ekoModel', { model });
  }
  // tarife: milliyetçi/devletçi yüksek, liberal düşük, savaşta orta-yüksek
  const tarife = ip === 3 || C.model[c]! >= 2 ? 250_000 : ip === 1 ? 50_000 : savas ? 150_000 : 100_000;
  if (Math.abs(C.tarife[c]! - tarife) >= 50_000) emir(w, c, 'tarife', { oran: tarife });
  // gıda ve tarım: stok azsa tahıla döner ve tarımı destekler; bolsa nakit ürünlerine geçer
  const { stok, gunluk } = ulkeGidaStok(w, c);
  const gun = gunluk > 0 ? Math.floor(stok / gunluk) : 999;
  const odak = gun < 45 || savas ? 0 : gun > 150 ? 1 : C.tarimOdak[c]!;
  if (C.tarimOdak[c] !== odak) emir(w, c, 'tarimOdak', { odak });
  const subT = gun < 30 ? 50_000 : 0, subS = savas && C.hazine[c]! > C.g1[c]! ? 30_000 : 0;
  if (C.subTarim[c] !== subT) emir(w, c, 'sub', { alan: 0, oran: subT });
  if (C.subSanayi[c] !== subS) emir(w, c, 'sub', { alan: 1, oran: subS });
  // nüfus: milliyetçi iktidar doğumu teşvik eder
  const pol = ip === 3 && C.hazine[c]! > C.g1[c]! ? 1 : 0;
  if (C.nufusPol[c] !== pol) emir(w, c, 'nufusPol', { pol });
  // barışçıl demografi: milliyetçi ya da tek parti yönetimi en kalabalık azınlığı asimile etmeye çalışır (aynı anda en çok iki bölge)
  if (!savas && (ip === 3 || rj === 3)) {
    let suren = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c && w.R.c.demPol[r]! > 0) suren++;
    if (suren < 2) {
      const ku = w.pkg.ulkeler[c]!.kultur;
      let enR = -1, enK = -1, enN = 0;
      for (let r = 0; r < w.nR; r++) {
        if (w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c || w.R.c.demPol[r]! > 0) continue;
        const a = w.pkg.bolgeler[r]!.kimlikAnahtar;
        if (!a.some(([k]) => k === ku)) continue;
        for (let k = 0; k < a.length && k < NKIMLIK; k++) { const n = w.kim[r * NKIMLIK + k]!; if (a[k]![0] >= 0 && a[k]![0] !== ku && n > enN) { enN = n; enR = r; enK = k; } }
      }
      if (enR >= 0) emir(w, c, 'demografi', { bolge: enR, eylem: 1, kimlik: enK });
    }
  }
  // müttefike yardım: savaştaki müttefik hazinesi tükeniyorsa (ve biz rahatsak)
  if (C.hazine[c]! > C.g1[c]! * 4) {
    for (const s of w.AN.rows()) {
      if (w.AN.c.tur[s] !== A.ittifak) continue;
      const d = w.AN.c.a[s] === c ? w.AN.c.b[s]! : w.AN.c.b[s] === c ? w.AN.c.a[s]! : -1;
      if (d < 0 || pasif(w, d) || !savastaMi(w, d) || C.hazine[d]! > C.g1[d]!) continue;
      if (emir(w, c, 'yardim', { kime: d, miktar: Math.max(10_000, Math.floor(C.g1[c]! / 3)) })) break;
    }
  }
  // ideolojik devletler: komşu kırılgan rejime darbe desteği (yılda bir, düşük olasılık)
  if (kis === 'İdeolojik' && !savas && C.pg[c]! >= 220_000 && uniformInt(rng(w.tohum, w.gun, 44, c, 0, AMAC.aiChoice, 0, 0), 12) === 0) {
    for (let d = 0; d < w.nC; d++) {
      if (d === c || pasif(w, d) || C.rejim[d] === rj || !sinirKomsusu(w, c, d) || C.mesru[d]! > 40_000 || gorus(w, c, d) > 40_000) continue;
      if (emir(w, c, 'darbe', { hedef: d })) break;
    }
  }
  // ambargoyu kaldırma: hedefin suç kaydı söndü ve ilişkiler düzeldiyse
  for (const s of w.AN.rows()) {
    if (w.AN.c.tur[s] !== A.ambargo || w.AN.c.a[s] !== c) continue;
    const d = w.AN.c.b[s]!;
    if (C.zulum[d]! < 20_000 && gorus(w, c, d) >= 30_000) { emir(w, c, 'ambargo', { kime: d, acik: 0 }); break; }
  }
}

/** Kukla ilişkileri: güçlenen ya da efendisi çöken kukla bağımsızlık ilan eder; yayılmacılar zayıf komşuya ültimatom verir. */
function kuklaPlan(w: World, c: number): void {
  const f = efendi(w, c);
  if (f >= 0) {
    if ((gorus(w, c, f) < 25_000 && kendiGuc(w, c) * 3 > kendiGuc(w, f)) || (savastaMi(w, f) && teslimKosulu(w, f))) emir(w, c, 'bagimsizlik', {});
    return;
  }
  const kis = KISILIK[w.pkg.ulkeler[c]!.kisilik]!;
  if ((kis !== 'Yayılmacı' && kis !== 'Fırsatçı') || savastaMi(w, c)) return;
  for (let d = 0; d < w.nC; d++) {
    if (d === c || pasif(w, d) || savasta(w, c, d) || !sinirKomsusu(w, c, d)) continue;
    const istek: number[] = [];
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === d && iddiaVar(w, r, c) && r !== w.pkg.ulkeler[d]!.baskent) istek.push(r);
    if (!istek.length || kendiGuc(w, c) < kendiGuc(w, d) * 3) continue;
    if (emir(w, c, 'teklif', { kime: d, tip: TK.ultimatom, bolgeler: istek.slice(0, 3) })) return;
  }
}

// ---------- Oyuncunun kalıcı emirleri ----------
function oyuncuKalici(w: World, c: number): void {
  if (w.C.c.kaliciGida[c] && ((w.gun % 7) + 7) % 7 === 6) {
    const { stok, gunluk } = ulkeGidaStok(w, c);
    if (gunluk > 0 && stok < gunluk * 20) emir(w, c, 'satinAl', { mal: MALI.gida, miktar: Math.floor((gunluk * 14) / 1000) + 1 });
  }
}

// ---------- Cephe yönetimi (19.5) ----------
/** Toplam güç oranı (S): kendi birliklerimiz / düşmanın gözlenen ordusu (aralık ortası). Haftalık önbellek. */
function ustunluk(w: World, c: number, k: number, birimler: number[]): number {
  const anahtar = `ust${Math.floor(w.gun / 7)}`;
  let o = w.onbellek.get('ustunluk') as { k: string; m: Map<number, number> } | undefined;
  if (!o || o.k !== anahtar) { o = { k: anahtar, m: new Map() }; w.onbellek.set('ustunluk', o); }
  const key = c * 65536 + k;
  const v0 = o.m.get(key);
  if (v0 !== undefined) return v0;
  let biz = 0; for (const u of birimler) { const s = birlikIstat(w, u); biz += s.YS + s.SV; }
  let onlar = 0; for (const g of ulkeGozlem(w, c, k)) onlar += Math.floor((g.gucAlt + g.gucUst) / 2);
  const v = onlar <= 0 ? 10 * S : mulDiv(biz, S, onlar).q;
  o.m.set(key, v);
  return v;
}

function cepheYonet(w: World, c: number): void {
  const U = uc(w);
  const kis = w.pkg.ulkeler[c]!.kisilik;
  const esik = c === w.oyuncu ? 1_500_000 : ESIK_SALDIRI[kis]!;
  // oyuncunun elle yönettiği birlikler (son 30 gün) otomasyonun dışında kalır
  const birimler = ulkeBirimleri(w, c).filter((u) => U.egitimBitis![u]! <= w.gun && !(c === w.oyuncu && w.U.c.elle[u]! > w.gun));
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
  /** Sınır bölgesinin karşısındaki gözlenen düşman gücü (savunma için tutulması gereken güç hesabı). */
  const karsiGuc = new Map<number, number>();
  for (const { r, v: vs } of sinirlarHam) {
    let t = 0, kg = 0;
    for (const v of vs) {
      const k = R.kontrolEden[v]!;
      const dus = savasta(w, c, k);
      const o = gozlem.get(v);
      if (o) for (const [u2, gg] of o) if (u2 === k || savasta(w, c, u2)) { t += gg; if (savasta(w, c, u2)) kg += gg; }
      t += dus ? 20_000 : 5000;
    }
    karsiGuc.set(r, kg);
    // ana yurt ve başkent önce korunur; uzak sömürge sınırları daha az birlik çeker
    if (!w.pkg.bolgeler[r]!.anaYurt.includes(c)) t = Math.floor(t / 2);
    else if (w.pkg.ulkeler[c]!.baskent === r || w.komsuluk[w.pkg.ulkeler[c]!.baskent]!.includes(r)) t = Math.floor((t * 3) / 2);
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
      const komsuDost = w.komsuluk[r]!.filter((v) => R.kontrolEden[v] === c && denizGecer(w, c, v, r));
      if (komsuDost.length === 0) continue;
      const kaynak = birimler.filter((u) => komsuDost.includes(U.bolge![u]!) && U.org![u]! > mulDiv(birlikIstat(w, u).orgMax, 600_000, S).q && birlikIkmal(w, u).oran >= 400_000);
      if (kaynak.length === 0) continue;
      let benim = 0;
      for (const u of kaynak) { const s = birlikIstat(w, u); benim += s.YS + s.SV; }
      let onlar = 0;
      const o = gozlem.get(r);
      if (o) for (const [, gg] of o) onlar += gg;
      // arazi ve tahkimat savunanı güçlendirir; topçu hazırlığı tahkimatı bastırır
      let top = 0, ys = 0;
      for (const u of kaynak) { const s = birlikIstat(w, u); top += s.topcu; ys += s.YS; }
      onlar = mulDiv(onlar, savunmaCarpan(w, r, topcuBaski(w, c, top, ys)), S).q;
      const oran = onlar <= 0 ? 10 * S : mulDiv(benim, S, onlar).q;
      let deger = bolgeDegeri(w, r) * 1000;
      if (iddiaVar(w, r, c) || R.sahip[r] === c) deger *= 2;
      if (w.pkg.ulkeler[k]?.baskent === r) deger *= 2;
      adaylar.push({ hedef: r, deger, kaynak, oran });
    }
    adaylar.sort((a, b) => b.oran - a.oran || b.deger - a.deger || a.hedef - b.hedef);
    // kaynak bölgede kalması gereken güç: karşıdaki düşman gücünün %70'i, bölgenin savunma çarpanıyla bölünür
    const bolgeGuc = new Map<number, number>();
    for (const u of birimler) { const s = birlikIstat(w, u); bolgeGuc.set(U.bolge![u]!, (bolgeGuc.get(U.bolge![u]!) ?? 0) + s.YS + s.SV); }
    const tutGerek = (r: number) => mulDiv(mulDiv(karsiGuc.get(r) ?? 0, 700_000, S).q, S, Math.max(S, savunmaCarpan(w, r, 0))).q;
    let say = 0;
    for (const a of adaylar) {
      if (say >= 3) break;
      // ezici üstünlük: düşman ordusunun (gözlenen) 2,5 katı güçteysek eşik düşer, başkent hedefi daha da cazip
      const hk = R.kontrolEden[a.hedef]!;
      let e = esik;
      if (ustunluk(w, c, hk, birimler) >= 2_500_000) e = Math.max(1_100_000, mulDiv(esik, w.pkg.ulkeler[hk]?.baskent === a.hedef ? 700_000 : 800_000, S).q);
      if (a.oran < e) continue;
      // savunmayı boşaltmamak için kaynak bölgede tehdide yetecek güç kalır; boş bölgeye en çok iki birlik yeter
      const kullan = a.kaynak.filter((u) => !atanmis.has(u)).sort((x, y) => birlikIstat(w, y).YS - birlikIstat(w, x).YS || x - y);
      const giden: number[] = [];
      for (const u of kullan) {
        const r = U.bolge![u]!;
        const s = birlikIstat(w, u);
        const kalan = (bolgeGuc.get(r) ?? 0) - s.YS - s.SV;
        if (kalan < tutGerek(r)) continue;
        bolgeGuc.set(r, kalan);
        giden.push(u);
        if (a.oran >= 10 * S && giden.length >= 2) break;
      }
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
