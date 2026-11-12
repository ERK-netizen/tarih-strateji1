// Bölüm 6.6: kanonik serileştirme (küçük-endian, şema sırası) ve hash. Görsel durum ve önbellek dışarıda kalır.
import type { World } from '../state/world.ts';
import { yeniDunya, BAKAN_VARSAYILAN, partiBaslat, kuvvetBaslat, IDDIA_MAX, H_EYALET, T_KISI } from '../state/world.ts';
import { MAL, NHUCRE, NKIMLIK, ST } from '../catalog.ts';
import { largestRemainder } from '../num/index.ts';
import { kentYuvaUyumla } from '../systems/gelisim.ts';
import { kimlikEsitle } from '../systems/nufus.ts';
import { komutanBaslat, komutanDagit } from '../systems/komutan.ts';
import type { Table } from '../state/table.ts';
import type { Paket } from '../paket.ts';
import { usTersaneKur } from '../systems/us.ts';
import { hashV1, hashText } from '../hash/index.ts';

export const SEMA_SURUM = 9;
/** Şema 9'da eklenen kolonlar (komutanlar). */
const YENI9: Record<string, string[]> = { birlik: ['komutan'] };
/** Şema 6'da eklenen kolonlar: 5 sürümlü kayıt okunurken atlanır, varsayılanla doldurulur. */
const YENI6: Record<string, string[]> = {
  ulke: ['bakan', 'bazBolge', 'bazYasam', 'bazTek', 'bazNufus', 'savasGunu', 'tekSay', 'maas'],
  birlik: ['elle'],
};
/** Şema 5'te teknoloji yuvası sayısı (dönem başına 12). */
/** Şema 7'de eklenen kolonlar: eski kayıtta yoktur, varsayılanla doldurulur. */
const YENI8: Record<string, string[]> = { bolge: ['havaUs', 'tersane'], ulke: ['donBolge'] };
const YENI7: Record<string, string[]> = {
  bolge: ['kent', 'maden', 'demPol', 'demKim'],
  ulke: ['gs0', 'gs1', 'gs2', 'gs3', 'gs4', 'gHasar', 'donGorev', 'h0', 'h1', 'h2', 'hHasar', 'havaGorev', 'havaBolge', 'abluka', 'akinKayip', 'denizK',
    'rejim', 'parti0', 'parti1', 'parti2', 'parti3', 'parti4', 'iktidar', 'secim', 'gecis', 'nufusPol', 'zulum', 'model', 'tarife', 'subTarim', 'subSanayi', 'tarimOdak', 'petrol', 'petrolDun', 'petrolIht'],
  proje: ['alt', 'adet'],
  birlik: ['t6', 't7', 't8', 't9', 't10', 't11'],
};
const NYUVA6 = 3, NMAL6 = 4;
const NTEK5 = 12;
const MAGIC = 0x314b5354; // 'TSK1'

