// Bölüm 21: olaylar, açılış krizi zinciri (Temmuz Krizi karşılığı), şablonlu Kronik.
import type { World } from '../state/world.ts';
import { A } from '../state/world.ts';
import { KISILIK, MALI } from '../catalog.ts';
import { S, mulDiv } from '../num/index.ts';
import { rng, AMAC, uniformInt } from '../rng/index.ts';
import { tarih } from '../calendar/index.ts';
import { anlat, bildir, savastaMi, anlasmaVar, savasta, tarafi, diploDegisti } from './ortak.ts';
import { gerekceBaslat, gorusDegis, savasIlan, savasaKatil, anlasmaKur, anlasmaBoz, barisUygula } from './diplomasi.ts';
import type { PaketEylem, PaketSenaryoOlay, Paket } from '../paket.ts';
import { clamp } from '../num/index.ts';
import { ulkeGidaGuvence, ulkeGidaStok, HASAT_KUCUK } from './ekonomi.ts';

export interface Secenek { ad: string; etki: string; uygula: (w: World, c: number, p1: number, p2: number) => void; yz: (w: World, c: number) => number }
export interface Olay { kod: string; baslik: string; metin: (w: World, c: number, p1: number) => string; secenekler: Secenek[] }

const ad = (w: World, c: number) => w.pkg.ulkeler[c]!.ad;
const kisa = (w: World, c: number) => w.pkg.ulkeler[c]!.kisa;
const MVK = 1, DMR = 2;

