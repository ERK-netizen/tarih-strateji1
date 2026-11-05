// Veri derleyici (bölüm 25): 1A kurgusal fixture'ı (48 bölge, 8 eyalet, 4 devlet) deterministik üretir.
// Oyun içinde çalışmaz. Kayan nokta yalnız geometri üretiminde kullanılır; pakete tamsayı yazılır.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HASAT_HAM, HASAT_P, NKIMLIK, BAYRAK } from '../../engine/src/catalog.ts';
import type { Paket, PaketBolge, PaketKenar } from '../../engine/src/paket.ts';

const W = 1200, H = 700;
const S = 1_000_000;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(19140628);
const hashR = (k: number) => mulberry32(k * 2654435761)();

type P2 = [number, number];
const uyarilar: string[] = [];

// ---------- Tohum noktaları ----------
// Eyaletler 4×2 düzende: [0]AKD [1]MVK [2]DMR [3]DMR / [4]AKD [5]KZL [6]KZL [7]DMR
const EYALET_ULKE = [0, 1, 2, 2, 0, 3, 3, 2];
const EYALET_AD = ['Batı Yaylası', 'Mavi Kıyılar', 'Demir Eşiği', 'Doğu Ovası', 'Güney Akdağ', 'Kızıl Bozkır', 'Irmak Boyu', 'Hanlar Diyarı'];
const merkezler: P2[] = [];
for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
  merkezler.push([170 + c * 285 + (rnd() - 0.5) * 50, 200 + r * 300 + (rnd() - 0.5) * 40]);
}
// MVK kıyıda dursun
merkezler[1]![1] = 175;

const kara: P2[] = [];
const karaEyalet: number[] = [];
for (let e = 0; e < 8; e++) {
  const [cx, cy] = merkezler[e]!;
  let n = 0, deneme = 0;
  while (n < 6 && deneme < 5000) {
    deneme++;
    const a = rnd() * Math.PI * 2, rr = 25 + rnd() * 105;
    const p: P2 = [cx + Math.cos(a) * rr * 1.15, cy + Math.sin(a) * rr * 0.95];
    if (p[0] < 60 || p[0] > W - 60 || p[1] < 70 || p[1] > H - 55) continue;
    if (kara.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 62)) continue;
    kara.push(p); karaEyalet.push(e); n++;
  }
  if (n < 6) throw new Error('nokta yerleşimi başarısız');
}
// Deniz tohumları: kenar halkası + kuzey körfezi + batı kıyısı girintisi
const deniz: P2[] = [];
for (let x = 0; x <= W; x += 55) { deniz.push([x + (rnd() - 0.5) * 20, 4 + rnd() * 18]); deniz.push([x + (rnd() - 0.5) * 20, H - 4 - rnd() * 14]); }
for (let y = 55; y < H; y += 55) { deniz.push([4 + rnd() * 18, y + (rnd() - 0.5) * 20]); deniz.push([W - 4 - rnd() * 14, y + (rnd() - 0.5) * 20]); }
const korfez: P2[] = [[520, 40], [470, 62], [600, 55], [680, 38], [130, 640], [70, 560], [1130, 640], [1050, 668]];
for (const p of korfez) deniz.push(p);

// Lloyd gevşetmesi (yalnız kara, eyalet üyeliği korunur)
const tum = (): P2[] => [...kara, ...deniz];

