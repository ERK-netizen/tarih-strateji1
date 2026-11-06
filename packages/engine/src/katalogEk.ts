// Ek katalog (şema 7): deniz ve hava kuvvetleri, siyasi partiler, rejim adları, ekonomi modelleri, tarım odakları,
// teknoloji kademeleri (geleceğe uzanan adlar) ve petrol. Bütün sayılar VARSAYILAN denge değeridir.
import type { DonemKod } from './donem.ts';

// ---------- Fiyat ölçeği ----------
/** Dönem ekonomilerinin büyüklük ölçeği (1914 = 1): gemi, uçak ve büyük yatırım bedelleri bununla çarpılır (‰). */
export const DONEM_FIYAT: Record<DonemKod, number> = { orta: 70, barut: 130, buyuk: 1000, ikinci: 1500, modern: 4000 };

// ---------- Deniz kuvvetleri ----------
/** Gemi sınıfı rolleri (bütün dönemlerde aynı sıra): 0 hat gemisi, 1 kruvazör, 2 muhrip/eskort, 3 akıncı/denizaltı, 4 nakliye. */
export interface GemiSinif {
  ad: string; kisa: string;
  /** muharebe gücü (×10) */ guc: number;
  /** ticaret akını gücü (×10) */ akin: number;
  /** konvoy koruma ve denizaltı savarlık (×10) */ koruma: number;
  /** 1914 ölçeğinde birim bedel (altın) ve yapım süresi (gün) */ bedel: number; gun: number;
  /** günlük bakım (altın) ve yakıt (milibirim petrol) */ bakim: number; yakit: number;
  /** başlangıçta deniz gücü puanı başına sayı */ taban: number;
}
const G = (ad: string, kisa: string, guc: number, akin: number, koruma: number, bedel: number, gun: number, bakim: number, yakit: number, taban: number): GemiSinif =>
  ({ ad, kisa, guc, akin, koruma, bedel, gun, bakim, yakit, taban });
export const GEMI: Record<DonemKod, GemiSinif[]> = {
  orta: [G('Ağır kadırga', 'kadırga', 60, 0, 5, 1_500_000, 180, 400, 0, 3), G('Hafif kadırga', 'kalyete', 25, 5, 10, 600_000, 120, 150, 0, 6), G('Çekdiri', 'çekdiri', 10, 0, 15, 200_000, 60, 40, 0, 8), G('Korsan teknesi', 'korsan', 5, 25, 0, 150_000, 50, 30, 0, 4), G('Nakliye gemisi', 'nakliye', 0, 0, 0, 80_000, 40, 15, 0, 10)],
  barut: [G('Kalyon (hat gemisi)', 'kalyon', 100, 0, 5, 2_000_000, 300, 500, 0, 3), G('Firkateyn', 'firkateyn', 35, 10, 10, 700_000, 160, 160, 0, 6), G('Kadırga', 'kadırga', 12, 0, 15, 250_000, 80, 50, 0, 8), G('Korsan gemisi', 'korsan', 6, 25, 0, 180_000, 60, 35, 0, 4), G('Ticaret ve nakliye gemisi', 'nakliye', 0, 0, 0, 90_000, 45, 15, 0, 10)],
  buyuk: [G('Dretnot', 'dretnot', 100, 0, 5, 2_000_000, 540, 600, 30, 5), G('Kruvazör', 'kruvazör', 30, 10, 10, 600_000, 300, 200, 10, 10), G('Muhrip', 'muhrip', 8, 0, 20, 150_000, 150, 50, 3, 22), G('Denizaltı', 'denizaltı', 3, 30, 2, 120_000, 120, 40, 1, 6), G('Nakliye gemisi', 'nakliye', 0, 0, 0, 80_000, 90, 20, 2, 15)],
  ikinci: [G('Zırhlı ve uçak gemisi', 'uçak gemisi', 120, 5, 15, 2_500_000, 600, 800, 40, 3), G('Kruvazör', 'kruvazör', 35, 10, 15, 700_000, 300, 220, 12, 8), G('Muhrip', 'muhrip', 10, 0, 25, 180_000, 150, 60, 4, 20), G('Denizaltı', 'denizaltı', 4, 35, 3, 130_000, 120, 45, 1, 10), G('Nakliye ve çıkarma gemisi', 'nakliye', 0, 0, 0, 90_000, 90, 20, 2, 20)],
  modern: [G('Uçak gemisi', 'uçak gemisi', 200, 10, 30, 6_000_000, 900, 2000, 60, 1), G('Destroyer', 'destroyer', 45, 10, 30, 1_200_000, 400, 400, 15, 6), G('Fırkateyn ve korvet', 'fırkateyn', 15, 0, 30, 400_000, 250, 120, 6, 8), G('Denizaltı', 'denizaltı', 20, 40, 10, 900_000, 400, 250, 2, 4), G('Amfibi hücum gemisi', 'amfibi', 5, 0, 0, 500_000, 300, 150, 8, 6)],
};
export const NGEMI = 5;
export const DENIZ_GOREV = ['Limanda', 'Deniz hâkimiyeti', 'Abluka', 'Ticaret akını', 'Konvoy koruması'] as const;

