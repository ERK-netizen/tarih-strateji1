// Bölüm 15: kara hareketi, çekirdek muharebe modu, kayıp, geri çekilme, kontrol devri.
import type { World } from '../state/world.ts';
import { ck, hc } from '../state/world.ts';
import { ARAZI, K, EKIPMAN, NEKIP, ST, YB, NTEK, tekIdx } from '../catalog.ts';
import { S, mulDiv, mulRatio, clamp, largestRemainder } from '../num/index.ts';
import { rng, AMAC, combatR } from '../rng/index.ts';
import {
  uc, rotaTip, kenarTur, savasta, essavasan, muttefik, birlikIstat, birlikIkmal, birlikGidaGun, birlikMuhimmatGunU,
  deneyimCarpan, hareketMevsim, camurDuzey, kisDuzey, birlikAdi, anlat, bildir, fmtSayi,
} from './ortak.ts';
import { kayipYaz, birlikKisiCikar } from './nufus.ts';
import { baslangicItaat } from './siyaset.ts';
import { kenarKey } from '../state/world.ts';
import { KOL_E } from '../state/world.ts';
import { trEk } from '../tr.ts';

export const DURUS = ['Hattı tut', 'Esnek savunma', 'Saldırı', 'Garnizon'] as const;

/** P7: birlik tüketimi (gıda her gün; mühimmat muharebede). */
export function birlikTuketim(w: World): void {
  const U = uc(w);
  for (const u of w.U.rows()) {
    const g = birlikGidaGun(w, u);
    U.gida![u] = Math.max(0, U.gida![u]! - g);
  }
}

interface Muharebe { bolge: number; saldiran: number[]; savunan: number[] }

/** P8: hareket ve karşılaşma listesi. */
export function hareketGunu(w: World): Muharebe[] {
  const U = uc(w);
  const muh = new Map<number, Muharebe>();
  const birimler = w.U.list();
  for (const u of birimler) U.muharebe![u] = 0;
  for (const u of birimler) {
    if (U.egitimBitis![u]! > w.gun) continue;
    const hedef = U.hedef![u]!;
    if (hedef < 0) { U.ilerleme![u] = 0; U.sonraki![u] = -1; continue; }
    const c = U.ulke![u]!;
    const r = U.bolge![u]!;
    if (r === hedef) { U.hedef![u] = -1; U.sonraki![u] = -1; continue; }
    // komşu hedefe doğrudan (sık durum: cephe hareketi), uzak hedefe önbellekli rota
    const y = w.komsuluk[r]!.includes(hedef) ? { yol: [r, hedef], km: 0 } : rotaTip(w, c, 0, r, hedef);
    if (!y || y.yol.length < 2) { U.hedef![u] = -1; continue; }
    const sonraki = y.yol[1]!;
    if (U.sonraki![u] !== sonraki) { U.sonraki![u] = sonraki; U.ilerleme![u] = 0; }
    const kontrol = w.R.c.kontrolEden[sonraki]!;
    if (savasta(w, c, kontrol) && savunanlar(w, sonraki, c).length > 0) {
      // karşılaşma: P8'de tek çatışma kaydı (T050)
      let m = muh.get(sonraki);
      if (!m) { m = { bolge: sonraki, saldiran: [], savunan: [] }; muh.set(sonraki, m); }
      m.saldiran.push(u);
      continue;
    }
    // ilerleme
    const ist = birlikIstat(w, u);
    const deniz = kenarTur(w, r, sonraki);
    let hiz = ist.hiz * 1000;
    if (deniz > 0) {
      // deniz intikali: sabit hız (boğaz geçişi / açık deniz nakliyesi)
      hiz = (deniz === 1 ? K.bogazHiz : K.okyanusHiz) * 1000;
    } else {
      hiz = mulRatio(hiz, hareketMevsim(w, sonraki)).q;
      hiz = mulRatio(hiz, ARAZI[w.pkg.bolgeler[sonraki]!.arazi]!.hareket).q;
      const demir = w.R.c.demiryolu[r]! >= 1 && w.R.c.demiryolu[sonraki]! >= 1 && w.R.c.kontrolEden[r] === c && w.R.c.kontrolEden[sonraki] === c;
      if (demir) hiz *= 3;
      if (U.org![u]! < mulDiv(ist.orgMax, 100_000, S).q) hiz = Math.floor(hiz / 2);
    }
    U.ilerleme![u] = U.ilerleme![u]! + hiz;
    const km = (w.kenarKm.get(kenarKey(r, sonraki)) ?? 150) * 1000;
    if (U.ilerleme![u]! >= km) {
      U.bolge![u] = sonraki; U.ilerleme![u] = 0; U.sonraki![u] = -1;
      if (savasta(w, c, kontrol)) kontrolDegistir(w, sonraki, c);
      if (sonraki === hedef) U.hedef![u] = -1;
    }
  }
  for (const m of muh.values()) {
    const sald = w.U.list().filter((u) => U.bolge![u] === m.bolge);
    m.savunan = sald.filter((u) => {
      const c = U.ulke![u]!;
      return m.saldiran.some((a) => savasta(w, U.ulke![a]!, c));
    });
  }
  return [...muh.values()].sort((a, b) => a.bolge - b.bolge);
}

