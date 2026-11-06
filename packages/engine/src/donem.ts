// Dönem katalogları: her senaryo aynı yuva yapısını (8 ekipman, 5 tabur, 4 şablon, 36 teknoloji, 6 proje, 4 mal)
// kendi dönemine uygun ad, istatistik ve görsellerle doldurur. Motor yuva kodlarını kullanır; adlar dönemden gelir.
import type { Ekipman, Tabur, Sablon, Teknoloji } from './catalog.ts';

export type DonemKod = 'orta' | 'barut' | 'buyuk' | 'ikinci' | 'modern';

export interface Donem {
  kod: DonemKod; ad: string;
  /** Teknoloji yılı ölçeği: erken dönemlerde ilerleme yavaştır (yıl farkı bu sayıya bölünür) */
  yilOlcek: number;
  ekipman: Ekipman[]; tabur: Tabur[]; sablon: Sablon[]; teknoloji: Teknoloji[];
  proje: { kod: string; ad: string; sp: number; nakit: number; gun: number; esanlam: string[]; ozel?: boolean }[];
  mal: { kod: string; ad: string; p0: number; esanlam: string[] }[];
  /** Arayüz terimleri */
  terim: { sivilF: string; askeriF: string; demiryolu: string; muhimmat: string; para: string };
  /** game-icons.net simge adları (aile → simge) */
  simge: Record<'piyade' | 'suvari' | 'mt' | 'sahra' | 'agir', string>;
}

const E = (kod: string, ad: string, aile: string, yil: number, YS: number, SV: number, YR: number, sp: number, celik: number, agirlik: number, tek?: string): Ekipman =>
  ({ kod, ad, aile, yil, YS, SS: Math.floor(YS / 8), SV, YR, zirh: 0, delme: 3000, sertlik: 0, sp, celik, agirlik, tek });
const T = (kod: string, ad: string, kisi: number, aile: string, adet: number, org: number, genislik: number, hiz: number, muhimmat: number, egitim: number): Tabur =>
  ({ kod, ad, kisi, aile, adet, org, genislik, hiz, muhimmat, egitim });
const TK = (kod: string, ad: string, yil: number, maliyet: number, on: string[], etki: string, esanlam: string[]): Teknoloji => ({ kod, ad, yil, maliyet, on, etki, esanlam, dal: 0, dislar: [] });

/** Araştırma ağacı (36 yuva; bütün dönemlerde aynı kodlar ve ön koşullar, adlar ve yıllar dönemden). */
export const TEK_DAL = ['Kara kuvvetleri', 'Doktrin', 'Lojistik', 'Sanayi ve maliye', 'Tarım ve toplum', 'Devlet'] as const;
const DOKTRIN = ['dok_ates', 'dok_manevra', 'dok_kitle'];
export const TEK_TEMEL: [string, number, number, string[], string][] = [
  // kod, dal, maliyet, ön koşul, etki
  ['piyade2', 0, 150_000, [], 'Piyade silahı II üretimi'], ['piyade3', 0, 180_000, ['piyade2'], 'Piyade silahı III üretimi'], ['agirtop2', 0, 160_000, [], 'Ağır silah II üretimi'],
  ['tarim1', 4, 120_000, [], 'Tarım işçisi ihtiyacı −%15'], ['tarim2', 4, 170_000, ['tarim1'], 'Tarım verimi +%10'], ['sanayi1', 3, 130_000, [], 'Üretim gücü +%10'],
  ['sanayi2', 3, 180_000, ['sanayi1'], 'Üretim gücü +%10, verim tavanı +0,1'], ['demiryolu', 2, 140_000, [], 'Ulaşım inşası −%25; yol kapasitesi +%10'], ['sihhiye', 2, 120_000, [], 'Yaralı iyileşmesi %50 → %60'],
  ['kurmay', 1, 140_000, [], 'Organizasyon yenilenmesi +%20'], ['idare', 5, 150_000, [], 'Yönetim kapasitesi +10, idari verim +0,05'], ['propaganda', 5, 110_000, [], 'Savaşa destek +5'],
  ['taktik1', 0, 140_000, [], 'Piyade ve destek saldırısı +%8'], ['taktik2', 0, 200_000, ['taktik1', 'kurmay'], 'Saldırı +%8; taarruzda organizasyon kaybı −%10'],
  ['tahkimat1', 0, 130_000, [], 'Tahkimat kurma hızı +%50, tahkimat tavanı +%15'], ['tahkimat2', 0, 190_000, ['tahkimat1'], 'Savunma +%10, tahkimat tavanı +%15'],
  ['topcu1', 0, 150_000, [], 'Topçu saldırısı +%15'], ['topcu2', 0, 210_000, ['topcu1', 'agirtop2'], 'Topçu hazırlığı tahkimatı iki kat hızlı söker'],
  ['zirh1', 0, 170_000, [], 'Süvari/zırh saldırısı +%15, hızı +%10'],
  ['dok_ates', 1, 180_000, ['kurmay'], 'Topçu +%10, savunma +%10 (öteki doktrinleri kapatır)'], ['dok_manevra', 1, 180_000, ['kurmay'], 'Hız +%15, saldırı +%5, kuşatma etkisi iki kat (öteki doktrinleri kapatır)'],
  ['dok_kitle', 1, 160_000, [], 'Eğitim süresi −%30, insan gücü +%10, organizasyon −%5 (öteki doktrinleri kapatır)'],
  ['ikmal1', 2, 130_000, [], 'Birlik erzak ve mühimmat tüketimi −%15'], ['ikmal2', 2, 190_000, ['ikmal1', 'demiryolu'], 'İkmal yolu kapasitesi +%25'],
  ['istihbarat1', 2, 140_000, [], 'Yabancı ordu tahminleri daralır'], ['seferberlik', 1, 150_000, [], 'Yeni birlik eğitim süresi −%25'],
  ['sanayi3', 3, 230_000, ['sanayi2'], 'Üretim gücü +%5, verim tavanı +0,05, verim daha hızlı artar'], ['insaat1', 3, 140_000, [], 'İnşaat süresi ve maliyeti −%15'],
  ['maden1', 3, 140_000, [], 'Çelik ve kömür çıkarma +%20'], ['ticaret1', 3, 130_000, [], 'Hizmet ve ticaret katma değeri +%10'],
  ['maliye1', 5, 140_000, [], 'Vergi verimi +%5'], ['banka1', 5, 190_000, ['maliye1'], 'Kredi limiti +%50, faiz −1 puan'],
  ['tarim3', 4, 220_000, ['tarim2'], 'Tarım verimi +%10'], ['depo1', 4, 120_000, [], 'Gıda bozulması −%50'],
  ['egitim1', 4, 160_000, [], 'Araştırma hızı +%10, eğitim artışı +%50'], ['asayis1', 5, 150_000, ['idare'], 'Direniş −%25, işgal itaati daha hızlı'],
];
export const TEK_KOD = TEK_TEMEL.map((t) => t[0]);