export const OLAYLAR: Olay[] = [
  {
    kod: 'suikast', baslik: 'Tunçkale Suikastı',
    metin: () => `Demirhan veliahdı, sınır kenti Tunçkale'de bir Mavikıyılı milliyetçinin kurşunuyla öldürüldü. Saray öfkeli, kalabalıklar intikam istiyor. Bütün başkentler İmparatorluğun yanıtını bekliyor.`,
    secenekler: [
      { ad: 'Mavikıyı\'ya ültimatom ver', etki: 'Mavikıyı 10 gün içinde yanıt vermek zorunda; red savaş gerekçesi doğurur. Dünya gerginliği artar.', uygula: (w, c) => {
        w.C.c.krizAsama[c] = 1; w.C.c.gerginlik[c] = w.C.c.gerginlik[c]! + 10_000;
        olayPlanla(w, 'ultimatom', MVK, w.gun + 10, c, 0);
        gorusDegis(w, MVK, c, -15_000);
        anlat(w, `${ad(w, c)}, Mavikıyı'ya on günlük bir ültimatom verdi: suikastçıların teslimi ve Demirhanlı soruşturmacıların ülkeye kabulü.`, 'kriz', c, 3);
      }, yz: (w, c) => (KISILIK[w.pkg.ulkeler[c]!.kisilik] === 'Yayılmacı' ? 85 : 30) },
      { ad: 'Uluslararası soruşturma iste', etki: 'Huzur −5; Mavikıyı ile ilişkiler yumuşar; kriz söner.', uygula: (w, c) => {
        w.C.c.huzur[c] = Math.max(0, w.C.c.huzur[c]! - 5000); gorusDegis(w, MVK, c, 5000);
        anlat(w, `${ad(w, c)} öfkesini dizginledi ve tarafsız bir soruşturma heyeti istedi. Avrupa rahat bir nefes aldı.`, 'kriz', c, 2);
      }, yz: () => 25 },
      { ad: 'Sessiz kal', etki: 'Meşruiyet −10.', uygula: (w, c) => {
        w.C.c.mesru[c] = Math.max(0, w.C.c.mesru[c]! - 10_000);
        anlat(w, `${ad(w, c)} sarayı suikast karşısında sessiz kaldı; muhalefet hükümeti korkaklıkla suçluyor.`, 'kriz', c, 1);
      }, yz: () => 5 },
    ],
  },
  {
    kod: 'ultimatom', baslik: 'Demirhan\'ın Ültimatomu',
    metin: (w, c, p1) => `${ad(w, p1)} suikastçıların teslimini ve kendi soruşturmacılarının ülkemizde serbestçe çalışmasını istiyor. Kabul, egemenliğimizden ödün demek; red ise savaş demek olabilir.${anlasmaVar(w, A.garanti, 0, c) >= 0 ? ' Akdağ Krallığı bağımsızlığımızın garantörüdür.' : ''}`,
    secenekler: [
      { ad: 'Ültimatomu kabul et', etki: 'Huzur −15, meşruiyet −10; savaştan kaçınılır.', uygula: (w, c, p1) => {
        w.C.c.huzur[c] = Math.max(0, w.C.c.huzur[c]! - 15_000); w.C.c.mesru[c] = Math.max(0, w.C.c.mesru[c]! - 10_000);
        w.C.c.pg[p1] = Math.min(500_000, w.C.c.pg[p1]! + 50_000); gorusDegis(w, p1, c, 10_000); w.C.c.krizAsama[p1] = 0;
        anlat(w, `${kisa(w, c)} ültimatomu kabul etti. ${kisa(w, p1)}'da zafer şenlikleri, ${kisa(w, c)}'da sessiz bir öfke var.`, 'kriz', c, 3);
      }, yz: (w, c) => (anlasmaVar(w, A.garanti, 0, c) >= 0 ? 15 : 55) },
      { ad: 'Ültimatomu reddet', etki: 'Demirhan anında savaş gerekçesi kazanır. Garantörler çağrılabilir.', uygula: (w, c, p1) => {
        gerekceBaslat(w, p1, c, 0);
        w.C.c.destek[c] = Math.min(100_000, w.C.c.destek[c]! + 10_000);
        w.C.c.krizAsama[p1] = 2;
        anlat(w, `${kisa(w, c)} ültimatomu reddetti. ${kisa(w, p1)} elçisi başkentten ayrıldı; sınır kasabalarında askerler görülüyor.`, 'kriz', c, 3);
      }, yz: (w, c) => (anlasmaVar(w, A.garanti, 0, c) >= 0 ? 85 : 45) },
    ],
  },
  {
    kod: 'kitlik', baslik: 'Kıtlık Kapıda',
    metin: (w, c) => `${kisa(w, c)} ambarları boşalıyor. Gıda güvencesi kritik düzeyin altına indi; kentlerde ekmek kuyrukları uzuyor.`,
    secenekler: [
      { ad: 'Karne uygula', etki: 'Tüketim −%15, huzur −5 (sürekli).', uygula: (w, c) => { w.C.c.karne[c] = 1; }, yz: () => 60 },
      { ad: 'Dışarıdan tahıl al', etki: 'Dünya pazarında haftalık gıda alım emri verilir.', uygula: (w, c) => {
        const { gunluk } = ulkeGidaStok(w, c);
        const s = w.SP.alloc(); w.SP.c.ulke[s] = c; w.SP.c.mal[s] = MALI.gida; w.SP.c.miktar[s] = gunluk * 14; w.SP.c.yon[s] = 0; w.SP.c.kalici[s] = 0;
      }, yz: (w, c) => (w.C.c.hazine[c]! > 2_000_000 ? 70 : 10) },
      { ad: 'Bekle', etki: 'Huzur −5.', uygula: (w, c) => { w.C.c.huzur[c] = Math.max(0, w.C.c.huzur[c]! - 5000); }, yz: () => 5 },
    ],
  },
  {
    kod: 'grev', baslik: 'Fabrikalarda Grev',
    metin: (w, c) => `${kisa(w, c)} sanayi kentlerinde işçiler ücret ve ekmek için iş bıraktı. Hükümet bir karar vermek zorunda.`,
    secenekler: [
      { ad: 'Ücretleri artır', etki: 'Hazineden bir aylık gelirin %20\'si; huzur +6.', uygula: (w, c) => {
        const m = mulDiv(Math.max(0, w.C.c.g1[c]!), 200_000, S).q;
        w.C.c.hazine[c] = w.C.c.hazine[c]! - Math.min(m, Math.max(0, w.C.c.hazine[c]!)); w.C.c.huzur[c] = Math.min(100_000, w.C.c.huzur[c]! + 6000);
      }, yz: (w, c) => (w.C.c.hazine[c]! > w.C.c.g1[c]! ? 65 : 20) },
      { ad: 'Grevi bastır', etki: 'Meşruiyet −6, huzur −3; olay etkisi 60 gün.', uygula: (w, c) => {
        w.C.c.mesru[c] = Math.max(0, w.C.c.mesru[c]! - 6000); w.C.c.huzur[c] = Math.max(0, w.C.c.huzur[c]! - 3000); w.C.c.yasakGun[c] = w.gun + 60;
      }, yz: () => 35 },
    ],
  },
  {
    kod: 'gonullu', baslik: 'Gönüllü Akını',
    metin: (w, c) => `Savaş haberiyle ${kisa(w, c)} gençleri askerlik şubelerine akın ediyor. Coşku sürerken onları değerlendirmek mümkün.`,
    secenekler: [
      { ad: 'Gönüllüleri kabul et', etki: 'Askerlik çağındaki S havuzunun %2\'si çağrılabilir (Y) olur; savaşa destek +5.', uygula: (w, c) => {
        for (let r = 0; r < w.nR; r++) {
          if (w.R.c.sahip[r] !== c) continue;
          const hs = r * 32 + 8 + 1, hy = r * 32 + 8 + 2;
          const a = mulDiv(w.pop[hs]!, 20_000, S).q;
          w.pop[hs] = w.pop[hs]! - a; w.pop[hy] = w.pop[hy]! + a;
        }
        w.C.c.destek[c] = Math.min(100_000, w.C.c.destek[c]! + 5000);
      }, yz: () => 90 },
      { ad: 'Fabrikalarda kalsınlar', etki: 'Huzur +3.', uygula: (w, c) => { w.C.c.huzur[c] = Math.min(100_000, w.C.c.huzur[c]! + 3000); }, yz: () => 10 },
    ],
  },
];