// ---------- Hava kuvvetleri ----------
export interface HavaTur {
  ad: string; kisa: string;
  /** hava muharebesi, yakın destek ve bombardıman gücü (×10) */ hava: number; destek: number; bomba: number;
  /** 1914 ölçeğinde 10 uçaklık filo bedeli ve süresi */ bedel: number; gun: number;
  /** uçak başına günlük bakım (altın) ve yakıt (milibirim) */ bakim: number; yakit: number;
  /** başlangıçta güç puanı başına uçak */ taban: number;
}
const H = (ad: string, kisa: string, hava: number, destek: number, bomba: number, bedel: number, gun: number, bakim: number, yakit: number, taban: number): HavaTur =>
  ({ ad, kisa, hava, destek, bomba, bedel, gun, bakim, yakit, taban });
/** Ortaçağ ve barut çağında hava kuvveti yoktur. */
export const HAVA: Record<DonemKod, HavaTur[]> = {
  orta: [], barut: [],
  buyuk: [H('Avcı uçağı', 'avcı', 20, 5, 0, 150_000, 45, 15, 1, 3), H('Bombardıman uçağı', 'bombardıman', 3, 15, 25, 300_000, 60, 30, 2, 1), H('Keşif uçağı', 'keşif', 2, 3, 0, 100_000, 30, 8, 1, 15)],
  ikinci: [H('Avcı uçağı', 'avcı', 25, 10, 2, 400_000, 45, 25, 2, 40), H('Bombardıman ve pike uçağı', 'bombardıman', 6, 25, 30, 700_000, 60, 45, 4, 25), H('Keşif uçağı', 'keşif', 3, 3, 0, 250_000, 30, 15, 1, 8)],
  modern: [H('Çok rollü savaş uçağı', 'savaş uçağı', 40, 25, 20, 9_000_000, 120, 400, 8, 12), H('Bombardıman uçağı ve SİHA', 'SİHA', 8, 40, 35, 2_500_000, 60, 150, 2, 10), H('Erken uyarı ve keşif', 'keşif', 5, 5, 0, 3_000_000, 90, 200, 3, 2)],
};
export const NHAVA = 3;
export const HAVA_GOREV = ['Üste', 'Hava üstünlüğü', 'Yakın destek', 'Stratejik bombardıman', 'Keşif'] as const;

// ---------- Siyaset ----------
/** Rejim adları (YONETIM sırası: 0 mutlak, 1 sınırlı/meşruti, 2 temsilî, 3 tek parti/teokrasi, 4 askerî). */
export const REJIM_AD: Record<DonemKod, string[]> = {
  orta: ['Mutlak monarşi', 'Feodal monarşi', 'Tüccar cumhuriyeti', 'Teokrasi', 'Askerî yönetim'],
  barut: ['Mutlak monarşi', 'Meşruti monarşi', 'Cumhuriyet', 'Teokrasi', 'Askerî yönetim'],
  buyuk: ['Mutlak monarşi', 'Meşruti monarşi', 'Demokratik cumhuriyet', 'Tek parti', 'Askerî yönetim'],
  ikinci: ['Mutlak monarşi', 'Meşruti monarşi', 'Demokratik cumhuriyet', 'Tek parti', 'Askerî yönetim'],
  modern: ['Mutlak monarşi', 'Anayasal monarşi', 'Demokratik cumhuriyet', 'Otoriter tek parti', 'Askerî cunta'],
};
/** Seçim yapılan rejimler. */
export const SECIMLI = new Set([1, 2]);
/**
 * Partiler ya da (seçimsiz dönemlerde) güç odakları. eğilim: 0 düzen, 1 serbesti, 2 eşitlik, 3 milliyet, 4 devrim.
 * etki: iktidardayken uygulanan ülke değiştiricileri (S ya da puan ×1000).
 */
