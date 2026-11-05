// Bölüm 21: olaylar, açılış krizi zinciri (Temmuz Krizi karşılığı), şablonlu Kronik.
import type { World } from '../state/world.ts';
import { A } from '../state/world.ts';
import { KISILIK, MALI } from '../catalog.ts';
import { S, mulDiv } from '../num/index.ts';
import { rng, AMAC, uniformInt } from '../rng/index.ts';
import { tarih } from '../calendar/index.ts';
import { anlat, bildir, savastaMi, anlasmaVar } from './ortak.ts';
import { gerekceBaslat, gorusDegis } from './diplomasi.ts';
import { ulkeGidaGuvence, ulkeGidaStok, HASAT_KUCUK } from './ekonomi.ts';

export interface Secenek { ad: string; etki: string; uygula: (w: World, c: number, p1: number, p2: number) => void; yz: (w: World, c: number) => number }
export interface Olay { kod: string; baslik: string; metin: (w: World, c: number, p1: number) => string; secenekler: Secenek[] }

const ad = (w: World, c: number) => w.pkg.ulkeler[c]!.ad;
const kisa = (w: World, c: number) => w.pkg.ulkeler[c]!.kisa;
const MVK = 1, DMR = 2;

export const OLAYLAR: Olay[] = [
  {
    kod: 'suikast', baslik: 'Tunçkale Suikastı',
    metin: (w) => `Demirhan veliahdı, sınır kenti Tunçkale'de bir Mavikıyılı milliyetçinin kurşunuyla öldürüldü. Saray öfkeli, kalabalıklar intikam istiyor. Bütün başkentler İmparatorluğun yanıtını bekliyor.`,
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
export const olayIdx = (kod: string) => OLAYLAR.findIndex((o) => o.kod === kod);

/** Olay kaydı: oyuncu için bekleyen seçim; YZ için P11'de anahtarlı seçim. */
export function olayPlanla(w: World, kod: string, c: number, gun: number, p1 = 0, p2 = 0): void {
  const s = w.OL.alloc();
  w.OL.c.olay[s] = olayIdx(kod); w.OL.c.ulke[s] = c; w.OL.c.gun[s] = gun; w.OL.c.p1[s] = p1; w.OL.c.p2[s] = p2; w.OL.c.secim[s] = -1;
}

export function olaySecimUygula(w: World, s: number, secim: number): void {
  const o = OLAYLAR[w.OL.c.olay[s]!]!;
  const c = w.OL.c.ulke[s]!;
  const sec = o.secenekler[secim] ?? o.secenekler[0]!;
  sec.uygula(w, c, w.OL.c.p1[s]!, w.OL.c.p2[s]!);
  if (c === w.oyuncu) anlat(w, `Karar (${o.baslik}): ${sec.ad}.`, 'karar', c, 1);
  w.OL.release(s);
}

function yzSecim(w: World, s: number): number {
  const o = OLAYLAR[w.OL.c.olay[s]!]!;
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
    if (c === w.oyuncu && w.mod !== 2) {
      if (g === w.gun) {
        const o = OLAYLAR[w.OL.c.olay[s]!]!;
        bildir(w, 'olay', o.baslik, c, true);
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
  olayPlanla(w, 'suikast', DMR, w.gun);
  anlat(w, `28 Haziran 1914. Dört taht arasındaki eski hesaplar yeniden açılmak üzere.`, 'kriz', -1, 2);
}
