// Kanonik dünya durumu. Tek yazar: çözümleyici (faz hattı). Bütün değerler tamsayıdır.
import { Table, fixedTable, type ColType } from './table.ts';
import type { Paket } from '../paket.ts';
import { NHUCRE, NKIMLIK, NEKIP, NTEK, NMAL, MAL, BAYRAK, ST, YB, TABUR, SABLON, AILE_EKIP, EKIPMAN, MAX_TABUR, K, TEKNOLOJI, donemYukle } from '../catalog.ts';
import type { DonemKod } from '../donem.ts';
import { gunNo } from '../calendar/index.ts';
import { largestRemainder, S } from '../num/index.ts';
import { GEMI, HAVA } from '../katalogEk.ts';
import { AKTIF } from '../catalog.ts';

const f = 'f64' as ColType;
const i32 = 'i32' as ColType;

export const BOLGE_KOL = [
  ['sahip', i32], ['kontrolEden', i32], ['kontrol', f], ['itaat', f], ['butunlesme', f], ['direnis', f],
  ['altyapi', f], ['demiryolu', f], ['sulama', f], ['sivilF', f], ['askeriF', f], ['hasar', f],
  ['isTarim', f], ['isSanayi', f], ['isHizmet', f], ['isGucu', f], ['issiz', f],
  ['yerelGida', f], ['gidaArtik', f], ['uretimDun', f], ['vergiDun', f],
  ['isgalGun', f], ['anaYurtGun', f], ['mesafe', f], ['valilik', f], ['isyan', f], ['tahkimat', f], ['sonMuharebe', f], ['vaDun', f],
  // şema 7: şehir düzeyi (0–10), maden işletmesi düzeyi (0–5), etkin demografi politikası ve hedef kimlik hücresi
  ['kent', f], ['maden', f], ['demPol', i32], ['demKim', i32],
  // şema 8: hava üssü düzeyi (0–5) ve tersane düzeyi (0–3)
  ['havaUs', f], ['tersane', f],
] as const;
export type BolgeK = (typeof BOLGE_KOL)[number][0];

export const EYALET_KOL = [
  ['gida', f], ['ihtiyacAy', f], ['karsilananAy', f], ['guvence', f], ['ihtiyacDun', f], ['karsilananDun', f], ['artik', f],
] as const;

export const ULKE_KOL = [
  ['hazine', f], ['pg', f], ['huzur', f], ['mesru', f], ['destek', f], ['yorgunluk', f], ['vergi', f],
  ['askerlik', i32], ['ekonomi', i32], ['isgalPol', i32], ['borc', f], ['faiz', f], ['temerrut', f], ['odenmeyenGun', f],
  ['b0', f], ['b1', f], ['b2', f], ['b3', f], ['egitim', f], ['karne', i32],
  ['gelirAy', f], ['giderAy', f], ['g1', f], ['g2', f], ['g3', f], ['gelirDun', f], ['giderDun', f],
  ['un', f], ['guvenilir', f], ['saldiriyaUgradi', f], ['zafer', f], ['olumAy', f], ['sakatAy', f],
  ['spDun', f], ['muhimmat', f], ['celikDun', f], ['komurDun', f], ['celikKayip', f],
  ['arastirmaHizi', f], ['otoCephe', i32], ['tamPuan', f], ['yasakGun', f], ['krizAsama', i32], ['gerginlik', f],
  ['olu', f], ['sonPlan', f], ['hedefUlke', i32], ['bakimHedef', f], ['propaganda', f], ['celik', f], ['komur', f], ['tuketimYet', f], ['bakimOdenen', f], ['harcamaOran', f], ['otoTakviye', i32], ['vergiAy', f], ['kaliciGida', i32], ['olayEsik', f], ['pasif', i32],
  // şema 6: bakanlar (alan bit maskesi), başlangıç tabanları (hedefler), savaşta geçen gün, seçilen doktrin
  ['bakan', i32], ['bazBolge', f], ['bazYasam', f], ['bazTek', f], ['bazNufus', f], ['savasGunu', f], ['tekSay', f], ['maas', f],
  // şema 7: donanma (sınıf başına gemi), hasar, görev; hava filoları (tür başına uçak), görev ve hedef bölge; abluka ve akın kaybı
  ['gs0', f], ['gs1', f], ['gs2', f], ['gs3', f], ['gs4', f], ['gHasar', f], ['donGorev', i32], ['donBolge', i32],
  ['h0', f], ['h1', f], ['h2', f], ['hHasar', f], ['havaGorev', i32], ['havaBolge', i32], ['abluka', f], ['akinKayip', f], ['denizK', i32],
  // siyaset: rejim, parti destekleri (S), iktidar partisi, sonraki seçim günü, rejim geçişinin bitişi
  ['rejim', i32], ['parti0', f], ['parti1', f], ['parti2', f], ['parti3', f], ['parti4', f], ['iktidar', i32], ['secim', f], ['gecis', f],
  // demografi ve ekonomi: nüfus politikası, zulüm kaydı, ekonomi modeli, gümrük, sübvansiyonlar, tarım odağı, petrol stoku ve akışı
  ['nufusPol', i32], ['zulum', f], ['model', i32], ['tarife', f], ['subTarim', f], ['subSanayi', f], ['tarimOdak', i32], ['petrol', f], ['petrolDun', f], ['petrolIht', f],
] as const;
export type UlkeK = (typeof ULKE_KOL)[number][0];

