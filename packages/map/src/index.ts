// Harita çizicisi (Canvas 2D). Gerçek dünya senaryolarında geometri ortak `dunya-geo.json` dosyasından gelir
// (Natural Earth kökenli bölge çokgenleri, sınır/kıyı çizgileri, deniz adları); 1A fixture'ı kendi geometrisini taşır.
// Sahiplik değişimi yeniden karo üretmez; yalnız dolgu, sınır ve etiketler yeniden hesaplanır.
import type { Paket } from '@ts/engine';

export type HaritaModu = 'siyasi' | 'kontrol' | 'gida' | 'nufus' | 'iliski' | 'altyapi';

export interface HaritaBolge { k: number; s: number; kontrol: number; itaat: number; direnis: number; cephe: number; isyan: number; guvence: number; demiryolu: number; altyapi: number; nufus: number; fabrika: number; uretim: number; istihbarat: number }
export interface HaritaBirim { id: number; ulke: number; bolge: number; ad: string; sablon: number; kisi: number; kisiHedef: number; org: number; guc: number; hedef: number; sonraki: number; ilerleme: number; muharebe: number; egitim: number; durus: number; ikmal: number }
export interface HaritaYabanci { bolge: number; ulke: number; birlik: number; gucAlt: number; gucUst: number; kisiAlt: number; kisiUst: number; kesin: boolean }
export interface HaritaVeri { bolgeler: HaritaBolge[]; birimler: HaritaBirim[]; yabanci: HaritaYabanci[]; savaslar: number[][]; ulkeler: { kisa: string; renk: string }[] }
export interface Geo { gen: number; yuk: number; poligon: (number[] | number[][])[]; denizler: { ad: string; x: number; y: number }[]; cizgiler: { a: number; b: number; p: number[] }[] }
export interface Bosluk { sol: number; ust: number; sag: number; alt: number }

interface Tema { deniz: string; denizCizgi: string; kiyi: string; etiket: string; etiketGolge: string; sinir: string; eyalet: string; cephe: string; secim: string; vurgu: string; kotu: string; iyi: string; orta: string; sis: string; kagit: string; murekkep: string }