// ---------- Etiketli Voronoi (yarı-düzlem kırpma) ----------
interface V { p: P2; lab: number } // lab: bu köşeden sonraki kenarın komşusu (-1 dikdörtgen)
function hucre(i: number, pts: P2[]): V[] {
  let poly: V[] = [{ p: [0, 0], lab: -1 }, { p: [W, 0], lab: -1 }, { p: [W, H], lab: -1 }, { p: [0, H], lab: -1 }];
  const pi = pts[i]!;
  const sira = pts.map((_, j) => j).filter((j) => j !== i).sort((a, b) => {
    const da = (pts[a]![0] - pi[0]) ** 2 + (pts[a]![1] - pi[1]) ** 2;
    const db = (pts[b]![0] - pi[0]) ** 2 + (pts[b]![1] - pi[1]) ** 2;
    return da - db || a - b;
  });
  for (const j of sira) {
    const pj = pts[j]!;
    const nx = pj[0] - pi[0], ny = pj[1] - pi[1];
    const mx = (pj[0] + pi[0]) / 2, my = (pj[1] + pi[1]) / 2;
    const f = (p: P2) => (p[0] - mx) * nx + (p[1] - my) * ny; // ≤0 içeride
    const out: V[] = [];
    for (let k = 0; k < poly.length; k++) {
      const A = poly[k]!, B = poly[(k + 1) % poly.length]!;
      const fa = f(A.p), fb = f(B.p);
      const inA = fa <= 1e-9, inB = fb <= 1e-9;
      const I = (): P2 => { const t = fa / (fa - fb); return [A.p[0] + (B.p[0] - A.p[0]) * t, A.p[1] + (B.p[1] - A.p[1]) * t]; };
      if (inA && inB) out.push({ p: A.p, lab: A.lab });
      else if (inA && !inB) { out.push({ p: A.p, lab: A.lab }); out.push({ p: I(), lab: j }); }
      else if (!inA && inB) out.push({ p: I(), lab: A.lab });
    }
    poly = out;
    // erken çıkış: hücre yarıçapının iki katından uzak noktalar kesemez
    let rmax = 0;
    for (const v of poly) rmax = Math.max(rmax, Math.hypot(v.p[0] - pi[0], v.p[1] - pi[1]));
    if (Math.hypot(nx, ny) > 2 * rmax + 1) break;
  }
  return poly;
}

for (let it = 0; it < 2; it++) {
  const pts = tum();
  for (let i = 0; i < kara.length; i++) {
    const poly = hucre(i, pts);
    let ax = 0, ay = 0, a2 = 0;
    for (let k = 0; k < poly.length; k++) {
      const A = poly[k]!.p, B = poly[(k + 1) % poly.length]!.p;
      const cr = A[0] * B[1] - B[0] * A[1];
      a2 += cr; ax += (A[0] + B[0]) * cr; ay += (A[1] + B[1]) * cr;
    }
    const c: P2 = [ax / (3 * a2), ay / (3 * a2)];
    kara[i] = [kara[i]![0] * 0.5 + c[0] * 0.5, kara[i]![1] * 0.5 + c[1] * 0.5];
  }
}

const pts = tum();
const NK = kara.length;
const hucreler = pts.map((_, i) => hucre(i, pts));

// ---------- Gürültülü kenarlar ----------
const kenarCizgi = new Map<string, P2[]>();
function gurultu(a: P2, b: P2, key: number, seviye: number): P2[] {
  if (seviye === 0) return [a, b];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const amp = L * 0.16 * (hashR(key * 31 + seviye * 7) - 0.5) * 2;
  const m: P2 = [mx - (dy / L) * amp, my + (dx / L) * amp];
  const s1 = gurultu(a, m, key * 3 + 1, seviye - 1);
  const s2 = gurultu(m, b, key * 3 + 2, seviye - 1);
  return [...s1, ...s2.slice(1)];
}
function cizgi(i: number, j: number, a: P2, b: P2): P2[] {
  if (j < 0) return [a, b];
  const lo = Math.min(i, j), hi = Math.max(i, j);
  const k = `${lo}-${hi}`;
  let c = kenarCizgi.get(k);
  if (!c) {
    // kanonik yön: küçük kimlikli hücrenin yönü
    c = gurultu(i === lo ? a : b, i === lo ? b : a, lo * 1000 + hi, 3);
    kenarCizgi.set(k, c);
  }
  return i === lo ? c : [...c].reverse();
}
const yuvarla = (x: number) => Math.round(x * 10) / 10;
function poligon(i: number): number[] {
  const h = hucreler[i]!;
  const out: number[] = [];
  for (let k = 0; k < h.length; k++) {
    const A = h[k]!, B = h[(k + 1) % h.length]!;
    const c = cizgi(i, A.lab, A.p, B.p);
    for (let q = 0; q < c.length - 1; q++) out.push(yuvarla(c[q]![0]), yuvarla(c[q]![1]));
  }
  return out;
}
// Hücrelerin kanonik sırayla işlenmesi (küçük kimlik önce) — kenar paylaşımı tutarlı olsun
const poligonlar: number[][] = [];
for (let i = 0; i < pts.length; i++) poligonlar.push(poligon(i));