export interface Parti { ad: string; renk: string; etki: Partial<Record<'uretim' | 'vergi' | 'huzur' | 'destek' | 'mesru' | 'arastirma' | 'saldiri', number>>; aciklama: string }
const P = (ad: string, renk: string, aciklama: string, etki: Parti['etki']): Parti => ({ ad, renk, aciklama, etki });
export const PARTI: Record<DonemKod, Parti[]> = {
  orta: [
    P('Saray ve hanedan', '#8a6d3b', 'Taht ve soyluluk: düzen ve meşruiyet', { mesru: 5000 }),
    P('Tüccarlar ve loncalar', '#3f7f5f', 'Çarşı ve kervan: ticaret ve vergi', { vergi: 40_000 }),
    P('Köylü ve zanaatkâr', '#9b3d3d', 'Hafif yük, adil öşür', { huzur: 5000, vergi: -30_000 }),
    P('Ordu ve akıncı beyleri', '#4b4b7a', 'Gaza ve ganimet', { saldiri: 50_000, destek: 5000 }),
    P('Din adamları', '#6b4f8a', 'İnanç birliği ve vakıflar', { mesru: 5000, arastirma: -50_000 }),
  ],
  barut: [
    P('Saray ve bürokrasi', '#8a6d3b', 'Merkezî otorite', { mesru: 5000 }),
    P('Tüccarlar ve kumpanyalar', '#3f7f5f', 'Deniz ticareti ve sermaye', { uretim: 30_000, vergi: 30_000 }),
    P('Taşra ayanları', '#9b3d3d', 'Yerel güç ve hafif vergi', { huzur: 5000, vergi: -30_000 }),
    P('Ordu (kapıkulu)', '#4b4b7a', 'Sefer ve ulufe', { saldiri: 50_000, destek: 5000 }),
    P('Din adamları', '#6b4f8a', 'Gelenek ve inanç', { mesru: 5000, arastirma: -50_000 }),
  ],
  buyuk: [
    P('Muhafazakârlar', '#3b5b8a', 'Taht, kilise ve düzen', { mesru: 5000 }),
    P('Liberaller', '#c9a227', 'Serbest ticaret ve anayasa', { uretim: 30_000, vergi: 20_000 }),
    P('Sosyalistler', '#b33a3a', 'Sekiz saatlik iş günü ve sosyal güvence', { huzur: 6000, uretim: -20_000 }),
    P('Milliyetçiler', '#4a6b3b', 'Büyük ülkü ve güçlü ordu', { saldiri: 50_000, destek: 6000 }),
    P('Devrimciler', '#7a1f1f', 'Kızıl bayrak ya da kara bayrak', { huzur: -5000, destek: -5000 }),
  ],
  ikinci: [
    P('Muhafazakârlar', '#3b5b8a', 'Gelenek ve istikrar', { mesru: 5000 }),
    P('Liberaller', '#c9a227', 'Piyasa ve parlamento', { uretim: 30_000, vergi: 20_000 }),
    P('Sosyal demokratlar', '#c4553a', 'Refah devleti', { huzur: 6000, uretim: -10_000 }),
    P('Faşistler', '#3a3a3a', 'Tek parti, tek önder, yayılma', { saldiri: 80_000, destek: 8000, huzur: -3000 }),
    P('Komünistler', '#a01f1f', 'Planlı ekonomi ve proletarya diktatörlüğü', { uretim: 40_000, huzur: -4000 }),
  ],
  modern: [
    P('Merkez sağ', '#3b5b8a', 'Piyasa, güvenlik ve gelenek', { uretim: 20_000, mesru: 3000 }),
    P('Merkez sol', '#c4553a', 'Sosyal devlet ve eşitlik', { huzur: 5000 }),
    P('Yeşiller ve liberaller', '#4f9a4f', 'Özgürlük, iklim ve teknoloji', { arastirma: 80_000 }),
    P('Milliyetçi sağ', '#4a6b3b', 'Sınırlar, egemenlik ve ordu', { saldiri: 50_000, destek: 5000 }),
    P('Radikal sol', '#a01f1f', 'Sistem karşıtı halk hareketi', { huzur: -3000, destek: -3000 }),
  ],
};
export const NPARTI = 5;

