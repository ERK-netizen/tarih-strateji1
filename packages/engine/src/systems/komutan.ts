// Komutanlar (şartname v1.6, PR-07): kalıcı kişi kaydı, birlik ataması, kapasite, muharebe etkisi, daimî emir.
// Tarihî kişiler yalnız kendi yaşam ve hizmet aralıklarında görünür; nitelikler (1–100) oyun değerlendirmesidir.
// Kurgu komutanlar sabit tohumla üretilir ve "kurgu" olarak işaretlenir; tarihî kişiyle aynı adı taşımaz.
import type { World } from '../state/world.ts';
import { tarih } from '../calendar/index.ts';
import { rng, uniformInt, AMAC } from '../rng/index.ts';
import { S, mulDiv, clamp } from '../num/index.ts';
import { uc, anlat, birlikIstat, birlikIkmal, pasif, savasta } from './ortak.ts';

/** rng sistem kimliği (başka sistemle paylaşılmaz). */
const SISTEM = 60;
/** En yüksek nitelik; kurmay eğitimi ve deneyim bunun üstüne çıkaramaz. */
export const NITELIK_TAVAN = 95;
export const EGITIM_AZAMI = 3, EGITIM_PG = 30_000, EGITIM_ALTIN = 150_000, EGITIM_ARTIS = 4;
export const KOMUTAN_EMIR = ['Serbest', 'Savun', 'Taarruz'] as const;

