import { DONEMLER, TEK_KOD, type DonemKod } from './donem.ts';
// Ek B: veri sözlüğü ve başlangıç katsayıları (1A). Bütün sayılar VARSAYILAN denge başlangıç değeridir.
// Ölçekler: oran S=1e6, puan ×1000, gıda/mühimmat/kaynak milibirim, sanayi milipuan (SP×1000).

export const STATU = ['O', 'S', 'Y', 'E', 'A', 'W', 'P', 'R'] as const;
export const ST = { O: 0, S: 1, Y: 2, E: 3, A: 4, W: 5, P: 6, R: 7 } as const;
export const YAS = ['çocuk', 'askerlik çağı', 'diğer yetişkin', 'yaşlı'] as const;
export const YB = { COCUK: 0, ASKER: 1, YETISKIN: 2, YASLI: 3 } as const;
export const NST = 8;
export const NYAS = 4;
export const NHUCRE = NST * NYAS; // bölge başına 32
export const NKIMLIK = 7; // 3 kültür × 2 inanç + diğer
/** Geçerli hücre mi? S, Y, E yalnız askerlik çağı; çocuk yalnız O. */
export function hucreGecerli(yas: number, st: number): boolean {
  if (yas === YB.COCUK) return st === ST.O;
  if (st === ST.S || st === ST.Y || st === ST.E) return yas === YB.ASKER;
  return true;
}

// ---------- Arazi (15.6) ----------
export const ARAZI = [
  { ad: 'Ova', genislik: 90, savunma: 1_000_000, atli: 1_000_000, hareket: 1_000_000, ikmal: 1_000_000 },
  { ad: 'Orman', genislik: 84, savunma: 1_150_000, atli: 800_000, hareket: 850_000, ikmal: 1_000_000 },
  { ad: 'Tepe', genislik: 80, savunma: 1_250_000, atli: 850_000, hareket: 800_000, ikmal: 1_000_000 },
  { ad: 'Dağ', genislik: 50, savunma: 1_500_000, atli: 600_000, hareket: 600_000, ikmal: 1_000_000 },
  { ad: 'Bataklık', genislik: 50, savunma: 1_300_000, atli: 500_000, hareket: 600_000, ikmal: 1_000_000 },
  { ad: 'Çöl', genislik: 90, savunma: 1_000_000, atli: 1_000_000, hareket: 900_000, ikmal: 1_500_000 },
  { ad: 'Kent', genislik: 96, savunma: 1_400_000, atli: 700_000, hareket: 1_000_000, ikmal: 1_000_000 },
] as const;

// ---------- Ekipman (13.3) ----------
export interface Ekipman {
  kod: string; ad: string; aile: string; yil: number; YS: number; SS: number; SV: number; YR: number;
  zirh: number; delme: number; sertlik: number; sp: number; celik: number; agirlik: number; tek?: string;
}
// İstatistikler ×1000 tamsayı; sp milipuan; çelik milibirim; ağırlık milibirim taşıma.
export const EKIPMAN: Ekipman[] = [
  { kod: 'psil1', ad: 'Piyade silahı I', aile: 'piyade', yil: 1914, YS: 5000, SS: 500, SV: 20000, YR: 3000, zirh: 0, delme: 3000, sertlik: 0, sp: 400, celik: 50, agirlik: 5 },
  { kod: 'psil2', ad: 'Piyade silahı II', aile: 'piyade', yil: 1916, YS: 6000, SS: 600, SV: 22000, YR: 3500, zirh: 0, delme: 3000, sertlik: 0, sp: 450, celik: 55, agirlik: 5, tek: 'piyade2' },
  { kod: 'psil3', ad: 'Piyade silahı III', aile: 'piyade', yil: 1918, YS: 7000, SS: 800, SV: 24000, YR: 4000, zirh: 0, delme: 4000, sertlik: 0, sp: 500, celik: 60, agirlik: 5, tek: 'piyade3' },
  { kod: 'suvari', ad: 'Süvari teçhizatı', aile: 'suvari', yil: 1914, YS: 6000, SS: 500, SV: 10000, YR: 8000, zirh: 0, delme: 3000, sertlik: 0, sp: 1000, celik: 50, agirlik: 20 },
  { kod: 'mt', ad: 'Makineli tüfek', aile: 'mt', yil: 1914, YS: 4000, SS: 1000, SV: 12000, YR: 1000, zirh: 0, delme: 4000, sertlik: 0, sp: 800, celik: 100, agirlik: 15 },
  { kod: 'sahra', ad: 'Sahra topu', aile: 'sahra', yil: 1914, YS: 20000, SS: 1000, SV: 6000, YR: 4000, zirh: 0, delme: 4000, sertlik: 0, sp: 3000, celik: 500, agirlik: 150 },
  { kod: 'agir1', ad: 'Ağır top', aile: 'agir', yil: 1914, YS: 28000, SS: 4000, SV: 6000, YR: 3000, zirh: 0, delme: 10000, sertlik: 0, sp: 6000, celik: 1000, agirlik: 400 },
  { kod: 'agir2', ad: 'Ağır top II', aile: 'agir', yil: 1916, YS: 32000, SS: 5000, SV: 6000, YR: 3000, zirh: 0, delme: 12000, sertlik: 0, sp: 6500, celik: 1100, agirlik: 400, tek: 'agirtop2' },
];
export const NEKIP = EKIPMAN.length;
export const ekipIdx = (kod: string): number => EKIPMAN.findIndex((e) => e.kod === kod);
export const AILE_EKIP: Record<string, number[]> = {};
function aileKur(): void {
  for (const k of Object.keys(AILE_EKIP)) delete AILE_EKIP[k];
  EKIPMAN.forEach((e, i) => { (AILE_EKIP[e.aile] ??= []).push(i); });
}
aileKur();