// ---------- Senaryo paketinin veriyle tanımlı olayları (indeks ≥ 1000) ----------
export const PAKET_OLAY = 1000;
const paketOlayOnbellek = new WeakMap<Paket, Olay[]>();

function ulkeVar(w: World, c: number): boolean {
  if (c < 0 || c >= w.nC) return false;
  for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === c) return true;
  return false;
}

/** Olay koşulu: savaşta/barışta/bölge kontrolü. Koşul tutmazsa olay düşer. */
export function kosulTutar(w: World, o: PaketSenaryoOlay): boolean {
  if (!ulkeVar(w, o.ulke)) return false;
  const k = o.kosul;
  if (!k) return true;
  if (k.savasta && !savasta(w, k.savasta[0], k.savasta[1])) return false;
  if (k.barista && savasta(w, k.barista[0], k.barista[1])) return false;
  const kk = k as { kontrol?: [number, number]; kontrolDegil?: [number, number] };
  if (kk.kontrol && w.R.c.kontrolEden[kk.kontrol[0]] !== kk.kontrol[1]) return false;
  if (kk.kontrolDegil && w.R.c.kontrolEden[kk.kontrolDegil[0]] === kk.kontrolDegil[1]) return false;
  return true;
}

const art = (v: number, d: number, ust = 100_000) => clamp(v + d, 0, ust);
/** Olayla gelen savaş: sessiz, hazır gerekçe (tarihî casus belli). */
function sessizGerekce(w: World, a: number, b: number): void {
  const g = w.GR.alloc();
  w.GR.c.ulke[g] = a; w.GR.c.hedef[g] = b; w.GR.c.bitis[g] = w.gun; w.GR.c.hazir[g] = 1;
}

