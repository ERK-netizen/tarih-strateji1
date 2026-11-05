// Harita çizicisi (Canvas 2D). Aşama 0 kararı: 48 bölgelik 1A fixture'ında MapLibre + PMTiles yerine
// tek Canvas çizici seçildi (Ek A, K-06). Sahiplik değişimi yeniden karo üretmez; yalnız dolgu yeniden çizilir.
import type { Paket } from '@ts/engine';

export type HaritaModu = 'siyasi' | 'kontrol' | 'gida' | 'nufus' | 'iliski' | 'altyapi';

export interface HaritaBolge { k: number; s: number; kontrol: number; itaat: number; direnis: number; cephe: number; isyan: number; guvence: number; demiryolu: number; altyapi: number; nufus: number; fabrika: number; uretim: number; istihbarat: number }
export interface HaritaBirim { id: number; ulke: number; bolge: number; ad: string; sablon: number; kisi: number; kisiHedef: number; org: number; guc: number; hedef: number; sonraki: number; ilerleme: number; muharebe: number; egitim: number; durus: number; ikmal: number }
export interface HaritaYabanci { bolge: number; ulke: number; birlik: number; gucAlt: number; gucUst: number; kisiAlt: number; kisiUst: number; kesin: boolean }
export interface HaritaVeri { bolgeler: HaritaBolge[]; birimler: HaritaBirim[]; yabanci: HaritaYabanci[]; savaslar: number[][]; ulkeler: { kisa: string; renk: string }[] }

interface Tema { deniz: string; denizCizgi: string; kiyi: string; etiket: string; etiketGolge: string; sinir: string; eyalet: string; cephe: string; secim: string; vurgu: string; kotu: string; iyi: string; orta: string; sis: string; kagit: string }

function hex(h: string): [number, number, number] {
  const x = h.replace('#', '');
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}
function karis(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}
function rampa(t: number, kotu: string, orta: string, iyi: string): string {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? karis(kotu, orta, c * 2) : karis(orta, iyi, (c - 0.5) * 2);
}

export class HaritaCizici {
  private ctx: CanvasRenderingContext2D;
  private yollar: Path2D[] = [];
  private denizYol: Path2D[] = [];
  private cizgiYol: { a: number; b: number; yol: Path2D }[] = [];
  private merkez: [number, number][];
  private desen = new Map<string, CanvasPattern>();
  veri: HaritaVeri | null = null;
  mod: HaritaModu = 'siyasi';
  oyuncu = 0;
  gorus: number[] = []; // ülkelerin oyuncuya görüşü (×1000)
  seciliBolge = -1;
  seciliBirlik = new Set<number>();
  hedefIsaret = -1;
  // kamera
  s = 1; ox = 0; oy = 0;
  private kirli = true;
  private tema!: Tema;
  private birlikKutu: { id: number; x: number; y: number; w: number; h: number }[] = [];
  onBolge: (r: number) => void = () => {};
  onBirlik: (id: number, coklu: boolean) => void = () => {};
  onBos: () => void = () => {};

  constructor(private cv: HTMLCanvasElement, private pkg: Paket) {
    this.ctx = cv.getContext('2d')!;
    for (const b of pkg.bolgeler) this.yollar.push(this.poli(b.poligon));
    for (const d of pkg.harita.deniz) this.denizYol.push(this.poli(d));
    for (const c of pkg.harita.cizgiler) {
      const p = new Path2D();
      p.moveTo(c.p[0]!, c.p[1]!);
      for (let i = 2; i < c.p.length; i += 2) p.lineTo(c.p[i]!, c.p[i + 1]!);
      this.cizgiYol.push({ a: c.a, b: c.b, yol: p });
    }
    this.merkez = pkg.bolgeler.map((b) => b.merkez);
    this.temaOku();
    this.olaylar();
    const dongu = () => { if (this.kirli) { this.kirli = false; this.ciz(); } requestAnimationFrame(dongu); };
    requestAnimationFrame(dongu);
  }

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