// ---------- Komşuluk ----------
const kenarlar: PaketKenar[] = [];
const komsu: number[][] = Array.from({ length: NK }, () => []);
const kiyi = new Array<boolean>(NK).fill(false);
for (let i = 0; i < NK; i++) {
  const h = hucreler[i]!;
  for (let k = 0; k < h.length; k++) {
    const A = h[k]!, B = h[(k + 1) % h.length]!;
    const L = Math.hypot(A.p[0] - B.p[0], A.p[1] - B.p[1]);
    if (A.lab >= NK || A.lab === -1) { if (A.lab >= NK) kiyi[i] = true; continue; }
    const j = A.lab;
    if (L < 6) continue; // köşe teması komşuluk değildir
    if (j > i && !komsu[i]!.includes(j)) {
      const km = Math.round(Math.hypot(kara[i]![0] - kara[j]![0], kara[i]![1] - kara[j]![1]));
      kenarlar.push({ a: i, b: j, km, sinir: Math.round(L) });
      komsu[i]!.push(j); komsu[j]!.push(i);
    }
  }
}
for (const k of komsu) k.sort((a, b) => a - b);

// ---------- Adlar ----------
const ADLAR = [
  'Akyurt', 'Taşdere', 'Kuzgunkaya', 'Sarıova', 'Gökçeyazı', 'Ilgınlı',
  'Mavişehir', 'Yelkenli', 'Martıburnu', 'Tuzla Kıyısı', 'Selvikoy', 'Fenerbaşı',
  'Tunçkale', 'Demirkapı', 'Kurtboğazı', 'Karagöl', 'Bozkayalar', 'Kartalyuva',
  'Hanbalık', 'Ulugöl', 'Koyunova', 'Tozludere', 'Altınsu', 'Yaylabaşı',
  'Akdağ Kalesi', 'Çamlıyurt', 'Değirmendere', 'Zeytinlik', 'Kayalıboğaz', 'Narlıova',
  'Kızılova', 'Başakköy', 'Kervansaray', 'Harmanlı', 'Gölbucak', 'Susuzova',
  'Irmakağzı', 'Söğütlü', 'Değirmenli', 'Saztepe', 'Balıkesen', 'Kumtepe',
  'Hanlar', 'Bozkırkent', 'Atlıkonak', 'Çorakyurt', 'Uzunyayla', 'Kavaklıdere',
];
const ULKE = [
  { kod: 'AKD', ad: 'Akdağ Krallığı', kisa: 'Akdağ', sifat: 'Akdağlı', renk: '#3f6e8c', yonetim: 1, kisilik: 1, kultur: 0, inanc: 0, yedekOran: 60_000, lider: 'Kral III. Orhan' },
  { kod: 'MVK', ad: 'Mavikıyı Prensliği', kisa: 'Mavikıyı', sifat: 'Mavikıyılı', renk: '#c9a227', yonetim: 0, kisilik: 3, kultur: 1, inanc: 0, yedekOran: 40_000, lider: 'Prens Selim' },
  { kod: 'DMR', ad: 'Demirhan İmparatorluğu', kisa: 'Demirhan', sifat: 'Demirhanlı', renk: '#6a4c86', yonetim: 0, kisilik: 0, kultur: 2, inanc: 1, yedekOran: 80_000, lider: 'İmparator Tuğrul' },
  { kod: 'KZL', ad: 'Kızılova Cumhuriyeti', kisa: 'Kızılova', sifat: 'Kızılovalı', renk: '#b5562f', yonetim: 2, kisilik: 2, kultur: 3, inanc: 0, yedekOran: 50_000, lider: 'Başkan Nermin Aral' },
];
const KULTUR = [
  { kod: 'akdagli', ad: 'Akdağlı', grup: 0 },
  { kod: 'mavili', ad: 'Mavikıyılı', grup: 0 },
  { kod: 'demirhanli', ad: 'Demirhanlı', grup: 1 },
  { kod: 'kizilovali', ad: 'Kızılovalı', grup: 2 },
  { kod: 'dagli', ad: 'Dağlı', grup: 1 },
];
const INANC = [{ kod: 'eski', ad: 'Eski İnanç' }, { kod: 'yeni', ad: 'Yeni Mezhep' }];