const ekipKol = Array.from({ length: NEKIP }, (_, k) => [`e${k}`, f] as const);
const kokenKol = Array.from({ length: 8 }, (_, k) => [`ok${k}`, i32] as const);
const kokenSay = Array.from({ length: 9 }, (_, k) => [`on${k}`, f] as const);
const taburKol = Array.from({ length: MAX_TABUR }, (_, k) => [`t${k}`, i32] as const);
export const BIRLIK_KOL = [
  ['ulke', i32], ['sablon', i32], ['bolge', i32], ['hedef', i32], ['sonraki', i32], ['ilerleme', f], ['durus', i32],
  ['org', f], ['deneyim', f], ['kisi', f], ['gida', f], ['muhimmatS', f], ['egitimBitis', f], ['muharebe', i32],
  ['savasGun', f], ['adNo', f], ['atamaGun', f], ['taburSay', i32], ...taburKol, ...ekipKol, ...kokenKol, ...kokenSay,
  // şema 6: oyuncunun elle verdiği emrin önceliği bitene dek (gün) bakanlık bu birliğe dokunmaz
  ['elle', f],
  // şema 9: komutan kimliği + 1 (0 = komutansız)
  ['komutan', f],
] as const;

/**
 * Komutanlar (şema 9): kalıcı kişi kaydı. ad: `komutanAd` dizge tablosu indeksi; kaynak: 0 tarihî, 1 kurgu;
 * dogum/bitis: yıl (bitis = ölüm ya da hizmetten ayrılış); saldiri/savunma/lojistik: 1–100 (oyun değerlendirmesi);
 * deneyim: 0–100.000; kapasite: tam etkiyle komuta ettiği birlik sayısı; emir: 0 serbest, 1 savun, 2 taarruz;
 * ikmalEsik/orgEsik: S ölçekli taarruz koşulları; durum: 0 görevde, 1 öldü/ayrıldı (tarihçe için satır kalır);
 * kod: tarihî katalog satırı + 1 (aynı kişi iki kez oluşmaz); egitim: alınan kurmay eğitimi sayısı.
 */
export const KOMUTAN_KOL = [
  ['ulke', i32], ['ad', i32], ['kaynak', i32], ['dogum', i32], ['bitis', i32], ['saldiri', i32], ['savunma', i32], ['lojistik', i32],
  ['deneyim', f], ['kapasite', i32], ['emir', i32], ['ikmalEsik', f], ['orgEsik', f], ['durum', i32], ['kod', i32], ['egitim', i32],
] as const;

export const TRANSIT_KOL = [
  ['tur', i32], ['alt', i32], ['miktar', f], ['ulke', i32], ['hedefTip', i32], ['hedefId', f], ['varis', f], ['konum', i32], ['karsi', i32],
] as const;
export const T_GIDA = 0, T_MUH = 1, T_EKIP = 2, T_KISI = 3, T_PARA = 4, T_MAL = 5;
export const H_EYALET = 0, H_BIRLIK = 1, H_ULKE = 2;

export const ANLASMA_TUR = ['ticaret', 'saldirmazlik', 'gecis', 'garanti', 'ittifak', 'ateskes', 'tazminat', 'kukla', 'ambargo'] as const;
/** kukla: a efendi, b kukla (yönlü). ambargo: a, b'ye ambargo uygular (yönlü). */
export const A = { ticaret: 0, saldirmazlik: 1, gecis: 2, garanti: 3, ittifak: 4, ateskes: 5, tazminat: 6, kukla: 7, ambargo: 8 } as const;
export const ANLASMA_KOL = [['tur', i32], ['a', i32], ['b', i32], ['baslangic', f], ['bitis', f], ['miktar', f]] as const;