/** Veri eylemini uygular. Bilinmeyen eylem yok sayılır. */
export function eylemUygula(w: World, e: PaketEylem): void {
  const C = w.C.c;
  const a = e.a ?? -1, b = e.b ?? -1, v = e.v ?? 0;
  switch (e.t) {
    case 'gerekce': if (a >= 0 && b >= 0 && ulkeVar(w, a) && ulkeVar(w, b)) gerekceBaslat(w, a, b, 0); break;
    case 'savas': {
      if (a < 0 || b < 0 || !ulkeVar(w, a) || !ulkeVar(w, b) || savasta(w, a, b)) break;
      anlasmaBoz(w, A.ateskes, a, b, false);
      anlasmaBoz(w, A.ittifak, a, b, false);
      sessizGerekce(w, a, b);
      savasIlan(w, a, b, e.cagri !== false);
      break;
    }
    case 'katil': {
      // a, b'nin yanında b'nin d ile savaşına katılır (d verilmezse b'nin ilk savaşı)
      const d = e.d ?? -1;
      if (a < 0 || b < 0 || !ulkeVar(w, a)) break;
      let bulundu = false;
      for (const s of w.SV.list()) {
        const tb = tarafi(w, s, b);
        if (tb === 0 || tarafi(w, s, a) !== 0) continue;
        if (d >= 0 && tarafi(w, s, d) !== (tb === 1 ? 2 : 1)) continue;
        if (d >= 0) anlasmaBoz(w, A.ateskes, a, d, false);
        savasaKatil(w, s, a, tb === 1 ? 0 : 1);
        bulundu = true;
        break;
      }
      if (!bulundu && d >= 0 && ulkeVar(w, d) && !savasta(w, a, d)) { sessizGerekce(w, a, d); savasIlan(w, a, d, true); }
      break;
    }
    case 'baris': if (a >= 0 && b >= 0 && savasta(w, a, b)) barisUygula(w, a, b, 0, []); break;
    case 'gorus': if (a >= 0 && b >= 0) { gorusDegis(w, a, b, v); if (e.olay === 'karsilikli') gorusDegis(w, b, a, v); } break;
    case 'huzur': if (a >= 0) C.huzur[a] = art(C.huzur[a]!, v); break;
    case 'mesru': if (a >= 0) C.mesru[a] = art(C.mesru[a]!, v); break;
    case 'destek': if (a >= 0) C.destek[a] = art(C.destek[a]!, v); break;
    case 'pg': if (a >= 0) C.pg[a] = art(C.pg[a]!, v, 500_000); break;
    case 'hazine': if (a >= 0) C.hazine[a] = C.hazine[a]! + v; break;
    case 'gerginlik': if (a >= 0) C.gerginlik[a] = Math.max(0, C.gerginlik[a]! + v); break;
    case 'ittifak': case 'ticaret': case 'saldirmazlik': case 'garanti': case 'gecis':
      if (a >= 0 && b >= 0 && !savasta(w, a, b)) anlasmaKur(w, (A as Record<string, number>)[e.t]!, a, b);
      break;
    case 'boz': if (a >= 0 && b >= 0) anlasmaBoz(w, v, a, b, false); break;
    case 'bolge': {
      // a: bölge, b: yeni sahip (ilhak/devir)
      if (a < 0 || a >= w.nR || b < 0) break;
      const R = w.R.c;
      R.sahip[a] = b; R.kontrolEden[a] = b; R.itaat[a] = 0; R.direnis[a] = 10_000; R.kontrol[a] = 30_000; R.anaYurtGun[a] = 0;
      diploDegisti(w);
      break;
    }
    case 'olay': {
      if (!e.olay) break;
      const i = w.pkg.olaylar?.findIndex((o) => o.kod === e.olay) ?? -1;
      if (i >= 0) olayPlanlaIdx(w, PAKET_OLAY + i, w.pkg.olaylar![i]!.ulke, w.gun + (e.gecikme ?? 0));
      break;
    }
  }
}

function paketOlaylari(w: World): Olay[] {
  let l = paketOlayOnbellek.get(w.pkg);
  if (l) return l;
  l = (w.pkg.olaylar ?? []).map((o) => ({
    kod: o.kod, baslik: o.baslik,
    metin: () => o.metin,
    secenekler: o.secenekler.map((x) => ({
      ad: x.ad, etki: x.etki,
      uygula: (ww: World) => { for (const e of x.e) eylemUygula(ww, e); },
      yz: () => x.yz,
    })),
  }));
  paketOlayOnbellek.set(w.pkg, l);
  return l;
}

/** Olay tanımı (yerleşik ya da paket). */
export function olayTanim(w: World, idx: number): Olay {
  if (idx >= PAKET_OLAY) return paketOlaylari(w)[idx - PAKET_OLAY]!;
  return OLAYLAR[idx]!;
}

export const olayIdx = (kod: string) => OLAYLAR.findIndex((o) => o.kod === kod);

function olayPlanlaIdx(w: World, idx: number, c: number, gun: number, p1 = 0, p2 = 0): void {
  const s = w.OL.alloc();
  w.OL.c.olay[s] = idx; w.OL.c.ulke[s] = c; w.OL.c.gun[s] = gun; w.OL.c.p1[s] = p1; w.OL.c.p2[s] = p2; w.OL.c.secim[s] = -1;
}

/** Olay kaydı: oyuncu için bekleyen seçim; YZ için P11'de anahtarlı seçim. */
export function olayPlanla(w: World, kod: string, c: number, gun: number, p1 = 0, p2 = 0): void {
  olayPlanlaIdx(w, olayIdx(kod), c, gun, p1, p2);
}