/** Bölgedeki, saldıran ülkeyle savaşta olan savunucular. */
/** Önizleme: yol boyunca hareket kuralının aynısıyla tahmini gün (bugünkü mevsim, arazi, demiryolu, deniz). */
export function tahminiGun(w: World, u: number, yol: number[]): number {
  const ist = birlikIstat(w, u);
  const c = uc(w).ulke![u]!;
  let gun = 0;
  for (let i = 0; i + 1 < yol.length; i++) {
    const r = yol[i]!, q = yol[i + 1]!;
    const deniz = kenarTur(w, r, q);
    let hiz = ist.hiz * 1000;
    if (deniz > 0) hiz = (deniz === 1 ? K.bogazHiz : K.okyanusHiz) * 1000;
    else {
      hiz = mulRatio(hiz, hareketMevsim(w, q)).q;
      hiz = mulRatio(hiz, ARAZI[w.pkg.bolgeler[q]!.arazi]!.hareket).q;
      if (w.R.c.demiryolu[r]! >= 1 && w.R.c.demiryolu[q]! >= 1 && w.R.c.kontrolEden[r] === c && w.R.c.kontrolEden[q] === c) hiz *= 3;
    }
    const km = (w.kenarKm.get(kenarKey(r, q)) ?? 150) * 1000;
    gun += Math.ceil(km / Math.max(1, hiz));
  }
  return Math.max(1, gun);
}

export function savunanlar(w: World, r: number, saldiranUlke: number): number[] {
  const U = uc(w);
  return w.U.list().filter((u) => U.bolge![u] === r && savasta(w, saldiranUlke, U.ulke![u]!));
}

function genislikSec(w: World, birimler: number[], genislik: number): { aktif: number[]; ceza: number } {
  let top = 0;
  const aktif: number[] = [];
  let ceza = 0;
  for (const u of birimler) {
    const g = birlikIstat(w, u).genislik;
    if (top + g <= genislik) { aktif.push(u); top += g; }
    else if (top < genislik) {
      aktif.push(u);
      const asim = top + g - genislik;
      ceza = Math.min(330_000, mulDiv(asim, S, genislik).q);
      top += g;
      break;
    } else break;
  }
  return { aktif, ceza };
}

interface Taraf { u: number; v: number; k: number; gen: number; orgMax: number }