export const SAVAS_KOL = [['saldiran', i32], ['savunan', i32], ['baslangic', f], ['kayipA', f], ['kayipB', f], ['gerekceli', i32]] as const;
/** Eşzamanlı savaş sınırı (taraf tablosu satır sayısı). */
export const SV_MAX = 48;
/** Bölge başına en çok iddia sahibi. */
export const IDDIA_MAX = 4;
export const GEREKCE_KOL = [['ulke', i32], ['hedef', i32], ['bitis', f], ['hazir', i32]] as const;
export const HAT_KOL = [['ulke', i32], ['urun', i32], ['fabrika', f], ['verim', f], ['wip', f], ['oncelik', f]] as const;
export const URUN_MUH = 100;
/** alt/adet (şema 7): gemi sınıfı ya da uçak türü ve sayısı. */
export const PROJE_KOL = [['ulke', i32], ['tur', i32], ['bolge', i32], ['spTop', f], ['nakitTop', f], ['spKul', f], ['nakitKul', f], ['sira', f], ['alt', i32], ['adet', f]] as const;
export const YARALI_KOL = [['ulke', i32], ['eyalet', i32], ['kisi', f], ['gun', f]] as const;
export const KALICI_KOL = [['ulke', i32], ['tur', i32], ['p1', f], ['p2', f], ['p3', f], ['sonGun', f]] as const;
export const TEKLIF_KOL = [['kimden', i32], ['kime', i32], ['tur', i32], ['p1', f], ['p2', f], ['gun', f], ['durum', i32]] as const;
export const SIPARIS_KOL = [['ulke', i32], ['mal', i32], ['miktar', f], ['yon', i32], ['karsi', i32], ['kalici', i32]] as const;
export const OLAY_KOL = [['olay', i32], ['ulke', i32], ['gun', f], ['p1', f], ['p2', f], ['secim', i32]] as const;
/** Süreli etkiler (şema 6): olay kararlarının kalıcı/süreli sonuçları. deger S ölçekli ek oran ya da puan. */
export const MOD_KOL = [['ulke', i32], ['tur', i32], ['deger', f], ['bitis', f]] as const;
export const MOD_TUR = ['uretim', 'vergi', 'huzurAy', 'destekAy', 'arastirma', 'saldiri', 'savunma', 'insan', 'tarim', 'mesruAy'] as const;
export const MT = Object.fromEntries(MOD_TUR.map((t, i) => [t, i])) as Record<(typeof MOD_TUR)[number], number>;
/** Bakanlık alanları (bit). */
/** Oyuncunun bakanları (bit maskesi C.bakan): açık alanı karar modülü oyuncu adına yürütür; cephe ve takviye otoCephe/otoTakviye ile ayrıdır. */
export const BAKAN = ['ekonomi', 'arastirma', 'uretim', 'ordu', 'insa'] as const;
export const BAKAN_AD: Record<(typeof BAKAN)[number], string> = { ekonomi: 'Maliye (vergi, borç, ticaret, yasalar)', arastirma: 'Araştırma', uretim: 'Savaş sanayii (üretim hatları)', ordu: 'Harbiye (birlik kurma)', insa: 'Bayındırlık (inşa)' };
export const BK = Object.fromEntries(BAKAN.map((t, i) => [t, 1 << i])) as Record<(typeof BAKAN)[number], number>;
/** Oyuncu için başlangıçta açık bakanlıklar: cephe, takviye, üretim, ekonomi, araştırma. */
export const BAKAN_VARSAYILAN = BK.arastirma;

/** Bir bölgede bir günün muharebesi: motorun P9'da kesinleştirdiği sonuç (ikinci bir hesap değildir). */
export interface MuharebeBirlik { id: number; ad: string; ulke: number; taraf: 0 | 1; sablon: number; komutan: string; guc: number; savunma: number; orgOnce: number; orgSonra: number; orgMax: number; kisiOnce: number; kisiSonra: number }
export interface MuharebeKaydi {
  gun: number; bolge: number; saldiran: number; savunan: number;
  /** savunma çarpanı (S), topçu baskısı (S), saldırının geldiği bölge sayısı, hava üstünlüğü (saldıran, S işaretli) */
  savCarpan: number; baski: number; yon: number; hava: number;
  birlikler: MuharebeBirlik[];
  /** 0 sürüyor, 1 saldıran bölgeyi aldı, 2 saldırı püskürtüldü */
  sonuc: number;
}
export interface AnlatiKaydi { gun: number; metin: string; tur: string; ulke: number; onem: number }
export interface Bildirim { tur: string; metin: string; ulke: number; durdur: boolean; gun: number; kimlik: number }