class Yazici {
  buf = new ArrayBuffer(1 << 16);
  dv = new DataView(this.buf);
  n = 0;
  private yer(k: number) {
    if (this.n + k <= this.buf.byteLength) return;
    let c = this.buf.byteLength * 2;
    while (c < this.n + k) c *= 2;
    const nb = new ArrayBuffer(c);
    new Uint8Array(nb).set(new Uint8Array(this.buf, 0, this.n));
    this.buf = nb; this.dv = new DataView(nb);
  }
  u32(v: number) { this.yer(4); this.dv.setUint32(this.n, v >>> 0, true); this.n += 4; }
  f64(v: number) {
    if (!Number.isSafeInteger(v)) throw new Error(`kanonik olmayan sayı: ${v}`);
    this.yer(8); this.dv.setFloat64(this.n, v === 0 ? 0 : v, true); this.n += 8;
  }
  arr(a: ArrayLike<number>) { this.u32(a.length); for (let i = 0; i < a.length; i++) this.f64(a[i]!); }
  /** Dizi: uzunluk, kip; seyrekse (indeks, değer) çiftleri, yoğunsa 8 bayt hizalı ham değerler. */
  arrS(a: ArrayLike<number>) {
    const n = a.length;
    let k = 0, eksiSifir = false, guvenli = true;
    const tam = !(a instanceof Float64Array);
    for (let i = 0; i < n; i++) {
      const v = a[i]!;
      if (v !== 0) { k++; if (!tam && !Number.isSafeInteger(v)) guvenli = false; } else if (1 / v < 0) eksiSifir = true;
    }
    if (!guvenli) throw new Error('kanonik olmayan sayı dizide');
    this.u32(n);
    if (k * 12 > n * 8 && !eksiSifir) {
      this.u32(0xffffffff);
      const pad = (8 - (this.n % 8)) % 8;
      this.yer(pad + n * 8);
      for (let i = 0; i < pad; i++) this.dv.setUint8(this.n + i, 0);
      this.n += pad;
      const f = new Float64Array(this.buf, this.n, n);
      if (a instanceof Float64Array) f.set(a); else for (let i = 0; i < n; i++) f[i] = a[i]!;
      this.n += n * 8;
      return;
    }
    this.u32(k);
    for (let i = 0; i < n; i++) if (a[i] !== 0) { this.u32(i); this.f64(a[i]!); }
  }
  str(s: string) { const b = new TextEncoder().encode(s); this.u32(b.length); this.yer(b.length); new Uint8Array(this.buf, this.n, b.length).set(b); this.n += b.length; }
  etiket(s: string) { this.str(s); }
  bytes(): Uint8Array { return new Uint8Array(this.buf, 0, this.n).slice(); }
}

class Okuyucu {
  dv: DataView; n = 0; u8: Uint8Array;
  constructor(b: Uint8Array) { this.u8 = b; this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength); }
  u32() { const v = this.dv.getUint32(this.n, true); this.n += 4; return v; }
  f64() { const v = this.dv.getFloat64(this.n, true); this.n += 8; return v; }
  arr(): number[] { const k = this.u32(); const a: number[] = []; for (let i = 0; i < k; i++) a.push(this.f64()); return a; }
  arrS(): ArrayLike<number> {
    const n = this.u32(), k = this.u32();
    if (k === 0xffffffff) {
      this.n += (8 - (this.n % 8)) % 8;
      const off = this.u8.byteOffset + this.n;
      let a: Float64Array;
      if (off % 8 === 0) a = new Float64Array(this.u8.buffer.slice(off, off + n * 8));
      else { a = new Float64Array(n); for (let i = 0; i < n; i++) a[i] = this.dv.getFloat64(this.n + i * 8, true); }
      this.n += n * 8;
      return a;
    }
    const a: number[] = new Array<number>(n).fill(0);
    for (let j = 0; j < k; j++) { const i = this.u32(); a[i] = this.f64(); }
    return a;
  }
  str() { const k = this.u32(); const s = new TextDecoder().decode(this.u8.subarray(this.n, this.n + k)); this.n += k; return s; }
}

