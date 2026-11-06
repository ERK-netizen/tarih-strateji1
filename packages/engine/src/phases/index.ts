// Bölüm 7: günlük faz hattı P0–P12, sıklık katmanları, durma koşulları, bütünlük ve hash.
import type { World, Bildirim } from '../state/world.ts';
import { hc } from '../state/world.ts';
import { tarih, haftaGunu } from '../calendar/index.ts';
import { NHUCRE, ST, YB } from '../catalog.ts';
import { uygula, type Emir } from '../orders.ts';
import { kararGunu, teklifYanitlari } from '../decision/index.ts';
import { aylikNufus, isDagit, yaraliIyilestir, gunlukIsOlcekle } from '../systems/nufus.ts';
import { gidaGunu, aylikGida, sanayiGunu, arastirmaGunu, maliyeGunu, aylikMaliye, pazarTemizle, hasatKademeSec, ulkeGidaGuvence, aylikArastirma } from '../systems/ekonomi.ts';
import { varislar, lojistikGunu } from '../systems/lojistik.ts';
import { hareketGunu, muharebeGunu, sonucGunu, birlikTuketim } from '../systems/kara.ts';
import { aylikSiyaset, aylikKontrol } from '../systems/siyaset.ts';
import { aylikDiplomasi, gerekceGunu, cokusDenetle } from '../systems/diplomasi.ts';
import { denizHaftasi, havaHaftasi, denizUstunlukGuncelle } from '../systems/deniz.ts';
import { aylikSiyasetEk, demografiHaftasi, yillikKent } from '../systems/toplum.ts';
import { olayGunu, aylikOlaylar, hasatAnlat, acilisOlaylari } from '../systems/olaylar.ts';
import { serilestir } from '../serialize/index.ts';
import { fazDegisti } from '../observe/index.ts';
import { hashV1 } from '../hash/index.ts';
import { uc, anlat, savasta as ortakSavasta, eyaletUlke, savastaMi, modTemizle, yonetimMesafeleri } from '../systems/ortak.ts';
import { sayac } from '../num/index.ts';
import { yeniDunya } from '../state/world.ts';
import type { Paket } from '../paket.ts';
import { KOL_OK, KOL_ON } from '../state/world.ts';

export interface GunSonuc { gun: number; surum: number; hash: string; durmalar: Bildirim[]; bildirimler: Bildirim[]; sogukYol: number; bayt: Uint8Array }

/** Senaryo başlangıcı: yeni dünya + başlangıç iş dağılımı + açılış olayları. */
export function senaryoBaslat(pkg: Paket, oyuncu: number, mod = 0): World {
  const w = yeniDunya(pkg, oyuncu);
  w.mod = mod;
  isDagit(w, true);
  hasatKademeSec(w);
  acilisOlaylari(w);
  // yönetim mesafeleri ilk aylık kapanıştan önce de doğru olsun
  for (let c = 0; c < w.nC; c++) { const m = yonetimMesafeleri(w, c); for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) w.R.c.mesafe[r] = m[r]!; }
  // hedef ve kriz göstergeleri için başlangıç tabanları
  for (let r = 0; r < w.nR; r++) { const c = w.R.c.sahip[r]!; if (c >= 0) { w.C.c.bazBolge[c] = w.C.c.bazBolge[c]! + 1; let n = 0; for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!; w.C.c.bazNufus[c] = w.C.c.bazNufus[c]! + n; } }
  for (let c = 0; c < w.nC; c++) w.C.c.bazTek[c] = w.C.c.tekSay[c]!;
  // aylık kapanışların başlangıç değerleri: gelir tarihçesi için ilk gün tahmini
  for (let c = 0; c < w.nC; c++) w.C.c.sonPlan[c] = 0;
  baslangicNufus.set(w, toplamNufus(w));
  return w;
}

const baslangicNufus = new WeakMap<World, number>();
export function toplamNufus(w: World): number {
  let n = 0;
  for (let i = 0; i < w.pop.length; i++) n += w.pop[i]!;
  return n;
}