export interface World {
  pkg: Paket;
  gun: number;
  surum: number;
  tohum: number;
  oyuncu: number;
  mod: number; // 0 Normal, 1 Sandbox (kalıcı), 2 Gözlemci
  bayrak: Uint8Array;
  hasatKademe: Int32Array; // iklim × 1 (yıllık)
  nR: number; nE: number; nC: number;
  R: Table<BolgeK>;
  E: Table<(typeof EYALET_KOL)[number][0]>;
  C: Table<UlkeK>;
  pop: Float64Array; // R × 32
  kim: Float64Array; // R × 7
  ekip: Float64Array; // C × NEKIP (başkent deposu)
  tekIlerleme: Float64Array; // C × NTEK
  tekBitti: Uint8Array; // C × NTEK
  tekMaliyet: Float64Array; // C × NTEK (başlangıçta sabitlenen maliyet)
  arastirma: Int32Array; // C × NYUVA (teknoloji indeksi, -1 boş)
  gorus: Float64Array; // C × C
  tutum: Int32Array; // C × C
  tutumKilit: Float64Array; // C × C
  kokenDefter: Float64Array; // C × nE ulusal köken defteri
  esir: Float64Array; // C(tutan) × C(köken) esir sayısı
  fiyat: Float64Array; // NMAL
  pazarHacim: Float64Array; // NMAL son temizleme hacmi
  U: Table<(typeof BIRLIK_KOL)[number][0]>;
  T: Table<(typeof TRANSIT_KOL)[number][0]>;
  AN: Table<(typeof ANLASMA_KOL)[number][0]>;
  SV: Table<(typeof SAVAS_KOL)[number][0]>;
  GR: Table<(typeof GEREKCE_KOL)[number][0]>;
  HT: Table<(typeof HAT_KOL)[number][0]>;
  PR: Table<(typeof PROJE_KOL)[number][0]>;
  YR: Table<(typeof YARALI_KOL)[number][0]>;
  KE: Table<(typeof KALICI_KOL)[number][0]>;
  TK: Table<(typeof TEKLIF_KOL)[number][0]>;
  SP: Table<(typeof SIPARIS_KOL)[number][0]>;
  OL: Table<(typeof OLAY_KOL)[number][0]>;
  MOD: Table<(typeof MOD_KOL)[number][0]>;
  KM: Table<(typeof KOMUTAN_KOL)[number][0]>;
  komutanAd: string[]; // KM.ad indeksli dizge tablosu
  /** Olay kararlarıyla açılan tarih bayrakları (sıralı küme; dallanan senaryo akışı) */
  olayBayrak: string[];
  birlikAd: string[]; // adNo indeksli dizge tablosu
  rotaEpoch: number;
  savasTaraf: Int8Array; // SV_MAX × C: 0 yok, 1 saldıran tarafı, 2 savunan tarafı
  iddia: Int16Array; // R × IDDIA_MAX: ülke+1 (0 boş)
  teklifBolge: Record<string, number[]>; // barış teklifindeki bölge listeleri (teklif kimliği → bölgeler)
  /** Hash dışı: savaş/anlaşma değişim sayacı (önbellek anahtarı) */
  diploSurum: number;
  /** Hash dışı: savaş tarafı ve anlaşma tablosu sürümleri (önbellek anahtarları) */
  savasSurum: number;
  anSurum: number;
  kuyruk: { sira: number; emir: Record<string, unknown> }[]; // onaylı emir kuyruğu (kanonik)
  emirSira: number;
  artik: { dogum: number; olum: number; kohort: number };
  sayac: { dogum: number; dogalOlum: number; askerOlum: number; ekOlum: number }; // kümülatif (korunum)
  // Hash dışı alanlar
  anlati: AnlatiKaydi[];
  /** Hash dışı: P9 muharebe kayıtları (görüntüleyici yalnız bunları oynatır; şartname v1.6 PR-15) */
  muharebeler: MuharebeKaydi[];
  bildirim: Bildirim[];
  tarihce: { gun: number; ulke: number[][] }[];
  onbellek: Map<string, unknown>;
  ayarlar: { zorlaTamYol: boolean; onbellekKapali: boolean };
  komsuluk: number[][];
  kenarKm: Map<number, number>;
  depo: Int32Array; // eyalet → merkez bölge
}

/** Araştırma yuvası sayısı (şema 7: 3 → 6; açık yuva sayısı eğitim ve bilim yatırımıyla artar). */
export const NYUVA = 6;

export const KOL_E = Array.from({ length: 16 }, (_, k) => `e${k}`);
export const KOL_T = Array.from({ length: 16 }, (_, k) => `t${k}`);
export const KOL_ON = Array.from({ length: 16 }, (_, k) => `on${k}`);
export const KOL_OK = Array.from({ length: 16 }, (_, k) => `ok${k}`);
export const hc = (r: number, yas: number, st: number) => r * NHUCRE + yas * 8 + st;
export const ek = (r: number, k: number) => r * NKIMLIK + k;
export const ck = (c: number, k: number) => c * NEKIP + k;
export const cc = (w: World, a: number, b: number) => a * w.nC + b;

export function bayrakAcik(w: World, ad: (typeof BAYRAK)[number]): boolean {
  return w.bayrak[BAYRAK.indexOf(ad)] === 1;
}

export function kenarKey(a: number, b: number): number { return a < b ? a * 4096 + b : b * 4096 + a; }

export function bolgeNufus(w: World, r: number): number {
  let n = 0;
  for (let k = 0; k < NHUCRE; k++) n += w.pop[r * NHUCRE + k]!;
  return n;
}