/** P9: eşzamanlı kara çatışması. Bütün hedefler aynı alt faz başlangıcından hesaplanır (T054). */
export function muharebeGunu(w: World, list: Muharebe[]): void {
  const U = uc(w);
  const orgKayip = new Map<number, number>();
  const kayipOran = new Map<number, { oran: number; tutan: number }>();
  for (const m of list) {
    const b = m.bolge;
    const arazi = ARAZI[w.pkg.bolgeler[b]!.arazi]!;
    w.R.c.sonMuharebe[b] = w.gun;
    const sGen = genislikSec(w, [...m.saldiran].sort((a, x) => a - x), arazi.genislik);
    const dGen = genislikSec(w, [...m.savunan].sort((a, x) => a - x), arazi.genislik);
    const ikmal = (u: number) => 500_000 + mulDiv(500_000, birlikIkmal(w, u).oran, S).q;
    const r = (u: number, taraf: number) => combatR(rng(w.tohum, w.gun, 8, u, w.U.gen[u]!, AMAC.combatRoll, b, taraf));
    const camur = camurDuzey(w, b) >= 2 ? 800_000 : S;
    const sald: Taraf[] = sGen.aktif.map((u) => {
      const s = birlikIstat(w, u);
      let v = mulRatio(s.YS, deneyimCarpan(U.deneyim![u]!)).q;
      v = mulRatio(v, ikmal(u)).q;
      const atli = U.sablon![u] === 1 ? arazi.atli : S;
      v = mulRatio(v, atli).q; v = mulRatio(v, camur).q;
      v = mulRatio(v, S - sGen.ceza).q;
      v = mulRatio(v, r(u, 0)).q;
      if (birlikIkmal(w, u).muh <= 0) v = mulRatio(v, 500_000).q;
      if (kenarTur(w, U.bolge![u]!, b) > 0) v = mulRatio(v, K.cikarmaCarpan).q; // denizden çıkarma
      return { u, v, k: s.YR, gen: Math.max(1, s.genislik), orgMax: s.orgMax };
    });
    const sav: Taraf[] = dGen.aktif.map((u) => {
      const s = birlikIstat(w, u);
      let v = mulRatio(s.YS, deneyimCarpan(U.deneyim![u]!)).q;
      v = mulRatio(v, ikmal(u)).q;
      v = mulRatio(v, S - dGen.ceza).q;
      v = mulRatio(v, r(u, 1)).q;
      let k = mulRatio(s.SV, arazi.savunma).q;
      k = mulRatio(k, ikmal(u)).q;
      if (U.durus![u] === 1) k = mulRatio(k, 1_100_000).q;
      return { u, v, k, gen: Math.max(1, s.genislik), orgMax: s.orgMax };
    });
    // saldırı hedeflere genişlik payıyla paylaştırılır (T057)
    const vur = (atan: Taraf[], hedef: Taraf[]) => {
      const genTop = hedef.reduce((a, t) => a + t.gen, 0);
      for (const h of hedef) {
        let gelen = 0;
        for (const a of atan) gelen += mulDiv(a.v, h.gen, genTop).q;
        const etkin = mulDiv(Math.min(gelen, h.k), 100_000, S).q + mulDiv(Math.max(0, gelen - h.k), 400_000, S).q;
        const tavan = mulDiv(h.orgMax, K.orgTavan, S).q;
        const ok = Math.min(tavan, mulDiv(etkin, K.lambda, S).q);
        orgKayip.set(h.u, (orgKayip.get(h.u) ?? 0) + ok);
        const oran = Math.min(30_000, mulDiv(ok, 300_000, Math.max(1, h.orgMax)).q);
        const tutan = U.ulke![atan[0]!.u]!;
        kayipOran.set(h.u, { oran: Math.min(30_000, (kayipOran.get(h.u)?.oran ?? 0) + oran), tutan });
      }
    };
    if (sav.length > 0 && sald.length > 0) { vur(sald, sav); vur(sav, sald); }
    // mühimmat ve deneyim
    for (const t of [...sald, ...sav]) {
      const u = t.u;
      U.muharebe![u] = 1;
      U.muhimmatS![u] = Math.max(0, U.muhimmatS![u]! - birlikMuhimmatGunU(w, u));
      U.deneyim![u] = Math.min(100_000, U.deneyim![u]! + 200);
      U.savasGun![u] = U.savasGun![u]! + 1;
    }
    for (const u of [...m.saldiran, ...m.savunan]) U.muharebe![u] = 1;
  }
  // eşzamanlı uygulama: önce bütün kayıplar hesaplandı, sonra yazılır
  for (const [u, ok] of [...orgKayip.entries()].sort((a, b) => a[0] - b[0])) {
    U.org![u] = Math.max(0, U.org![u]! - ok);
    const ko = kayipOran.get(u)!;
    const n = mulDiv(U.kisi![u]!, ko.oran, S).q;
    if (n > 0) {
      const p = largestRemainder(n, [300_000, 650_000, 50_000]);
      kayipYaz(w, u, p[0]!, p[1]!, p[2]!, ko.tutan);
    }
    // ekipman kaybı: oranın yarısı
    for (let k = 0; k < NEKIP; k++) {
      const e = U[KOL_E[k]!]![u]!;
      const kayip = mulDiv(e, Math.floor(ko.oran / 2), S).q;
      U[KOL_E[k]!]![u] = e - kayip;
    }
  }
}