/** Anahtar sırasından bağımsız kanonik JSON. */
export function kanonikJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(kanonikJson).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    const keys = Object.keys(v as object).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${kanonikJson((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function diziler(w: World): [string, ArrayLike<number>][] {
  return [['pop', w.pop], ['kim', w.kim], ['ekip', w.ekip], ['tekIlerleme', w.tekIlerleme], ['tekBitti', w.tekBitti], ['tekMaliyet', w.tekMaliyet], ['arastirma', w.arastirma], ['gorus', w.gorus], ['tutum', w.tutum], ['tutumKilit', w.tutumKilit], ['kokenDefter', w.kokenDefter], ['esir', w.esir], ['fiyat', w.fiyat], ['pazarHacim', w.pazarHacim], ['savasTaraf', w.savasTaraf], ['iddia', w.iddia]];
}

function tablolar(w: World, sv = SEMA_SURUM): Table[] {
  const l = [w.R, w.E, w.C, w.U, w.T, w.AN, w.SV, w.GR, w.HT, w.PR, w.YR, w.KE, w.TK, w.SP, w.OL] as unknown as Table[];
  if (sv >= 6) l.push(w.MOD as unknown as Table);
  if (sv >= 9) { l.push(w.KM as unknown as Table); l.push(w.IR as unknown as Table); }
  return l;
}

function tabloYaz(y: Yazici, t: Table): void {
  y.etiket(t.name);
  y.u32(t.hw);
  y.arr([...t.free].sort((a, b) => a - b));
  y.arrS(t.gen.subarray(0, t.hw));
  y.arrS(t.alive.subarray(0, t.hw));
  for (const [k] of t.defs) { y.etiket(k); y.arrS((t.ci[k] as Float64Array).subarray(0, t.hw)); }
}
function tabloOku(o: Okuyucu, t: Table, sv = SEMA_SURUM): void {
  const atla = new Set<string>([...(sv < 6 ? YENI6[t.name] ?? [] : []), ...(sv < 7 ? YENI7[t.name] ?? [] : []), ...(sv < 8 ? YENI8[t.name] ?? [] : []), ...(sv < 9 ? YENI9[t.name] ?? [] : [])]);
  const ad = o.str();
  if (ad !== t.name) throw new Error(`tablo sırası bozuk: ${ad} ≠ ${t.name}`);
  const hw = o.u32();
  t.reserve(hw);
  t.hw = hw;
  t.free = o.arr();
  const gen = o.arrS(), alive = o.arrS();
  for (let i = 0; i < hw; i++) { t.gen[i] = gen[i]!; t.alive[i] = alive[i]!; }
  for (const [k] of t.defs) {
    if (atla.has(k)) continue;
    const kk = o.str();
    if (kk !== k) throw new Error(`kolon sırası bozuk: ${kk}`);
    const a = o.arrS();
    const col = t.ci[k]!;
    if (a.length !== hw) throw new Error(`kolon uzunluğu bozuk: ${k}`);
    for (let i = 0; i < hw; i++) (col as Float64Array)[i] = a[i]!;
  }
}

export function serilestir(w: World): Uint8Array {
  const y = new Yazici();
  y.u32(MAGIC); y.u32(SEMA_SURUM);
  y.str(w.pkg.kimlik); y.str(w.pkg.surum);
  y.f64(w.gun); y.f64(w.surum); y.f64(w.tohum); y.f64(w.oyuncu); y.f64(w.mod); y.f64(w.emirSira); y.f64(w.rotaEpoch);
  y.arr([w.artik.dogum, w.artik.olum, w.artik.kohort]);
  y.arr([w.sayac.dogum, w.sayac.dogalOlum, w.sayac.askerOlum, w.sayac.ekOlum]);
  y.arr(w.bayrak); y.arr(w.hasatKademe);
  for (const t of tablolar(w)) tabloYaz(y, t);
  for (const [ad, a] of diziler(w)) { y.etiket(ad); y.arrS(a); }
  y.str(kanonikJson(w.teklifBolge));
  y.u32(w.birlikAd.length); for (const s of w.birlikAd) y.str(s);
  y.str(kanonikJson(w.kuyruk));
  y.str(kanonikJson(w.olayBayrak));
  y.u32(w.komutanAd.length); for (const s of w.komutanAd) y.str(s);
  return y.bytes();
}

export function dunyaHash(w: World): string { return hashV1(serilestir(w)); }
export function anlatiHash(w: World): string { return hashText(kanonikJson(w.anlati)); }

/** Kaydın hangi pakete ait olduğunu (tam çözmeden) okur; kayıt değilse null. */
export function kayitPaketi(bytes: Uint8Array): { kimlik: string; surum: string } | null {
  try {
    const o = new Okuyucu(bytes);
    if (o.u32() !== MAGIC) return null;
    o.u32();
    return { kimlik: o.str(), surum: o.str() };
  } catch { return null; }
}

export function coz(bytes: Uint8Array, pkg: Paket): World {
  // harita göçü: paket aynı senaryonun eski haritasıyla (pkg.goc.surum) kaydedilmişse bölgeler yeni haritaya taşınır
  const k = kayitPaketi(bytes);
  if (k && k.kimlik === pkg.kimlik && k.surum !== pkg.surum && pkg.goc && k.surum === pkg.goc.surum) return haritaGoc(bytes, pkg);
  return cozIc(bytes, pkg, false);
}

function cozIc(bytes: Uint8Array, pkg: Paket, paketSerbest: boolean): World {
  const o = new Okuyucu(bytes);
  if (o.u32() !== MAGIC) throw new Error('kayıt dosyası değil');
  const sv = o.u32();
  if (sv !== SEMA_SURUM && sv !== 5 && sv !== 6 && sv !== 7 && sv !== 8) throw new Error(`şema sürümü uyumsuz: ${sv}`);
  const pid = o.str(), psur = o.str();
  if (pid !== pkg.kimlik || (!paketSerbest && psur !== pkg.surum)) throw new Error(`paket uyumsuz: ${pid}@${psur}`);
  const gun = o.f64(), surum = o.f64(), tohum = o.f64(), oyuncu = o.f64(), mod = o.f64(), emirSira = o.f64(), rotaEpoch = o.f64();
  const w = yeniDunyaBos(pkg, oyuncu);
  w.gun = gun; w.surum = surum; w.tohum = tohum; w.mod = mod; w.emirSira = emirSira; w.rotaEpoch = rotaEpoch;
  const ar = o.arr(); w.artik = { dogum: ar[0]!, olum: ar[1]!, kohort: ar[2]! };
  const sy = o.arr(); w.sayac = { dogum: sy[0]!, dogalOlum: sy[1]!, askerOlum: sy[2]!, ekOlum: sy[3]! };
  w.bayrak.set(o.arr()); w.hasatKademe.set(o.arr());
  for (const t of tablolar(w, sv)) tabloOku(o, t, sv);
  const tekDizi = new Set(['tekIlerleme', 'tekBitti', 'tekMaliyet']);
  for (const [ad, a] of diziler(w)) {
    const k = o.str();
    if (k !== ad) throw new Error(`dizi sırası bozuk: ${k} ≠ ${ad}`);
    const v = o.arrS();
    if (sv < 6 && tekDizi.has(ad)) {
      // şema 5: ülke başına 12 teknoloji; ilk 12 yuva aynı kodlarla korunur
      const hedef = a as unknown as Float64Array;
      const nt = hedef.length / w.nC;
      hedef.fill(0);
      for (let c = 0; c < w.nC; c++) for (let t = 0; t < NTEK5; t++) hedef[c * nt + t] = v[c * NTEK5 + t]!;
    } else if (sv < 7 && ad === 'arastirma') {
      // şema 6: ülke başına 3 araştırma yuvası → NYUVA
      const hedef = a as unknown as Int32Array;
      hedef.fill(-1);
      for (let c = 0; c < w.nC; c++) for (let k = 0; k < NYUVA6; k++) hedef[c * (hedef.length / w.nC) + k] = v[c * NYUVA6 + k]!;
    } else if (sv < 7 && (ad === 'fiyat' || ad === 'pazarHacim')) {
      // şema 6: 4 mal → petrol eklendi
      const hedef = a as unknown as Float64Array;
      for (let m = 0; m < NMAL6; m++) hedef[m] = v[m]!;
    } else (a as unknown as { set(x: ArrayLike<number>): void }).set(v);
  }
  w.teklifBolge = JSON.parse(o.str()) as Record<string, number[]>;
  w.diploSurum++;
  const nb = o.u32(); w.birlikAd = []; for (let i = 0; i < nb; i++) w.birlikAd.push(o.str());
  w.kuyruk = JSON.parse(o.str());
  if (sv >= 6) w.olayBayrak = JSON.parse(o.str()) as string[];
  else gocDoldur5(w);
  if (sv < 7) gocDoldur6(w);
  if (sv < 8) usTersaneKur(w);
  if (sv >= 9) { const nk = o.u32(); w.komutanAd = []; for (let i = 0; i < nk; i++) w.komutanAd.push(o.str()); }
  else { komutanBaslat(w); for (let c = 0; c < w.nC; c++) komutanDagit(w, c); } // şema 8 → 9: kadro senaryo kuralıyla kurulur
  return w;
}

/** Şema 5 → 6 göçü: yeni kolonların varsayılanları (bakanlar, hedef tabanları). */
function gocDoldur5(w: World): void {
  const C = w.C.c;
  w.olayBayrak = [];
  for (let c = 0; c < w.nC; c++) {
    C.bakan[c] = c === w.oyuncu && w.mod !== 2 ? BAKAN_VARSAYILAN : 0;
    let n = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) n++;
    C.bazBolge[c] = n;
    let t = 0; for (let k = 0; k < NTEK5; k++) t += w.tekBitti[c * (w.tekBitti.length / w.nC) + k]!;
    C.tekSay[c] = t; C.bazTek[c] = t;
  }
}

/** Şema 6 → 7 göçü: rejim, partiler, donanma/hava kuvvetleri, kent düzeyleri ve ekonomi ayarları senaryo başlangıcından. */
function gocDoldur6(w: World): void {
  const C = w.C.c, R = w.R.c;
  for (let c = 0; c < w.nC; c++) {
    const u = w.pkg.ulkeler[c]!;
    C.rejim[c] = u.yonetim; C.model[c] = 1; C.tarife[c] = 100_000; C.petrol[c] = 20_000; C.havaBolge[c] = -1;
    partiBaslat(w, c);
    kuvvetBaslat(w, c);
  }
  w.pkg.bolgeler.forEach((b, r) => { R.kent[r] = Math.min(6, 1 + b.yerlesim + Math.floor((R.sivilF[r]! + R.askeriF[r]!) / 3)); });
  MAL.forEach((m, i) => { if (i >= NMAL6) w.fiyat[i] = m.p0; });
}

/** Boş dünya iskeleti (başlangıç birlikleri ve hatlar olmadan) — çözümleme için. */
function yeniDunyaBos(pkg: Paket, oyuncu: number): World {
  const bos: Paket = { ...pkg, birlikler: [], anlasmalar: [] };
  const w = yeniDunya(bos, oyuncu);
  w.pkg = pkg;
  // hatları temizle (çözümleme tablodan yükler)
  for (const t of [w.HT, w.U, w.AN, w.MOD, w.KM, w.IR]) { t.hw = 0; t.free = []; t.alive.fill(0); t.gen.fill(0); }
  w.birlikAd = []; w.komutanAd = [];
  return w;
}

// ---------- Harita göçü (v1.6, PR-05 / V16-T61) ----------
// Yeni haritada her bölge eski bir bölgenin (ata) alt bölümüdür; eski bölgenin adını taşıyan alt bölüm "tohum"dur.
// Kayıt, yeni paketten türetilen eski biçimli bir iskeletle okunur, sonra yeni dünyaya aktarılır:
//  - nüfus, iş gücü, fabrika, stok gibi toplanabilir büyüklükler alt bölümlere başlangıç nüfusu oranında,
//    en büyük artık yöntemiyle bölünür (toplam tam korunur);
//  - sahiplik, kontrol, altyapı gibi durum değerleri bütün alt bölümlere kopyalanır;
//  - birlikler, projeler, üsler, asker kökenleri ve askerî statüdeki nüfus tohum bölgeye taşınır.
/** Alt bölümlere bölünen bölge sütunları. */
const GOC_BOL = new Set(['sivilF', 'askeriF', 'isTarim', 'isSanayi', 'isHizmet', 'isGucu', 'issiz', 'yerelGida', 'gidaArtik', 'uretimDun', 'vergiDun', 'vaDun']);
/** Yalnız tohum bölgeye geçen bölge sütunları (tekil tesisler; şehir düzeyi alt bölümlerde paket başlangıcından gelir). */
const GOC_TOHUM = new Set(['valilik', 'havaUs', 'tersane', 'maden', 'kent']);
const GOC_BOL_E = new Set(['gida', 'ihtiyacAy', 'karsilananAy', 'ihtiyacDun', 'karsilananDun', 'artik']);

function eskiPaket(pkg: Paket): { p: Paket; tohum: number[]; aile: number[][] } {
  const g = pkg.goc!;
  let n1 = 0;
  for (const a of g.ata) n1 = Math.max(n1, a + 1);
  const tohum = new Array<number>(n1).fill(-1);
  const aile: number[][] = Array.from({ length: n1 }, () => []);
  g.ata.forEach((a, r) => { aile[a]!.push(r); if (g.tohum[r]) tohum[a] = r; });
  for (let i = 0; i < n1; i++) if (tohum[i]! < 0) throw new Error(`harita göçü: eski bölge #${i} yeni haritada yok`);
  const bolgeler = tohum.map((r, i) => ({ ...pkg.bolgeler[r]!, eyalet: i, komsu: [] as number[] }));
  const p: Paket = {
    ...pkg, surum: g.surum, goc: undefined, bolgeler, kenarlar: [], birlikler: [], anlasmalar: [],
    eyaletler: bolgeler.map((b, i) => ({ kod: `E${i + 1}`, ad: b.ad, ulke: b.sahip, merkez: i, bolgeler: [i] })),
    ulkeler: pkg.ulkeler.map((u) => ({ ...u, baskent: g.ata[u.baskent]! })),
  };
  return { p, tohum, aile };
}

function haritaGoc(bytes: Uint8Array, pkg: Paket): World {
  if (pkg.eyaletler.length !== pkg.bolgeler.length) throw new Error('harita göçü yalnız eyalet = bölge paketlerinde tanımlıdır');
  const { p, tohum, aile } = eskiPaket(pkg);
  const e = cozIc(bytes, p, true);
  const w = yeniDunyaBos(pkg, e.oyuncu);
  const n1 = tohum.length, ata = pkg.goc!.ata;
  w.gun = e.gun; w.surum = e.surum; w.tohum = e.tohum; w.mod = e.mod; w.emirSira = e.emirSira; w.rotaEpoch = e.rotaEpoch + 1;
  w.artik = e.artik; w.sayac = e.sayac; w.bayrak.set(e.bayrak); w.hasatKademe.set(e.hasatKademe);
  // boyutu değişmeyen tablolar ve diziler olduğu gibi devralınır
  w.C = e.C; w.U = e.U; w.T = e.T; w.AN = e.AN; w.SV = e.SV; w.GR = e.GR; w.HT = e.HT; w.PR = e.PR; w.YR = e.YR; w.KE = e.KE; w.TK = e.TK; w.SP = e.SP; w.OL = e.OL; w.MOD = e.MOD; w.KM = e.KM; w.komutanAd = e.komutanAd; w.IR = e.IR;
  w.ekip = e.ekip; w.tekIlerleme = e.tekIlerleme; w.tekBitti = e.tekBitti; w.tekMaliyet = e.tekMaliyet; w.arastirma = e.arastirma;
  w.gorus = e.gorus; w.tutum = e.tutum; w.tutumKilit = e.tutumKilit; w.esir = e.esir; w.fiyat = e.fiyat; w.pazarHacim = e.pazarHacim; w.savasTaraf = e.savasTaraf;
  w.birlikAd = e.birlikAd; w.olayBayrak = e.olayBayrak;
  // bekleyen kuyruk emirleri eski bölge numaraları taşır: düşürülür (oyuncu yeniden verir)
  w.kuyruk = [];
  // bölge numarası taşıyan alanlar tohum bölgeye çevrilir
  const yeni = (i: number): number => (i >= 0 && i < n1 ? tohum[i]! : i);
  const sutun = (t: Table, k: string) => (t.ci as Record<string, Float64Array | Int32Array>)[k]!;
  for (const u of w.U.rows()) {
    for (const k of ['bolge', 'hedef', 'sonraki']) { const c = sutun(w.U as unknown as Table, k); c[u] = yeni(c[u]!); }
    for (let k = 0; k < 8; k++) { const c = sutun(w.U as unknown as Table, `ok${k}`); if (c[u]! > 0) c[u] = yeni(c[u]! - 1) + 1; }
  }
  for (const s of w.T.rows()) {
    const T = w.T.c;
    T.konum[s] = yeni(T.konum[s]!);
    if (T.hedefTip[s] === H_EYALET) T.hedefId[s] = yeni(T.hedefId[s]!);
    if (T.tur[s] === T_KISI) T.alt[s] = yeni(T.alt[s]!);
  }
  for (const s of w.PR.rows()) w.PR.c.bolge[s] = yeni(w.PR.c.bolge[s]!);
  for (const s of w.YR.rows()) w.YR.c.eyalet[s] = yeni(w.YR.c.eyalet[s]!);
  for (let c = 0; c < w.nC; c++) { w.C.c.donBolge[c] = yeni(w.C.c.donBolge[c]!); w.C.c.havaBolge[c] = yeni(w.C.c.havaBolge[c]!); }
  // bölge ve eyalet sütunları
  const agirlik = aile.map((ch) => ch.map((r) => { let n = 0; for (const x of pkg.bolgeler[r]!.nufus) n += x; return Math.max(1, n); }));
  const bol = (toplam: number, i: number): number[] => {
    const ch = aile[i]!;
    // negatif ya da tamsayı olmayan değer bölünmez: tohuma yazılır
    if (toplam <= 0 || !Number.isSafeInteger(toplam)) return ch.map((r) => (r === tohum[i] ? toplam : 0));
    return largestRemainder(toplam, agirlik[i]!);
  };
  for (const [k] of w.R.defs) {
    const eski = sutun(e.R as unknown as Table, k), hedef = sutun(w.R as unknown as Table, k);
    for (let i = 0; i < n1; i++) {
      const ch = aile[i]!;
      if (GOC_BOL.has(k)) { const pay = bol(eski[i]!, i); ch.forEach((r, j) => { hedef[r] = pay[j]!; }); }
      else if (GOC_TOHUM.has(k)) hedef[tohum[i]!] = eski[i]!;
      else for (const r of ch) hedef[r] = eski[i]!;
    }
  }
  for (const [k] of w.E.defs) {
    const eski = sutun(e.E as unknown as Table, k), hedef = sutun(w.E as unknown as Table, k);
    for (let i = 0; i < n1; i++) {
      const ch = aile[i]!;
      if (GOC_BOL_E.has(k)) { const pay = bol(eski[i]!, i); ch.forEach((r, j) => { hedef[r] = pay[j]!; }); }
      else for (const r of ch) hedef[r] = eski[i]!;
    }
  }
  // nüfus: sivil hücreler bölünür; askerî statüler (A, W, P) köken muhasebesiyle birlikte tohumda kalır
  w.pop.fill(0); w.kim.fill(0);
  for (let i = 0; i < n1; i++) {
    const ch = aile[i]!;
    for (let h = 0; h < NHUCRE; h++) {
      const v = e.pop[i * NHUCRE + h]!;
      const st = h % 8;
      if (st === ST.A || st === ST.W || st === ST.P) w.pop[tohum[i]! * NHUCRE + h] = v;
      else { const pay = bol(v, i); ch.forEach((r, j) => { w.pop[r * NHUCRE + h] = pay[j]!; }); }
    }
    // kimlik: her kimlik hücresi alt bölümlerin yeni nüfusu oranında; sonra bölge toplamına eşitlenir
    const kap = ch.map((r) => { let n = 0; for (let h = 0; h < NHUCRE; h++) n += w.pop[r * NHUCRE + h]!; return n; });
    for (let q = 0; q < NKIMLIK; q++) {
      const pay = largestRemainder(e.kim[i * NKIMLIK + q]!, kap);
      ch.forEach((r, j) => { w.kim[r * NKIMLIK + q] = pay[j]!; });
    }
    for (const r of ch) kimlikEsitle(w, r);
  }
  // ulusal köken defteri ve iddialar
  w.kokenDefter.fill(0);
  for (let c = 0; c < w.nC; c++) for (let i = 0; i < n1; i++) w.kokenDefter[c * w.nE + tohum[i]!] = e.kokenDefter[c * n1 + i]!;
  for (let r = 0; r < w.nR; r++) for (let q = 0; q < IDDIA_MAX; q++) w.iddia[r * IDDIA_MAX + q] = e.iddia[ata[r]! * IDDIA_MAX + q]!;
  // barış tekliflerindeki bölge listeleri: eski bölge → bütün alt bölümleri
  w.teklifBolge = {};
  for (const [kimlik, l] of Object.entries(e.teklifBolge)) w.teklifBolge[kimlik] = [...new Set(l.flatMap((i) => aile[i] ?? []))].sort((a, b) => a - b);
  kentYuvaUyumla(w);
  w.diploSurum++; w.savasSurum++; w.anSurum++;
  return w;
}