export function yeniDunya(pkg: Paket, oyuncu: number): World {
  donemYukle(pkg.donem as DonemKod | undefined);
  const nR = pkg.bolgeler.length, nE = pkg.eyaletler.length, nC = pkg.ulkeler.length;
  const w: World = {
    pkg, gun: gunNo(pkg.senaryo.baslangic), surum: 0, tohum: pkg.tohum, oyuncu, mod: 0,
    bayrak: new Uint8Array(BAYRAK.length), hasatKademe: new Int32Array(2),
    nR, nE, nC,
    R: fixedTable('bolge', BOLGE_KOL, nR), E: fixedTable('eyalet', EYALET_KOL, nE), C: fixedTable('ulke', ULKE_KOL, nC),
    pop: new Float64Array(nR * NHUCRE), kim: new Float64Array(nR * NKIMLIK),
    ekip: new Float64Array(nC * NEKIP), tekIlerleme: new Float64Array(nC * NTEK), tekBitti: new Uint8Array(nC * NTEK), tekMaliyet: new Float64Array(nC * NTEK),
    arastirma: new Int32Array(nC * NYUVA).fill(-1),
    gorus: new Float64Array(nC * nC), tutum: new Int32Array(nC * nC).fill(1), tutumKilit: new Float64Array(nC * nC),
    kokenDefter: new Float64Array(nC * nE), esir: new Float64Array(nC * nC),
    fiyat: new Float64Array(NMAL), pazarHacim: new Float64Array(NMAL),
    U: new Table('birlik', BIRLIK_KOL, 64), T: new Table('transit', TRANSIT_KOL, 64), AN: new Table('anlasma', ANLASMA_KOL, 16),
    SV: new Table('savas', SAVAS_KOL, 4), GR: new Table('gerekce', GEREKCE_KOL, 4), HT: new Table('hat', HAT_KOL, 32),
    PR: new Table('proje', PROJE_KOL, 16), YR: new Table('yarali', YARALI_KOL, 32), KE: new Table('kalici', KALICI_KOL, 8),
    TK: new Table('teklif', TEKLIF_KOL, 8), SP: new Table('siparis', SIPARIS_KOL, 16), OL: new Table('olay', OLAY_KOL, 8),
    MOD: new Table('mod', MOD_KOL, 8), KM: new Table('komutan', KOMUTAN_KOL, 16), komutanAd: [], olayBayrak: [],
    birlikAd: [], rotaEpoch: 1, kuyruk: [], emirSira: 0,
    savasTaraf: new Int8Array(SV_MAX * nC), iddia: new Int16Array(nR * IDDIA_MAX), teklifBolge: {}, diploSurum: 1, savasSurum: 1, anSurum: 1,
    artik: { dogum: 0, olum: 0, kohort: 0 },
    sayac: { dogum: 0, dogalOlum: 0, askerOlum: 0, ekOlum: 0 },
    anlati: [], muharebeler: [], bildirim: [], tarihce: [], onbellek: new Map(), ayarlar: { zorlaTamYol: false, onbellekKapali: false },
    komsuluk: pkg.bolgeler.map((b) => b.komsu), kenarKm: new Map(), depo: new Int32Array(pkg.eyaletler.map((e) => e.merkez)),
  };
  BAYRAK.forEach((b, i) => { w.bayrak[i] = pkg.bayraklar[b] ? 1 : 0; });
  for (const k of pkg.kenarlar) w.kenarKm.set(kenarKey(k.a, k.b), k.km);
  MAL.forEach((m, i) => { w.fiyat[i] = m.p0; });

  const R = w.R.c;
  pkg.bolgeler.forEach((b, r) => {
    R.sahip[r] = b.sahip; R.kontrolEden[r] = b.kontrol ?? b.sahip; R.kontrol[r] = 80_000; R.itaat[r] = b.kontrol !== undefined && b.kontrol !== b.sahip ? 15_000 : 0;
    R.butunlesme[r] = b.anaYurt.includes(b.sahip) ? 80_000 : 30_000;
    R.altyapi[r] = b.altyapi; R.demiryolu[r] = b.demiryolu; R.sulama[r] = b.sulama;
    R.sivilF[r] = b.sivilF; R.askeriF[r] = b.askeriF;
    R.anaYurtGun[r] = 0;
    R.kent[r] = Math.min(6, 1 + b.yerlesim + Math.floor((b.sivilF + b.askeriF) / 3));
    b.iddia.slice(0, IDDIA_MAX).forEach((d, i) => { w.iddia[r * IDDIA_MAX + i] = d + 1; });
    for (let k = 0; k < NHUCRE; k++) w.pop[r * NHUCRE + k] = b.nufus[k]!;
    for (let k = 0; k < NKIMLIK; k++) w.kim[r * NKIMLIK + k] = b.kimlik[k]!;
  });
  const C = w.C.c;
  pkg.ulkeler.forEach((u, c) => {
    C.hazine[c] = u.hazine; C.pg[c] = u.pg; C.huzur[c] = u.huzur; C.mesru[c] = u.mesru;
    C.destek[c] = u.destek ?? 40_000; C.vergi[c] = u.vergi; C.askerlik[c] = u.askerlik; C.ekonomi[c] = u.ekonomi; C.isgalPol[c] = 1;
    C.b0[c] = 250_000; C.b1[c] = 200_000; C.b2[c] = 300_000; C.b3[c] = 250_000; C.egitim[c] = 30_000;
    C.guvenilir[c] = 50_000; C.faiz[c] = 50_000; C.arastirmaHizi[c] = 1000; C.hedefUlke[c] = -1; C.bakimHedef[c] = S;
    C.muhimmat[c] = 0; C.bakimOdenen[c] = S; C.harcamaOran[c] = 700_000; C.otoTakviye[c] = 1; C.tuketimYet[c] = S;
    C.celik[c] = 20_000; C.komur[c] = 20_000; C.pasif[c] = u.pasif ? 1 : 0;
    C.bakan[c] = c === oyuncu ? BAKAN_VARSAYILAN : 0;
    // şema 7: rejim ve partiler, ekonomi ayarları, petrol stoku, deniz ve hava kuvvetleri
    C.rejim[c] = u.yonetim; C.model[c] = 1; C.tarife[c] = 100_000; C.petrol[c] = 20_000; C.havaBolge[c] = -1;
    partiBaslat(w, c);
    kuvvetBaslat(w, c);
    for (let d = 0; d < nC; d++) w.gorus[c * nC + d] = pkg.gorus[c]![d]!;
    // senaryonun verdiği başlangıç teknolojileri
    for (const kod of u.tekler ?? []) { const t = TEKNOLOJI.findIndex((x) => x.kod === kod); if (t >= 0 && !w.tekBitti[c * NTEK + t]) { w.tekBitti[c * NTEK + t] = 1; C.tekSay[c] = C.tekSay[c]! + 1; } }
  });
  for (const a of pkg.anlasmalar) {
    const s = w.AN.alloc();
    w.AN.c.tur[s] = (A as Record<string, number>)[a.tur]!; w.AN.c.a[s] = a.a; w.AN.c.b[s] = a.b; w.AN.c.baslangic[s] = w.gun; w.AN.c.bitis[s] = -1;
  }
  for (const sv of pkg.savaslar ?? []) {
    if (w.SV.count() >= SV_MAX || !sv.a.length || !sv.b.length) continue;
    const s = w.SV.alloc();
    w.SV.c.saldiran[s] = sv.a[0]!; w.SV.c.savunan[s] = sv.b[0]!; w.SV.c.baslangic[s] = w.gun - (sv.gun ?? 0); w.SV.c.gerekceli[s] = sv.gerekceli === false ? 0 : 1;
    for (const c of sv.a) w.savasTaraf[s * nC + c] = 1;
    for (const c of sv.b) w.savasTaraf[s * nC + c] = 2;
  }
  // Başlangıç birlikleri: personel köken eyaletlerinden A statüsüne, ekipman tam
  for (let r = 0; r < nR; r++) R.sonMuharebe[r] = -999;
  for (const pb of pkg.birlikler) {
    const sab = SABLON.findIndex((s) => s.kod === pb.sablon);
    birlikKur(w, pb.ulke, sab, pb.bolge, pb.ad, true);
  }
  // Başlangıç depoları: eyalet gıdası 45 günlük, mühimmat ve ekipman yedeği
  for (let e = 0; e < nE; e++) {
    let n = 0;
    for (const r of pkg.eyaletler[e]!.bolgeler) n += bolgeNufus(w, r);
    w.E.c.gida[e] = Math.floor((n * 45 * 1000) / K.gidaKisiGun);
    w.E.c.guvence[e] = S;
  }
  for (let c = 0; c < nC; c++) {
    const u = pkg.ulkeler[c]!;
    if (u.depo) {
      w.C.c.muhimmat[c] = u.depo.muhimmat;
      u.depo.ekip.forEach((v, k) => { w.ekip[ck(c, k)] = v; });
    } else {
      const buyuk = [1, 0, 2, 1][c] ?? 1;
      w.C.c.muhimmat[c] = [60_000, 25_000, 90_000, 40_000][c] ?? 30_000;
      w.ekip[ck(c, 0)] = [2500, 900, 3200, 1600][c] ?? 1000;
      w.ekip[ck(c, 3)] = 150 * (buyuk + 1);
      w.ekip[ck(c, 4)] = 30 * (buyuk + 1);
      w.ekip[ck(c, 5)] = 25 * (buyuk + 1);
      w.ekip[ck(c, 6)] = 8 * buyuk;
    }
    if (u.pasif) continue;
    // başlangıç üretim hatları
    hatEkle(w, c, 0, 450_000);
    hatEkle(w, c, URUN_MUH, 300_000);
    hatEkle(w, c, 5, 150_000);
    hatEkle(w, c, 4, 100_000);
  }
  return w;
}

