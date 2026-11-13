// Bölüm 15: kara hareketi, çekirdek muharebe modu, kayıp, geri çekilme, kontrol devri.
import type { World, MuharebeKaydi, MuharebeBirlik } from '../state/world.ts';
import { komutanYuk, komutanCarpan, komutanDeneyim, komutanAdi } from './komutan.ts';
import { ck, hc } from '../state/world.ts';
import { tekCarpan, kayipUygula } from './gelisim.ts';
import { ARAZI, K, EKIPMAN, NEKIP, ST, YB, NTEK, tekIdx, tekVar, AKTIF } from '../catalog.ts';
import { MT } from '../state/world.ts';
import type { DonemKod } from '../donem.ts';
import { S, mulDiv, mulRatio, clamp, largestRemainder } from '../num/index.ts';
import { rng, AMAC, combatR } from '../rng/index.ts';
import {
  uc, rotaTip, kenarTur, savasta, essavasan, muttefik, birlikIstat, birlikIkmal, birlikGidaGun, birlikMuhimmatGunU,
  deneyimCarpan, hareketMevsim, camurDuzey, kisDuzey, birlikAdi, anlat, bildir, fmtSayi, modDeger, denizGecer,
} from './ortak.ts';
import type { Istat } from './ortak.ts';
import { havaUstunluk, yakinDestek } from './deniz.ts';
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
    const y = w.komsuluk[r]!.includes(hedef) && denizGecer(w, c, r, hedef) ? { yol: [r, hedef], km: 0 } : rotaTip(w, c, 0, r, hedef);
    if (!y || y.yol.length < 2) {
      if (c === w.oyuncu && w.mod !== 2 && kenarTur(w, r, hedef) > 0) bildir(w, 'birlik', `${birlikAdi(w, u)}: düşman donanması deniz geçişini kapatıyor`, c, false);
      U.hedef![u] = -1; continue;
    }
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
      // düşman toprağına giriş: keşif, yerel direniş ve köprü yıkımı ilerlemeyi yarıya indirir; ana yurtta daha da yavaş
      if (savasta(w, c, kontrol)) hiz = w.pkg.bolgeler[sonraki]!.anaYurt.includes(kontrol) ? Math.floor(hiz * 2 / 5) : Math.floor(hiz / 2);
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
      const k = w.R.c.kontrolEden[q]!;
      if (savasta(w, c, k)) hiz = w.pkg.bolgeler[q]!.anaYurt.includes(k) ? Math.floor(hiz * 2 / 5) : Math.floor(hiz / 2);
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

interface Taraf { u: number; v: number; k: number; gen: number; orgMax: number; okC: number }

// ---------- Tahkimat (siper, sur, mevzi) ----------
/** Dönem tahkimat tavanı (S): savunma çarpanına eklenen en yüksek pay. Büyük Savaş siper çağıdır. */
const TAHKIMAT_TAVAN: Record<DonemKod, number> = { orta: 200_000, barut: 300_000, buyuk: 600_000, ikinci: 350_000, modern: 300_000 };
export function tahkimatTavan(w: World, c: number): number {
  let t = TAHKIMAT_TAVAN[AKTIF.donem];
  if (tekVar(w, c, 'tahkimat1')) t = mulDiv(t, 115, 100).q;
  if (tekVar(w, c, 'tahkimat2')) t = mulDiv(t, 115, 100).q;
  return t;
}
/** Saldıran topçusunun tahkimatı bastırma payı (S, en çok %60). */
export function topcuBaski(w: World, c: number, topcu: number, ys: number): number {
  if (ys <= 0 || topcu <= 0) return 0;
  const pay = mulDiv(topcu, S, ys).q;
  return Math.min(600_000, mulDiv(pay, tekVar(w, c, 'topcu2') ? 2 : 3, tekVar(w, c, 'topcu2') ? 1 : 2).q);
}
/** Bölgenin etkin savunma çarpanı (S): arazi × (1 + 0,8 × etkin tahkimat). Önizleme ve karar için de kullanılır. */
export function savunmaCarpan(w: World, r: number, baski: number): number {
  const arazi = ARAZI[w.pkg.bolgeler[r]!.arazi]!;
  const tah = mulDiv(w.R.c.tahkimat[r]!, S - baski, S).q;
  return mulDiv(arazi.savunma, S + mulDiv(tah, 800_000, S).q, S).q;
}
/** Günlük tahkimat: bölgeyi tutan ülkenin duran birlikleri kazar; birlik yoksa çürür. Başkentte kalıcı sur/mevzi tabanı vardır. */
export function tahkimatGunu(w: World): void {
  const U = uc(w), R = w.R.c;
  const var_ = new Uint8Array(w.nR);
  for (const u of w.U.rows()) {
    const r = U.bolge![u]!;
    if (U.ulke![u] !== R.kontrolEden[r] || U.egitimBitis![u]! > w.gun) continue;
    if (U.hedef![u]! >= 0 && U.hedef![u] !== r) continue;
    var_[r] = 1;
  }
  for (let r = 0; r < w.nR; r++) {
    const c = R.kontrolEden[r]!;
    if (c < 0) continue;
    const tavan = tahkimatTavan(w, c);
    const taban = w.pkg.ulkeler[c]!.baskent === r && R.sahip[r] === c ? tavan >> 1 : 0;
    const t = R.tahkimat[r]!;
    if (var_[r]) {
      if (R.sonMuharebe[r] !== w.gun && t < tavan) R.tahkimat[r] = Math.min(tavan, t + mulDiv(Math.floor(tavan / 30), tekVar(w, c, 'tahkimat1') ? 3 : 2, 2).q);
    } else if (t > taban) R.tahkimat[r] = Math.max(taban, t - Math.max(1, Math.floor(tavan / 120)));
    if (R.tahkimat[r]! < taban) R.tahkimat[r] = taban;
  }
}