/** Bir günü çözer ve kesinleştirir. Bütünlük bozulursa hata fırlatır (gün kesinleşmez). */
/** kesinlestir=false: serileştirme ve hash atlanır (çok günlük atlamada ara günler). */
export function gunIlerle(w: World, kesinlestir = true): GunSonuc {
  const sogukOnce = sayac.sogukYol;
  // P0: önceki günün kesinleşmiş durumu w'dir. Gün numarası ilerler.
  w.gun += 1;
  w.bildirim = [];
  const t = tarih(w.gun);
  const n0 = baslangicNufus.get(w) ?? (() => { const v = toplamNufus(w) - (w.sayac.dogum - w.sayac.dogalOlum - w.sayac.askerOlum - w.sayac.ekOlum); baslangicNufus.set(w, v); return v; })();
  // P1: takvim, aylık/yıllık kapanış
  if (t.d === 1) {
    aylikNufus(w);
    isDagit(w);
    aylikGida(w);
    aylikMaliye(w);
    aylikKontrol(w);
    aylikSiyaset(w);
    aylikDiplomasi(w);
    aylikOlaylar(w);
    aylikArastirma(w);
    aylikSiyasetEk(w);
    for (let c = 0; c < w.nC; c++) w.C.c.vergiAy[c] = 0;
    tarihceEkle(w);
    if (t.m === 1) { hasatKademeSec(w); hasatAnlat(w); yillikKent(w); }
  }
  // P2: oyuncu emirleri (kuyruk sırası), sonra karar modülü
  const kuyruk = w.kuyruk.splice(0, w.kuyruk.length).sort((a, b) => a.sira - b.sira);
  for (const k of kuyruk) {
    const r = uygula(w, k.emir as Emir);
    if (!r.ok && (k.emir as Emir).ulke === w.oyuncu) anlat(w, `Emir uygulanamadı: ${r.neden ?? ''}`, 'emir', w.oyuncu, 1);
  }
  fazDegisti(w);
  kararGunu(w);
  fazDegisti(w);
  // P3: diplomasi
  teklifYanitlari(w);
  gerekceGunu(w);
  for (let c = 0; c < w.nC; c++) w.C.c.savasGunu[c] = savastaMi(w, c) ? w.C.c.savasGunu[c]! + 1 : 0;
  modTemizle(w);
  denizUstunlukGuncelle(w);
  if (haftaGunu(w.gun) === 2) { denizHaftasi(w); havaHaftasi(w); cokusDenetle(w); demografiHaftasi(w); }
  fazDegisti(w);
  // P4: varışlar
  varislar(w);
  // P5–P6: üretim, sivil gıda, sanayi, araştırma, lojistik
  for (let r = 0; r < w.nR; r++) gunlukIsOlcekle(w, r);
  gidaGunu(w);
  sanayiGunu(w);
  arastirmaGunu(w);
  lojistikGunu(w);
  // P7: maliye, birlik tüketimi, pazar (haftalık), yaralı
  maliyeGunu(w);
  birlikTuketim(w);
  pazarTemizle(w);
  yaraliIyilestir(w);
  fazDegisti(w);
  // P8–P10: kara
  const muh = hareketGunu(w);
  muharebeGunu(w, muh);
  sonucGunu(w, muh);
  fazDegisti(w);
  // P11: olaylar ve durma koşulları
  olayGunu(w);
  durmaKosullari(w);
  // P12: bütünlük, hash, yayımla
  butunluk(w, n0);
  w.surum += 1;
  fazDegisti(w);
  const bayt = kesinlestir ? serilestir(w) : new Uint8Array(0);
  const hash = kesinlestir ? hashV1(bayt) : '';
  const durmalar = w.bildirim.filter((b) => b.durdur && (b.ulke === w.oyuncu || b.ulke < 0 || ['savas', 'baris'].includes(b.tur)));
  return { gun: w.gun, surum: w.surum, hash, durmalar, bildirimler: w.bildirim.slice(), sogukYol: sayac.sogukYol - sogukOnce, bayt };
}

function durmaKosullari(w: World): void {
  const c = w.oyuncu;
  if (w.mod === 2) return;
  const ui = (w.onbellek.get('ui') as { gidaUyari: boolean } | undefined) ?? { gidaUyari: false };
  // gıda: son 7 günün oranı 0,50 altına geçiş; 0,60 üstüne çıkmadan yeniden kurulmaz (histerezis)
  let ih = 0, k = 0;
  for (let e = 0; e < w.nE; e++) if (eyaletUlke(w, e) === c) { ih += w.E.c.ihtiyacDun[e]!; k += w.E.c.karsilananDun[e]!; }
  const oran = ih > 0 ? Math.floor((k * 1_000_000) / ih) : 1_000_000;
  if (!ui.gidaUyari && oran < 500_000) { ui.gidaUyari = true; w.bildirim.push({ tur: 'gida', metin: 'Kritik gıda açığı: halkın yarısından fazlası aç', ulke: c, durdur: true, gun: w.gun, kimlik: w.bildirim.length }); }
  else if (ui.gidaUyari && oran > 600_000) ui.gidaUyari = false;
  w.onbellek.set('ui', ui);
  // başkent tehdidi: iki kara kenarı içinde düşman birliği
  const U = uc(w);
  const bas = w.pkg.ulkeler[c]!.baskent;
  const yakin = new Set<number>([bas, ...w.komsuluk[bas]!]);
  for (const v of [...yakin]) for (const x of w.komsuluk[v]!) yakin.add(x);
  const tehdit = w.U.list().some((u) => yakin.has(U.bolge![u]!) && U.ulke![u] !== c && savastaKontrol(w, c, U.ulke![u]!));
  const ui2 = (w.onbellek.get('ui2') as { baskent: boolean } | undefined) ?? { baskent: false };
  if (tehdit && !ui2.baskent) w.bildirim.push({ tur: 'baskent', metin: 'Başkent tehdit altında', ulke: c, durdur: true, gun: w.gun, kimlik: w.bildirim.length });
  ui2.baskent = tehdit;
  w.onbellek.set('ui2', ui2);
  void ulkeGidaGuvence;
}
function savastaKontrol(w: World, a: number, b: number): boolean { return ortakSavasta(w, a, b); }