// ---------- Mühimmat (13.2) ----------
export const MUHIMMAT = { sp: 1200, celik: 600, komur: 300, agirlik: 1000 };

// ---------- Taburlar ----------
export interface Tabur { kod: string; ad: string; kisi: number; aile: string; adet: number; org: number; genislik: number; hiz: number; muhimmat: number; destek?: boolean; egitim: number }
// org ×1000; hız km/gün; mühimmat milibirim/gün muharebede
export const TABUR: Tabur[] = [
  { kod: 'piyade', ad: 'Piyade taburu', kisi: 1000, aile: 'piyade', adet: 100, org: 60000, genislik: 2, hiz: 25, muhimmat: 50, egitim: 90 },
  { kod: 'suvari', ad: 'Süvari taburu', kisi: 800, aile: 'suvari', adet: 80, org: 50000, genislik: 2, hiz: 45, muhimmat: 50, egitim: 120 },
  { kod: 'mt', ad: 'Makineli tüfek bölüğü', kisi: 200, aile: 'mt', adet: 12, org: 60000, genislik: 0, hiz: 25, muhimmat: 80, destek: true, egitim: 90 },
  { kod: 'sahra', ad: 'Sahra topu taburu', kisi: 500, aile: 'sahra', adet: 12, org: 40000, genislik: 3, hiz: 20, muhimmat: 600, egitim: 120 },
  { kod: 'agir', ad: 'Ağır top taburu', kisi: 500, aile: 'agir', adet: 8, org: 40000, genislik: 3, hiz: 15, muhimmat: 1000, egitim: 120 },
];
export const taburIdx = (kod: string): number => TABUR.findIndex((t) => t.kod === kod);

export interface Sablon { kod: string; ad: string; kisa: string; taburlar: string[]; esanlam: string[] }
export const SABLON: Sablon[] = [
  { kod: 'piyade', ad: 'Piyade Tümeni', kisa: 'P', taburlar: ['piyade', 'piyade', 'piyade', 'piyade', 'sahra', 'mt'], esanlam: ['piyade', 'tümen', 'piyade tümeni', 'asker', 'birlik'] },
  { kod: 'suvari', ad: 'Süvari Tümeni', kisa: 'S', taburlar: ['suvari', 'suvari', 'suvari'], esanlam: ['süvari', 'atlı', 'süvari tümeni'] },
  { kod: 'topcu', ad: 'Topçu Alayı', kisa: 'T', taburlar: ['sahra', 'sahra', 'agir'], esanlam: ['topçu', 'top', 'topçu alayı'] },
  { kod: 'yedek', ad: 'Yedek Tümen', kisa: 'Y', taburlar: ['piyade', 'piyade', 'piyade'], esanlam: ['yedek', 'garnizon', 'yedek tümen'] },
];
export const MAX_TABUR = 6;