function teknolojiler(ad: Record<string, [string, number, string[]?]>): Teknoloji[] {
  return TEK_TEMEL.map(([kod, dal, maliyet, on, etki]) => {
    const x = ad[kod];
    if (!x) throw new Error(`dönem teknolojisi eksik: ${kod}`);
    const [a, y, es] = x;
    return { ...TK(kod, a, y, maliyet, on, etki, [a.toLocaleLowerCase('tr'), ...(es ?? [])]), dal, dislar: DOKTRIN.includes(kod) ? DOKTRIN.filter((d) => d !== kod) : [] };
  });
}

// sivil, askeri, sulama, demiryolu, altyapı, valilik, kent (şehir imarı), maden (maden ocağı), gemi (tersane siparişi), uçak
const PROJE_SAYI = [[1_800_000, 900_000, 180], [1_800_000, 1_000_000, 180], [600_000, 500_000, 120], [900_000, 800_000, 120], [700_000, 500_000, 90], [500_000, 700_000, 150],
  [2_400_000, 1_500_000, 240], [1_200_000, 900_000, 150], [0, 0, 0], [0, 0, 0]] as const;
/** Ek projeler (şema 7): şehir imarı, maden ocağı; gemi ve uçak siparişleri ayrı emirle verilir (özel). */
const EK_PROJE: Record<DonemKod, [string, string, string[]][]> = {
  orta: [['kent', 'Şehir imarı', ['şehir', 'imar', 'kent']], ['maden', 'Maden ocağı', ['maden', 'ocak']], ['gemi', 'Tersane siparişi', ['gemi', 'tersane']], ['ucak', 'Uçak siparişi', ['uçak']]],
  barut: [['kent', 'Şehir imarı', ['şehir', 'imar', 'kent']], ['maden', 'Maden ocağı', ['maden', 'ocak']], ['gemi', 'Tersane siparişi', ['gemi', 'tersane']], ['ucak', 'Uçak siparişi', ['uçak']]],
  buyuk: [['kent', 'Şehir imarı', ['şehir', 'imar', 'kent', 'şehir geliştir']], ['maden', 'Maden ocağı', ['maden', 'ocak', 'petrol kuyusu']], ['gemi', 'Tersane siparişi', ['gemi', 'tersane']], ['ucak', 'Uçak siparişi', ['uçak']]],
  ikinci: [['kent', 'Şehir imarı', ['şehir', 'imar', 'kent', 'şehir geliştir']], ['maden', 'Maden ve petrol işletmesi', ['maden', 'ocak', 'petrol kuyusu']], ['gemi', 'Tersane siparişi', ['gemi', 'tersane']], ['ucak', 'Uçak siparişi', ['uçak']]],
  modern: [['kent', 'Kentsel dönüşüm', ['şehir', 'imar', 'kent', 'kentsel dönüşüm']], ['maden', 'Maden ve enerji sahası', ['maden', 'petrol', 'doğalgaz']], ['gemi', 'Tersane siparişi', ['gemi', 'tersane']], ['ucak', 'Uçak siparişi', ['uçak']]],
};
function projeler(adlar: [string, string, string[]][], d: DonemKod = 'buyuk'): Donem['proje'] {
  return [...adlar, ...EK_PROJE[d]].map(([kod, ad, es], i) => ({ kod, ad, sp: PROJE_SAYI[i]![0], nakit: PROJE_SAYI[i]![1], gun: PROJE_SAYI[i]![2], esanlam: [ad.toLocaleLowerCase('tr'), ...es], ozel: kod === 'gemi' || kod === 'ucak' || undefined }));
}
function mallar(adlar: [string, string[]][]): Donem['mal'] {
  const kod = ['gida', 'celik', 'komur', 'muhimmat', 'petrol'], p0 = [900, 1500, 400, 3500, 700];
  return adlar.map(([ad, es], i) => ({ kod: kod[i]!, ad, p0: p0[i]!, esanlam: [ad.toLocaleLowerCase('tr'), ...es] }));
}
const sablon = (adlar: [string, string, string[], string[]][]): Sablon[] =>
  adlar.map(([kod, ad, taburlar, esanlam], i) => ({ kod, ad, kisa: ['P', 'S', 'T', 'Y'][i]!, taburlar, esanlam: [ad.toLocaleLowerCase('tr'), ...esanlam] }));