/** P12 bütünlük: negatif olmama, nüfus korunumu, köken muhasebesi. */
export function butunluk(w: World, n0: number): void {
  for (let i = 0; i < w.pop.length; i++) if (w.pop[i]! < 0 || !Number.isSafeInteger(w.pop[i]!)) throw new Error(`bütünlük: negatif/geçersiz nüfus hücresi ${i}=${w.pop[i]}`);
  for (let e = 0; e < w.nE; e++) if (w.E.c.gida[e]! < 0) throw new Error(`bütünlük: negatif gıda eyalet ${e}`);
  const U = uc(w);
  for (const u of w.U.rows()) if (U.kisi![u]! < 0) throw new Error('bütünlük: negatif personel');
  const beklenen = n0 + w.sayac.dogum - w.sayac.dogalOlum - w.sayac.askerOlum - w.sayac.ekOlum;
  const gercek = toplamNufus(w);
  if (beklenen !== gercek) throw new Error(`bütünlük: nüfus korunumu ${gercek} ≠ ${beklenen}`);
  const kok = kokenDenetim(w);
  if (kok) throw new Error(`bütünlük: köken muhasebesi ${kok}`);
}

/** Σ birlik köken partileri + ulusal defter + yoldaki personel = Σ A hücreleri (eyalet bazında) (T102). */
export function kokenDenetim(w: World): string | null {
  const U = uc(w);
  const birlik = new Array<number>(w.nE).fill(0);
  const kova = new Array<number>(w.nC).fill(0), def = new Array<number>(w.nC).fill(0);
  for (const u of w.U.rows()) {
    for (let k = 0; k < 8; k++) { const e = U[KOL_OK[k]!]![u]! - 1; if (e >= 0) birlik[e]! += U[KOL_ON[k]!]![u]!; }
    kova[U.ulke![u]!]! += U.on8![u]!;
  }
  for (let c = 0; c < w.nC; c++) for (let e = 0; e < w.nE; e++) { const v = w.kokenDefter[c * w.nE + e]!; if (v) { birlik[e]! += v; def[c]! += v; } }
  for (const t of w.T.rows()) if (w.T.c.tur[t] === 3) birlik[w.T.c.alt[t]!]! += w.T.c.miktar[t]!;
  for (let e = 0; e < w.nE; e++) {
    let a = 0;
    for (const r of w.pkg.eyaletler[e]!.bolgeler) a += w.pop[hc(r, YB.ASKER, ST.A)]!;
    if (a !== birlik[e]) return `eyalet ${e}: A=${a}, kayıt=${birlik[e]}`;
  }
  // kova toplamı = defter toplamı (ülke bazında)
  for (let c = 0; c < w.nC; c++) if (kova[c] !== def[c]) return `ülke ${c}: kova ${kova[c]} ≠ defter ${def[c]}`;
  void NHUCRE;
  return null;
}

function tarihceEkle(w: World): void {
  const satir: number[][] = [];
  for (let c = 0; c < w.nC; c++) {
    const C = w.C.c;
    let nufus = 0, asker = 0;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) for (let k = 0; k < NHUCRE; k++) nufus += w.pop[r * NHUCRE + k]!;
    const U = uc(w);
    for (const u of w.U.rows()) if (U.ulke![u] === c) asker += U.kisi![u]!;
    satir.push([C.hazine[c]!, C.g1[c]!, C.huzur[c]!, C.destek[c]!, C.yorgunluk[c]!, nufus, asker, ulkeGidaGuvence(w, c), C.pg[c]!, C.mesru[c]!]);
  }
  w.tarihce.push({ gun: w.gun, ulke: satir });
  if (w.tarihce.length > 240) w.tarihce.shift();
}

export type DurmaPolitikasi = { sessiz: string[] };
