// Bölüm 6.6: kanonik serileştirme (küçük-endian, şema sırası) ve hash. Görsel durum ve önbellek dışarıda kalır.
import type { World } from '../state/world.ts';
import { yeniDunya } from '../state/world.ts';
import type { Table } from '../state/table.ts';
import type { Paket } from '../paket.ts';
import { hashV1, hashText } from '../hash/index.ts';

export const SEMA_SURUM = 5;
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

function tablolar(w: World): Table[] {
  return [w.R, w.E, w.C, w.U, w.T, w.AN, w.SV, w.GR, w.HT, w.PR, w.YR, w.KE, w.TK, w.SP, w.OL] as unknown as Table[];
}

function tabloYaz(y: Yazici, t: Table): void {
  y.etiket(t.name);
  y.u32(t.hw);
  y.arr([...t.free].sort((a, b) => a - b));
  y.arrS(t.gen.subarray(0, t.hw));
  y.arrS(t.alive.subarray(0, t.hw));
  for (const [k] of t.defs) { y.etiket(k); y.arrS((t.ci[k] as Float64Array).subarray(0, t.hw)); }
}
function tabloOku(o: Okuyucu, t: Table): void {
  const ad = o.str();
  if (ad !== t.name) throw new Error(`tablo sırası bozuk: ${ad} ≠ ${t.name}`);
  const hw = o.u32();
  t.reserve(hw);
  t.hw = hw;
  t.free = o.arr();
  const gen = o.arrS(), alive = o.arrS();
  for (let i = 0; i < hw; i++) { t.gen[i] = gen[i]!; t.alive[i] = alive[i]!; }
  for (const [k] of t.defs) {
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
  const o = new Okuyucu(bytes);
  if (o.u32() !== MAGIC) throw new Error('kayıt dosyası değil');
  const sv = o.u32();
  if (sv !== SEMA_SURUM) throw new Error(`şema sürümü uyumsuz: ${sv}`);
  const pid = o.str(), psur = o.str();
  if (pid !== pkg.kimlik || psur !== pkg.surum) throw new Error(`paket uyumsuz: ${pid}@${psur}`);
  const gun = o.f64(), surum = o.f64(), tohum = o.f64(), oyuncu = o.f64(), mod = o.f64(), emirSira = o.f64(), rotaEpoch = o.f64();
  const w = yeniDunyaBos(pkg, oyuncu);
  w.gun = gun; w.surum = surum; w.tohum = tohum; w.mod = mod; w.emirSira = emirSira; w.rotaEpoch = rotaEpoch;
  const ar = o.arr(); w.artik = { dogum: ar[0]!, olum: ar[1]!, kohort: ar[2]! };
  const sy = o.arr(); w.sayac = { dogum: sy[0]!, dogalOlum: sy[1]!, askerOlum: sy[2]!, ekOlum: sy[3]! };
  w.bayrak.set(o.arr()); w.hasatKademe.set(o.arr());
  for (const t of tablolar(w)) tabloOku(o, t);
  for (const [ad, a] of diziler(w)) {
    const k = o.str();
    if (k !== ad) throw new Error(`dizi sırası bozuk: ${k} ≠ ${ad}`);
    (a as unknown as { set(x: ArrayLike<number>): void }).set(o.arrS());
  }
  w.teklifBolge = JSON.parse(o.str()) as Record<string, number[]>;
  w.diploSurum++;
  const nb = o.u32(); w.birlikAd = []; for (let i = 0; i < nb; i++) w.birlikAd.push(o.str());
  w.kuyruk = JSON.parse(o.str());
  return w;
}

/** Boş dünya iskeleti (başlangıç birlikleri ve hatlar olmadan) — çözümleme için. */
function yeniDunyaBos(pkg: Paket, oyuncu: number): World {
  const bos: Paket = { ...pkg, birlikler: [], anlasmalar: [] };
  const w = yeniDunya(bos, oyuncu);
  w.pkg = pkg;
  // hatları temizle (çözümleme tablodan yükler)
  for (const t of [w.HT, w.U, w.AN]) { t.hw = 0; t.free = []; t.alive.fill(0); t.gen.fill(0); }
  w.birlikAd = [];
  return w;
}