/** Başlangıç parti destekleri: rejime ve döneme göre (iktidar en güçlü parti). */
export function partiBaslat(w: World, c: number): void {
  const C = w.C.c;
  const rj = C.rejim[c]!;
  // eğilimler: 0 düzen, 1 serbesti, 2 eşitlik, 3 milliyet, 4 devrim
  const taban = rj === 2 ? [300, 280, 220, 150, 50] : rj === 1 ? [380, 240, 160, 160, 60] : rj === 3 ? [200, 100, 150, 450, 100] : rj === 4 ? [300, 80, 80, 480, 60] : [500, 150, 120, 180, 50];
  // ülke kimliği küçük sapma verir (kişilik ve güç; deterministik)
  const k = w.pkg.ulkeler[c]!.kisilik;
  if (k === 0) { taban[3] = taban[3]! + 80; taban[1] = taban[1]! - 40; taban[2] = taban[2]! - 40; }
  if (k === 3) { taban[1] = taban[1]! + 80; taban[3] = taban[3]! - 80; }
  if (k === 4) { taban[4] = taban[4]! + 60; taban[0] = taban[0]! - 60; }
  const top = taban.reduce((a, b) => a + b, 0);
  const pay = largestRemainder(S, taban.map((x) => Math.max(1, x)));
  void top;
  C.parti0[c] = pay[0]!; C.parti1[c] = pay[1]!; C.parti2[c] = pay[2]!; C.parti3[c] = pay[3]!; C.parti4[c] = pay[4]!;
  let best = 0; for (let i = 1; i < 5; i++) if (pay[i]! > pay[best]!) best = i;
  C.iktidar[c] = best;
  C.secim[c] = rj === 1 || rj === 2 ? w.gun + 365 * 2 + ((c * 97) % 730) : 0;
}
/** Başlangıç donanması ve hava kuvvetleri: senaryonun deniz gücü ve genel güç puanından (dönem kataloğuna göre). */
export function kuvvetBaslat(w: World, c: number): void {
  const u = w.pkg.ulkeler[c]!;
  if (u.pasif) return;
  const C = w.C.c;
  let lim = w.onbellek.get('limanUlke') as Uint8Array | undefined;
  if (!lim) {
    lim = new Uint8Array(w.nC);
    for (const k of w.pkg.kenarlar) if (k.tur) { const a = w.pkg.bolgeler[k.a]!.sahip, b2 = w.pkg.bolgeler[k.b]!.sahip; if (a >= 0) lim[a] = 1; if (b2 >= 0) lim[b2] = 1; }
    for (const b2 of w.pkg.bolgeler) if (b2.kiyi && b2.sahip >= 0) lim[b2.sahip] = 1;
    w.onbellek.set('limanUlke', lim);
  }
  const kiyi = lim[c] === 1;
  const d = AKTIF.donem;
  const deniz = u.deniz ?? Math.floor((u.guc ?? 4) / 2);
  if (kiyi && deniz > 0) GEMI[d].forEach((g, k) => { C[`gs${k}` as 'gs0'][c] = Math.floor((g.taban * deniz * (deniz + 2)) / 6); });
  const guc = u.guc ?? 4;
  HAVA[d].forEach((h, k) => { C[`h${k}` as 'h0'][c] = Math.floor((h.taban * guc * (guc + 1)) / 8); });
}