/** Satır: ülke kodu|ad|doğum|hizmet başı|hizmet sonu (ölüm ya da ayrılış)|taarruz|savunma|lojistik */
const TARIHI: string[] = [
  // Büyük Savaş kuşağı
  'GER|Paul von Hindenburg|1847|1911|1919|70|80|65', 'GER|Erich Ludendorff|1865|1908|1918|85|60|75', 'GER|Helmuth von Moltke|1848|1906|1916|55|55|60',
  'GER|Erich von Falkenhayn|1861|1913|1919|65|70|65', 'GER|August von Mackensen|1849|1908|1920|80|65|60',
  'FRA|Joseph Joffre|1852|1911|1916|60|75|70', 'FRA|Ferdinand Foch|1851|1907|1923|80|65|60', 'FRA|Philippe Pétain|1856|1911|1931|55|90|70',
  'GBR|John French|1852|1907|1915|50|55|50', 'GBR|Douglas Haig|1861|1909|1920|60|60|65', 'GBR|Horatio Kitchener|1850|1900|1916|55|60|85',
  'RUS|Aleksey Brusilov|1853|1906|1917|85|60|55', 'RUS|Aleksandr Samsonov|1859|1905|1914|45|40|35', 'RUS|Paul von Rennenkampf|1854|1905|1915|45|50|40', 'RUS|Nikolay Yudeniç|1862|1907|1919|75|65|60',
  'AUH|Franz Conrad von Hötzendorf|1852|1906|1918|60|50|45', 'AUH|Svetozar Boroević|1856|1908|1918|50|85|60',
  'OSM|Enver Paşa|1881|1913|1918|55|40|35', 'OSM|Mustafa Kemal|1881|1911|1922|85|90|70', 'OSM|Cemal Paşa|1872|1911|1918|45|50|50',
  'OSM|Kâzım Karabekir|1882|1912|1922|70|75|65', 'OSM|Fevzi Çakmak|1876|1910|1922|65|80|70', 'OSM|Esad Paşa|1862|1907|1919|50|75|55',
  'ITA|Luigi Cadorna|1850|1908|1917|45|50|45', 'ITA|Armando Diaz|1861|1912|1924|60|75|65',
  'SRB|Radomir Putnik|1847|1903|1917|70|85|60', 'SRB|Živojin Mišić|1855|1909|1921|80|75|55',
  'USA|John J. Pershing|1860|1906|1924|70|65|75', 'JAP|Kamio Mitsuomi|1856|1908|1917|65|60|65', 'BUL|Nikola Jekov|1864|1910|1918|65|65|55',
  'ROM|Constantin Prezan|1861|1907|1920|60|65|55', 'BEL|Gérard Leman|1851|1905|1920|40|75|50',
  // İkinci Dünya Savaşı kuşağı
  'GER|Gerd von Rundstedt|1875|1932|1945|80|75|70', 'GER|Erich von Manstein|1887|1936|1944|95|80|70', 'GER|Heinz Guderian|1888|1935|1945|95|60|65',
  'GER|Erwin Rommel|1891|1937|1944|95|65|45', 'GER|Fedor von Bock|1880|1931|1942|80|65|60',
  'FRA|Maurice Gamelin|1872|1925|1940|40|55|55', 'FRA|Maxime Weygand|1867|1920|1942|50|65|60', 'FRA|Charles de Gaulle|1890|1937|1946|75|60|55',
  'GBR|Lord Gort|1886|1935|1946|55|60|55', 'GBR|Bernard Montgomery|1887|1937|1958|75|85|85', 'GBR|Archibald Wavell|1883|1935|1947|65|70|70', 'GBR|Harold Alexander|1891|1937|1952|65|75|70',
  'SOV|Georgi Jukov|1896|1933|1957|95|85|70', 'SOV|Semyon Timoşenko|1895|1933|1960|65|65|60', 'SOV|Kliment Voroşilov|1881|1925|1960|35|45|40',
  'SOV|Konstantin Rokossovski|1896|1936|1962|85|85|70', 'SOV|Boris Şapoşnikov|1882|1925|1945|60|70|85',
  'POL|Edward Rydz-Śmigły|1886|1929|1941|50|55|45', 'POL|Władysław Anders|1892|1934|1946|65|65|55',
  'ITA|Rodolfo Graziani|1882|1930|1945|45|40|40', 'ITA|Pietro Badoglio|1871|1919|1943|50|55|55', 'ITA|Giovanni Messe|1883|1935|1947|70|70|60',
  'JAP|Tomoyuki Yamashita|1885|1934|1946|90|70|60', 'JAP|Hisaichi Terauchi|1879|1930|1946|60|60|55', 'JAP|Masaharu Homma|1887|1935|1946|70|55|50',
  'USA|Dwight D. Eisenhower|1890|1936|1952|70|70|95', 'USA|George S. Patton|1885|1934|1945|95|55|60', 'USA|Douglas MacArthur|1880|1925|1951|80|70|60', 'USA|Omar Bradley|1893|1938|1953|75|75|80',
  'FIN|C. G. E. Mannerheim|1867|1918|1946|60|95|70', 'CHN|Li Zongren|1890|1926|1949|65|70|50', 'CHN|Bai Chongxi|1893|1926|1949|70|70|55',
  'TUR|Fevzi Çakmak|1876|1923|1944|65|80|70', 'TUR|Kâzım Orbay|1886|1926|1946|60|65|65', 'ROM|Ion Antonescu|1882|1931|1946|60|55|50',
  'YUG|Dušan Simović|1882|1930|1941|45|50|45', 'GRE|Alexandros Papagos|1883|1927|1955|60|80|60',
];
const SATIR = TARIHI.map((s) => { const p = s.split('|'); return { kod: p[0]!, ad: p[1]!, dogum: Number(p[2]), bas: Number(p[3]), bitis: Number(p[4]), saldiri: Number(p[5]), savunma: Number(p[6]), lojistik: Number(p[7]) }; });