// eyalet → bölgeler (nokta sırası kalıcı kimlik)
const eyBolge: number[][] = Array.from({ length: 8 }, () => []);
karaEyalet.forEach((e, i) => eyBolge[e]!.push(i));

// eyalet merkezi: eyalet merkez noktasına en yakın bölge
const eyMerkez = eyBolge.map((bs, e) => bs.reduce((best, b) =>
  Math.hypot(kara[b]![0] - merkezler[e]![0], kara[b]![1] - merkezler[e]![1]) <
  Math.hypot(kara[best]![0] - merkezler[e]![0], kara[best]![1] - merkezler[e]![1]) ? b : best, bs[0]!));
// başkentler: ülkenin ilk eyaletinin merkezi (DMR: Doğu Ovası)
const baskent = [eyMerkez[0]!, eyMerkez[1]!, eyMerkez[3]!, eyMerkez[5]!];

// ---------- Bölge öznitelikleri ----------
const bolgeler: PaketBolge[] = [];
for (let i = 0; i < NK; i++) {
  const e = karaEyalet[i]!;
  const u = EYALET_ULKE[e]!;
  const [x, y] = kara[i]!;
  const r = hashR(i + 77);
  const baskentMi = baskent.includes(i);
  const merkezMi = eyMerkez.includes(i);
  // Arazi: Demir Eşiği ve Batı Yaylası dağlık, Mavi Kıyılar ormanlık, Kızıl Bozkır ova, Irmak Boyu bataklık izleri
  let arazi = 0;
  if (baskentMi) arazi = 6;
  else if (e === 2) arazi = r < 0.55 ? 3 : 2;
  else if (e === 0) arazi = r < 0.35 ? 3 : r < 0.75 ? 2 : 1;
  else if (e === 1) arazi = r < 0.6 ? 1 : 0;
  else if (e === 5) arazi = r < 0.15 ? 2 : 0;
  else if (e === 6) arazi = r < 0.3 ? 4 : r < 0.5 ? 1 : 0;
  else if (e === 4) arazi = r < 0.4 ? 2 : r < 0.6 ? 1 : 0;
  else if (e === 7) arazi = r < 0.25 ? 5 : r < 0.5 ? 2 : 0;
  else arazi = r < 0.3 ? 1 : 0;
  const yerlesim = baskentMi ? 2 : merkezMi ? 1 : 0;
  const nufus = baskentMi ? 900_000 + Math.floor(r * 300_000) : merkezMi ? 420_000 + Math.floor(r * 120_000) : 220_000 + Math.floor(r * 110_000);
  // tarım: bozkır ve ova güçlü
  const tarimGuc = [1.0, 0.55, 0.65, 0.3, 0.4, 0.35, 0.15][arazi]!;
  const ulkeTarim = [1.0, 0.75, 0.95, 1.35][u]!;
  // günlük ihtiyaç ≈ nüfus/30.000 birim; üretim kapasitesi
  const ihtiyac30 = nufus / 30_000 * 30;
  const kentKat = yerlesim === 2 ? 0.35 : yerlesim === 1 ? 0.8 : 1;
  const alan = Math.max(20, Math.round((ihtiyac30 * (0.55 + 0.75 * tarimGuc) * ulkeTarim * kentKat) / 2.0)); // alan birimi; verim 2,0 birim/alan/30 gün
  const verim = 2000; // milibirim / alan / 30 gün
  // Sanayi
  const sanayiUlke = [[2, 1], [1, 0], [1.6, 1.2], [0.8, 0.4]][u]!;
  let sivilF = Math.round((yerlesim === 2 ? 5 : yerlesim === 1 ? 2.5 : 0.7) * sanayiUlke[0]! + r * 0.6);
  let askeriF = Math.round((yerlesim === 2 ? 4 : yerlesim === 1 ? 2 : 0.4) * sanayiUlke[1]! + hashR(i + 999) * 0.8);
  if (sivilF < 0) sivilF = 0; if (askeriF < 0) askeriF = 0;
  const celik = (arazi === 3 || arazi === 2) && (u === 0 || u === 2) ? Math.round(1500 + hashR(i + 5) * 2500) : 0; // milibirim/gün
  const komur = (arazi === 2 || arazi === 1) && u !== 1 ? Math.round(1500 + hashR(i + 9) * 3000) : 0;
  // Yaş × statü
  const cells = new Array<number>(32).fill(0);
  const cocuk = Math.floor(nufus * 0.34), asker = Math.floor(nufus * 0.30), yetiskin = Math.floor(nufus * 0.28);
  const yasli = nufus - cocuk - asker - yetiskin;
  const yedekOran = ULKE[u]!.yedekOran / S;
  const R = Math.floor(asker * 0.15);
  const E = Math.floor(asker * yedekOran);
  const yLaw = [0.075, 0.125, 0.25, 0.5][[2, 3, 3, 1][u]!]!; // başlangıç yasası: AKD Kapsamlı, MVK Zorunlu? aşağıda
  const kalan = asker - R - E;
  const Y = Math.floor(kalan * yLaw);
  const Sx = kalan - Y;
  cells[0 * 8 + 0] = cocuk; // çocuk × O
  cells[1 * 8 + 1] = Sx; cells[1 * 8 + 2] = Y; cells[1 * 8 + 3] = E; cells[1 * 8 + 7] = R;
  cells[2 * 8 + 0] = yetiskin; cells[3 * 8 + 0] = yasli;
  // Kimlik: ana kültür + sınır karışımı
  const anaK = ULKE[u]!.kultur, anaI = ULKE[u]!.inanc;
  const kimlikAnahtar: [number, number][] = [];
  const kimlik: number[] = [];
  const parcalar: [number, number, number][] = [[anaK, anaI, 0.82]];
  // komşu yabancı ülke kültürü
  const yabanci = komsu[i]!.map((j) => EYALET_ULKE[karaEyalet[j]!]!).filter((v) => v !== u);
  if (yabanci.length > 0) { const yu = yabanci[0]!; parcalar[0]![2] = 0.7; parcalar.push([ULKE[yu]!.kultur, ULKE[yu]!.inanc, 0.2]); }
  if (e === 2 || e === 0) { parcalar[0]![2] -= 0.08; parcalar.push([4, 1, 0.08]); } // dağlı azınlık
  if (u === 2 && r < 0.4) parcalar.push([anaK, 0, 0.05]); // azınlık inanç
  const topPay = parcalar.reduce((s, p) => s + p[2], 0);
  let dag = 0;
  for (const [k, inn, pay] of parcalar) {
    if (kimlikAnahtar.length >= 6) break;
    const ix = kimlikAnahtar.findIndex(([a, b]) => a === k && b === inn);
    const n = Math.floor((nufus * pay) / topPay);
    if (ix >= 0) kimlik[ix]! += n; else { kimlikAnahtar.push([k, inn]); kimlik.push(n); }
    dag += n;
  }
  while (kimlikAnahtar.length < NKIMLIK - 1) { kimlikAnahtar.push([-1, -1]); kimlik.push(0); }
  kimlikAnahtar.push([-1, -1]); kimlik.push(0); // diğer
  kimlik[0]! += nufus - dag;
  // Mevsim: kuzey ve dağ kışı sert
  const kuzey = y < 300 ? 1 : 0;
  const dagMi = arazi === 3 ? 1 : 0;
  const kis = [2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2].map((v) => Math.min(3, v + (v > 0 ? kuzey + dagMi : 0)));
  const camur = [0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 1, 0].map((v) => (arazi === 4 || arazi === 0) ? v : Math.max(0, v - 1));
  const anaYurt = [u];
  const iddia: number[] = [];
  bolgeler.push({
    kod: `R${String(i + 1).padStart(2, '0')}`, ad: ADLAR[i] ?? `Bölge ${i + 1}`, eyalet: e, sahip: u, arazi, yerlesim,
    merkez: [yuvarla(x), yuvarla(y)], poligon: poligonlar[i]!, komsu: komsu[i]!,
    alan, verim, isciYog: 420, sulama: yerlesim > 0 ? 1 : 0, altyapi: yerlesim === 2 ? 4 : yerlesim === 1 ? 3 : 2,
    demiryolu: yerlesim === 2 ? 2 : (u === 0 || u === 2) ? 1 : yerlesim === 1 ? 1 : 0,
    sivilF, askeriF, celik, komur, nufus: cells, kimlik, kimlikAnahtar, kis, camur, anaYurt, iddia, iklim: kuzey,
  });
  void x;
}