// ---------- Mallar (pazar) ----------
export interface Mal { kod: string; ad: string; p0: number; esanlam: string[] }
export const MAL: Mal[] = [
  { kod: 'gida', ad: 'Gıda', p0: 900, esanlam: ['gıda', 'yiyecek', 'tahıl', 'buğday', 'erzak'] },
  { kod: 'celik', ad: 'Çelik', p0: 1500, esanlam: ['çelik', 'demir'] },
  { kod: 'komur', ad: 'Kömür', p0: 400, esanlam: ['kömür'] },
  { kod: 'muhimmat', ad: 'Mühimmat', p0: 3500, esanlam: ['mühimmat', 'cephane', 'mermi'] },
];
export const NMAL = MAL.length;
export const MALI = { gida: 0, celik: 1, komur: 2, muhimmat: 3 } as const;

// ---------- Yasalar ----------
export const ASKERLIK = [
  { ad: 'Gönüllü', y: 75_000, destek: 0, egitimSure: 1_000_000 },
  { ad: 'Sınırlı', y: 125_000, destek: 10_000, egitimSure: 1_000_000 },
  { ad: 'Kapsamlı', y: 250_000, destek: 20_000, egitimSure: 1_100_000 },
  { ad: 'Zorunlu', y: 500_000, destek: 60_000, egitimSure: 1_200_000 },
  { ad: 'Son çare', y: 800_000, destek: 0, egitimSure: 1_350_000 },
] as const;
export const EKONOMI = [
  { ad: 'Sivil', tuketim: 350_000, insaat: 1_000_000, askeri: 900_000, huzur: 5000, destek: 0 },
  { ad: 'Kısmi', tuketim: 250_000, insaat: 1_100_000, askeri: 1_000_000, huzur: 0, destek: 25_000 },
  { ad: 'Savaş', tuketim: 150_000, insaat: 1_200_000, askeri: 1_100_000, huzur: -5000, destek: 60_000 },
  { ad: 'Topyekûn', tuketim: 100_000, insaat: 1_300_000, askeri: 1_200_000, huzur: -15000, destek: 80_000 },
] as const;
export const YONETIM = [
  { ad: 'Mutlak monarşi', pg: 30_000, baris: 3, huzur: 50_000, destek: 50_000, mesru: 60_000, idari: 450_000 },
  { ad: 'Meşruti monarşi', pg: 20_000, baris: 2, huzur: 55_000, destek: 45_000, mesru: 55_000, idari: 550_000 },
  { ad: 'Demokratik cumhuriyet', pg: 15_000, baris: 1, huzur: 60_000, destek: 35_000, mesru: 55_000, idari: 600_000 },
  { ad: 'Tek parti', pg: 30_000, baris: 2, huzur: 45_000, destek: 55_000, mesru: 45_000, idari: 500_000 },
  { ad: 'Askerî yönetim', pg: 25_000, baris: 3, huzur: 35_000, destek: 55_000, mesru: 35_000, idari: 450_000 },
] as const;
export const ISGAL = [
  { ad: 'Yumuşak', tavan: 400_000, hedef: 60_000, hiz: 3000, direnis: 25_000, garnizon: 750_000 },
  { ad: 'Dengeli', tavan: 550_000, hedef: 45_000, hiz: 2500, direnis: 40_000, garnizon: 1_000_000 },
  { ad: 'Sert', tavan: 700_000, hedef: 30_000, hiz: 2000, direnis: 55_000, garnizon: 1_250_000 },
] as const;
export const KISILIK = ['Yayılmacı', 'Temkinli', 'Fırsatçı', 'Ticari', 'İdeolojik'] as const;
export const TUTUM = ['Dostane', 'Nötr', 'Soğuk', 'Düşmanca'] as const;
export const BUTCE = ['Bilim', 'Eğitim', 'Altyapı/Tarım', 'Sosyal/Güvenlik'] as const;