/** P10: geri çekilme, teslim, kontrol devri, tamamlamalar. */
export function sonucGunu(w: World, list: Muharebe[]): void {
  const U = uc(w);
  for (const m of list) {
    const b = m.bolge;
    const kalanSavunan: number[] = [];
    for (const u of m.savunan) {
      if (w.U.resolve(w.U.id(u)) < 0) continue;
      const ist = birlikIstat(w, u);
      if (U.org![u]! <= mulDiv(ist.orgMax, 10_000, S).q || U.kisi![u]! <= 0) geriCekil(w, u, m.saldiran);
      else kalanSavunan.push(u);
    }
    const kalanSald = m.saldiran.filter((u) => w.U.alive[u] && U.org![u]! > mulDiv(birlikIstat(w, u).orgMax, 100_000, S).q);
    for (const u of m.saldiran) if (w.U.alive[u] && !kalanSald.includes(u)) { U.hedef![u] = -1; U.sonraki![u] = -1; }
    const hala = w.U.list().filter((u) => U.bolge![u] === b && m.saldiran.some((a) => w.U.alive[a] && savasta(w, U.ulke![a]!, U.ulke![u]!)));
    if (hala.length === 0 && kalanSald.length > 0) {
      const kazanan = U.ulke![kalanSald[0]!]!;
      for (const u of kalanSald) { U.bolge![u] = b; U.ilerleme![u] = 0; U.sonraki![u] = -1; if (U.hedef![u] === b) U.hedef![u] = -1; }
      kontrolDegistir(w, b, kazanan);
    }
  }
  // organizasyon yenilenmesi (muharebe dışı)
  for (const u of w.U.rows()) {
    const ist = birlikIstat(w, u);
    const c = U.ulke![u]!;
    const tavan = mulRatio(ist.orgMax, w.C.c.bakimOdenen[c]!).q;
    if (U.muharebe![u]! === 0) {
      let yen = mulDiv(ist.orgMax, 50_000, S).q;
      yen = mulRatio(yen, birlikIkmal(w, u).oran).q;
      if (w.tekBitti[c * NTEK + tekIdx('kurmay')]) yen = mulRatio(yen, 1_200_000).q;
      U.org![u] = Math.min(tavan, U.org![u]! + yen);
    }
    if (U.org![u]! > tavan) U.org![u] = tavan;
    if (U.egitimBitis![u]! === w.gun && U.egitimBitis![u]! > 0) {
      anlat(w, `${birlikAdi(w, u)} eğitimini tamamladı ve göreve hazır.`, 'ordu', c, 0);
      bildir(w, 'egitim', `${birlikAdi(w, u)} hazır`, c, false);
    }
  }
  kisYipranmasi(w);
}

function geriCekil(w: World, u: number, saldiranlar: number[]): void {
  const U = uc(w);
  const c = U.ulke![u]!;
  const r = U.bolge![u]!;
  const dusman = U.ulke![saldiranlar[0]!]!;
  let hedef = -1;
  for (const v of w.komsuluk[r]!) {
    const k = w.R.c.kontrolEden[v]!;
    if (!(k === c || essavasan(w, c, k) || muttefik(w, c, k))) continue;
    // düşman birliği bulunan bölgeye çekilmez
    if (w.U.list().some((x) => U.bolge![x] === v && savasta(w, c, U.ulke![x]!))) continue;
    if (hedef < 0 || v < hedef) hedef = v;
  }
  if (hedef >= 0) {
    U.bolge![u] = hedef; U.hedef![u] = -1; U.sonraki![u] = -1; U.ilerleme![u] = 0;
    anlat(w, `${birlikAdi(w, u)} ${trEk(w.pkg.bolgeler[r]!.ad, 'den')} ${trEk(w.pkg.bolgeler[hedef]!.ad, 'e')} geri çekildi.`, 'muharebe', c, 1);
    return;
  }
  // teslim: kuşatmada personel esir, ekipmanın yarısı ele geçer
  const ad = birlikAdi(w, u);
  const n = U.kisi![u]!;
  kayipYaz(w, u, 0, 0, n, dusman);
  for (let k = 0; k < NEKIP; k++) {
    const e = U[KOL_E[k]!]![u]!;
    w.ekip[ck(dusman, k)] = w.ekip[ck(dusman, k)]! + Math.floor(e / 2);
  }
  anlat(w, `${ad} ${trEk(w.pkg.bolgeler[r]!.ad, 'de')} kuşatıldı ve ${fmtSayi(n)} askeriyle teslim oldu.`, 'muharebe', c, 3);
  bildir(w, 'teslim', `${ad} teslim oldu`, c, true);
  w.U.release(u);
  void birlikKisiCikar;
}