// ---------- Ekonomi ----------
/** Ekonomi modelleri. etkileri (S): hizmet katma değeri, sanayi üretimi, vergi verimi, inşa hızı, huzur (puan). */
export const EKO_MODEL = [
  { ad: 'Serbest piyasa', hizmet: 100_000, sanayi: 0, vergi: -50_000, insa: 0, huzur: 0, aciklama: 'Ticaret ve hizmet canlı; devlet geliri sınırlı' },
  { ad: 'Karma ekonomi', hizmet: 0, sanayi: 0, vergi: 0, insa: 0, huzur: 0, aciklama: 'Dengeli' },
  { ad: 'Devletçilik', hizmet: -50_000, sanayi: 50_000, vergi: 50_000, insa: 150_000, huzur: 0, aciklama: 'Devlet fabrikaları ve planlı yatırım' },
  { ad: 'Merkezî planlama', hizmet: -150_000, sanayi: 120_000, vergi: 100_000, insa: 250_000, huzur: -5000, aciklama: 'Ağır sanayi önceliği; tüketim ve hizmet zayıf' },
] as const;
/** Tarım odağı: gıda verimi (S), hizmet/ticaret katma değeri (S), tarım işgücü (S). */
export const TARIM_ODAK = [
  { ad: 'Tahıl', gida: 0, ticaret: 0, isci: 0, aciklama: 'Gıda güvenliği' },
  { ad: 'Nakit ürünleri', gida: -150_000, ticaret: 80_000, isci: 0, aciklama: 'Pamuk, tütün, kahve, şeker: ihracat geliri' },
  { ad: 'Hayvancılık', gida: -50_000, ticaret: 20_000, isci: -150_000, aciklama: 'Daha az işgücü, et ve yün' },
] as const;

// ---------- Petrol ----------
/** Petrol tüketimi: zırhlı/süvari birliği (milibirim/gün) ve fabrika başına; dönemden önce petrol yok sayılır. */
export const PETROL_KULLANIM: Record<DonemKod, { zirh: number; fabrika: number }> = {
  orta: { zirh: 0, fabrika: 0 }, barut: { zirh: 0, fabrika: 0 }, buyuk: { zirh: 5, fabrika: 0 }, ikinci: { zirh: 40, fabrika: 6 }, modern: { zirh: 60, fabrika: 15 },
};