function hex(h: string): [number, number, number] {
  const x = h.replace('#', '');
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}
export function karis(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}
function rampa(t: number, kotu: string, orta: string, iyi: string): string {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? karis(kotu, orta, c * 2) : karis(orta, iyi, (c - 0.5) * 2);
}
/** Renk parlaklığı (0–1): yazı ve simge rengi seçimi için. */
function parlak(h: string): number { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

interface Etiket { x: number; y: number; metin: string; alan: number; gen: number; yuk: number; ulke: number }
type Kutu = { tur: 'yigin' | 'yabanci'; bolge: number; x: number; y: number; w: number; h: number };

export class HaritaCizici {
  private ctx: CanvasRenderingContext2D;
  private yollar: Path2D[] = [];
  private kutuB: [number, number, number, number][] = []; // bölgenin ana kütlesinin sınır kutusu (dünya)
  private kutuT: [number, number, number, number][] = []; // uzak adalar dahil tüm kutu (görünürlük, dokunma)
  private alanB: number[] = [];
  private denizYol: Path2D[] = [];
  private cizgiYol: { a: number; b: number; yol: Path2D }[] = [];
  private merkez: [number, number][];
  private denizAdlari: { ad: string; x: number; y: number }[];
  private W: number; private H: number;
  private desen = new Map<string, CanvasPattern>();
  private simgeYol = new Map<string, Path2D>();
  private genislik = new Map<string, number>();
  private _veri: HaritaVeri | null = null;
  private ulkeEtiket: Etiket[] = [];
  private etiketKirli = true;
  private baskentler: number[] = [];
  mod: HaritaModu = 'siyasi';
  oyuncu = 0;
  gorus: number[] = []; // ülkelerin oyuncuya görüşü (×1000)
  seciliBolge = -1;
  seciliBirlik = new Set<number>();
  hedefIsaret = -1;
  /** Seçilebilir bölgeler (haritadan seçim kipi); boşsa vurgulanmaz. */
  uygunBolge: ((r: number) => boolean) | null = null;
  /** Şablon → simge adı (dönem görselleri). */
  sablonSimge: string[] = [];
  yabanciSimge = '';
  bosluk: Bosluk = { sol: 0, ust: 0, sag: 0, alt: 0 };
  // kamera
  s = 1; ox = 0; oy = 0;
  private kirli = true;
  private bitti = false;
  private dinleyici = new AbortController();
  private tema!: Tema;
  private birlikKutu: Kutu[] = [];
  onBolge: (r: number) => void = () => {};
  onYigin: (r: number) => void = () => {};
  onBos: () => void = () => {};

  constructor(private cv: HTMLCanvasElement, private pkg: Paket, geo?: Geo | null, private simge: Record<string, string> = {}) {
    this.ctx = cv.getContext('2d')!;
    const kendi = pkg.bolgeler.some((b) => (b.poligon as unknown[]).length > 0) || !geo;
    const poligon = kendi ? pkg.bolgeler.map((b) => b.poligon) : geo!.poligon;
    this.W = kendi ? pkg.harita.gen : geo!.gen;
    this.H = kendi ? pkg.harita.yuk : geo!.yuk;
    poligon.forEach((p, r) => {
      this.yollar.push(this.poli(p));
      const halkalar = (typeof p[0] === 'number' ? [p as number[]] : (p as number[][]));
      // ana kütle: bölge merkezine yakın halkalar (uzak adalar odak, etiket ve alan hesabını bozmasın)
      const m = pkg.bolgeler[r]?.merkez ?? [0, 0];
      const H = halkalar.filter((h) => h.length >= 6).map((h) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, a = 0, sx = 0, sy = 0;
        for (let i = 0; i < h.length; i += 2) { const x = h[i]!, y = h[i + 1]!; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        for (let i = 0, j = h.length - 2; i < h.length; j = i, i += 2) a += (h[j]! + h[i]!) * (h[j + 1]! - h[i + 1]!);
        const n = h.length / 2;
        return { k: [x0, y0, x1, y1] as [number, number, number, number], a: Math.abs(a / 2), uz: Math.hypot(sx / n - m[0], sy / n - m[1]) };
      });
      let ana = H.filter((h) => h.uz < 250);
      if (!ana.length && H.length) ana = [H.reduce((a, b) => (a.a > b.a ? a : b))];
      const birles = (l: typeof H): [number, number, number, number] => l.reduce<[number, number, number, number]>((t, h) => [Math.min(t[0], h.k[0]), Math.min(t[1], h.k[1]), Math.max(t[2], h.k[2]), Math.max(t[3], h.k[3])], [Infinity, Infinity, -Infinity, -Infinity]);
      this.kutuB.push(ana.length ? birles(ana) : [m[0], m[1], m[0], m[1]]);
      this.kutuT.push(H.length ? birles(H) : [m[0], m[1], m[0], m[1]]);
      this.alanB.push(ana.reduce((t, h) => t + h.a, 0));
    });
    if (kendi) for (const d of pkg.harita.deniz) this.denizYol.push(this.poli(d));
    const cizgiler = kendi ? pkg.harita.cizgiler : geo!.cizgiler;
    for (const c of cizgiler) {
      const p = new Path2D();
      p.moveTo(c.p[0]!, c.p[1]!);
      for (let i = 2; i < c.p.length; i += 2) p.lineTo(c.p[i]!, c.p[i + 1]!);
      this.cizgiYol.push({ a: c.a, b: c.b, yol: p });
    }
    this.denizAdlari = kendi ? pkg.harita.denizAdlari : (pkg.harita.denizAdlari?.length ? pkg.harita.denizAdlari : geo!.denizler);
    this.merkez = pkg.bolgeler.map((b) => b.merkez);
    this.baskentler = pkg.ulkeler.map((u) => u.baskent);
    this.temaOku();
    this.olaylar();
    const dongu = () => { if (this.bitti) return; if (this.kirli) { this.kirli = false; this.ciz(); } requestAnimationFrame(dongu); };
    requestAnimationFrame(dongu);
  }

  /** Çizim döngüsünü ve olay dinleyicilerini bırakır (aynı tuvale yeni çizici kurulmadan önce). */
  kapat(): void { this.bitti = true; this.dinleyici.abort(); }

  get veri(): HaritaVeri | null { return this._veri; }
  set veri(v: HaritaVeri | null) { this._veri = v; this.etiketKirli = true; this.isaretle(); }

  private poli(p: number[] | number[][]): Path2D {
    const y = new Path2D();
    const halkalar = (typeof p[0] === 'number' ? [p as number[]] : (p as number[][]));
    for (const h of halkalar) {
      if (h.length < 4) continue;
      y.moveTo(h[0]!, h[1]!);
      for (let i = 2; i < h.length; i += 2) y.lineTo(h[i]!, h[i + 1]!);
      y.closePath();
    }
    return y;
  }

  private simgeP(ad: string): Path2D | null {
    if (!ad) return null;
    let p = this.simgeYol.get(ad);
    if (!p) { const d = this.simge[ad]; if (!d) return null; p = new Path2D(d); this.simgeYol.set(ad, p); }
    return p;
  }

  temaOku(): void {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
    this.tema = {
      deniz: v('--h-deniz', '#16222e'), denizCizgi: v('--h-deniz-cizgi', '#1d2c3b'), kiyi: v('--h-kiyi', '#8a9aa6'), etiket: v('--h-etiket', '#f1ede4'),
      etiketGolge: v('--h-etiket-golge', '#0b1118'), sinir: v('--h-sinir', '#0d141b'), eyalet: v('--h-eyalet', '#2a3846'), cephe: v('--h-cephe', '#d9483b'),
      secim: v('--h-secim', '#f3d27a'), vurgu: v('--pirinc', '#d1a84f'), kotu: v('--kotu', '#c2473a'), iyi: v('--iyi', '#6f9a5a'), orta: v('--orta', '#d6b24c'), sis: v('--h-sis', '#2b3642'), kagit: v('--h-kagit', '#c9c3b5'),
      murekkep: v('--murekkep', '#111922'),
    };
    this.desen.clear();
    this.isaretle();
  }

  isaretle(): void { this.kirli = true; }

  private ekran(): { w: number; h: number } { const r = this.cv.getBoundingClientRect(); return { w: r.width, h: r.height }; }

  /** Dünyanın tamamını kullanılabilir alana sığdırır. */
  sigdir(): void { this.odakKutu(0, 0, this.W, this.H, 0); }

  /** Verilen bölgeleri (ör. oyuncunun ülkesi) çevresiyle birlikte görünür alana sığdırır. */
  odakBolgeler(rs: number[], pay = 0.35): void {
    if (!rs.length) { this.sigdir(); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    // ana kütle: ilk bölgeye (başkent) bitişik toprak kümesi; uzak sömürgeler odağı bozmasın
    const kume = new Set(rs);
    const [mx, my] = this.merkez[rs[0]!]!;
    const ana = new Set([rs[0]!]);
    const yigin = [rs[0]!];
    while (yigin.length) {
      const r = yigin.pop()!;
      for (const q of this.pkg.bolgeler[r]?.komsu ?? []) {
        if (ana.has(q) || !kume.has(q) || Math.hypot(this.merkez[q]![0] - mx, this.merkez[q]![1] - my) > 520) continue;
        ana.add(q); yigin.push(q);
      }
    }
    for (const r of ana) { const k = this.kutuB[r]!; x0 = Math.min(x0, k[0]); y0 = Math.min(y0, k[1]); x1 = Math.max(x1, k[2]); y1 = Math.max(y1, k[3]); }
    const w = Math.max(220, x1 - x0), h = Math.max(140, y1 - y0);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    this.odakKutu(cx - (w / 2) * (1 + pay), cy - (h / 2) * (1 + pay), cx + (w / 2) * (1 + pay), cy + (h / 2) * (1 + pay), 0);
  }

  private odakKutu(x0: number, y0: number, x1: number, y1: number, _p: number): void {
    const e = this.ekran(), B = this.bosluk;
    const gen = Math.max(100, e.w - B.sol - B.sag), yuk = Math.max(100, e.h - B.ust - B.alt);
    this.s = Math.min(gen / (x1 - x0), yuk / (y1 - y0));
    this.s = Math.max(this.minOlcek(), Math.min(this.maxOlcek(), this.s));
    this.ox = B.sol + gen / 2 - ((x0 + x1) / 2) * this.s;
    this.oy = B.ust + yuk / 2 - ((y0 + y1) / 2) * this.s;
    this.sinirla();
    this.isaretle();
  }

  private minOlcek(): number { const e = this.ekran(); return 0.9 * Math.min(e.w / this.W, e.h / this.H); }
  private maxOlcek(): number { return 9; }

  /** Haritanın ekrandan tamamen kaymasını önler. */
  private sinirla(): void {
    const e = this.ekran();
    const mw = this.W * this.s, mh = this.H * this.s;
    const pay = 80;
    this.ox = Math.min(e.w - pay, Math.max(pay - mw, this.ox));
    this.oy = Math.min(e.h - pay, Math.max(pay - mh, this.oy));
  }

  boyutla(): void {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    this.cv.width = Math.max(1, Math.round(r.width * dpr));
    this.cv.height = Math.max(1, Math.round(r.height * dpr));
    this.isaretle();
  }

  odakla(r: number, yakinlas = true): void {
    const e = this.ekran(), B = this.bosluk;
    const [x, y] = this.merkez[r]!;
    if (yakinlas) { const k = this.kutuB[r]!; this.s = Math.max(this.s, Math.min(4, 0.35 * Math.min((e.w - B.sol - B.sag) / Math.max(20, k[2] - k[0]), (e.h - B.ust - B.alt) / Math.max(20, k[3] - k[1])))); }
    this.ox = B.sol + (e.w - B.sol - B.sag) / 2 - x * this.s; this.oy = B.ust + (e.h - B.ust - B.alt) / 2 - y * this.s;
    this.sinirla();
    this.isaretle();
  }

  kontrolDelta(d: Int16Array): void {
    if (!this._veri) return;
    for (let r = 0; r < this._veri.bolgeler.length; r++) this._veri.bolgeler[r]!.k = d[r]!;
    this.etiketKirli = true;
    this.isaretle();
  }

  private renkUlke(c: number): string { return this._veri?.ulkeler[c]?.renk ?? this.pkg.ulkeler[c]?.renk ?? '#777777'; }

  private taramaDesen(renk: string): CanvasPattern {
    let p = this.desen.get(renk);
    if (p) return p;
    const c = document.createElement('canvas');
    c.width = c.height = 10;
    const x = c.getContext('2d')!;
    x.strokeStyle = renk; x.lineWidth = 3.2;
    x.beginPath(); x.moveTo(-2, 12); x.lineTo(12, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(8, 12); x.lineTo(12, 8); x.stroke();
    p = this.ctx.createPattern(c, 'repeat')!;
    this.desen.set(renk, p);
    return p;
  }

  private dolgu(r: number): string {
    const b = this._veri!.bolgeler[r]!;
    const T = this.tema;
    const P = this.oyuncu;
    switch (this.mod) {
      case 'siyasi': return this.renkUlke(b.k);
      case 'kontrol': if (b.k !== P && b.s !== P) return karis(this.renkUlke(b.k), T.sis, 0.7);
        return b.k !== b.s ? rampa(b.itaat / 100_000, T.kotu, T.orta, T.iyi) : rampa((b.kontrol / 1000 - 10) / 90, T.kotu, T.orta, T.iyi);
      case 'gida': return rampa((b.guvence / 1_000_000 - 0.4) / 0.6, T.kotu, T.orta, T.iyi);
      case 'nufus': { const t = Math.log10(Math.max(1, b.nufus)) - 5.2; return karis(T.sis, T.vurgu, Math.max(0, Math.min(1, t / 1.6))); }
      case 'iliski': if (b.k === P) return T.vurgu; return rampa((this.gorus[b.k] ?? 50_000) / 100_000, T.kotu, T.orta, T.iyi);
      case 'altyapi': return karis(T.sis, T.kagit, Math.min(1, (b.altyapi - 1) / 9 * 0.7 + b.demiryolu * 0.06));
    }
  }

  /** Ülke etiketleri: her bitişik toprak kümesinin alan ağırlıklı merkezi; başkent kümesi ve büyükler önce yerleşir. */
  private etiketHazirla(): void {
    this.etiketKirli = false;
    const v = this._veri;
    this.ulkeEtiket = [];
    if (!v) return;
    const nR = v.bolgeler.length;
    const gorulen = new Uint8Array(nR);
    const kumeler: (Etiket & { bas: boolean })[] = [];
    for (let r0 = 0; r0 < nR; r0++) {
      if (gorulen[r0]) continue;
      const c = v.bolgeler[r0]!.k;
      if (c < 0) continue;
      const yigin = [r0]; gorulen[r0] = 1;
      let alan = 0, sx = 0, sy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, bas = false;
      while (yigin.length) {
        const r = yigin.pop()!;
        if (this.baskentler[c] === r) bas = true;
        const a = Math.max(1, this.alanB[r] ?? 1);
        alan += a; sx += this.merkez[r]![0] * a; sy += this.merkez[r]![1] * a;
        const k = this.kutuB[r]!; x0 = Math.min(x0, k[0]); y0 = Math.min(y0, k[1]); x1 = Math.max(x1, k[2]); y1 = Math.max(y1, k[3]);
        for (const q of this.pkg.bolgeler[r]!.komsu) if (!gorulen[q] && v.bolgeler[q]!.k === c) { gorulen[q] = 1; yigin.push(q); }
      }
      kumeler.push({ x: sx / alan, y: sy / alan, metin: (v.ulkeler[c]?.kisa ?? '').toLocaleUpperCase('tr'), alan, gen: x1 - x0, yuk: y1 - y0, ulke: c, bas });
    }
    this.ulkeEtiket = kumeler.sort((a, b) => b.alan * (b.bas ? 3 : 1) - a.alan * (a.bas ? 3 : 1));
  }

  private olc(metin: string, font: string): number {
    const k = font + '|' + metin;
    let w = this.genislik.get(k);
    if (w === undefined) { this.ctx.font = font; w = this.ctx.measureText(metin).width; this.genislik.set(k, w); }
    return w;
  }

  ciz(): void {
    const ctx = this.ctx, T = this.tema;
    const e = this.ekran();
    const dpr = this.cv.width / Math.max(1, e.w);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = T.deniz;
    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(dpr * this.s, 0, 0, dpr * this.s, dpr * this.ox, dpr * this.oy);
    const lw = 1 / this.s;
    // görünür dünya kutusu
    const vx0 = -this.ox / this.s, vy0 = -this.oy / this.s, vx1 = (e.w - this.ox) / this.s, vy1 = (e.h - this.oy) / this.s;
    // kurmay ızgarası (15°)
    ctx.strokeStyle = T.denizCizgi; ctx.lineWidth = lw;
    ctx.beginPath();
    const adim = this.W / 24;
    for (let x = 0; x <= this.W + 0.1; x += adim) { ctx.moveTo(x, 0); ctx.lineTo(x, this.H); }
    for (let y = this.H / 2 % adim; y <= this.H; y += adim) { ctx.moveTo(0, y); ctx.lineTo(this.W, y); }
    ctx.stroke();
    if (!this._veri) {
      // veri yokken nötr kara
      ctx.fillStyle = karis(T.kagit, T.murekkep, 0.72);
      for (const y of this.yollar) ctx.fill(y, 'evenodd');
      ctx.strokeStyle = T.kiyi; ctx.lineWidth = 0.8 * lw; ctx.globalAlpha = 0.6;
      for (const c of this.cizgiYol) if (c.b < 0) ctx.stroke(c.yol);
      ctx.globalAlpha = 1;
      return;
    }
    if (this.etiketKirli) this.etiketHazirla();
    const gor = (r: number) => { const k = this.kutuT[r]!; return k[2] >= vx0 && k[0] <= vx1 && k[3] >= vy0 && k[1] <= vy1; };
    // bölge dolguları
    for (let r = 0; r < this.yollar.length; r++) {
      if (!gor(r)) continue;
      const b = this._veri.bolgeler[r]!;
      let renk = this.dolgu(r);
      if (this.uygunBolge && !this.uygunBolge(r)) renk = karis(renk, T.murekkep, 0.62);
      ctx.fillStyle = renk;
      ctx.fill(this.yollar[r]!, 'evenodd');
      if (b.k !== b.s && this.mod === 'siyasi') {
        // işgal taraması: sahibin rengi, kontrol edenin üzerinde
        ctx.save(); ctx.clip(this.yollar[r]!, 'evenodd'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = this.taramaDesen(karis(this.renkUlke(b.s), '#000000', 0.1)); ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, this.cv.width, this.cv.height); ctx.restore();
      }
      if (b.isyan) { ctx.save(); ctx.clip(this.yollar[r]!, 'evenodd'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 0.35; ctx.fillStyle = this.taramaDesen(T.kotu); ctx.fillRect(0, 0, this.cv.width, this.cv.height); ctx.restore(); }
    }
    // sınırlar ve kıyılar
    const savas = new Set(this._veri.savaslar.map(([a, b]) => `${a}-${b}`));
    const ic = this.s > 0.9;
    const eyaletVar = this.pkg.eyaletler.length < this.pkg.bolgeler.length;
    ctx.lineJoin = 'round';
    for (const c of this.cizgiYol) {
      if (!gor(c.a) && (c.b < 0 || !gor(c.b))) continue;
      if (c.b < 0) { ctx.strokeStyle = T.kiyi; ctx.globalAlpha = 0.75; ctx.lineWidth = 0.9 * lw; ctx.stroke(c.yol); ctx.globalAlpha = 1; continue; }
      const A = this._veri.bolgeler[c.a]!, B = this._veri.bolgeler[c.b]!;
      if (A.k !== B.k) {
        const cephe = savas.has(`${A.k}-${B.k}`) || savas.has(`${B.k}-${A.k}`);
        if (cephe) {
          ctx.strokeStyle = T.cephe; ctx.lineWidth = 4.2 * lw; ctx.globalAlpha = 0.35; ctx.stroke(c.yol); ctx.globalAlpha = 1;
          ctx.lineWidth = 1.8 * lw; ctx.stroke(c.yol);
        } else { ctx.strokeStyle = T.sinir; ctx.lineWidth = 1.5 * lw; ctx.stroke(c.yol); }
      } else if (eyaletVar && this.pkg.bolgeler[c.a]!.eyalet !== this.pkg.bolgeler[c.b]!.eyalet) {
        ctx.strokeStyle = T.sinir; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.1 * lw; ctx.setLineDash([4 * lw, 3 * lw]); ctx.stroke(c.yol); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else if (ic) { ctx.strokeStyle = T.sinir; ctx.globalAlpha = Math.min(0.4, 0.12 + (this.s - 0.9) * 0.1); ctx.lineWidth = 0.7 * lw; ctx.stroke(c.yol); ctx.globalAlpha = 1; }
    }
    // seçim
    if (this.seciliBolge >= 0) {
      ctx.strokeStyle = T.etiketGolge; ctx.lineWidth = 4.4 * lw; ctx.stroke(this.yollar[this.seciliBolge]!);
      ctx.strokeStyle = T.secim; ctx.lineWidth = 2.2 * lw; ctx.stroke(this.yollar[this.seciliBolge]!);
    }
    if (this.hedefIsaret >= 0) { ctx.save(); ctx.setLineDash([5 * lw, 4 * lw]); ctx.strokeStyle = T.cephe; ctx.lineWidth = 2.6 * lw; ctx.stroke(this.yollar[this.hedefIsaret]!); ctx.restore(); }
    // ekran koordinatı: işaretler, etiketler, birlikler
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = (x: number) => this.ox + x * this.s, sy = (y: number) => this.oy + y * this.s;
    // muharebe işaretleri
    for (let r = 0; r < this._veri.bolgeler.length; r++) {
      if (!this._veri.bolgeler[r]!.cephe || !gor(r)) continue;
      const [x, y] = this.merkez[r]!;
      ctx.save(); ctx.translate(sx(x) + 15, sy(y) - 15);
      ctx.strokeStyle = T.etiketGolge; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
      ctx.strokeStyle = T.cephe; ctx.lineWidth = 2.4;
      ctx.stroke(); ctx.restore();
    }
    this.etiketCiz(gor, sx, sy);
    this.birlikCiz(gor, sx, sy);
  }

  private etiketCiz(gor: (r: number) => boolean, sx: (x: number) => number, sy: (y: number) => number): void {
    const ctx = this.ctx, T = this.tema;
    const e = this.ekran();
    const yer: [number, number, number, number][] = [];
    const cakisir = (x0: number, y0: number, x1: number, y1: number) => yer.some((q) => x0 < q[2] && x1 > q[0] && y0 < q[3] && y1 > q[1]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    // deniz adları
    if (this.s < 2.2) {
      const f = `italic 400 ${Math.round(Math.max(10, Math.min(15, 11 * Math.sqrt(this.s * 2.2))))}px "Old Standard TT", Georgia, serif`;
      ctx.font = f; ctx.fillStyle = T.kiyi; ctx.globalAlpha = 0.75;
      for (const d of this.denizAdlari) {
        const x = sx(d.x), y = sy(d.y);
        if (x < -100 || x > e.w + 100 || y < -20 || y > e.h + 20) continue;
        const w = this.olc(d.ad, f);
        if (cakisir(x - w / 2, y - 8, x + w / 2, y + 8)) continue;
        ctx.fillText(d.ad, x, y); yer.push([x - w / 2, y - 8, x + w / 2, y + 8]);
      }
      ctx.globalAlpha = 1;
    }
    // ülke adları: kümenin ekrandaki genişliğine göre boyut; ekranı aşan dev kümelerde gizli (bölge adları görünsün)
    for (const L of this.ulkeEtiket) {
      const gw = L.gen * this.s, gh = L.yuk * this.s;
      if (gw > e.w * 1.25 && gh > e.h * 0.9) continue;
      const boy = Math.max(10, Math.min(30, Math.sqrt(L.alan) * this.s * 0.2));
      const aralik = boy > 15 ? 0.14 : 0.04;
      const f = `700 ${Math.round(boy)}px "Old Standard TT", Georgia, serif`;
      const w = this.olc(L.metin, f) * (1 + aralik);
      if (w > gw * 1.35 + 24) continue;
      const x = sx(L.x), y = sy(L.y);
      if (x + w / 2 < 0 || x - w / 2 > e.w || y < -boy || y > e.h + boy) continue;
      const k: [number, number, number, number] = [x - w / 2, y - boy * 0.6, x + w / 2, y + boy * 0.6];
      if (cakisir(...k)) continue;
      ctx.font = f;
      (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(boy * aralik).toFixed(1)}px`;
      ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(3, boy * 0.22); ctx.strokeStyle = T.etiketGolge; ctx.strokeText(L.metin, x, y);
      ctx.fillStyle = T.etiket; ctx.fillText(L.metin, x, y); ctx.globalAlpha = 1;
      (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
      yer.push(k);
    }
    // başkentler ve bölge adları
    const fb = `500 ${this.s > 2.5 ? 13 : 12}px "IBM Plex Sans Condensed", system-ui, sans-serif`;
    const baskent = new Set(this.baskentler.filter((r, c) => r >= 0 && this._veri!.bolgeler[r]?.k === c));
    if (this.s > 0.5) {
      for (const r of baskent) {
        if (!gor(r)) continue;
        const [x, y] = this.merkez[r]!;
        this.yildiz(sx(x), sy(y), this.s > 1.2 ? 5.5 : 4);
      }
    }
    if (this.s > 0.8) {
      ctx.font = fb;
      const sira = [...this.yollar.keys()].filter(gor).sort((a, b) => (baskent.has(b) ? 1e12 : this.alanB[b]!) - (baskent.has(a) ? 1e12 : this.alanB[a]!));
      for (const r of sira) {
        const k = this.kutuB[r]!;
        const ad = this.pkg.bolgeler[r]!.ad;
        const w = this.olc(ad, fb);
        const bw = (k[2] - k[0]) * this.s;
        if (bw < w * 0.8 && !(baskent.has(r) && this.s > 1.6)) continue;
        const [mx, my] = this.merkez[r]!;
        const x = sx(mx), y = sy(my) + 13;
        const q: [number, number, number, number] = [x - w / 2 - 2, y - 7, x + w / 2 + 2, y + 7];
        if (cakisir(...q)) continue;
        ctx.lineWidth = 3; ctx.strokeStyle = T.etiketGolge; ctx.globalAlpha = 0.85; ctx.strokeText(ad, x, y); ctx.globalAlpha = 1;
        ctx.fillStyle = T.etiket; ctx.fillText(ad, x, y);
        yer.push(q);
      }
    }
  }

  private yildiz(x: number, y: number, r: number): void {
    const ctx = this.ctx, T = this.tema;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); else ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = T.etiketGolge; ctx.stroke();
    ctx.fillStyle = T.secim; ctx.fill();
  }

  private birlikCiz(gor: (r: number) => boolean, sx: (x: number) => number, sy: (y: number) => number): void {
    const ctx = this.ctx, T = this.tema;
    const v = this._veri!;
    this.birlikKutu = [];
    const k = Math.max(0.72, Math.min(1.2, 0.62 + this.s * 0.32));
    const W = 34 * k, H = 26 * k;
    // hareket okları
    for (const b of v.birimler) {
      if (b.sonraki < 0) continue;
      const [x1, y1] = this.merkez[b.bolge]!, [x2, y2] = this.merkez[b.sonraki]!;
      const ax = sx(x1), ay = sy(y1), bx = sx(x2), by = sy(y2);
      const saldiri = b.durus === 2 || b.muharebe;
      ctx.strokeStyle = saldiri ? T.cephe : T.secim; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.6;
      ctx.globalAlpha = this.seciliBirlik.has(b.id) ? 1 : 0.8;
      const hx = bx - (bx - ax) * 0.16, hy = by - (by - ay) * 0.16;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke();
      const ang = Math.atan2(by - ay, bx - ax);
      ctx.beginPath(); ctx.moveTo(hx + 3 * Math.cos(ang), hy + 3 * Math.sin(ang)); ctx.lineTo(hx - 10 * Math.cos(ang - 0.45), hy - 10 * Math.sin(ang - 0.45)); ctx.lineTo(hx - 10 * Math.cos(ang + 0.45), hy - 10 * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill();
      if (b.ilerleme > 0) { const t = (b.ilerleme / 100) * 0.84; ctx.beginPath(); ctx.arc(ax + (bx - ax) * t, ay + (by - ay) * t, 3.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // bölge başına yığın: kendi birliklerimiz tek pul (baskın tür simgesi + sayı), yabancılar ülke başına bir pul
    const yigin = new Map<number, { kendi: HaritaBirim[]; yab: HaritaYabanci[] }>();
    for (const b of v.birimler) { const y = yigin.get(b.bolge) ?? { kendi: [], yab: [] }; y.kendi.push(b); yigin.set(b.bolge, y); }
    const savasta = new Set<number>();
    for (const [a, b] of v.savaslar) { if (a === this.oyuncu) savasta.add(b!); if (b === this.oyuncu) savasta.add(a!); }
    // yabancı pullar: düşman, sınır komşusu ya da kendi toprağımızdaysa; yakın ölçekte hepsi (kalabalığı önler)
    const P = this.oyuncu;
    for (const f of v.yabanci) {
      const sinirda = v.bolgeler[f.bolge]?.k === P || (this.pkg.bolgeler[f.bolge]?.komsu ?? []).some((q) => v.bolgeler[q]?.k === P);
      if (!savasta.has(f.ulke) && !(sinirda && this.s > 0.7) && this.s < 2.6) continue;
      const y = yigin.get(f.bolge) ?? { kendi: [], yab: [] }; y.yab.push(f); yigin.set(f.bolge, y);
    }
    for (const [r, y] of yigin) {
      if (!gor(r)) continue;
      const [mx, my] = this.merkez[r]!;
      const n = (y.kendi.length ? 1 : 0) + Math.min(3, y.yab.length);
      let x = sx(mx) - (n * W + (n - 1) * 4 * k) / 2;
      const yy = sy(my) - H / 2 - 2 * k;
      if (y.kendi.length) {
        const say = new Map<number, number>();
        for (const b of y.kendi) say.set(b.sablon, (say.get(b.sablon) ?? 0) + 1);
        const bask = [...say.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
        const org = y.kendi.reduce((s, b) => s + b.org, 0) / y.kendi.length;
        const secili = y.kendi.some((b) => this.seciliBirlik.has(b.id));
        const tumSecili = secili && y.kendi.every((b) => this.seciliBirlik.has(b.id));
        this.pul(x, yy, W, H, this.renkUlke(y.kendi[0]!.ulke), this.sablonSimge[bask] ?? '', y.kendi.length, org, y.kendi.every((b) => b.egitim > 0), secili, tumSecili, y.kendi.some((b) => b.muharebe === 1));
        this.birlikKutu.push({ tur: 'yigin', bolge: r, x, y: yy, w: W, h: H });
        x += W + 4 * k;
      }
      for (const f of y.yab.slice(0, 3)) {
        this.pul(x, yy, W, H, this.renkUlke(f.ulke), this.yabanciSimge, f.birlik, -1, false, false, false, savasta.has(f.ulke));
        if (savasta.has(f.ulke) || this.s > 2.2) {
          const g = f.kesin ? `${Math.round(f.gucAlt / 1000)}` : `${Math.round(f.gucAlt / 1000)}–${Math.round(f.gucUst / 1000)}`;
          ctx.font = `600 ${Math.round(10 * k)}px "IBM Plex Sans Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = T.etiketGolge; ctx.strokeText(g, x + W / 2, yy + H + 7 * k); ctx.fillStyle = T.etiket; ctx.fillText(g, x + W / 2, yy + H + 7 * k);
        }
        this.birlikKutu.push({ tur: 'yabanci', bolge: r, x, y: yy, w: W, h: H });
        x += W + 4 * k;
      }
    }
  }

  /** Birlik pulu: ülke renginde levha, dönem simgesi, adet rozeti ve organizasyon çubuğu. */
  private pul(x: number, y: number, w: number, h: number, renk: string, simge: string, adet: number, org: number, egitim: boolean, secili: boolean, tumSecili: boolean, muharebe: boolean): void {
    const ctx = this.ctx, T = this.tema;
    const zemin = karis(renk, '#000000', 0.08);
    const ac = parlak(zemin) > 0.58;
    const murekkep = ac ? '#141a20' : '#f7f2e6';
    ctx.save();
    ctx.shadowColor = '#000a'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3.5); ctx.fillStyle = zemin; ctx.fill();
    ctx.restore();
    ctx.lineWidth = secili ? 2.6 : 1.3; ctx.strokeStyle = secili ? T.secim : (muharebe ? T.cephe : '#0b1015');
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3.5); ctx.stroke();
    if (secili && !tumSecili) { ctx.setLineDash([3, 2]); ctx.strokeStyle = T.etiketGolge; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); }
    const p = this.simgeP(simge);
    const ih = h - (org >= 0 ? 7 : 4);
    if (p) {
      ctx.save();
      const sc = ih / 512;
      ctx.translate(x + (w - ih) / 2, y + 2); ctx.scale(sc, sc);
      ctx.fillStyle = murekkep; ctx.fill(p);
      ctx.restore();
    }
    if (org >= 0) {
      ctx.fillStyle = '#0b1015'; ctx.fillRect(x + 2, y + h - 4.5, w - 4, 3);
      ctx.fillStyle = org > 60 ? T.iyi : org > 30 ? T.orta : T.kotu; ctx.fillRect(x + 2, y + h - 4.5, (w - 4) * Math.max(0, Math.min(1, org / 100)), 3);
    }
    if (adet > 1) {
      const r = Math.max(6.5, h * 0.3);
      const bx = x + w - 1, by = y + 1;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fillStyle = T.etiketGolge; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = secili ? T.secim : T.kiyi; ctx.stroke();
      ctx.font = `700 ${Math.round(r * 1.15)}px "IBM Plex Sans Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = T.etiket; ctx.fillText(String(adet), bx, by + 0.5);
    }
    if (egitim) { ctx.fillStyle = T.etiketGolge; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 3.5); ctx.fill(); ctx.globalAlpha = 1; }
  }

  private olaylar(): void {
    const cv = this.cv;
    const sig = { signal: this.dinleyici.signal };
    const parmak = new Map<number, { x: number; y: number }>();
    let bas: { x: number; y: number; t: number } | null = null;
    let tasindi = false;
    let pinchD = 0;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      parmak.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (parmak.size === 1) { bas = { x: e.offsetX, y: e.offsetY, t: performance.now() }; tasindi = false; }
      if (parmak.size === 2) { const [a, b] = [...parmak.values()]; pinchD = Math.hypot(a!.x - b!.x, a!.y - b!.y); tasindi = true; }
    }, sig);
    cv.addEventListener('pointermove', (e) => {
      const p = parmak.get(e.pointerId);
      if (!p) return;
      const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
      if (parmak.size === 1) {
        if (bas && Math.hypot(e.offsetX - bas.x, e.offsetY - bas.y) > 8) tasindi = true;
        if (tasindi) { this.ox += dx; this.oy += dy; this.sinirla(); this.isaretle(); }
      } else if (parmak.size === 2) {
        p.x = e.offsetX; p.y = e.offsetY;
        const [a, b] = [...parmak.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinchD > 0) this.zoom(d / pinchD, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
        pinchD = d;
        return;
      }
      p.x = e.offsetX; p.y = e.offsetY;
    }, sig);
    const bitir = (e: PointerEvent) => {
      const vardi = parmak.has(e.pointerId);
      parmak.delete(e.pointerId);
      if (!vardi || parmak.size > 0) return;
      if (!tasindi && bas) this.dokun(e.offsetX, e.offsetY);
      bas = null;
    };
    cv.addEventListener('pointerup', bitir, sig);
    cv.addEventListener('pointercancel', (e) => { parmak.delete(e.pointerId); bas = null; }, sig);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY); }, { passive: false, signal: this.dinleyici.signal });
    cv.addEventListener('dblclick', (e) => { this.zoom(1.8, e.offsetX, e.offsetY); }, sig);
  }

  zoom(f: number, cx: number, cy: number): void {
    const ns = Math.max(this.minOlcek(), Math.min(this.maxOlcek(), this.s * f));
    const k = ns / this.s;
    this.ox = cx - (cx - this.ox) * k; this.oy = cy - (cy - this.oy) * k; this.s = ns;
    this.sinirla();
    this.isaretle();
  }

  /** Ekran noktasındaki bölge (yoksa −1). */
  bolgeNoktada(x: number, y: number): number {
    const wx = (x - this.ox) / this.s, wy = (y - this.oy) / this.s;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    let bulunan = -1;
    for (let r = 0; r < this.yollar.length; r++) {
      const k = this.kutuT[r]!;
      if (wx < k[0] || wx > k[2] || wy < k[1] || wy > k[3]) continue;
      if (this.ctx.isPointInPath(this.yollar[r]!, wx, wy, 'evenodd')) { bulunan = r; break; }
    }
    this.ctx.restore();
    return bulunan;
  }

  private dokun(x: number, y: number): void {
    // dokunulan pul: payla birlikte içeren pullardan merkezi en yakın olanı (bitişik pullar karışmasın)
    let en: Kutu | null = null, enD = Infinity;
    for (const b of this.birlikKutu) {
      if (x < b.x - 4 || x > b.x + b.w + 4 || y < b.y - 6 || y > b.y + b.h + 4) continue;
      const d = Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2));
      if (d < enD) { enD = d; en = b; }
    }
    if (en) { if (en.tur === 'yigin') this.onYigin(en.bolge); else this.onBolge(en.bolge); return; }
    const r = this.bolgeNoktada(x, y);
    if (r >= 0) this.onBolge(r); else this.onBos();
  }
}