export function toplamAskeriFabrika(w: World, c: number): number {
  let n = 0;
  for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === c) n += w.R.c.askeriF[r]!; // yalnız hat kurulurken
  return n;
}

/** Üretim hattı ekler. pay: askerî fabrikaların payı (S ölçekli). fabrika ×1000 (milifabrika). */
export function hatEkle(w: World, c: number, urun: number, pay: number): number {
  const s = w.HT.alloc();
  const top = Math.max(1, toplamAskeriFabrika(w, c));
  w.HT.c.ulke[s] = c; w.HT.c.urun[s] = urun;
  w.HT.c.fabrika[s] = Math.max(100, Math.floor((top * pay) / 1000));
  w.HT.c.verim[s] = 300_000; w.HT.c.oncelik[s] = w.HT.hw;
  return s;
}

/** Birlik şablonunun ihtiyaçları. */
export function sablonIhtiyac(sab: number): { kisi: number; aile: Record<string, number>; org: number; genislik: number; hiz: number; egitim: number } {
  const s = SABLON[sab]!;
  let kisi = 0, orgT = 0, gen = 0, hiz = 1e9, egitim = 0;
  const aile: Record<string, number> = {};
  for (const tk of s.taburlar) {
    const t = TABUR.find((x) => x.kod === tk)!;
    kisi += t.kisi; orgT += t.org * t.kisi; gen += t.genislik; hiz = Math.min(hiz, t.hiz); egitim = Math.max(egitim, t.egitim);
    aile[t.aile] = (aile[t.aile] ?? 0) + t.adet;
  }
  return { kisi, aile, org: Math.floor(orgT / kisi), genislik: gen, hiz, egitim };
}

/** Ülkenin Y havuzundan (kontrol erişimiyle) kişi çeker; köken eyaletlerine göre dağılım döner. */
export function askerCek(w: World, c: number, kisi: number, kaynak: number[] = [ST.Y]): number[] | null {
  const agirlik: number[] = [];
  const rs: number[] = [];
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c) continue;
    let v = 0;
    for (const st of kaynak) v += w.pop[hc(r, YB.ASKER, st)]!;
    const erisim = Math.floor((v * w.R.c.kontrol[r]!) / 100_000);
    if (erisim > 0) { rs.push(r); agirlik.push(erisim); }
  }
  const top = agirlik.reduce((a, b) => a + b, 0);
  if (top < kisi) return null;
  const pay = largestRemainder(kisi, agirlik);
  const eyalet = new Array<number>(w.nE).fill(0);
  rs.forEach((r, i) => {
    let kalan = pay[i]!;
    for (const st of kaynak) {
      const h = hc(r, YB.ASKER, st);
      const al = Math.min(kalan, w.pop[h]!);
      w.pop[h] = w.pop[h]! - al; w.pop[hc(r, YB.ASKER, ST.A)] = w.pop[hc(r, YB.ASKER, ST.A)]! + al; kalan -= al;
    }
    eyalet[w.pkg.bolgeler[r]!.eyalet]! += pay[i]!;
  });
  return eyalet;
}