export const DONEMLER: Record<DonemKod, Donem> = {
  orta: {
    kod: 'orta', ad: 'Erken Orta Çağ', yilOlcek: 10,
    ekipman: [
      E('psil1', 'Mızrak ve kalkan', 'piyade', 700, 3000, 14000, 2000, 200, 30, 5), E('psil2', 'Demir kılıç ve zırh', 'piyade', 760, 4000, 16000, 2000, 260, 40, 5, 'piyade2'),
      E('psil3', 'Zincir zırh', 'piyade', 800, 4600, 19000, 2000, 320, 50, 5, 'piyade3'), E('suvari', 'Savaş atı ve kargı', 'suvari', 700, 7000, 6000, 7000, 700, 40, 20),
      E('mt', 'Bileşik yay', 'mt', 700, 5000, 4000, 1000, 300, 10, 5), E('sahra', 'Mancınık', 'sahra', 700, 9000, 2000, 2000, 1500, 200, 150),
      E('agir1', 'Koçbaşı ve kuşatma kulesi', 'agir', 700, 12000, 2000, 1500, 3000, 300, 300), E('agir2', 'Çekim mancınığı', 'agir', 780, 15000, 2000, 1500, 3200, 300, 300, 'agirtop2'),
    ],
    tabur: [T('piyade', 'Piyade bölüğü', 1000, 'piyade', 100, 50000, 2, 22, 20, 60), T('suvari', 'Süvari bölüğü', 600, 'suvari', 60, 50000, 2, 40, 20, 120),
      T('mt', 'Okçu bölüğü', 400, 'mt', 40, 45000, 1, 24, 40, 90), T('sahra', 'Mancınık takımı', 300, 'sahra', 6, 35000, 2, 15, 200, 90), T('agir', 'Kuşatma takımı', 300, 'agir', 4, 35000, 2, 12, 300, 120)],
    sablon: sablon([['piyade', 'Piyade Ordusu', ['piyade', 'piyade', 'piyade', 'mt', 'mt'], ['piyade', 'ordu', 'asker', 'birlik', 'piyade ordusu']],
      ['suvari', 'Süvari Ordusu', ['suvari', 'suvari', 'suvari', 'mt'], ['süvari', 'atlı', 'süvari ordusu', 'akıncı']], ['topcu', 'Kuşatma Birliği', ['sahra', 'agir', 'piyade'], ['kuşatma', 'mancınık', 'kuşatma birliği']],
      ['yedek', 'Milis', ['piyade', 'piyade'], ['milis', 'yedek', 'garnizon']]]),
    teknoloji: teknolojiler({ piyade2: ['Demir dövme', 760], piyade3: ['Zincir zırh', 800], agirtop2: ['Çekim mancınığı', 780], tarim1: ['Ağır saban', 750], tarim2: ['Üç tarla sistemi', 800],
      sanayi1: ['Su değirmeni', 750], sanayi2: ['Lonca düzeni', 800], demiryolu: ['Yol ve köprü ağı', 760], sihhiye: ['Bimarhane', 780], kurmay: ['İkta ve beylik teşkilatı', 760], idare: ['Divan teşkilatı', 760], propaganda: ['Hutbe ve ferman', 750],
      taktik1: ['Saf düzeni', 750], taktik2: ['Pusu ve kuşatma taktiği', 780], tahkimat1: ['Hendek ve palanka', 750], tahkimat2: ['Taş sur ve hisar', 790], topcu1: ['Ateşli ok ve neft', 760, ['neft']], topcu2: ['Kuşatma mühendisliği', 800],
      zirh1: ['Üzengi ve ağır süvari', 760, ['üzengi']], dok_ates: ['Okçu üstünlüğü', 770], dok_manevra: ['Turan taktiği (sahte ricat)', 770, ['turan taktiği', 'sahte ricat']], dok_kitle: ['Halk ordusu', 760],
      ikmal1: ['Menzilhane ve erzak ambarı', 760], ikmal2: ['Kervan ikmali', 790], istihbarat1: ['Berid haber ağı', 760, ['berid']], seferberlik: ['Divan ordu defteri', 760, ['ordu defteri']],
      sanayi3: ['Ölçü ve ayar birliği', 800], insaat1: ['Kemer ve kubbe tekniği', 770], maden1: ['Maden ocakları', 760], ticaret1: ['Kervan ticareti', 750], maliye1: ['Haraç ve öşür düzeni', 760], banka1: ['Sakk ve sarraflar', 790, ['sarraf', 'çek']],
      tarim3: ['Bağ ve bahçe ıslahı', 810], depo1: ['Tahıl ambarları', 750], egitim1: ['Beytülhikme', 790, ['bilgelik evi']], asayis1: ['Şurta teşkilatı', 760, ['şurta']] }),
    proje: projeler([['sivil', 'Atölye', ['atölye', 'çarşı']], ['askeri', 'Silahhane', ['silahhane', 'cebehane']], ['sulama', 'Sulama kanalı', ['sulama', 'kanal']], ['demiryolu', 'Yol', ['yol', 'köprü']], ['altyapi', 'Kervansaray', ['kervansaray', 'han']], ['valilik', 'Valilik', ['valilik', 'emirlik']]], 'orta'),
    mal: mallar([['Tahıl', ['gıda', 'yiyecek', 'buğday', 'erzak']], ['Demir', ['çelik', 'maden']], ['Odun kömürü', ['kömür', 'odun']], ['Ok ve erzak', ['mühimmat', 'ok', 'cephane']], ['Neft', ['petrol', 'neft', 'nafta']]]),
    terim: { sivilF: 'atölye', askeriF: 'silahhane', demiryolu: 'yol', muhimmat: 'ok ve erzak', para: 'altın' },
    simge: { piyade: 'swordman', suvari: 'mounted-knight', mt: 'bowman', sahra: 'catapult', agir: 'trebuchet' },
  },
  barut: {
    kod: 'barut', ad: 'Barut Çağı', yilOlcek: 5,
    ekipman: [
      E('psil1', 'Arkebüz', 'piyade', 1550, 4000, 12000, 2500, 300, 40, 5), E('psil2', 'Misket tüfeği', 'piyade', 1620, 5000, 14000, 2500, 340, 45, 5, 'piyade2'),
      E('psil3', 'Çakmaklı tüfek', 'piyade', 1660, 6000, 16000, 3000, 380, 50, 5, 'piyade3'), E('suvari', 'Zırhlı süvari', 'suvari', 1550, 6500, 7000, 7000, 900, 60, 20),
      E('mt', 'Uzun mızrak', 'mt', 1500, 2000, 14000, 1000, 200, 20, 5), E('sahra', 'Sahra topu', 'sahra', 1550, 12000, 4000, 3000, 2500, 400, 150),
      E('agir1', 'Kuşatma topu', 'agir', 1500, 18000, 3000, 2500, 5000, 900, 400), E('agir2', 'Havan topu', 'agir', 1650, 21000, 3000, 2500, 5400, 950, 400, 'agirtop2'),
    ],
    tabur: [T('piyade', 'Tüfekli bölük', 1000, 'piyade', 100, 55000, 2, 22, 40, 90), T('suvari', 'Süvari bölüğü', 700, 'suvari', 70, 50000, 2, 40, 30, 120),
      T('mt', 'Mızraklı bölük', 600, 'mt', 60, 60000, 1, 22, 10, 90), T('sahra', 'Sahra topçusu', 400, 'sahra', 10, 40000, 3, 16, 400, 120), T('agir', 'Kuşatma topçusu', 400, 'agir', 6, 40000, 3, 12, 700, 120)],
    sablon: sablon([['piyade', 'Piyade Alayı', ['piyade', 'piyade', 'piyade', 'mt', 'sahra'], ['piyade', 'alay', 'tercio', 'asker', 'birlik', 'piyade alayı', 'yeniçeri']],
      ['suvari', 'Süvari Alayı', ['suvari', 'suvari', 'suvari'], ['süvari', 'atlı', 'sipahi', 'süvari alayı']], ['topcu', 'Topçu Ocağı', ['sahra', 'sahra', 'agir'], ['topçu', 'top', 'topçu ocağı']],
      ['yedek', 'Milis', ['piyade', 'piyade'], ['milis', 'yedek', 'garnizon']]]),
    teknoloji: teknolojiler({ piyade2: ['Misket tüfeği', 1620], piyade3: ['Çakmaklı tüfek', 1660], agirtop2: ['Havan topu', 1650], tarim1: ['Yeni Dünya bitkileri', 1600, ['patates', 'mısır']], tarim2: ['Ekim nöbeti', 1650],
      sanayi1: ['Manifaktür', 1600], sanayi2: ['Su gücüyle imalat', 1650], demiryolu: ['Menzil yolları ve kanallar', 1610, ['menzil']], sihhiye: ['Ordu hekimliği', 1620], kurmay: ['Talim ve tabur düzeni', 1600, ['talim']], idare: ['Merkezî bürokrasi', 1620], propaganda: ['Matbaa', 1600],
      taktik1: ['Yaylım ateşi', 1600, ['yaylım']], taktik2: ['Karma tugay düzeni', 1630], tahkimat1: ['Tabya ve metris', 1600, ['tabya']], tahkimat2: ['Yıldız kale', 1640, ['burç']], topcu1: ['Sahra topu dökümü', 1610], topcu2: ['Kuşatma topçuluğu', 1670],
      zirh1: ['Hafif süvari ve karakol', 1610], dok_ates: ['Ateş gücü doktrini', 1620], dok_manevra: ['Hızlı sefer doktrini', 1620], dok_kitle: ['Sekban ve kul yazımı', 1600, ['sekban']],
      ikmal1: ['Menzil ambarları', 1600], ikmal2: ['Nehir filosu ikmali', 1630], istihbarat1: ['Casus ve kaşif ağı', 1600, ['casus']], seferberlik: ['Asker yazım defterleri', 1610],
      sanayi3: ['Kalıp ve değişebilir parça', 1670], insaat1: ['Mimarlar ocağı', 1600], maden1: ['Derin maden kuyuları', 1620], ticaret1: ['Ticaret kumpanyası', 1602, ['kumpanya']], maliye1: ['İltizam reformu', 1620], banka1: ['Banka ve senet', 1650, ['banka']],
      tarim3: ['Kanal ve arazi ıslahı', 1660], depo1: ['Kiler ve ambar düzeni', 1600], egitim1: ['Akademi ve rasathane', 1640, ['akademi', 'rasathane']], asayis1: ['Subaşı ve asayiş', 1600] }),
    proje: projeler([['sivil', 'İmalathane', ['imalathane', 'manifaktür']], ['askeri', 'Tophane', ['tophane', 'baruthane', 'silah fabrikası']], ['sulama', 'Sulama', ['sulama', 'kanal']], ['demiryolu', 'Menzil yolu', ['menzil', 'yol']], ['altyapi', 'Liman ve köprü', ['liman', 'köprü', 'altyapı']], ['valilik', 'Valilik', ['valilik', 'beylerbeylik']]], 'barut'),
    mal: mallar([['Tahıl', ['gıda', 'yiyecek', 'buğday', 'erzak']], ['Demir', ['çelik', 'maden']], ['Kömür', ['kömür', 'odun']], ['Barut ve mermi', ['mühimmat', 'barut', 'cephane']], ['Neft', ['petrol', 'neft']]]),
    terim: { sivilF: 'imalathane', askeriF: 'tophane', demiryolu: 'menzil yolu', muhimmat: 'barut ve mermi', para: 'akçe' },
    simge: { piyade: 'musket', suvari: 'cavalry', mt: 'pikeman', sahra: 'cannon', agir: 'pirate-cannon' },
  },
  buyuk: {
    kod: 'buyuk', ad: 'Büyük Savaş', yilOlcek: 1,
    ekipman: [
      E('psil1', 'Piyade silahı I', 'piyade', 1914, 5000, 20000, 3000, 400, 50, 5), E('psil2', 'Piyade silahı II', 'piyade', 1916, 6000, 22000, 3500, 450, 55, 5, 'piyade2'),
      E('psil3', 'Piyade silahı III', 'piyade', 1918, 7000, 24000, 4000, 500, 60, 5, 'piyade3'), E('suvari', 'Süvari teçhizatı', 'suvari', 1914, 6000, 10000, 8000, 1000, 50, 20),
      E('mt', 'Makineli tüfek', 'mt', 1914, 4000, 12000, 1000, 800, 100, 15), E('sahra', 'Sahra topu', 'sahra', 1914, 20000, 6000, 4000, 3000, 500, 150),
      E('agir1', 'Ağır top', 'agir', 1914, 28000, 6000, 3000, 6000, 1000, 400), E('agir2', 'Ağır top II', 'agir', 1916, 32000, 6000, 3000, 6500, 1100, 400, 'agirtop2'),
    ],
    tabur: [T('piyade', 'Piyade taburu', 1000, 'piyade', 100, 60000, 2, 25, 50, 90), T('suvari', 'Süvari taburu', 800, 'suvari', 80, 50000, 2, 45, 50, 120),
      T('mt', 'Makineli tüfek bölüğü', 200, 'mt', 12, 60000, 0, 25, 80, 90), T('sahra', 'Sahra topu taburu', 500, 'sahra', 12, 40000, 3, 20, 600, 120), T('agir', 'Ağır top taburu', 500, 'agir', 8, 40000, 3, 15, 1000, 120)],
    sablon: sablon([['piyade', 'Piyade Tümeni', ['piyade', 'piyade', 'piyade', 'piyade', 'sahra', 'mt'], ['piyade', 'tümen', 'piyade tümeni', 'asker', 'birlik']],
      ['suvari', 'Süvari Tümeni', ['suvari', 'suvari', 'suvari'], ['süvari', 'atlı', 'süvari tümeni']], ['topcu', 'Topçu Alayı', ['sahra', 'sahra', 'agir'], ['topçu', 'top', 'topçu alayı']],
      ['yedek', 'Yedek Tümen', ['piyade', 'piyade', 'piyade'], ['yedek', 'garnizon', 'yedek tümen']]]),
    teknoloji: teknolojiler({ piyade2: ['Piyade silahı II', 1916, ['piyade silahı', 'tüfek']], piyade3: ['Piyade silahı III', 1918], agirtop2: ['Ağır top II', 1916, ['ağır top']], tarim1: ['Tarım makineleri', 1914, ['tarım']], tarim2: ['Gübre kimyası', 1917, ['gübre']],
      sanayi1: ['Seri üretim', 1914, ['sanayi', 'fabrika']], sanayi2: ['Elektrikli tezgâh', 1917, ['elektrik']], demiryolu: ['Demiryolu ağı', 1914, ['demiryolu', 'lojistik']], sihhiye: ['Sahra sıhhiyesi', 1915, ['sıhhiye', 'sağlık']], kurmay: ['Kurmay sistemi', 1914, ['kurmay']], idare: ['Modern bürokrasi', 1915, ['bürokrasi']], propaganda: ['Kitle basını', 1915, ['basın', 'propaganda']],
      taktik1: ['Ateş ve hareket', 1914], taktik2: ['Sızma taktiği', 1917, ['fırtına birlikleri']], tahkimat1: ['Siper sistemi', 1914, ['siper']], tahkimat2: ['Derinlemesine savunma', 1916], topcu1: ['Dolaylı atış', 1914], topcu2: ['Yürüyen ateş barajı', 1916, ['baraj ateşi']],
      zirh1: ['Zırhlı otomobil ve tank', 1916, ['tank']], dok_ates: ['Malzeme savaşı doktrini', 1915], dok_manevra: ['Hareketli harp doktrini', 1915], dok_kitle: ['Kitle ordusu doktrini', 1914],
      ikmal1: ['Sahra mutfağı ve cephane deposu', 1914], ikmal2: ['Kamyon ikmali', 1916, ['kamyon']], istihbarat1: ['Telsiz dinleme ve hava keşfi', 1915, ['hava keşfi']], seferberlik: ['Seferberlik planı', 1914],
      sanayi3: ['Standart parça üretimi', 1918], insaat1: ['Betonarme', 1914], maden1: ['Mekanik madencilik', 1914], ticaret1: ['Ticaret filosu', 1914], maliye1: ['Gelir vergisi', 1914], banka1: ['Savaş tahvili', 1915, ['tahvil']],
      tarim3: ['Haber-Bosch azotu', 1918, ['azot']], depo1: ['Konserve ve soğuk depo', 1914, ['konserve']], egitim1: ['Teknik üniversiteler', 1915], asayis1: ['Jandarma teşkilatı', 1914, ['jandarma']] }),
    proje: projeler([['sivil', 'Sivil fabrika', ['fabrika']], ['askeri', 'Askerî fabrika', ['askeri fabrika', 'silah fabrikası', 'cephane fabrikası']], ['sulama', 'Sulama', ['kanal']], ['demiryolu', 'Demiryolu düzeyi', ['demiryolu', 'ray', 'tren yolu']], ['altyapi', 'Altyapı', ['yol']], ['valilik', 'Valilik', ['idare binası']]], 'buyuk'),
    mal: mallar([['Gıda', ['yiyecek', 'tahıl', 'buğday', 'erzak']], ['Çelik', ['demir']], ['Kömür', []], ['Mühimmat', ['cephane', 'mermi']], ['Petrol', ['yakıt', 'akaryakıt']]]),
    terim: { sivilF: 'sivil fabrika', askeriF: 'askerî fabrika', demiryolu: 'demiryolu', muhimmat: 'mühimmat', para: 'altın' },
    simge: { piyade: 'brodie-helmet', suvari: 'cavalry', mt: 'machine-gun', sahra: 'field-gun', agir: 'cannon' },
  },
  ikinci: {
    kod: 'ikinci', ad: 'İkinci Dünya Savaşı', yilOlcek: 1,
    ekipman: [
      E('psil1', 'Tüfek ve piyade teçhizatı', 'piyade', 1936, 6000, 22000, 3500, 450, 55, 5), E('psil2', 'Yarı otomatik tüfek', 'piyade', 1941, 7000, 24000, 4000, 500, 60, 5, 'piyade2'),
      E('psil3', 'Saldırı tüfeği', 'piyade', 1944, 8500, 26000, 4500, 560, 65, 5, 'piyade3'), E('suvari', 'Tank', 'suvari', 1936, 22000, 12000, 10000, 6000, 1200, 300),
      E('mt', 'Makineli tüfek ve tanksavar', 'mt', 1936, 6000, 16000, 1500, 1200, 150, 20), E('sahra', 'Sahra obüsü', 'sahra', 1936, 22000, 7000, 4500, 3500, 600, 150),
      E('agir1', 'Ağır top', 'agir', 1936, 30000, 7000, 3500, 6500, 1100, 400), E('agir2', 'Ağır obüs', 'agir', 1941, 35000, 7000, 3500, 7000, 1200, 400, 'agirtop2'),
    ],
    tabur: [T('piyade', 'Piyade taburu', 1000, 'piyade', 100, 60000, 2, 28, 60, 90), T('suvari', 'Tank taburu', 600, 'suvari', 50, 55000, 2, 45, 120, 150),
      T('mt', 'Destek bölüğü', 250, 'mt', 14, 60000, 0, 28, 90, 90), T('sahra', 'Topçu taburu', 500, 'sahra', 12, 45000, 3, 25, 700, 120), T('agir', 'Ağır topçu taburu', 500, 'agir', 8, 45000, 3, 20, 1100, 120)],
    sablon: sablon([['piyade', 'Piyade Tümeni', ['piyade', 'piyade', 'piyade', 'piyade', 'sahra', 'mt'], ['piyade', 'tümen', 'piyade tümeni', 'asker', 'birlik']],
      ['suvari', 'Zırhlı Tümen', ['suvari', 'suvari', 'suvari', 'piyade'], ['zırhlı', 'tank', 'panzer', 'zırhlı tümen']], ['topcu', 'Topçu Alayı', ['sahra', 'sahra', 'agir'], ['topçu', 'top', 'topçu alayı']],
      ['yedek', 'Yedek Tümen', ['piyade', 'piyade', 'piyade'], ['yedek', 'garnizon', 'yedek tümen']]]),
    teknoloji: teknolojiler({ piyade2: ['Yarı otomatik tüfek', 1941], piyade3: ['Saldırı tüfeği', 1944], agirtop2: ['Ağır obüs', 1941], tarim1: ['Tarım makineleşmesi', 1939, ['traktör']], tarim2: ['Sentetik gübre', 1942],
      sanayi1: ['Seri üretim hattı', 1939, ['sanayi', 'fabrika']], sanayi2: ['Savaş sanayii', 1942], demiryolu: ['Demiryolu ve karayolu ağı', 1939, ['demiryolu', 'karayolu']], sihhiye: ['Penisilin', 1943, ['sağlık']], kurmay: ['Telsizli komuta', 1939, ['telsiz']], idare: ['Savaş bürokrasisi', 1940], propaganda: ['Radyo propagandası', 1939, ['radyo', 'propaganda']],
      taktik1: ['Birleşik silahlar', 1939], taktik2: ['Görev odaklı komuta', 1941], tahkimat1: ['Tahkimat hattı', 1939], tahkimat2: ['Derin tanksavar savunması', 1942], topcu1: ['Ateş idare merkezi', 1939], topcu2: ['Topçu yoğunlaşması', 1942],
      zirh1: ['Orta tank', 1940, ['tank']], dok_ates: ['Üstün ateş gücü doktrini', 1940], dok_manevra: ['Yıldırım harbi doktrini', 1939, ['blitzkrieg', 'yıldırım']], dok_kitle: ['Kitle seferberliği doktrini', 1940],
      ikmal1: ['Motorlu ikmal', 1939, ['kamyon']], ikmal2: ['Hava ikmali', 1942], istihbarat1: ['Şifre çözme', 1941, ['enigma']], seferberlik: ['Genel seferberlik planı', 1939],
      sanayi3: ['Akan üretim hattı', 1942], insaat1: ['Prefabrik inşaat', 1940], maden1: ['Sentetik yakıt', 1940], ticaret1: ['Konvoy ticareti', 1939], maliye1: ['Savaş vergileri', 1939], banka1: ['Ödünç verme ve kiralama kredisi', 1941],
      tarim3: ['Hibrit tohum', 1944], depo1: ['Gıda dondurma', 1939], egitim1: ['Bilimsel araştırma kurulu', 1940], asayis1: ['İşgal yönetimi', 1939] }),
    proje: projeler([['sivil', 'Sivil fabrika', ['fabrika']], ['askeri', 'Askerî fabrika', ['askeri fabrika', 'silah fabrikası']], ['sulama', 'Sulama', ['kanal']], ['demiryolu', 'Demiryolu düzeyi', ['demiryolu', 'ray']], ['altyapi', 'Altyapı', ['yol', 'otoyol']], ['valilik', 'Valilik', ['idare binası']]], 'ikinci'),
    mal: mallar([['Gıda', ['yiyecek', 'tahıl', 'erzak']], ['Çelik', ['demir']], ['Kömür', []], ['Mühimmat', ['cephane', 'mermi']], ['Petrol', ['yakıt', 'akaryakıt']]]),
    terim: { sivilF: 'sivil fabrika', askeriF: 'askerî fabrika', demiryolu: 'demiryolu', muhimmat: 'mühimmat', para: 'altın' },
    simge: { piyade: 'winchester-rifle', suvari: 'tank', mt: 'machine-gun', sahra: 'field-gun', agir: 'cannon' },
  },
  modern: {
    kod: 'modern', ad: 'Günümüz', yilOlcek: 1,
    ekipman: [
      E('psil1', 'Piyade teçhizatı', 'piyade', 2020, 8000, 24000, 4000, 700, 60, 5), E('psil2', 'Dijital muharebe ağı', 'piyade', 2028, 9500, 27000, 4500, 800, 65, 5, 'piyade2'),
      E('psil3', 'Yeni nesil piyade sistemi', 'piyade', 2032, 11000, 30000, 5000, 900, 70, 5, 'piyade3'), E('suvari', 'Ana muharebe tankı', 'suvari', 2015, 32000, 18000, 12000, 12000, 2000, 400),
      E('mt', 'Tanksavar füzesi', 'mt', 2015, 12000, 20000, 2000, 2500, 120, 20), E('sahra', 'Obüs', 'sahra', 2015, 30000, 8000, 5000, 7000, 900, 150),
      E('agir1', 'Çok namlulu roketatar', 'agir', 2015, 42000, 8000, 5000, 10000, 1300, 300), E('agir2', 'İHA ve hassas füze', 'agir', 2027, 50000, 8000, 6000, 11000, 900, 200, 'agirtop2'),
    ],
    tabur: [T('piyade', 'Mekanize piyade taburu', 700, 'piyade', 70, 60000, 2, 70, 80, 120), T('suvari', 'Tank taburu', 400, 'suvari', 40, 55000, 2, 60, 150, 180),
      T('mt', 'Tanksavar bölüğü', 150, 'mt', 12, 60000, 0, 70, 60, 120), T('sahra', 'Obüs taburu', 400, 'sahra', 18, 45000, 3, 50, 800, 150), T('agir', 'Roket taburu', 300, 'agir', 12, 45000, 3, 50, 1200, 150)],
    sablon: sablon([['piyade', 'Mekanize Tugay', ['piyade', 'piyade', 'piyade', 'suvari', 'sahra', 'mt'], ['mekanize', 'tugay', 'piyade', 'asker', 'birlik', 'mekanize tugay']],
      ['suvari', 'Zırhlı Tugay', ['suvari', 'suvari', 'suvari', 'piyade', 'sahra'], ['zırhlı', 'tank', 'zırhlı tugay']], ['topcu', 'Topçu Tugayı', ['sahra', 'sahra', 'agir'], ['topçu', 'roket', 'topçu tugayı']],
      ['yedek', 'Yedek Tugay', ['piyade', 'piyade'], ['yedek', 'garnizon', 'yedek tugay']]]),
    teknoloji: teknolojiler({ piyade2: ['Dijital muharebe ağı', 2028], piyade3: ['Yeni nesil piyade', 2032], agirtop2: ['Kamikaze İHA', 2027, ['iha', 'drone']], tarim1: ['Hassas tarım', 2026], tarim2: ['Dikey tarım', 2030],
      sanayi1: ['Endüstri 4.0', 2026, ['sanayi', 'fabrika']], sanayi2: ['Yapay zekâ destekli üretim', 2030, ['yapay zeka']], demiryolu: ['Yüksek hızlı tren', 2026, ['hızlı tren', 'demiryolu']], sihhiye: ['Muharebe tıbbı', 2027, ['sağlık']], kurmay: ['Çok alanlı harekât', 2027], idare: ['E-devlet', 2026, ['dijital devlet']], propaganda: ['Sosyal medya kampanyası', 2026, ['sosyal medya', 'propaganda']],
      taktik1: ['Ağ merkezli harp', 2026], taktik2: ['Otonom sürü taktiği', 2030, ['sürü']], tahkimat1: ['Mevzi ve tünel ağı', 2026, ['tünel']], tahkimat2: ['Katmanlı hava savunması', 2028, ['hava savunması']], topcu1: ['Hassas güdümlü mühimmat', 2026], topcu2: ['Sensör-atıcı zinciri', 2029],
      zirh1: ['Aktif koruma sistemi', 2027], dok_ates: ['Uzun menzilli ateş doktrini', 2026], dok_manevra: ['Çevik manevra doktrini', 2026], dok_kitle: ['Topyekûn savunma doktrini', 2026],
      ikmal1: ['Akıllı lojistik', 2026], ikmal2: ['Otonom ikmal', 2029], istihbarat1: ['Uydu ve sinyal istihbaratı', 2026, ['uydu']], seferberlik: ['Yedek kuvvet sistemi', 2026],
      sanayi3: ['Eklemeli üretim', 2029, ['3d baskı']], insaat1: ['Modüler yapı', 2026], maden1: ['Nadir toprak işleme', 2027, ['nadir toprak']], ticaret1: ['Serbest ticaret bölgesi', 2026], maliye1: ['Dijital vergi', 2026], banka1: ['Egemen varlık fonu', 2027, ['varlık fonu']],
      tarim3: ['Gen düzenlemeli tohum', 2031], depo1: ['Stratejik gıda rezervi', 2026], egitim1: ['Ar-Ge teşvikleri', 2026, ['ar-ge']], asayis1: ['Siber güvenlik ve asayiş', 2026, ['siber güvenlik']] }),
    proje: projeler([['sivil', 'Sanayi tesisi', ['fabrika', 'sivil fabrika']], ['askeri', 'Savunma sanayii tesisi', ['askeri fabrika', 'savunma sanayii', 'silah fabrikası']], ['sulama', 'Sulama', ['baraj', 'kanal']], ['demiryolu', 'Hızlı tren hattı', ['demiryolu', 'tren']], ['altyapi', 'Altyapı', ['otoyol', 'yol']], ['valilik', 'Valilik', ['idare binası']]], 'modern'),
    mal: mallar([['Gıda', ['yiyecek', 'tahıl', 'erzak']], ['Çelik', ['demir']], ['Kömür', []], ['Mühimmat', ['cephane', 'mermi']], ['Petrol ve doğalgaz', ['petrol', 'doğalgaz', 'yakıt', 'enerji']]]),
    terim: { sivilF: 'sanayi tesisi', askeriF: 'savunma sanayii', demiryolu: 'hızlı tren', muhimmat: 'mühimmat', para: 'milyon $' },
    simge: { piyade: 'ak47', suvari: 'battle-tank', mt: 'missile-pod', sahra: 'field-gun', agir: 'missile-launcher' },
  },
};