/** Kurgu ad havuzları: [kültür kalıbı, ilk adlar, soyadlar, soyad önce mi]. */
const HAVUZ: [RegExp, string[], string[], boolean][] = [
  [/Türk|Azeri|Tatar|Türkmen|Özbek|Kazak|Kırgız|Uygur|Oğuz|Kıpçak|Hazar|Bulgar \(Volga\)/, ['Ahmet', 'Mehmet', 'Ali', 'Hasan', 'İsmail', 'Halil'], ['Demir', 'Kaya', 'Yıldız', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Şahin', 'Öztürk', 'Çelik'], false],
  [/Alman|Avusturya|Frank|Sakson|Bavyera|İsviçre|Hollanda|Felemenk/, ['Karl', 'Friedrich', 'Wilhelm', 'Otto', 'Hans', 'Heinrich'], ['Weber', 'Becker', 'Hoffmann', 'Schäfer', 'Krüger', 'Lehmann', 'Brandt', 'Vogel', 'Keller', 'Lang'], false],
  [/Fransız|Valon|Belçika/, ['Louis', 'Henri', 'Pierre', 'Jean', 'Charles', 'Émile'], ['Laurent', 'Moreau', 'Girard', 'Lefèvre', 'Mercier', 'Blanchard', 'Roche', 'Marchand', 'Renaud', 'Perrin'], false],
  [/İngiliz|Amerikan|Kanada|Avustralya|Yeni Zelanda|İskoç|İrlanda|Anglo/, ['John', 'William', 'Henry', 'George', 'Arthur', 'Edward'], ['Harding', 'Clarke', 'Fletcher', 'Hughes', 'Marsh', 'Palmer', 'Reeves', 'Shaw', 'Thorne', 'Whitaker'], false],
  [/Rus|Ukrayna|Belarus|Sovyet/, ['İvan', 'Nikolay', 'Aleksey', 'Dmitri', 'Sergey', 'Mihail'], ['Orlov', 'Volkov', 'Sokolov', 'Morozov', 'Lebedev', 'Kozlov', 'Vasilyev', 'Pavlov', 'Belov', 'Kuznetsov'], false],
  [/İtalyan|Lombard|Venedik|Napoli/, ['Giuseppe', 'Luigi', 'Carlo', 'Antonio', 'Vittorio', 'Enrico'], ['Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'Costa', 'Fontana', 'Rinaldi', 'Barbieri'], false],
  [/İspanyol|Portekiz|Meksika|Arjantin|Brezilya|Kolombiya|Şili|Peru|Kastilya|Katalan|Latin/, ['José', 'Manuel', 'Francisco', 'Juan', 'Antonio', 'Pedro'], ['Herrera', 'Navarro', 'Molina', 'Ortega', 'Delgado', 'Vega', 'Cabrera', 'Fuentes', 'Campos', 'Medina'], false],
  [/Arap|Berberi|Mısır/, ['Halid', 'Ömer', 'Yusuf', 'Said', 'Faysal', 'Hamid'], ['el-Haşimi', 'el-Mısri', 'el-Bağdadi', 'el-Halebi', 'eş-Şami', 'el-Necdi', 'et-Tunusi', 'el-Fasi', 'el-Yemeni', 'el-Hicazi'], false],
  [/Fars|İran|Kürt|Afgan|Peştun|Tacik/, ['Rıza', 'Abbas', 'Hüseyin', 'Mehdi', 'Cafer', 'Nasır'], ['Şirazi', 'Tebrizi', 'İsfahani', 'Kirmani', 'Horasani', 'Hemedani', 'Kazvini', 'Yezdi', 'Gilani', 'Kaşani'], false],
  [/Çin|Han|Mançu|Kore|Viet/, ['Wei', 'Jian', 'Ming', 'Hao', 'Feng', 'Long'], ['Zhang', 'Wang', 'Li', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu'], true],
  [/Japon/, ['Hiroshi', 'Takeshi', 'Kenji', 'Isamu', 'Masao', 'Tadashi'], ['Tanaka', 'Suzuki', 'Watanabe', 'Itō', 'Nakamura', 'Kobayashi', 'Katō', 'Yoshida', 'Yamada', 'Sasaki'], true],
  [/Hint|Bengal|Pencap|Marathi|Tamil|Racput/, ['Arjun', 'Vikram', 'Rajendra', 'Mohan', 'Anand', 'Pratap'], ['Singh', 'Sharma', 'Verma', 'Rao', 'Chauhan', 'Rathore', 'Nair', 'Reddy', 'Thakur', 'Mehta'], false],
  [/./, ['Aleksandr', 'Viktor', 'Marko', 'Stefan', 'Daniel', 'Pavel'], ['Novak', 'Horvat', 'Petrov', 'Kovač', 'Popov', 'Marin', 'Kraus', 'Dumitru', 'Nagy', 'Jovanović'], false],
];

export function komutanAdi(w: World, k: number): string { return w.komutanAd[w.KM.c.ad[k]!] ?? `Komutan ${k}`; }
/** Birliğin görevdeki komutanının yuvası (yoksa −1). */
export function birlikKomutani(w: World, u: number): number {
  const id = uc(w).komutan![u]! - 1;
  if (id < 0) return -1;
  const k = w.KM.resolve(id);
  return k >= 0 && w.KM.c.durum[k] === 0 && w.KM.c.ulke[k] === uc(w).ulke![u] ? k : -1;
}
/** Ülkenin görevdeki komutanları (yuva sırasıyla). */
export function ulkeKomutanlari(w: World, c: number): number[] {
  const l: number[] = [];
  for (const k of w.KM.rows()) if (w.KM.c.ulke[k] === c && w.KM.c.durum[k] === 0) l.push(k);
  return l;
}
/** Komutan başına canlı birlik sayısı (yuva indeksli). */
export function komutanYuk(w: World): Int32Array {
  const say = new Int32Array(w.KM.hw);
  for (const u of w.U.rows()) { const k = birlikKomutani(w, u); if (k >= 0) say[k] = say[k]! + 1; }
  return say;
}
/** Deneyimle etkin nitelik: tavana (95) kalan yolun en çok yarısı deneyimle kapanır (azalan getiri). */
export function etkinNitelik(taban: number, deneyim: number): number {
  return Math.min(NITELIK_TAVAN, taban + Math.floor((Math.max(0, NITELIK_TAVAN - taban) * deneyim) / 200_000));
}
/**
 * Komutanın birliğe muharebe etkisi (S ölçekli çarpanlar; ikmal S'ye eklenen pay).
 * Tam nitelikte +%20 taarruz/savunma, +%10 ikmal verimi. Kapasiteyi aşan komutanın etkisi kapasite/yük oranında
 * seyrelir (V16-T26). Etki birlik başına bir kez uygulanır; üst kademe yoktur (V16-T27).
 */
export function komutanCarpan(w: World, u: number, yuk: Int32Array): { saldiri: number; savunma: number; ikmal: number; k: number } | null {
  const k = birlikKomutani(w, u);
  if (k < 0) return null;
  const K = w.KM.c;
  const n = Math.max(1, yuk[k] ?? 1), kap = Math.max(1, K.kapasite[k]!);
  const pay = n > kap ? mulDiv(S, kap, n).q : S;
  const d = K.deneyim[k]!;
  return {
    k,
    saldiri: S + mulDiv(etkinNitelik(K.saldiri[k]!, d) * 2000, pay, S).q,
    savunma: S + mulDiv(etkinNitelik(K.savunma[k]!, d) * 2000, pay, S).q,
    ikmal: mulDiv(etkinNitelik(K.lojistik[k]!, d) * 1000, pay, S).q,
  };
}
/** Muharebeye giren birliğin komutanı deneyim kazanır (tavan 100.000). */
export function komutanDeneyim(w: World, u: number): void {
  const k = birlikKomutani(w, u);
  if (k >= 0) w.KM.c.deneyim[k] = Math.min(100_000, w.KM.c.deneyim[k]! + 25);
}

function ekle(w: World, c: number, ad: string, kaynak: number, dogum: number, bitis: number, s: number, sv: number, l: number, kod: number): number {
  const k = w.KM.alloc();
  const K = w.KM.c;
  w.komutanAd.push(ad);
  K.ulke[k] = c; K.ad[k] = w.komutanAd.length - 1; K.kaynak[k] = kaynak; K.dogum[k] = dogum; K.bitis[k] = bitis;
  K.saldiri[k] = s; K.savunma[k] = sv; K.lojistik[k] = l; K.deneyim[k] = 0; K.kapasite[k] = 6 + Math.floor(l / 20);
  K.emir[k] = 0; K.ikmalEsik[k] = 0; K.orgEsik[k] = 0; K.durum[k] = 0; K.kod[k] = kod; K.egitim[k] = 0;
  return k;
}
const adVar = (w: World, ad: string): boolean => { for (const k of w.KM.rows()) if (komutanAdi(w, k) === ad) return true; return false; };

/** Hizmet aralığına giren tarihî kişileri ekler; aynı kişi (katalog satırı ya da ad) ikinci kez oluşmaz (V16-T24). */
function tarihiEkle(w: World, c: number, yil: number): number {
  const kod = w.pkg.ulkeler[c]!.kod;
  let n = 0;
  SATIR.forEach((x, i) => {
    if (x.kod !== kod || yil < x.bas || yil > x.bitis) return;
    for (const k of w.KM.rows()) if (w.KM.c.kod[k] === i + 1) return;
    if (adVar(w, x.ad)) return;
    ekle(w, c, x.ad, 0, x.dogum, x.bitis, x.saldiri, x.savunma, x.lojistik, i + 1);
    n++;
  });
  return n;
}
/** Ülkenin birlik sayısına göre komutan kadrosu. */
export function komutanKadro(w: World, c: number): number {
  let n = 0;
  const U = uc(w);
  for (const u of w.U.rows()) if (U.ulke![u] === c) n++;
  return clamp(2 + Math.floor(n / 6), 2, 12);
}
/** Kurgu komutan üretir (sabit tohum; akademi mezunu ise nitelikleri daha düşüktür). */
function uret(w: World, c: number, yil: number, akademi: boolean): number {
  const kultur = w.pkg.kultur[w.pkg.ulkeler[c]!.kultur]?.ad ?? '';
  const h = HAVUZ.find(([re]) => re.test(kultur))!;
  let sira = 0;
  for (const k of w.KM.rows()) if (w.KM.c.ulke[k] === c) sira++;
  const z = (i: number, m: number) => uniformInt(rng(w.tohum, w.gun, SISTEM, c, 0, AMAC.lottery, sira, i), m);
  let ad = '';
  for (let d = 0; d < 60; d++) {
    const a = h[1][(z(0, h[1].length) + d) % h[1].length]!, s = h[2][(z(1, h[2].length) + Math.floor(d / h[1].length)) % h[2].length]!;
    ad = h[3] ? `${s} ${a}` : `${a} ${s}`;
    if (!adVar(w, ad)) break;
    ad = `${ad} ${sira + 1}`;
  }
  const taban = akademi ? 25 : 30, aralik = akademi ? 36 : 46;
  const dogum = yil - (akademi ? 30 : 38) - z(5, akademi ? 8 : 20);
  return ekle(w, c, ad, 1, dogum, dogum + 66, taban + z(2, aralik), taban + z(3, aralik), taban + z(4, aralik), 0);
}

/** Senaryo başlangıcı ve şema 8 kayıtlarının göçü: her etkin devlete kadrosu kadar komutan. */
export function komutanBaslat(w: World): void {
  const yil = tarih(w.gun).y;
  for (let c = 0; c < w.nC; c++) {
    if (pasif(w, c)) continue;
    tarihiEkle(w, c, yil);
    const hedef = komutanKadro(w, c);
    for (let i = ulkeKomutanlari(w, c).length; i < hedef; i++) uret(w, c, yil, false);
  }
}

/** Komutansız birlikleri görevdeki komutanlara dağıtır: en yetenekliden başlanır, kapasite aşılmaz. Atanan birlik sayısını döndürür. */
export function komutanDagit(w: World, c: number): number {
  const U = uc(w), K = w.KM.c;
  const kl = ulkeKomutanlari(w, c).sort((a, b) => K.saldiri[b]! + K.savunma[b]! - K.saldiri[a]! - K.savunma[a]! || a - b);
  if (!kl.length) return 0;
  const yuk = komutanYuk(w);
  // aynı bölgedeki birlikler aynı komutana düşsün: bölge, sonra kimlik sırası
  const bos: number[] = [];
  for (const u of w.U.rows()) if (U.ulke![u] === c && birlikKomutani(w, u) < 0) bos.push(u);
  bos.sort((a, b) => U.bolge![a]! - U.bolge![b]! || a - b);
  let n = 0, i = 0;
  for (const u of bos) {
    while (i < kl.length && yuk[kl[i]!]! >= K.kapasite[kl[i]!]!) i++;
    if (i >= kl.length) break;
    U.komutan![u] = w.KM.id(kl[i]!) + 1; yuk[kl[i]!] = yuk[kl[i]!]! + 1; n++;
  }
  return n;
}

/** Aylık: ölüm/ayrılış, hizmet yılı gelen tarihî kişiler, akademi mezunları; YZ ülkelerinde birlik dağıtımı. */
export function komutanAy(w: World): void {
  const yil = tarih(w.gun).y, K = w.KM.c, U = uc(w);
  const ayrilan = new Set<number>();
  for (const k of w.KM.rows()) {
    if (K.durum[k] !== 0 || yil <= K.bitis[k]!) continue;
    K.durum[k] = 1; ayrilan.add(k);
    const c = K.ulke[k]!;
    if (c === w.oyuncu) anlat(w, `${komutanAdi(w, k)} ${K.kaynak[k] === 0 ? 'hizmetten ayrıldı' : 'emekliye ayrıldı'}; birlikleri komutansız kaldı.`, 'ordu', c, 1);
  }
  // görevden ayrılanın birlikleri boşalır (ölü kişi komuta edemez)
  if (ayrilan.size) for (const u of w.U.rows()) { const id = U.komutan![u]! - 1; if (id >= 0) { const k = w.KM.resolve(id); if (k < 0 || ayrilan.has(k)) U.komutan![u] = 0; } }
  for (let c = 0; c < w.nC; c++) {
    if (pasif(w, c)) continue;
    let sahipBolge = false;
    for (let r = 0; r < w.nR && !sahipBolge; r++) if (w.R.c.sahip[r] === c) sahipBolge = true;
    if (!sahipBolge) continue;
    const yeni = tarihiEkle(w, c, yil);
    if (yeni > 0 && c === w.oyuncu) anlat(w, `${yeni} tarihî komutan göreve hazır.`, 'ordu', c, 1);
    // ayda en çok bir akademi mezunu
    if (ulkeKomutanlari(w, c).length < komutanKadro(w, c)) { const k = uret(w, c, yil, true); if (c === w.oyuncu) anlat(w, `Harp akademisinden yeni komutan: ${komutanAdi(w, k)}.`, 'ordu', c, 0); }
    if (c !== w.oyuncu || w.mod === 2) komutanDagit(w, c);
  }
}

/**
 * Günlük: daimî emirlerin denetimi (V16-T28). Komutan, ikmal ya da organizasyon eşiği tutmayan birliğin taarruzunu
 * durdurur ve gerekçesini bildirir; "savun" emrindeki komutan otomasyonun verdiği taarruzları iptal eder
 * (oyuncunun elle verdiği emre dokunmaz).
 */
export function komutanGunu(w: World): void {
  if (w.KM.hw === 0) return;
  const U = uc(w), K = w.KM.c, R = w.R.c;
  const durdu = new Map<number, string>();
  for (const u of w.U.rows()) {
    const h = U.hedef![u]!;
    if (h < 0) continue;
    const k = birlikKomutani(w, u);
    if (k < 0) continue;
    if (K.emir[k] === 0 && K.ikmalEsik[k] === 0 && K.orgEsik[k] === 0) continue;
    const c = U.ulke![u]!, hk = R.kontrolEden[h]!;
    if (hk === c || !savasta(w, c, hk)) continue; // yalnız taarruz hareketleri
    let neden = '';
    if (K.emir[k] === 1 && !(U.elle![u]! > w.gun)) neden = 'savunma emri';
    if (!neden && K.ikmalEsik[k]! > 0) { const ik = birlikIkmal(w, u).oran; if (ik < K.ikmalEsik[k]!) neden = `ikmal %${Math.floor(ik / 10_000)}, eşik %${Math.floor(K.ikmalEsik[k]! / 10_000)}`; }
    if (!neden && K.orgEsik[k]! > 0) { const o = mulDiv(U.org![u]!, S, Math.max(1, birlikIstat(w, u).orgMax)).q; if (o < K.orgEsik[k]!) neden = `organizasyon %${Math.floor(o / 10_000)}, eşik %${Math.floor(K.orgEsik[k]! / 10_000)}`; }
    if (!neden) continue;
    U.hedef![u] = -1; U.sonraki![u] = -1; U.ilerleme![u] = 0; U.durus![u] = 0;
    if (!durdu.has(k)) durdu.set(k, neden);
  }
  // gerekçe bildirimi: komutan başına en çok haftada bir (hash dışı sayaç)
  const son = (w.onbellek.get('kmRapor') as Map<number, number> | undefined) ?? new Map<number, number>();
  w.onbellek.set('kmRapor', son);
  for (const [k, neden] of [...durdu.entries()].sort((a, b) => a[0] - b[0])) {
    if (K.ulke[k] !== w.oyuncu || w.gun - (son.get(k) ?? -99) < 7) continue;
    son.set(k, w.gun);
    anlat(w, `${komutanAdi(w, k)} taarruzu durdurdu: ${neden}.`, 'ordu', K.ulke[k]!, 1);
  }
}