// Ülke gıda dengesi normalleştirme: hedef üretim/ihtiyaç oranı (MVK ithalatçı, KZL ihracatçı)
const HEDEF_ORAN = [1.06, 0.86, 1.03, 1.38];
for (let u = 0; u < 4; u++) {
  const bs = bolgeler.filter((b) => b.sahip === u);
  const ihtiyac = bs.reduce((s2, b) => s2 + b.nufus.reduce((a, c) => a + c, 0) / 30_000, 0);
  const uretim = bs.reduce((s2, b) => s2 + (b.alan * 2) / 30, 0);
  const k = (HEDEF_ORAN[u]! * ihtiyac) / uretim;
  for (const b of bs) b.alan = Math.max(15, Math.round(b.alan * k));
}

// İddialar: KZL, DMR'nin güney eyaleti (Hanlar Diyarı) sınır bölgelerine; DMR, MVK sınır bölgelerine
for (const b of bolgeler) {
  if (b.eyalet === 7 && b.komsu.some((j) => bolgeler[j]?.sahip === 3)) b.iddia.push(3);
  if (b.eyalet === 1 && b.komsu.some((j) => karaEyalet[j] === 2)) b.iddia.push(2);
  if (b.eyalet === 4 && b.komsu.some((j) => bolgeler[j]?.sahip === 3)) b.iddia.push(3);
}