/** Birlik kur: başlangıçta tam, aksi hâlde eğitimde. */
export function birlikKur(w: World, c: number, sab: number, bolge: number, ad: string, baslangic: boolean, egitimGun = 0): number {
  const ih = sablonIhtiyac(sab);
  const kaynak = baslangic ? [ST.E, ST.Y, ST.S] : [ST.Y];
  const koken = askerCek(w, c, ih.kisi, kaynak);
  if (!koken) return -1;
  const u = w.U.alloc();
  const U = w.U.c as unknown as Record<string, Float64Array>;
  U.ulke![u] = c; U.sablon![u] = sab; U.bolge![u] = bolge; U.hedef![u] = -1; U.sonraki![u] = -1;
  U.kisi![u] = ih.kisi; U.org![u] = baslangic ? ih.org : Math.floor(ih.org / 2); U.deneyim![u] = baslangic ? 30_000 : 10_000;
  U.gida![u] = Math.floor((ih.kisi * 3 * K.birlikErzakGun * 1000) / (2 * K.gidaKisiGun));
  U.egitimBitis![u] = baslangic ? 0 : w.gun + egitimGun;
  U.durus![u] = 0;
  const s = SABLON[sab]!;
  U.taburSay![u] = s.taburlar.length;
  s.taburlar.forEach((tk, k) => { U[KOL_T[k]!]![u] = TABUR.findIndex((t) => t.kod === tk); });
  // ekipman: başlangıçta tam (ilk ekipman türü); yeni birlikte depodan çekilir
  for (const [aile, adet] of Object.entries(ih.aile)) {
    const turler = AILE_EKIP[aile]!;
    if (baslangic) U[`e${turler[0]}`]![u] = adet;
    else {
      let kalan = adet;
      for (let q = turler.length - 1; q >= 0 && kalan > 0; q--) {
        const k = turler[q]!;
        const al = Math.min(kalan, w.ekip[ck(c, k)]!);
        w.ekip[ck(c, k)] = w.ekip[ck(c, k)]! - al; U[KOL_E[k]!]![u] = U[KOL_E[k]!]![u]! + al; kalan -= al;
      }
    }
  }
  // mühimmat: 7 muharebe günü
  U.muhimmatS![u] = baslangic ? birlikMuhimmatGun(w, u) * 7 : 0;
  // köken partileri (en çok 8 + diğer)
  kokenEkle(w, u, koken);
  w.birlikAd.push(ad);
  U.adNo![u] = w.birlikAd.length - 1;
  void EKIPMAN;
  return u;
}

export function birlikMuhimmatGun(w: World, u: number): number {
  const U = w.U.c as unknown as Record<string, Float64Array>;
  let m = 0;
  const n = U.taburSay![u]!;
  for (let k = 0; k < n; k++) m += TABUR[U[KOL_T[k]!]![u]!]!.muhimmat;
  return m;
}

/** Köken eyalet partilerine kişi ekler (bölüm 10.6). */
export function kokenEkle(w: World, u: number, eyaletKisi: number[]): void {
  const U = w.U.c as unknown as Record<string, Float64Array>;
  const c = U.ulke![u]!;
  for (let e = 0; e < eyaletKisi.length; e++) {
    let n = eyaletKisi[e]!;
    if (n <= 0) continue;
    let slot = -1;
    for (let k = 0; k < 8; k++) if (U[KOL_OK[k]!]![u] === e + 1) { slot = k; break; }
    if (slot < 0) for (let k = 0; k < 8; k++) if (U[KOL_OK[k]!]![u] === 0) { slot = k; U[KOL_OK[k]!]![u] = e + 1; break; }
    if (slot < 0) {
      // dokuzuncu köken: en küçük parti (eşitlikte büyük eyalet kimliği) diğer kovasına
      let min = -1;
      for (let k = 0; k < 8; k++) {
        if (min < 0 || U[KOL_ON[k]!]![u]! < U[KOL_ON[min]!]![u]! || (U[KOL_ON[k]!]![u] === U[KOL_ON[min]!]![u] && U[KOL_OK[k]!]![u]! > U[KOL_OK[min]!]![u]!)) min = k;
      }
      const ey = U[KOL_OK[min]!]![u]! - 1;
      const say = U[KOL_ON[min]!]![u]!;
      U.on8![u] = U.on8![u]! + say;
      w.kokenDefter[c * w.nE + ey] = w.kokenDefter[c * w.nE + ey]! + say;
      U[KOL_OK[min]!]![u] = e + 1; U[KOL_ON[min]!]![u] = 0; slot = min;
    }
    U[KOL_ON[slot]!]![u] = U[KOL_ON[slot]!]![u]! + n;
    n = 0;
  }
}