  temaOku(): void {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
    this.tema = {
      deniz: v('--h-deniz', '#16222e'), denizCizgi: v('--h-deniz-cizgi', '#1d2c3b'), kiyi: v('--h-kiyi', '#8a9aa6'), etiket: v('--h-etiket', '#f1ede4'),
      etiketGolge: v('--h-etiket-golge', '#0b1118'), sinir: v('--h-sinir', '#0d141b'), eyalet: v('--h-eyalet', '#2a3846'), cephe: v('--h-cephe', '#d9483b'),
      secim: v('--h-secim', '#f3d27a'), vurgu: v('--pirinc', '#d1a84f'), kotu: v('--kotu', '#c2473a'), iyi: v('--iyi', '#6f9a5a'), orta: v('--orta', '#d6b24c'), sis: v('--h-sis', '#2b3642'), kagit: v('--h-kagit', '#c9c3b5'),
    };
    this.desen.clear();
    this.isaretle();
  }

  isaretle(): void { this.kirli = true; }

  sigdir(solBosluk = 0, ust = 0, alt = 0): void {
    const r = this.cv.getBoundingClientRect();
    const W = this.pkg.harita.gen, H = this.pkg.harita.yuk;
    const gen = Math.max(100, r.width - solBosluk);
    const yuk = Math.max(100, r.height - ust - alt);
    this.s = Math.min(gen / W, (yuk * 1.22) / H);
    this.ox = solBosluk + (gen - W * this.s) / 2; this.oy = ust + (yuk - H * this.s) / 2;
    this.isaretle();
  }

  boyutla(): void {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    this.cv.width = Math.max(1, Math.round(r.width * dpr));
    this.cv.height = Math.max(1, Math.round(r.height * dpr));
    this.isaretle();
  }

  odakla(r: number): void {
    const rr = this.cv.getBoundingClientRect();
    const [x, y] = this.merkez[r]!;
    this.s = Math.max(this.s, 1.3 * Math.min(rr.width / this.pkg.harita.gen, rr.height / this.pkg.harita.yuk));
    this.ox = rr.width / 2 - x * this.s; this.oy = rr.height / 2.3 - y * this.s;
    this.isaretle();
  }

  kontrolDelta(d: Int16Array): void {
    if (!this.veri) return;
    for (let r = 0; r < this.veri.bolgeler.length; r++) this.veri.bolgeler[r]!.k = d[r]!;
    this.isaretle();
  }