// Başlangıç yasası (askerlik indeksi): AKD Sınırlı(1), MVK Sınırlı(1), DMR Kapsamlı(2), KZL Gönüllü(0) → nüfus Y'si buna göre düzeltilir
const ASKERLIK_ULKE = [1, 1, 2, 0];
const YLAW = [75_000, 125_000, 250_000, 500_000];
for (const b of bolgeler) {
  const u = b.sahip;
  const sx = b.nufus[9]!, y = b.nufus[10]!;
  const top = sx + y;
  const yy = Math.floor((top * YLAW[ASKERLIK_ULKE[u]!]!) / S);
  b.nufus[9] = top - yy; b.nufus[10] = yy;
}

const ulkeler = ULKE.map((U, u) => ({
  ...U, baskent: baskent[u]!,
  hazine: [9_000_000, 3_000_000, 12_000_000, 5_000_000][u]!,
  pg: [60_000, 40_000, 80_000, 50_000][u]!,
  vergi: [140_000, 120_000, 160_000, 110_000][u]!,
  askerlik: ASKERLIK_ULKE[u]!, ekonomi: [1, 0, 1, 0][u]!,
  huzur: [62_000, 66_000, 52_000, 64_000][u]!, mesru: [60_000, 64_000, 55_000, 60_000][u]!,
  tekler: [[], [], [], []][u] as string[],
}));