// ---------- Teknoloji kademeleri ----------
/** Her teknoloji hattı en çok bu kadar kademeye çıkar (1914'te 12. kademe ≈ 2024). */
export const KADEME_MAX = 12;
/** Kademeler arası yıl (dönem). */
export const KADEME_ARALIK: Record<DonemKod, number> = { orta: 40, barut: 20, buyuk: 10, ikinci: 10, modern: 5 };
/** Soğuk Savaş (1950–1985) ve gelecek (2040+) adları: hatlar dönemi aşınca bu adları alır. */
export const TEK_SOGUK: Record<string, [string, number]> = {
  piyade2: ['Otomatik piyade tüfeği', 1950], piyade3: ['Gece görüş donanımı', 1970], agirtop2: ['Kundağı motorlu obüs', 1960], tarim1: ['Biçerdöver', 1950], tarim2: ['Yeşil devrim tohumları', 1965],
  sanayi1: ['Otomasyon', 1955], sanayi2: ['Bilgisayar destekli üretim', 1975], demiryolu: ['Otoyol ağı', 1956], sihhiye: ['Antibiyotik ve aşı kampanyası', 1955], kurmay: ['Elektronik komuta', 1960],
  idare: ['Planlama teşkilatı', 1960], propaganda: ['Televizyon yayını', 1955], taktik1: ['Mekanize piyade', 1955], taktik2: ['Hava indirme taktiği', 1965], tahkimat1: ['Sığınak ve tanksavar hattı', 1955],
  tahkimat2: ['Tanksavar güdümlü füze', 1970], topcu1: ['Çok namlulu roketatar', 1955], topcu2: ['Radar kontrollü ateş', 1970], zirh1: ['Ana muharebe tankı', 1960], dok_ates: ['Aktif savunma doktrini', 1976],
  dok_manevra: ['Hava-kara muharebesi', 1982], dok_kitle: ['Halk savaşı doktrini', 1950], ikmal1: ['Konteyner lojistiği', 1960], ikmal2: ['Helikopter ikmali', 1965], istihbarat1: ['Casus uydusu', 1962],
  seferberlik: ['Yedek subay sistemi', 1955], sanayi3: ['Yarı iletken', 1965], insaat1: ['Prefabrik betonarme', 1960], maden1: ['Açık ocak madenciliği', 1955], ticaret1: ['Konteyner taşımacılığı', 1960],
  maliye1: ['Katma değer vergisi', 1968], banka1: ['Merkez bankacılığı', 1950], tarim3: ['Damla sulama', 1970], depo1: ['Soğuk zincir', 1955], egitim1: ['Bilgisayar bilimi', 1965], asayis1: ['İstihbarat teşkilatı', 1955],
};
export const TEK_GELECEK: Record<string, [string, number]> = {
  piyade2: ['Dış iskelet zırhı', 2040], piyade3: ['Akıllı mühimmatlı piyade', 2050], agirtop2: ['Elektromanyetik top', 2045], tarim1: ['Robotik tarım', 2040], tarim2: ['Yapay et ve fermantasyon', 2045],
  sanayi1: ['Karanlık fabrika', 2040], sanayi2: ['Nanoüretim', 2055], demiryolu: ['Hiper hızlı ulaşım', 2045], sihhiye: ['Gen tedavisi', 2040], kurmay: ['Yapay zekâ kurmay', 2040],
  idare: ['Algoritmik yönetim', 2045], propaganda: ['Kişiselleştirilmiş bilgi harbi', 2040], taktik1: ['İnsan-makine ekipleri', 2040], taktik2: ['Sürü zekâsı', 2050], tahkimat1: ['Akıllı mayın ve sensör ağı', 2040],
  tahkimat2: ['Lazer hava savunması', 2045], topcu1: ['Hipersonik füze', 2040], topcu2: ['Otonom hedefleme', 2050], zirh1: ['İnsansız muharebe aracı', 2040], dok_ates: ['Erişim engelleme doktrini', 2040],
  dok_manevra: ['Çok alanlı manevra', 2040], dok_kitle: ['Dijital seferberlik', 2040], ikmal1: ['Öngörülü lojistik', 2040], ikmal2: ['Otonom kargo İHA', 2045], istihbarat1: ['Kuantum algılama', 2050],
  seferberlik: ['Sanal eğitim', 2040], sanayi3: ['Kuantum hesaplama', 2050], insaat1: ['Üç boyutlu yapı baskısı', 2040], maden1: ['Derin deniz madenciliği', 2045], ticaret1: ['Dijital ticaret ağı', 2040],
  maliye1: ['Dijital vergi altyapısı', 2040], banka1: ['Merkez bankası dijital parası', 2045], tarim3: ['Sentetik biyoloji', 2050], depo1: ['Kapalı döngü gıda sistemleri', 2045], egitim1: ['Yapay zekâ araştırma ajanları', 2040],
  asayis1: ['Öngörülü güvenlik', 2045],
};
/** Ara dönem adları: Yüksek Ortaçağ (~1050), Aydınlanma (~1740) ve bilgi çağı (~1990). */
export const TEK_ORTA2: Record<string, [string, number]> = {
  piyade2: ['Çelik kılıç ve zırh', 1050], piyade3: ['Levha zırh', 1150], agirtop2: ['Karşı ağırlıklı mancınık', 1100], tarim1: ['Ağır pulluk ve at koşumu', 1000], tarim2: ['Yel değirmeni', 1100],
  sanayi1: ['Şamdan çeliği atölyeleri', 1050], sanayi2: ['Su gücüyle dokuma', 1120], demiryolu: ['Taş köprü ve derbent', 1050], sihhiye: ['Darüşşifa', 1050], kurmay: ['Ordu divanı', 1050],
  idare: ['Nizamülmülk düzeni', 1080], propaganda: ['Siyasetname ve vaaz', 1080], taktik1: ['Kademeli saf', 1050], taktik2: ['Kuşatma çemberi', 1100], tahkimat1: ['Hisar ve iç kale', 1050],
  tahkimat2: ['Eş merkezli sur', 1150], topcu1: ['Grejuva ateşi', 1050], topcu2: ['Lağım ve kuşatma kulesi', 1100], zirh1: ['Ağır zırhlı süvari', 1050], dok_ates: ['Atlı okçu yaylımı', 1050],
  dok_manevra: ['Bozkır manevrası', 1050], dok_kitle: ['Gazi ve gönüllü orduları', 1050], ikmal1: ['Ordugâh ve ağırlık', 1050], ikmal2: ['Kervan yolları ikmali', 1100], istihbarat1: ['Casusluk teşkilatı', 1050],
  seferberlik: ['İkta askeri defteri', 1050], sanayi3: ['Kâğıt imalathaneleri', 1100], insaat1: ['Sivri kemer', 1100], maden1: ['Gümüş madenleri', 1050], ticaret1: ['Panayır ve kervansaray ağı', 1100],
  maliye1: ['Divan muhasebesi', 1050], banka1: ['Senet ve kredi ağları', 1120], tarim3: ['Yeni ürün yayılımı', 1100], depo1: ['Ambar şebekesi', 1050], egitim1: ['Medrese ve üniversite', 1100], asayis1: ['Muhtesiplik', 1050],
};
export const TEK_BARUT2: Record<string, [string, number]> = {
  piyade2: ['Süngülü tüfek', 1700], piyade3: ['Hafif piyade tüfeği', 1760], agirtop2: ['Obüs', 1740], tarim1: ['Tohum ekme makinesi', 1720], tarim2: ['Dörtlü ekim nöbeti', 1740],
  sanayi1: ['Buhar makinesi', 1712], sanayi2: ['Mekanik dokuma', 1770], demiryolu: ['Şose yollar', 1740], sihhiye: ['Çiçek aşısı', 1720], kurmay: ['Genelkurmay heyeti', 1760],
  idare: ['Kameral yönetim', 1720], propaganda: ['Gazete', 1700], taktik1: ['Hat taktiği', 1700], taktik2: ['Kol düzeni', 1780], tahkimat1: ['Sahra tahkimatı', 1700],
  tahkimat2: ['Bastiyonlu sur sistemi', 1700], topcu1: ['Hafif sahra topçusu', 1740], topcu2: ['Gribeauval sistemi', 1765], zirh1: ['Hafif süvari alayları', 1720], dok_ates: ['Ateş disiplini', 1700],
  dok_manevra: ['Bölük manevrası', 1750], dok_kitle: ['Kantonal asker toplama', 1730], ikmal1: ['Ordu fırınları', 1700], ikmal2: ['Kanal taşımacılığı', 1760], istihbarat1: ['Şifre bürosu', 1720],
  seferberlik: ['Asker yazım kantonları', 1733], sanayi3: ['Hassas tezgâh', 1770], insaat1: ['Mühendislik okulu', 1720], maden1: ['Kok kömürüyle demir', 1709], ticaret1: ['Merkantilizm', 1700],
  maliye1: ['Kamu borç kâğıdı', 1720], banka1: ['Ulusal banka', 1694], tarim3: ['Çit ve tarla ıslahı', 1760], depo1: ['Devlet ambarları', 1720], egitim1: ['Ansiklopedi ve akademiler', 1750], asayis1: ['Polis teşkilatı', 1720],
};
/** İki savaş arası (~1925): Büyük Savaş hatlarının 2. ve 3. kademeleri. */
export const TEK_ARASAVAS: Record<string, [string, number]> = {
  piyade2: ['Hafif makineli tüfek', 1925], piyade3: ['Hafif makineli tabanca', 1928], agirtop2: ['Çekili obüs', 1925], tarim1: ['Traktör', 1925], tarim2: ['Fosfat gübresi', 1925],
  sanayi1: ['Yürüyen bant', 1925], sanayi2: ['Elektrifikasyon', 1925], demiryolu: ['Karayolu ve otobüs ağı', 1928], sihhiye: ['Aşı ve serum enstitüsü', 1925], kurmay: ['Telsiz haberleşme', 1925],
  idare: ['Merkezî istatistik', 1925], propaganda: ['Radyo yayını', 1925], taktik1: ['Motorlu piyade', 1928], taktik2: ['Hareketli savunma', 1925], tahkimat1: ['Betonarme sığınak', 1925],
  tahkimat2: ['Tahkimli sınır hattı', 1928], topcu1: ['Ses ve ışıkla menzil tespiti', 1925], topcu2: ['Motorlu topçu', 1928], zirh1: ['Hafif tank', 1925], dok_ates: ['Sistemli savunma doktrini', 1925],
  dok_manevra: ['Derin harekât teorisi', 1928], dok_kitle: ['Milis ordusu doktrini', 1925], ikmal1: ['Motorlu nakliye kolu', 1925], ikmal2: ['Askerî karayolu', 1925], istihbarat1: ['Rotorlu şifre makinesi', 1925],
  seferberlik: ['Yedek ordu teşkilatı', 1925], sanayi3: ['Tezgâh standardizasyonu', 1925], insaat1: ['Çelik iskelet yapı', 1925], maden1: ['Petrol sondajı', 1925], ticaret1: ['Dizel ticaret gemisi', 1925],
  maliye1: ['Altın standardı ve bütçe disiplini', 1925], banka1: ['Merkez bankası', 1925], tarim3: ['Melez mısır', 1928], depo1: ['Soğutmalı vagon', 1925], egitim1: ['Araştırma laboratuvarları', 1925],
  asayis1: ['Emniyet teşkilatı', 1925],
};
export const TEK_BILGI: Record<string, [string, number]> = {
  piyade2: ['Termal nişangâh', 1990], piyade3: ['Seramik zırh yeleği', 1995], agirtop2: ['Füze topçusu', 1990], tarim1: ['GPS güdümlü traktör', 1995], tarim2: ['Biyoteknoloji tohumu', 1995],
  sanayi1: ['Esnek üretim', 1990], sanayi2: ['Robotlaşma', 1990], demiryolu: ['Yüksek hızlı demiryolu', 1990], sihhiye: ['Travma cerrahisi', 1990], kurmay: ['Ağ komuta sistemi', 1995],
  idare: ['Bilgi işlem devleti', 1990], propaganda: ['Uydu televizyonu', 1990], taktik1: ['Gece muharebesi', 1990], taktik2: ['Özel kuvvetler', 1990], tahkimat1: ['Yeraltı komuta merkezi', 1990],
  tahkimat2: ['Füze savunma sistemi', 1995], topcu1: ['Akıllı mühimmat', 1991], topcu2: ['Karşı batarya radarı', 1990], zirh1: ['Kompozit zırh', 1985], dok_ates: ['Derin taarruz doktrini', 1990],
  dok_manevra: ['Hava-kara harekâtı', 1991], dok_kitle: ['Topyekûn savunma', 1990], ikmal1: ['Tam zamanında lojistik', 1990], ikmal2: ['Ağır nakliye uçağı', 1990], istihbarat1: ['Sinyal istihbaratı', 1990],
  seferberlik: ['Profesyonel ordu', 1995], sanayi3: ['Mikroişlemci', 1985], insaat1: ['Çelik yüksek yapı', 1990], maden1: ['Yatay sondaj', 1990], ticaret1: ['Küresel tedarik zinciri', 1995],
  maliye1: ['Elektronik vergi', 1995], banka1: ['Bağımsız merkez bankası', 1990], tarim3: ['Sera tarımı', 1990], depo1: ['Stratejik stok yönetimi', 1990], egitim1: ['İnternet', 1993], asayis1: ['Elektronik gözetim', 1995],
};
const ROMA = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X', ' XI', ' XII'];
/**
 * Kademe adı ve yılı. Kademe L'nin yılı = hattın dönem yılı + (L−1)×aralık; ad, o yıla dek ulaşılmış en son adlandırılmış
 * dönem adıdır (dönem → İkinci Dünya → Soğuk Savaş → çağdaş → gelecek); aynı ad sürerse Roma rakamı eklenir.
 * sira: [yıl, ad] listesi (hattın dönem adı ilk eleman).
 */
export function kademeBilgi(sira: [number, string][], aralik: number, L: number): { ad: string; yil: number } {
  const y0 = sira[0]![0];
  const yil = y0 + (L - 1) * aralik;
  let ad = sira[0]![1], bas = 1;
  for (let k = 1; k <= L; k++) {
    const yk = y0 + (k - 1) * aralik;
    let yeni = sira[0]![1];
    for (const [ys, a] of sira) if (ys <= yk + 3) yeni = a;
    if (yeni !== ad) { ad = yeni; bas = k; }
  }
  const n = L - bas + 1;
  // adı zaten Roma rakamıyla biten hatlarda (Piyade silahı II) gelişim sırası yazılır
  return { ad: n <= 1 ? ad : /\s[IVX]+$/.test(ad) ? `${ad} (${n}. gelişim)` : ad + ROMA[n]!, yil };
}