// ---------- Teknoloji (1A alt kümesi) ----------
export interface Teknoloji {
  kod: string; ad: string; yil: number; maliyet: number; on: string[]; etki: string; esanlam: string[];
  /** Dal (TEK_DAL sırası) */
  dal: number;
  /** Bu teknoloji araştırılınca kapanan seçenekler (doktrinler birbirini dışlar) */
  dislar: string[];
}
// maliyet: araştırma puanı ×1000 (taban hız günlük 1000 → 1 puan/gün)
export const TEKNOLOJI: Teknoloji[] = [
  { kod: 'piyade2', ad: 'Piyade silahı II', yil: 1916, maliyet: 150_000, on: [], etki: 'Piyade silahı II üretimi', esanlam: ['piyade silahı', 'tüfek', 'piyade silahı ii'], dal: 0, dislar: [] },
  { kod: 'piyade3', ad: 'Piyade silahı III', yil: 1918, maliyet: 180_000, on: ['piyade2'], etki: 'Piyade silahı III üretimi', esanlam: ['piyade silahı iii'], dal: 0, dislar: [] },
  { kod: 'agirtop2', ad: 'Ağır top II', yil: 1916, maliyet: 160_000, on: [], etki: 'Ağır top II üretimi', esanlam: ['ağır top', 'topçu', 'ağır top ii'], dal: 0, dislar: [] },
  { kod: 'tarim1', ad: 'Tarım makineleri', yil: 1914, maliyet: 120_000, on: [], etki: 'İşçi yoğunluğu −%15', esanlam: ['tarım', 'tarım makineleri', 'tarım teknolojisi'], dal: 4, dislar: [] },
  { kod: 'tarim2', ad: 'Gübre kimyası', yil: 1917, maliyet: 170_000, on: ['tarim1'], etki: 'Alan verimi +%10', esanlam: ['gübre', 'gübre kimyası'], dal: 4, dislar: [] },
  { kod: 'sanayi1', ad: 'Seri üretim', yil: 1914, maliyet: 130_000, on: [], etki: 'Fabrika gücü +%10', esanlam: ['sanayi', 'seri üretim', 'fabrika'], dal: 3, dislar: [] },
  { kod: 'sanayi2', ad: 'Elektrikli tezgâh', yil: 1917, maliyet: 180_000, on: ['sanayi1'], etki: 'Fabrika gücü +%10; verim tavanı +0,1', esanlam: ['elektrik', 'elektrikli tezgah', 'tezgâh'], dal: 3, dislar: [] },
  { kod: 'demiryolu', ad: 'Demiryolu ağı', yil: 1914, maliyet: 140_000, on: [], etki: 'Demiryolu inşa maliyeti −%25; kapasite +%10', esanlam: ['demiryolu', 'demiryolu ağı', 'lojistik'], dal: 2, dislar: [] },
  { kod: 'sihhiye', ad: 'Sahra sıhhiyesi', yil: 1915, maliyet: 120_000, on: [], etki: 'Yaralı iyileşmesi %50 → %60', esanlam: ['sıhhiye', 'sağlık', 'hastane', 'sahra sıhhiyesi'], dal: 2, dislar: [] },
  { kod: 'kurmay', ad: 'Kurmay sistemi', yil: 1914, maliyet: 140_000, on: [], etki: 'Organizasyon yenilenmesi +%20', esanlam: ['kurmay', 'kurmay sistemi', 'doktrin'], dal: 1, dislar: [] },
  { kod: 'idare', ad: 'Modern bürokrasi', yil: 1915, maliyet: 150_000, on: [], etki: 'Yönetim kapasitesi +10, idari verim +0,05', esanlam: ['bürokrasi', 'idare', 'modern bürokrasi'], dal: 5, dislar: [] },
  { kod: 'propaganda', ad: 'Kitle basını', yil: 1915, maliyet: 110_000, on: [], etki: 'Savaşa destek +5', esanlam: ['propaganda', 'basın', 'kitle basını'], dal: 5, dislar: [] },
  ...DONEMLER.buyuk.teknoloji.slice(12),
];
export const NTEK = TEKNOLOJI.length;
const TEK_I: Record<string, number> = Object.fromEntries(TEK_KOD.map((k, i) => [k, i]));
/** Teknoloji yuvası (kodlar bütün dönemlerde aynı sıradadır). */
export const tekIdx = (kod: string): number => TEK_I[kod] ?? TEKNOLOJI.findIndex((t) => t.kod === kod);
/** Ülke bu teknolojiyi biliyor mu? */
export const tekVar = (w: { tekBitti: Uint8Array }, c: number, kod: string): boolean => w.tekBitti[c * NTEK + tekIdx(kod)] === 1;

// ---------- Projeler (13.6) ----------
export interface Proje { kod: string; ad: string; sp: number; nakit: number; gun: number; esanlam: string[] }
export const PROJE: Proje[] = [
  { kod: 'sivil', ad: 'Sivil fabrika', sp: 1_800_000, nakit: 900_000, gun: 180, esanlam: ['sivil fabrika', 'fabrika'] },
  { kod: 'askeri', ad: 'Askerî fabrika', sp: 1_800_000, nakit: 1_000_000, gun: 180, esanlam: ['askeri fabrika', 'askerî fabrika', 'silah fabrikası', 'cephane fabrikası'] },
  { kod: 'sulama', ad: 'Sulama', sp: 600_000, nakit: 500_000, gun: 120, esanlam: ['sulama', 'kanal'] },
  { kod: 'demiryolu', ad: 'Demiryolu düzeyi', sp: 900_000, nakit: 800_000, gun: 120, esanlam: ['demiryolu', 'ray', 'tren yolu'] },
  { kod: 'altyapi', ad: 'Altyapı', sp: 700_000, nakit: 500_000, gun: 90, esanlam: ['altyapı', 'yol'] },
  { kod: 'valilik', ad: 'Valilik', sp: 500_000, nakit: 700_000, gun: 150, esanlam: ['valilik', 'idare binası'] },
];
export const projeIdx = (kod: string): number => PROJE.findIndex((p) => p.kod === kod);