  private renkUlke(c: number): string { return this.veri?.ulkeler[c]?.renk ?? this.pkg.ulkeler[c]?.renk ?? '#777777'; }

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
    const b = this.veri!.bolgeler[r]!;
    const T = this.tema;
    const P = this.oyuncu;
    switch (this.mod) {
      case 'siyasi': return this.renkUlke(b.k);
      case 'kontrol': if (b.k !== P && b.s !== P) return karis(this.renkUlke(b.k), T.sis, 0.7);
        return b.k !== b.s ? rampa(b.itaat / 100_000, T.kotu, T.orta, T.iyi) : rampa((b.kontrol / 1000 - 10) / 90, T.kotu, T.orta, T.iyi);
      case 'gida': return rampa((b.guvence / 1_000_000 - 0.4) / 0.6, T.kotu, T.orta, T.iyi);
      case 'nufus': { const t = Math.log10(Math.max(1, b.nufus)) - 5.2; return karis(T.sis, T.vurgu, Math.max(0, Math.min(1, t / 0.9))); }
      case 'iliski': if (b.k === P) return T.vurgu; return rampa((this.gorus[b.k] ?? 50_000) / 100_000, T.kotu, T.orta, T.iyi);
      case 'altyapi': return karis(T.sis, T.kagit, Math.min(1, (b.altyapi - 1) / 4 * 0.6 + b.demiryolu * 0.15));
    }
  }

  ciz(): void {
    const ctx = this.ctx, T = this.tema;
    const dpr = this.cv.width / Math.max(1, this.cv.getBoundingClientRect().width);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = T.deniz;
    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(dpr * this.s, 0, 0, dpr * this.s, dpr * this.ox, dpr * this.oy);
    const lw = 1 / this.s;
    // deniz enlem çizgileri (kurmay haritası ızgarası)
    ctx.strokeStyle = T.denizCizgi; ctx.lineWidth = lw;
    ctx.beginPath();
    for (let x = 0; x <= this.pkg.harita.gen; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, this.pkg.harita.yuk); }
    for (let y = 0; y <= this.pkg.harita.yuk; y += 100) { ctx.moveTo(0, y); ctx.lineTo(this.pkg.harita.gen, y); }
    ctx.stroke();
    if (!this.veri) return;
    // bölge dolguları
    for (let r = 0; r < this.yollar.length; r++) {
      ctx.fillStyle = this.dolgu(r);
      ctx.fill(this.yollar[r]!);
      const b = this.veri.bolgeler[r]!;
      if (b.k !== b.s && this.mod === 'siyasi') {
        // işgal taraması: sahibin rengi, kontrol edenin üzerinde
        ctx.save(); ctx.clip(this.yollar[r]!); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = this.taramaDesen(karis(this.renkUlke(b.s), '#000000', 0.1)); ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, this.cv.width, this.cv.height); ctx.restore();
      }
      if (b.isyan) { ctx.save(); ctx.clip(this.yollar[r]!); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 0.35; ctx.fillStyle = this.taramaDesen(T.kotu); ctx.fillRect(0, 0, this.cv.width, this.cv.height); ctx.restore(); }
    }
    // kabartma gölgesi: iç kenar
    // sınırlar
    const savas = new Set(this.veri.savaslar.map(([a, b]) => `${a}-${b}`));
    for (const c of this.cizgiYol) {
      if (c.b < 0) { ctx.strokeStyle = T.kiyi; ctx.lineWidth = 1.6 * lw; ctx.stroke(c.yol); continue; }
      const A = this.veri.bolgeler[c.a]!, B = this.veri.bolgeler[c.b]!;
      if (A.k !== B.k) {
        const cephe = savas.has(`${A.k}-${B.k}`) || savas.has(`${B.k}-${A.k}`);
        if (cephe) {
          ctx.strokeStyle = T.cephe; ctx.lineWidth = 4.2 * lw; ctx.globalAlpha = 0.35; ctx.stroke(c.yol); ctx.globalAlpha = 1;
          ctx.lineWidth = 2 * lw; ctx.stroke(c.yol);
        } else { ctx.strokeStyle = T.sinir; ctx.lineWidth = 2.2 * lw; ctx.stroke(c.yol); }
      } else if (this.pkg.bolgeler[c.a]!.eyalet !== this.pkg.bolgeler[c.b]!.eyalet) {
        ctx.strokeStyle = T.sinir; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.1 * lw; ctx.setLineDash([4 * lw, 3 * lw]); ctx.stroke(c.yol); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else { ctx.strokeStyle = T.sinir; ctx.globalAlpha = 0.28; ctx.lineWidth = 0.8 * lw; ctx.stroke(c.yol); ctx.globalAlpha = 1; }
    }
    // seçim
    if (this.seciliBolge >= 0) {
      ctx.strokeStyle = T.secim; ctx.lineWidth = 2.6 * lw; ctx.stroke(this.yollar[this.seciliBolge]!);
    }
    if (this.hedefIsaret >= 0) { ctx.save(); ctx.setLineDash([5 * lw, 4 * lw]); ctx.strokeStyle = T.cephe; ctx.lineWidth = 2.4 * lw; ctx.stroke(this.yollar[this.hedefIsaret]!); ctx.restore(); }
    // muharebe işaretleri
    for (let r = 0; r < this.veri.bolgeler.length; r++) {
      if (!this.veri.bolgeler[r]!.cephe) continue;
      const [x, y] = this.merkez[r]!;
      ctx.save(); ctx.translate(x + 22, y - 20); ctx.scale(lw * 1.4, lw * 1.4);
      ctx.strokeStyle = T.cephe; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
      ctx.restore();
    }
    // etiketler (ekran koordinatı)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    const yakin = this.s > 0.95 * Math.min(this.cv.getBoundingClientRect().width / this.pkg.harita.gen, 9);
    if (this.s > 0.62) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `500 ${Math.max(9, Math.min(13, 10 * this.s))}px "IBM Plex Sans Condensed", system-ui, sans-serif`;
      for (let r = 0; r < this.merkez.length; r++) {
        const [x, y] = this.merkez[r]!;
        const sx = this.ox + x * this.s, sy = this.oy + (y + 16) * this.s;
        ctx.lineWidth = 3; ctx.strokeStyle = T.etiketGolge; ctx.globalAlpha = 0.85;
        ctx.strokeText(this.pkg.bolgeler[r]!.ad, sx, sy); ctx.globalAlpha = 1;
        ctx.fillStyle = T.etiket; ctx.fillText(this.pkg.bolgeler[r]!.ad, sx, sy);
      }
    }
    if (!yakin || this.s < 0.75) {
      // ülke adları: kontrol edilen bölgelerin ağırlık merkezi
      ctx.font = `700 ${Math.max(12, 19 * this.s)}px "Old Standard TT", Georgia, serif`;
      ctx.textAlign = 'center';
      for (let c = 0; c < this.veri.ulkeler.length; c++) {
        let sx = 0, sy = 0, n = 0;
        this.veri.bolgeler.forEach((b, r) => { if (b.k === c) { sx += this.merkez[r]![0]; sy += this.merkez[r]![1]; n++; } });
        if (!n) continue;
        const ad = this.veri.ulkeler[c]!.kisa.toLocaleUpperCase('tr').split('').join(' ');
        const x = this.ox + (sx / n) * this.s, y = this.oy + (sy / n) * this.s - 26 * this.s;
        ctx.globalAlpha = 0.85; ctx.lineWidth = 4; ctx.strokeStyle = T.etiketGolge; ctx.strokeText(ad, x, y);
        ctx.fillStyle = T.etiket; ctx.fillText(ad, x, y); ctx.globalAlpha = 1;
      }
    }
    for (const d of this.pkg.harita.denizAdlari) {
      ctx.font = `italic 400 ${Math.max(10, 12 * this.s)}px "Old Standard TT", Georgia, serif`;
      ctx.fillStyle = T.kiyi; ctx.globalAlpha = 0.8; ctx.fillText(d.ad, this.ox + d.x * this.s, this.oy + d.y * this.s); ctx.globalAlpha = 1;
    }
    this.birlikCiz(dpr);
  }

  private birlikCiz(dpr: number): void {
    const ctx = this.ctx, T = this.tema;
    if (!this.veri) return;
    this.birlikKutu = [];
    const k = Math.max(0.8, Math.min(1.25, this.s * 1.1));
    const W = 30 * k, H = 19 * k;
    // hareket okları
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const b of this.veri.birimler) {
      if (b.sonraki < 0) continue;
      const [x1, y1] = this.merkez[b.bolge]!, [x2, y2] = this.merkez[b.sonraki]!;
      const ax = this.ox + x1 * this.s, ay = this.oy + y1 * this.s, bx = this.ox + x2 * this.s, by = this.oy + y2 * this.s;
      const saldiri = b.durus === 2 || b.muharebe;
      ctx.strokeStyle = saldiri ? T.cephe : T.secim; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.4;
      ctx.globalAlpha = this.seciliBirlik.has(b.id) ? 1 : 0.75;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx - (bx - ax) * 0.18, by - (by - ay) * 0.18); ctx.stroke();
      const ang = Math.atan2(by - ay, bx - ax);
      const hx = bx - (bx - ax) * 0.18, hy = by - (by - ay) * 0.18;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 9 * Math.cos(ang - 0.45), hy - 9 * Math.sin(ang - 0.45)); ctx.lineTo(hx - 9 * Math.cos(ang + 0.45), hy - 9 * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill();
      if (b.ilerleme > 0) { const t = b.ilerleme / 100 * 0.82; ctx.beginPath(); ctx.arc(ax + (bx - ax) * t, ay + (by - ay) * t, 3.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // bölge başına yığın
    const yigin = new Map<number, { kendi: HaritaBirim[]; yab: HaritaYabanci[] }>();
    for (const b of this.veri.birimler) { const y = yigin.get(b.bolge) ?? { kendi: [], yab: [] }; y.kendi.push(b); yigin.set(b.bolge, y); }
    for (const b of this.veri.yabanci) { const y = yigin.get(b.bolge) ?? { kendi: [], yab: [] }; y.yab.push(b); yigin.set(b.bolge, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [r, y] of yigin) {
      const [mx, my] = this.merkez[r]!;
      let x = this.ox + mx * this.s - W / 2, yy = this.oy + my * this.s - H / 2 - 4 * k;
      const goster = y.kendi.slice(0, 3);
      goster.forEach((b, i) => {
        const bx = x + i * 5 * k, by = yy - i * 5 * k;
        this.kutu(bx, by, W, H, this.renkUlke(b.ulke), b.sablon, b.org, b.egitim > 0, this.seciliBirlik.has(b.id), b.muharebe === 1);
        this.birlikKutu.push({ id: b.id, x: bx, y: by, w: W, h: H });
      });
      if (y.kendi.length > 3) { ctx.font = `600 ${10 * k}px "IBM Plex Sans Condensed", sans-serif`; ctx.fillStyle = T.etiket; ctx.fillText(`+${y.kendi.length - 3}`, x + W + 12 * k, yy + H / 2); }
      if (y.kendi.length) yy += H + 6 * k;
      for (const f of y.yab) {
        this.kutu(x, yy, W, H, this.renkUlke(f.ulke), 0, 100, false, false, false, `${f.birlik}×`);
        ctx.font = `500 ${9.5 * k}px "IBM Plex Sans Condensed", sans-serif`;
        const g = f.kesin ? `${Math.round(f.gucAlt / 1000)}` : `${Math.round(f.gucAlt / 1000)}–${Math.round(f.gucUst / 1000)}`;
        ctx.lineWidth = 3; ctx.strokeStyle = T.etiketGolge; ctx.strokeText(g, x + W / 2, yy + H + 7 * k); ctx.fillStyle = T.etiket; ctx.fillText(g, x + W / 2, yy + H + 7 * k);
        x += W + 4 * k;
      }
    }
  }

  private kutu(x: number, y: number, w: number, h: number, renk: string, sablon: number, org: number, egitim: boolean, secili: boolean, muharebe: boolean, metin?: string): void {
    const ctx = this.ctx, T = this.tema;
    ctx.fillStyle = karis(renk, '#ffffff', 0.12); ctx.fillRect(x, y, w, h);
    ctx.lineWidth = secili ? 2.4 : 1.2; ctx.strokeStyle = secili ? T.secim : (muharebe ? T.cephe : T.sinir);
    ctx.strokeRect(x, y, w, h);
    // NATO benzeri simge
    ctx.strokeStyle = T.etiket; ctx.lineWidth = 1.3;
    const ix = x + 4, iy = y + 3, iw = w - 8, ih = h - 8;
    ctx.beginPath();
    if (metin !== undefined) { ctx.font = `600 ${h * 0.5}px "IBM Plex Sans Condensed", sans-serif`; ctx.fillStyle = T.etiket; ctx.fillText(metin || '?', x + w / 2, y + h / 2 - 1); }
    else if (sablon === 0 || sablon === 3) { ctx.moveTo(ix, iy); ctx.lineTo(ix + iw, iy + ih); ctx.moveTo(ix + iw, iy); ctx.lineTo(ix, iy + ih); }
    else if (sablon === 1) { ctx.moveTo(ix, iy + ih); ctx.lineTo(ix + iw, iy); }
    else { ctx.arc(x + w / 2, iy + ih / 2, ih * 0.28, 0, Math.PI * 2); ctx.fillStyle = T.etiket; ctx.fill(); }
    ctx.stroke();
    if (sablon === 3) { ctx.font = `600 ${h * 0.42}px sans-serif`; }
    // organizasyon çubuğu
    ctx.fillStyle = T.etiketGolge; ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillStyle = org > 60 ? T.iyi : org > 30 ? T.orta : T.kotu; ctx.fillRect(x, y + h - 3, w * Math.max(0, Math.min(1, org / 100)), 3);
    if (egitim) { ctx.fillStyle = T.etiketGolge; ctx.globalAlpha = 0.5; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
  }

  private olaylar(): void {
    const cv = this.cv;
    const parmak = new Map<number, { x: number; y: number }>();
    let bas: { x: number; y: number; t: number } | null = null;
    let tasindi = false;
    let pinchD = 0;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      parmak.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (parmak.size === 1) { bas = { x: e.offsetX, y: e.offsetY, t: performance.now() }; tasindi = false; }
      if (parmak.size === 2) { const [a, b] = [...parmak.values()]; pinchD = Math.hypot(a!.x - b!.x, a!.y - b!.y); tasindi = true; }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = parmak.get(e.pointerId);
      if (!p) return;
      const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
      if (parmak.size === 1) {
        if (bas && Math.hypot(e.offsetX - bas.x, e.offsetY - bas.y) > 7) tasindi = true;
        if (tasindi) { this.ox += dx; this.oy += dy; this.isaretle(); }
      } else if (parmak.size === 2) {
        p.x = e.offsetX; p.y = e.offsetY;
        const [a, b] = [...parmak.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinchD > 0) this.zoom(d / pinchD, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
        pinchD = d;
        return;
      }
      p.x = e.offsetX; p.y = e.offsetY;
    });
    const bitir = (e: PointerEvent) => {
      const vardi = parmak.has(e.pointerId);
      parmak.delete(e.pointerId);
      if (!vardi || parmak.size > 0) return;
      if (!tasindi && bas) this.dokun(e.offsetX, e.offsetY, e.shiftKey || e.ctrlKey || performance.now() - bas.t > 450);
      bas = null;
    };
    cv.addEventListener('pointerup', bitir);
    cv.addEventListener('pointercancel', (e) => { parmak.delete(e.pointerId); bas = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX, e.offsetY); }, { passive: false });
  }

  zoom(f: number, cx: number, cy: number): void {
    const r = this.cv.getBoundingClientRect();
    const min = 0.8 * Math.min(r.width / this.pkg.harita.gen, r.height / this.pkg.harita.yuk);
    const ns = Math.max(min, Math.min(4.5, this.s * f));
    const k = ns / this.s;
    this.ox = cx - (cx - this.ox) * k; this.oy = cy - (cy - this.oy) * k; this.s = ns;
    this.isaretle();
  }

  private dokun(x: number, y: number, coklu: boolean): void {
    for (let i = this.birlikKutu.length - 1; i >= 0; i--) {
      const b = this.birlikKutu[i]!;
      if (x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3) { this.onBirlik(b.id, coklu); return; }
    }
    const wx = (x - this.ox) / this.s, wy = (y - this.oy) / this.s;
    for (let r = 0; r < this.yollar.length; r++) if (this.ctx.isPointInPath(this.yollarDunya(r), wx, wy)) { this.onBolge(r); return; }
    this.onBos();
  }
  private yollarDunya(r: number): Path2D {
    // isPointInPath mevcut dönüşümü kullanır: dünyaya göre sınamak için birim dönüşüm
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    return this.yollar[r]!;
  }
}