/** Kontrol devri (15.10, 9.3). Ekonomik etki ertesi gün. */
export function kontrolDegistir(w: World, r: number, yeni: number): void {
  const R = w.R.c;
  const eski = R.kontrolEden[r]!;
  if (eski === yeni) return;
  const sahip = R.sahip[r]!;
  // kurtarma: sahip yeni kontrolcünün eş savaşanıysa kontrol sahibe döner
  const hedefK = sahip !== yeni && essavasan(w, yeni, sahip) && !savasta(w, yeni, sahip) ? sahip : yeni;
  R.kontrolEden[r] = hedefK;
  w.rotaEpoch++;
  const ad = w.pkg.bolgeler[r]!.ad;
  if (hedefK === sahip) {
    R.kontrol[r] = Math.max(R.kontrol[r]!, 40_000); R.itaat[r] = 0; R.direnis[r] = 0; R.isgalGun[r] = 0;
    anlat(w, `${ad} ${w.pkg.ulkeler[sahip]!.sifat} kuvvetlerince geri alındı.`, 'muharebe', sahip, 2);
    bildir(w, 'bolge', `${ad} geri alındı`, sahip, false);
  } else {
    R.itaat[r] = baslangicItaat(w, r, hedefK); R.direnis[r] = 20_000; R.isgalGun[r] = 0;
    R.tahkimat[r] = Math.floor(R.tahkimat[r]! / 2);
    // yerel gıda: eyalet deposu sahibinde kalır, bölgeye 10 günlük yerel stok
    anlat(w, `${w.pkg.ulkeler[hedefK]!.sifat} kuvvetleri ${ad}'ı ele geçirdi.`, 'muharebe', hedefK, 2);
    bildir(w, 'bolge', `${ad} düştü (${w.pkg.ulkeler[hedefK]!.kisa})`, sahip, w.pkg.ulkeler[sahip]!.baskent === r);
    w.C.c.zafer[hedefK] = Math.min(20_000, w.C.c.zafer[hedefK]! + 2000);
    w.C.c.zafer[sahip] = Math.max(-20_000, w.C.c.zafer[sahip]! - 2000);
  }
  void eski;
}

/** Kış yıpranması (15.6): erzaklı %0,05/%0,15/%0,30, erzaksız %0,2/%0,5/%1; dağda ×1,5. Aynı kayıp iki kez yazılmaz (T069). */
function kisYipranmasi(w: World): void {
  const U = uc(w);
  const erzakli = [0, 500, 1500, 3000];
  const erzaksiz = [2000, 2000, 5000, 10_000];
  for (const u of w.U.list()) {
    const r = U.bolge![u]!;
    const kis = kisDuzey(w, r);
    const ikmalYok = U.gida![u]! <= 0;
    // kendi kontrolündeki bölgede ve cephe dışında kışlada barınır
    const evde = w.R.c.kontrolEden[r] === U.ulke![u] && w.gun - w.R.c.sonMuharebe[r]! > 7;
    if (evde && !ikmalYok) continue;
    let oran = ikmalYok ? erzaksiz[kis]! : erzakli[kis]!;
    if (oran === 0) continue;
    if (w.pkg.bolgeler[r]!.arazi === 3) oran = mulDiv(oran, 3, 2).q;
    const n = mulDiv(U.kisi![u]!, oran, S).q;
    if (n <= 0) continue;
    const yarim = Math.floor(n / 2);
    kayipYaz(w, u, yarim, n - yarim, 0, -1);
  }
  void clamp; void hc; void ST; void YB; void EKIPMAN;
}