const eyaletler = eyBolge.map((bs, e) => ({ kod: `E${e + 1}`, ad: EYALET_AD[e]!, ulke: EYALET_ULKE[e]!, merkez: eyMerkez[e]!, bolgeler: bs }));

const g = (v: number) => v * 1000;
const gorus = [
  [g(100), g(76), g(34), g(52)],
  [g(82), g(100), g(28), g(50)],
  [g(30), g(24), g(100), g(42)],
  [g(55), g(48), g(30), g(100)],
];

// Başlangıç birlikleri: sınır bölgelerine dağılmış
function sinirBolgeleri(u: number, karsi: number[]): number[] {
  return bolgeler.map((b, i) => ({ b, i })).filter(({ b }) => b.sahip === u && b.komsu.some((j) => karsi.includes(bolgeler[j]!.sahip))).map(({ i }) => i);
}
const birlikler: Paket['birlikler'] = [];
const plan: [number, string, number, number[]][] = [
  [2, 'piyade', 10, [1, 3]], [2, 'suvari', 2, [1, 3]], [2, 'topcu', 2, [1, 3]],
  [0, 'piyade', 7, [2, 3]], [0, 'suvari', 1, [2, 3]], [0, 'topcu', 1, [2, 3]],
  [3, 'piyade', 6, [2, 0]], [3, 'suvari', 1, [2, 0]],
  [1, 'piyade', 3, [2]], [1, 'yedek', 1, [2]],
];
const sayac = [0, 0, 0, 0];
for (const [u, sab, n, karsi] of plan) {
  const sb = sinirBolgeleri(u, karsi);
  const havuz = sb.length > 0 ? sb : [baskent[u]!];
  for (let k = 0; k < n; k++) {
    sayac[u]!++;
    const bolge = sab === 'yedek' ? baskent[u]! : havuz[(k * 3 + sayac[u]!) % havuz.length]!;
    const ad = sab === 'piyade' ? `${sayac[u]}. Piyade Tümeni` : sab === 'suvari' ? `${sayac[u]}. Süvari Tümeni` : sab === 'topcu' ? `${sayac[u]}. Topçu Alayı` : `${sayac[u]}. Yedek Tümen`;
    birlikler.push({ ulke: u, sablon: sab, bolge, ad });
  }
}

// Hasat normalleştirme (11.1): beklenti tam 1,000000
const ham = HASAT_HAM, pp = HASAT_P;
let bek = 0; for (let i = 0; i < ham.length; i++) bek += ham[i]! * pp[i]!;
bek = bek / S; // 999.500
const hasat = ham.map((h) => Math.floor((h * S) / bek));
let bek2 = 0; for (let i = 0; i < hasat.length; i++) bek2 += hasat[i]! * pp[i]!;
// artığı en olası değere yaz: Σ h·p = S·S
let fark = S * S - bek2;
const enOlasi = 2;
hasat[enOlasi] = hasat[enOlasi]! + Math.floor(fark / pp[enOlasi]!);
fark = S * S - hasat.reduce((s, h, i) => s + h * pp[i]!, 0);
// kalan fark p=50.000'li uçlara dağıtılır
if (fark !== 0) {
  const adim = fark / pp[0]!;
  if (Number.isInteger(adim)) hasat[0] = hasat[0]! + adim;
  else uyarilar.push(`hasat beklentisi tam değil: fark=${fark}`);
}