export function olaySecimUygula(w: World, s: number, secim: number): void {
  const o = olayTanim(w, w.OL.c.olay[s]!);
  const c = w.OL.c.ulke[s]!;
  const sec = o.secenekler[secim] ?? o.secenekler[0]!;
  sec.uygula(w, c, w.OL.c.p1[s]!, w.OL.c.p2[s]!);
  if (c === w.oyuncu) anlat(w, `Karar (${o.baslik}): ${sec.ad}.`, 'karar', c, 1);
  w.OL.release(s);
}

function yzSecim(w: World, s: number): number {
  const o = olayTanim(w, w.OL.c.olay[s]!);
  const c = w.OL.c.ulke[s]!;
  const puan = o.secenekler.map((x) => Math.max(1, x.yz(w, c)));
  const top = puan.reduce((a, b) => a + b, 0);
  const u = uniformInt(rng(w.tohum, w.gun, 21, c, 0, AMAC.eventPick, w.OL.c.olay[s]!, 0), top);
  let acc = 0;
  for (let i = 0; i < puan.length; i++) { acc += puan[i]!; if (u < acc) return i; }
  return 0;
}

/** P11: zamanı gelen olaylar. Oyuncunun olayı bekler ve durdurur; 30 gün yanıtsız kalırsa YZ seçer. */
export function olayGunu(w: World): void {
  for (const s of w.OL.list()) {
    const g = w.OL.c.gun[s]!;
    if (g > w.gun) continue;
    const c = w.OL.c.ulke[s]!;
    const idx = w.OL.c.olay[s]!;
    if (idx >= PAKET_OLAY && g === w.gun && !kosulTutar(w, w.pkg.olaylar![idx - PAKET_OLAY]!)) { w.OL.release(s); continue; }
    if (c === w.oyuncu && w.mod !== 2) {
      if (g === w.gun) {
        const o = olayTanim(w, idx);
        bildir(w, 'olay', o.baslik, c, true);
        if (idx >= PAKET_OLAY) anlat(w, `${o.baslik}: ${o.metin(w, c, 0)}`, 'kriz', c, 3);
      }
      if (w.gun - g >= 30) olaySecimUygula(w, s, yzSecim(w, s));
      continue;
    }
    olaySecimUygula(w, s, yzSecim(w, s));
  }
}

/** Aylık olay tetikleri (koşullar adaylık yaratır; 180 günlük bekleme). */
export function aylikOlaylar(w: World): void {
  for (let c = 0; c < w.nC; c++) {
    if (w.C.c.olayEsik[c]! > w.gun) continue;
    const g = ulkeGidaGuvence(w, c);
    const h = w.C.c.huzur[c]!;
    if (g < 400_000 && !w.C.c.karne[c]) { olayPlanla(w, 'kitlik', c, w.gun); w.C.c.olayEsik[c] = w.gun + 180; continue; }
    if (h < 40_000 && h >= 25_000) { olayPlanla(w, 'grev', c, w.gun); w.C.c.olayEsik[c] = w.gun + 180; continue; }
    if (savastaMi(w, c) && w.C.c.destek[c]! > 50_000 && w.C.c.saldiriyaUgradi[c]! > 15_000) { olayPlanla(w, 'gonullu', c, w.gun); w.C.c.olayEsik[c] = w.gun + 365; }
  }
}

/** Yıllık hasat Kroniği. */
export function hasatAnlat(w: World): void {
  const y = tarih(w.gun).y;
  const k0 = w.hasatKademe[0]!, k1 = w.hasatKademe[1]!;
  anlat(w, `${y} hasadı: güneyde ${HASAT_KUCUK[k0]!}, kuzeyde ${HASAT_KUCUK[k1]!}.`, 'hasat', -1, k0 <= 1 || k1 <= 1 ? 2 : 0);
  void bildir; void DMR;
}

export function acilisOlaylari(w: World): void {
  if (w.pkg.olaylar) {
    // veri olayları: tarihi belli olanlar planlanır (gun < 0: yalnız zincirle tetiklenir)
    w.pkg.olaylar.forEach((o, i) => { if (o.gun >= w.gun) olayPlanlaIdx(w, PAKET_OLAY + i, o.ulke, o.gun); });
    if (w.pkg.aciklama) anlat(w, w.pkg.aciklama, 'kriz', -1, 2);
    return;
  }
  olayPlanla(w, 'suikast', DMR, w.gun);
  anlat(w, `28 Haziran 1914. Dört taht arasındaki eski hesaplar yeniden açılmak üzere.`, 'kriz', -1, 2);
}