// ---------- Dönem kataloğu ----------
/** Etkin dönem: senaryo paketine göre katalog dizileri yerinde değiştirilir (Worker'da tek dünya vardır). */
export const AKTIF = { donem: 'buyuk' as DonemKod, surum: 0, yilOlcek: 1 };
export function donemYukle(kod: DonemKod | undefined): void {
  const d = DONEMLER[kod ?? 'buyuk'];
  if (AKTIF.donem === d.kod && EKIPMAN[0]?.ad === d.ekipman[0]!.ad) return;
  EKIPMAN.splice(0, EKIPMAN.length, ...d.ekipman);
  TABUR.splice(0, TABUR.length, ...d.tabur);
  SABLON.splice(0, SABLON.length, ...d.sablon);
  TEKNOLOJI.splice(0, TEKNOLOJI.length, ...d.teknoloji);
  PROJE.splice(0, PROJE.length, ...d.proje);
  MAL.splice(0, MAL.length, ...d.mal);
  aileKur();
  AKTIF.donem = d.kod;
  AKTIF.yilOlcek = d.yilOlcek;
  AKTIF.surum++;
}

// ---------- Bayraklar (5.8) ----------
export const BAYRAK = ['zirh_aktif', 'rota_alternatif', 'seferberlik', 'tahkimat', 'buyuk_taarruz', 'secim', 'para_basma', 'deniz_soyut', 'deniz_ayrintili', 'hava_soyut', 'goc', 'istihbarat'] as const;
export type BayrakAd = (typeof BAYRAK)[number];
export const bayrakIdx = (b: BayrakAd): number => BAYRAK.indexOf(b);

// ---------- Başlangıç katsayıları (Ek B, 1A) ----------
export const K = {
  gidaKisiGun: 30_000, // 1 gıda birimi = 30.000 sivil kişi-günü
  fabrikaSP: 4500, // milipuan/gün
  fabrikaIsci: 2000,
  hizmetVerim: 450, // mili-altın / kişi / gün katma değer
  spDeger: 900, // altın / SP (katma değer)
  maasGun: 60, // mili-altın / asker / gün
  ekipBakim: 15, // binde: ekipman SP değerinin günlük bakım payı (‰)
  idariGider: 120, // mili-altın / kişi / yıl → günlük idari gider tabanı
  bozulmaAylik: 5000, // gıda aylık bozulma S ölçekli %0,5
  kenarKapasite: 600_000, // milibirim taşıma / gün taban
  bogazHiz: 100, // km/gün boğaz geçişi (VARSAYILAN, Ek A K-21)
  okyanusHiz: 250, // km/gün açık deniz nakliyesi
  cikarmaCarpan: 600_000, // denizden çıkarma saldırı çarpanı
  birlikErzakGun: 7,
  yaraliGun: 60,
  dogumYillik: 30_000, // nominal yıllık doğum %3 (S)
  netYillik: 10_000, // net doğal büyüme %1 (S)
  kohortGiris: 10_000, // yıllık nüfusun %1'i
  kohortCikisAylik: 3333, // askerlik çağı nüfusunun 1/300'ü (S)
  yedeklikYil: 12,
  ateskesGun: 1826,
  gerekceGun: 60,
  gerekcePG: 50_000,
  savasPG: 25_000,
  lambda: 500_000,
  orgTavan: 350_000,
} as const;

/** Mevsim çarpanları (8.4). */
export const KIS_HAREKET = [1_000_000, 850_000, 700_000, 550_000];
export const KIS_KAPASITE = [1_000_000, 900_000, 750_000, 600_000];
export const CAMUR_HAREKET = [1_000_000, 800_000, 600_000];

/** Hasat dağılımı (11.1): ham çarpanlar ve olasılıklar; derleyici normalleştirir. */
export const HASAT_HAM = [610_000, 870_000, 1_020_000, 1_120_000, 1_220_000];
export const HASAT_P = [50_000, 200_000, 500_000, 200_000, 50_000];