// Sınır çizgileri: kara-kara (b ≥ 0) ve kıyı (b = -1); arayüz ülke/eyalet/cephe sınırlarını bundan çizer
const sinirCizgi: { a: number; b: number; p: number[] }[] = [];
for (let i = 0; i < NK; i++) {
  const h = hucreler[i]!;
  for (let k = 0; k < h.length; k++) {
    const A = h[k]!, B = h[(k + 1) % h.length]!;
    const j = A.lab;
    if (j >= 0 && j < NK && j < i) continue; // her kara kenarı bir kez
    const c = cizgi(i, j, A.p, B.p);
    const p: number[] = [];
    for (const q of c) p.push(yuvarla(q[0]), yuvarla(q[1]));
    sinirCizgi.push({ a: i, b: j >= 0 && j < NK ? j : -1, p });
  }
}
const denizPoligon: number[][] = [];
for (let i = NK; i < pts.length; i++) denizPoligon.push(poligonlar[i]!);

const bayraklar = Object.fromEntries(BAYRAK.map((b) => [b, b === 'istihbarat'])) as Paket['bayraklar'];

const paket: Paket = {
  kimlik: 'fixture-1a',
  surum: '1.4.0',
  senaryo: { ad: 'Dört Taht Krizi (1A kurgusal)', baslangic: { y: 1914, m: 6, d: 28 }, bitis: { y: 1925, m: 12, d: 31 } },
  tohum: 19140628,
  bayraklar,
  hasat, hasatP: [...pp],
  kultur: KULTUR, inanc: INANC,
  ulkeler, eyaletler, bolgeler, kenarlar, gorus,
  anlasmalar: [
    { tur: 'garanti', a: 0, b: 1 }, { tur: 'ticaret', a: 0, b: 1 }, { tur: 'ticaret', a: 0, b: 3 },
    { tur: 'ticaret', a: 1, b: 3 }, { tur: 'ticaret', a: 2, b: 3 }, { tur: 'saldirmazlik', a: 0, b: 3 },
  ],
  birlikler,
  harita: { gen: W, yuk: H, deniz: denizPoligon, cizgiler: sinirCizgi, denizAdlari: [{ ad: 'Kuzey Denizi', x: 560, y: 30 }, { ad: 'Güney Körfezi', x: 1080, y: 678 }, { ad: 'Batı Koyu', x: 60, y: 600 }] },
  uyarilar,
};

// Doğrulama
if (bolgeler.length !== 48) throw new Error(`bölge sayısı ${bolgeler.length}`);
for (const b of bolgeler) {
  const t = b.nufus.reduce((s, v) => s + v, 0), tk = b.kimlik.reduce((s, v) => s + v, 0);
  if (t !== tk) throw new Error(`${b.ad}: kimlik toplamı ${tk} ≠ nüfus ${t}`);
  if (b.komsu.length === 0) throw new Error(`${b.ad}: komşusuz`);
}
void kiyi;

const kok = join(dirname(fileURLToPath(import.meta.url)), '../../..');
mkdirSync(join(kok, 'data/derlenmis'), { recursive: true });
writeFileSync(join(kok, 'data/derlenmis/fixture-1a.json'), JSON.stringify(paket));
console.log(`fixture-1a: ${bolgeler.length} bölge, ${eyaletler.length} eyalet, ${ulkeler.length} devlet, ${kenarlar.length} kenar, ${birlikler.length} birlik; uyarı: ${uyarilar.length}`);
for (const u of ULKE.keys()) {
  const bs = bolgeler.filter((b) => b.sahip === u);
  const n = bs.reduce((s, b) => s + b.nufus.reduce((a, c) => a + c, 0), 0);
  console.log(`  ${ULKE[u]!.kod}: ${bs.length} bölge, nüfus ${n.toLocaleString('tr-TR')}, sivil F ${bs.reduce((s, b) => s + b.sivilF, 0)}, askerî F ${bs.reduce((s, b) => s + b.askeriF, 0)}`);
}