/** P9: eşzamanlı kara çatışması. Bütün hedefler aynı alt faz başlangıcından hesaplanır (T054). */
export function muharebeGunu(w: World, list: Muharebe[]): void {
  const U = uc(w);
  const orgKayip = new Map<number, number>();
  const kayipOran = new Map<number, { oran: number; tutan: number }>();
  // komutan etkisi birlik başına bir kez hesaplanır (yük: komutan başına birlik sayısı)
  const yuk = komutanYuk(w);
  const kmOnbellek = new Map<number, ReturnType<typeof komutanCarpan>>();
  const km = (u: number) => { let x = kmOnbellek.get(u); if (x === undefined) { x = komutanCarpan(w, u, yuk); kmOnbellek.set(u, x); } return x; };
  const kayitlar: MuharebeKaydi[] = [];
  for (const m of list) {
    const b = m.bolge;
    const arazi = ARAZI[w.pkg.bolgeler[b]!.arazi]!;
    w.R.c.sonMuharebe[b] = w.gun;
    const sGen = genislikSec(w, [...m.saldiran].sort((a, x) => a - x), arazi.genislik);
    const dGen = genislikSec(w, [...m.savunan].sort((a, x) => a - x), arazi.genislik);
    const ikmal = (u: number) => Math.min(S, 500_000 + mulDiv(500_000, birlikIkmal(w, u).oran, S).q + (km(u)?.ikmal ?? 0));
    const r = (u: number, taraf: number) => combatR(rng(w.tohum, w.gun, 8, u, w.U.gen[u]!, AMAC.combatRoll, b, taraf));
    const camur = camurDuzey(w, b) >= 2 ? 800_000 : S;
    const ist = new Map<number, Istat>();
    for (const u of [...sGen.aktif, ...dGen.aktif]) ist.set(u, birlikIstat(w, u));
    // topçu hazırlığı tahkimatı bastırır; farklı bölgelerden gelen saldırı kuşatma etkisi yapar
    let topTop = 0, ysTop = 0;
    for (const u of sGen.aktif) { topTop += ist.get(u)!.topcu; ysTop += ist.get(u)!.YS; }
    const sc = sGen.aktif.length > 0 ? U.ulke![sGen.aktif[0]!]! : -1;
    const baski = sc >= 0 ? topcuBaski(w, sc, topTop, ysTop) : 0;
    const savCarpan = savunmaCarpan(w, b, baski);
    const kaynak = new Set(m.saldiran.map((u) => U.bolge![u]!));
    const sv = sGen.aktif.length > 0 && dGen.aktif.length > 0;
    const sald: Taraf[] = sGen.aktif.map((u) => {
      const s = ist.get(u)!;
      const c = U.ulke![u]!;
      let v = mulRatio(s.YS, deneyimCarpan(U.deneyim![u]!)).q;
      v = mulRatio(v, ikmal(u)).q;
      v = mulRatio(v, tekCarpan(w, c).saldiri).q;
      const kc = km(u);
      if (kc) v = mulRatio(v, kc.saldiri).q;
      const atli = U.sablon![u] === 1 ? arazi.atli : S;
      v = mulRatio(v, atli).q; v = mulRatio(v, camur).q;
      v = mulRatio(v, S - sGen.ceza).q;
      v = mulRatio(v, r(u, 0)).q;
      if (birlikIkmal(w, u).muh <= 0) v = mulRatio(v, 500_000).q;
      if (kenarTur(w, U.bolge![u]!, b) > 0) v = mulRatio(v, K.cikarmaCarpan).q; // denizden çıkarma
      if (kaynak.size >= 2) v = mulRatio(v, tekVar(w, c, 'dok_manevra') ? 1_200_000 : 1_100_000).q; // kuşatma
      const md = modDeger(w, c, MT.saldiri);
      if (md) v = mulRatio(v, Math.max(200_000, S + md)).q;
      // hava üstünlüğü ve yakın destek
      // yakın destek hava üstünlüğüyle ölçeklenir: gökyüzü düşmandaysa bombardıman uçakları hedefe ulaşamaz
      const hu = havaUstunluk(w, c, b);
      const hd = mulDiv(yakinDestek(w, c, b), S + hu, 2 * S).q;
      if (hu || hd) v = mulRatio(v, Math.max(600_000, S + mulDiv(200_000, hu, S).q + hd)).q;
      return { u, v, k: s.YR, gen: Math.max(1, s.genislik), orgMax: s.orgMax, okC: mulRatio(tekVar(w, c, 'taktik2') ? 900_000 : S, tekCarpan(w, c).dayanim).q };
    });
    const sav: Taraf[] = dGen.aktif.map((u) => {
      const s = ist.get(u)!;
      const c = U.ulke![u]!;
      let v = mulRatio(s.YS, deneyimCarpan(U.deneyim![u]!)).q;
      v = mulRatio(v, ikmal(u)).q;
      v = mulRatio(v, S - dGen.ceza).q;
      v = mulRatio(v, tekCarpan(w, c).saldiri).q;
      v = mulRatio(v, r(u, 1)).q;
      // tahkimat yalnız bölgeyi tutan ülkenin birliklerine yarar
      let k = mulRatio(s.SV, w.R.c.kontrolEden[b] === c ? savCarpan : arazi.savunma).q;
      k = mulRatio(k, ikmal(u)).q;
      k = mulRatio(k, tekCarpan(w, c).savunma).q;
      const kc = km(u);
      if (kc) k = mulRatio(k, kc.savunma).q;
      if (U.durus![u] === 1) k = mulRatio(k, 1_100_000).q;
      const md = modDeger(w, c, MT.savunma);
      if (md) k = mulRatio(k, Math.max(200_000, S + md)).q;
      const hu = havaUstunluk(w, c, b);
      const hd = mulDiv(yakinDestek(w, c, b), S + hu, 2 * S).q;
      if (hu || hd) k = mulRatio(k, Math.max(700_000, S + mulDiv(120_000, hu, S).q + Math.floor(hd / 2))).q;
      return { u, v, k, gen: Math.max(1, s.genislik), orgMax: s.orgMax, okC: tekCarpan(w, c).dayanim };
    });
    // muharebe tahkimatı aşındırır (topçu ile daha hızlı)
    if (sv && w.R.c.tahkimat[b]! > 0) w.R.c.tahkimat[b] = w.R.c.tahkimat[b]! - mulDiv(w.R.c.tahkimat[b]!, 5_000 + mulDiv(baski, 20_000, S).q, S).q;
    // saldırı hedeflere genişlik payıyla paylaştırılır (T057)
    const vur = (atan: Taraf[], hedef: Taraf[]) => {
      const genTop = hedef.reduce((a, t) => a + t.gen, 0);
      for (const h of hedef) {
        let gelen = 0;
        for (const a of atan) gelen += mulDiv(a.v, h.gen, genTop).q;
        const etkin = mulDiv(Math.min(gelen, h.k), 100_000, S).q + mulDiv(Math.max(0, gelen - h.k), 400_000, S).q;
        const tavan = mulDiv(h.orgMax, K.orgTavan, S).q;
        const ok = mulRatio(Math.min(tavan, mulDiv(etkin, K.lambda, S).q), h.okC).q;
        orgKayip.set(h.u, (orgKayip.get(h.u) ?? 0) + ok);
        const oran = kayipUygula(Math.min(30_000, mulDiv(ok, 300_000, Math.max(1, h.orgMax)).q), tekCarpan(w, U.ulke![h.u]!).kayip);
        const tutan = U.ulke![atan[0]!.u]!;
        kayipOran.set(h.u, { oran: Math.min(30_000, (kayipOran.get(h.u)?.oran ?? 0) + oran), tutan });
      }
    };
    if (sav.length > 0 && sald.length > 0) { vur(sald, sav); vur(sav, sald); }
    // muharebe kaydı (hash dışı): görüntüleyici yalnız bunu oynatır, ikinci bir hesap yapmaz
    if (sav.length > 0 && sald.length > 0) {
      const dc = U.ulke![dGen.aktif[0]!]!;
      if (w.mod === 2 || sc === w.oyuncu || dc === w.oyuncu) {
        const satir = (x: Taraf, taraf: 0 | 1): MuharebeBirlik => {
          const kk = km(x.u);
          return { id: w.U.id(x.u), ad: birlikAdi(w, x.u), ulke: U.ulke![x.u]!, taraf, sablon: U.sablon![x.u]!, komutan: kk ? komutanAdi(w, kk.k) : '', guc: x.v, savunma: x.k, orgOnce: U.org![x.u]!, orgSonra: U.org![x.u]!, orgMax: x.orgMax, kisiOnce: U.kisi![x.u]!, kisiSonra: U.kisi![x.u]! };
        };
        kayitlar.push({ gun: w.gun, bolge: b, saldiran: sc, savunan: dc, savCarpan, baski, yon: kaynak.size, hava: havaUstunluk(w, sc, b), birlikler: [...sald.map((x) => satir(x, 0)), ...sav.map((x) => satir(x, 1))], sonuc: 0 });
      }
    }
    // mühimmat ve deneyim
    for (const t of [...sald, ...sav]) {
      const u = t.u;
      U.muharebe![u] = 1;
      U.muhimmatS![u] = Math.max(0, U.muhimmatS![u]! - birlikMuhimmatGunU(w, u));
      U.deneyim![u] = Math.min(100_000, U.deneyim![u]! + 200);
      U.savasGun![u] = U.savasGun![u]! + 1;
      komutanDeneyim(w, u);
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
  // kayıtlara kesinleşen sonuçlar yazılır
  for (const kr of kayitlar) {
    for (const x of kr.birlikler) { const u = w.U.resolve(x.id); if (u >= 0) { x.orgSonra = U.org![u]!; x.kisiSonra = U.kisi![u]!; } else { x.orgSonra = 0; x.kisiSonra = 0; } }
    w.muharebeler.push(kr);
  }
  if (w.muharebeler.length > MUHAREBE_KAYIT_AZAMI) w.muharebeler.splice(0, w.muharebeler.length - MUHAREBE_KAYIT_AZAMI);
}
/** Saklanan muharebe kaydı tavanı (eskiler düşer). */
export const MUHAREBE_KAYIT_AZAMI = 300;

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
    // muharebe kaydının sonucu: 1 bölge alındı, 2 saldırı püskürtüldü (yoksa sürüyor)
    for (let i = w.muharebeler.length - 1; i >= 0 && w.muharebeler[i]!.gun === w.gun; i--) {
      if (w.muharebeler[i]!.bolge === b) { w.muharebeler[i]!.sonuc = hala.length === 0 && kalanSald.length > 0 ? 1 : kalanSald.length === 0 ? 2 : 0; break; }
    }
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
  tahkimatGunu(w);
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
  R.tahkimat[r] = 0; // siperler ve mevziler yeni sahibine dönük değildir
  w.rotaEpoch++;
  const ad = w.pkg.bolgeler[r]!.ad;
  if (hedefK === sahip) {
    R.kontrol[r] = Math.max(R.kontrol[r]!, 40_000); R.itaat[r] = 0; R.direnis[r] = 0; R.isgalGun[r] = 0;
    anlat(w, `${ad} ${w.pkg.ulkeler[sahip]!.sifat} kuvvetlerince geri alındı.`, 'muharebe', sahip, 2);
    bildir(w, 'bolge', `${ad} geri alındı`, sahip, false);
  } else {
    R.itaat[r] = baslangicItaat(w, r, hedefK); R.direnis[r] = 20_000; R.isgalGun[r] = 0;
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
