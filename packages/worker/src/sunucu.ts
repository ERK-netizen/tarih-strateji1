// Simülasyon Worker'ının çekirdeği: tek yazar. Mesaj döngüsünden bağımsızdır (Node testlerinde de çalışır).
import {
  type World, type Paket, senaryoBaslat, gunIlerle, onizle, kuyrugaAl, serilestir, coz, acikla, tarihMetni, ayEkle, dunyaHash, anlatiHash,
  type Emir,
} from '@ts/engine';
import { ayristir, emirMetni, type Sonuc } from '@ts/command';
import { KayitDeposu, type Depo } from '@ts/storage';
import { katalogKur } from './katalog.ts';
import * as G from './gorunum.ts';
import { danis } from './danisman.ts';
import { dogrula, mesaj, type Mesaj, type AdvanceP } from '@ts/protocol';

const SESSIZE_ALINAMAZ = new Set(['savas', 'baskent', 'teslim', 'temerrut', 'gida', 'olay', 'gerekce', 'baris']);

export class Sunucu {
  w: World | null = null;
  son: Uint8Array | null = null; // son kesinleşmiş gün (kurtarma)
  kayit: KayitDeposu;
  durdurIstek = false;
  calisiyor = false;
  constructor(public pkg: Paket, depo: Depo, public gonder: (m: Mesaj, aktar?: Transferable[]) => void, public bekle: () => Promise<void> = () => new Promise((r) => setTimeout(r, 0))) {
    this.kayit = new KayitDeposu(depo);
  }

  private yanit(id: number, t: string, p: unknown, aktar?: Transferable[]) { this.gonder(mesaj(id, t, p), aktar); }

  async isle(ham: unknown): Promise<void> {
    const d = dogrula(ham);
    if (!d.ok) { this.yanit((ham as { id?: number })?.id ?? -1, 'error', { kod: 'protokol', ayrinti: d.neden, oneri: 'Uygulamayı yeniden başlatın.' }); return; }
    const m = d.m;
    try {
      switch (m.t) {
        case 'init': return this.init(m);
        case 'preview': return this.yanit(m.id, 'previewCard', this.kart(m.p as Emir));
        case 'submit': return this.submit(m);
        case 'command': return this.komut(m);
        case 'advance': return void (await this.advance(m));
        case 'stop': this.durdurIstek = true; return;
        case 'query': return this.query(m);
        case 'explain': return this.yanit(m.id, 'explanation', acikla(this.dunya(), String(m.p), this.dunya().oyuncu));
        case 'save': return void (await this.kaydet(m.id, String((m.p as { yuva?: string })?.yuva ?? 'manuel')));
        case 'load': return void (await this.yukle(m));
        case 'branch': return void (await this.dal(m));
        case 'saves': return this.yanit(m.id, 'saveList', await this.kayit.yuvalar());
        case 'deleteSave': await this.kayit.sil(String(m.p)); return this.yanit(m.id, 'saveList', await this.kayit.yuvalar());
        case 'exportSave': { const b = this.paketle(); return this.yanit(m.id, 'fileReady', { ad: `tarih-strateji-${this.dunya().gun}.tsk`, bayt: b.buffer }, [b.buffer]); }
        case 'sandbox': return this.submit({ ...m, p: { ...(m.p as object), tur: 'sandbox' } });
        case 'switch': { const p = m.p as { oyuncu: number; mod: number }; const w = this.dunya(); w.oyuncu = p.oyuncu; w.mod = p.mod; this.son = serilestir(w); return this.yanit(m.id, 'ready', this.hazir()); }
      }
    } catch (e) {
      this.yanit(m.id, 'error', { kod: 'istisna', ayrinti: String((e as Error)?.message ?? e), oneri: 'Son kesinleşmiş güne dönüldü.' });
    }
  }

  dunya(): World { if (!this.w) throw new Error('oyun başlatılmadı'); return this.w; }

  private init(m: Mesaj) {
    const p = m.p as { oyuncu: number; mod: number };
    this.w = senaryoBaslat(this.pkg, p.oyuncu, p.mod);
    this.son = serilestir(this.w);
    this.yanit(m.id, 'ready', this.hazir());
  }
  private hazir() {
    const w = this.dunya();
    return { gun: w.gun, tarih: tarihMetni(w.gun), surum: w.surum, paket: `${w.pkg.kimlik}@${w.pkg.surum}`, hash: dunyaHash(w), oyuncu: w.oyuncu, mod: w.mod };
  }

  kart(e: Emir) {
    const w = this.dunya();
    const k = onizle(w, { ...e, ulke: w.oyuncu });
    return { ...k, esdeger: emirMetni({ ...e, ulke: w.oyuncu }, katalogKur(w)) };
  }

  private submit(m: Mesaj) {
    const w = this.dunya();
    const p = m.p as { emirler?: Emir[]; beklenenSurum?: number } & Emir;
    const emirler: Emir[] = p.emirler ?? [p as Emir];
    if (w.mod === 2) return this.yanit(m.id, 'orderResult', { kabul: false, neden: 'Gözlemci modunda emir verilemez.' });
    const sonuc = emirler.map((e) => {
      const em = { ...e, ulke: w.oyuncu };
      const k = onizle(w, em);
      if (!k.gecerli) return { kabul: false, neden: k.neden, baslik: k.baslik };
      kuyrugaAl(w, em);
      return { kabul: true, baslik: k.baslik, esdeger: emirMetni(em, katalogKur(w)) };
    });
    this.yanit(m.id, 'orderResult', { sonuc, kuyruk: w.kuyruk.length });
  }

  private komut(m: Mesaj) {
    const w = this.dunya();
    const p = m.p as { metin: string; secili?: number[] };
    const s: Sonuc = ayristir(p.metin, katalogKur(w, p.secili ?? []));
    let ek: unknown = null;
    if (s.tur === 'emir') ek = this.kart(s.yorum.emir);
    else if (s.tur === 'belirsiz') ek = s.secenekler.map((y) => this.kart(y.emir));
    else if (s.tur === 'soru') ek = danis(w, s.konu, s.ulke, s.bolge);
    this.yanit(m.id, 'commandResult', { sonuc: s, ek });
  }

  private query(m: Mesaj) {
    const w = this.dunya();
    const p = m.p as { gorunum: string; kapsam?: number; hepsi?: boolean };
    let v: unknown;
    switch (p.gorunum) {
      case 'ozet': v = G.ozet(w); break;
      case 'harita': v = G.harita(w); break;
      case 'bolge': v = G.bolge(w, p.kapsam ?? 0); break;
      case 'birlik': v = G.birlikler(w); break;
      case 'diplomasi': v = G.diplomasiG(w); break;
      case 'ekonomi': v = G.ekonomiG(w); break;
      case 'arastirma': v = G.arastirmaG(w); break;
      case 'istatistik': v = G.istatistik(w, p.kapsam ?? w.oyuncu); break;
      case 'kronik': v = G.kronik(w, !!p.hepsi); break;
      case 'danisman': v = danis(w, 'oneri'); break;
      default: v = null;
    }
    this.yanit(m.id, 'view', { gorunum: p.gorunum, veri: v });
  }

  /** Zaman ilerletme: her gün kesinleşir; durma koşulunda kesinleşmiş gün sonunda durur. */
  async advance(m: Mesaj): Promise<void> {
    const w = this.dunya();
    if (this.calisiyor) return this.yanit(m.id, 'error', { kod: 'mesgul', ayrinti: 'Zaman zaten ilerliyor.' });
    const p = m.p as AdvanceP;
    const bas = w.gun;
    let hedef: number;
    switch (p.birim) {
      case 'gun': hedef = bas + Math.max(1, p.adet); break;
      case 'hafta': hedef = bas + 7 * Math.max(1, p.adet); break;
      case 'ay': hedef = ayEkle(bas, Math.max(1, p.adet)); break;
      case 'yil': hedef = ayEkle(bas, 12 * Math.max(1, p.adet)); break;
      default: hedef = ayEkle(bas, 3); // sonraki önemli olay: en çok üç ay (tur temposu)
    }
    const sessiz = new Set(p.sessiz ?? []);
    this.calisiyor = true; this.durdurIstek = false;
    let neden = 'hedef';
    const durmalar: unknown[] = [];
    try {
      while (w.gun < hedef) {
        if (this.durdurIstek) { neden = 'kullanici'; break; }
        let s;
        try { s = gunIlerle(w); }
        catch (e) {
          // bütünlük hatası: gün kesinleşmez, son kesinleşmiş güne dönülür
          if (this.son) this.w = coz(this.son, this.pkg);
          this.yanit(m.id, 'error', { kod: 'butunluk', ayrinti: String((e as Error).message), oneri: 'Gün geri alındı. Kaydı dışa aktarıp geliştiriciye iletin.' });
          neden = 'hata';
          break;
        }
        this.son = s.bayt;
        const delta = new Int8Array(w.nR + 4);
        for (let r = 0; r < w.nR; r++) delta[r] = w.R.c.kontrolEden[r]!;
        this.yanit(m.id, 'dayCommitted', { gun: s.gun, tarih: tarihMetni(s.gun), surum: s.surum, hash: s.hash, ilerleme: Math.min(100, Math.floor(((s.gun - bas) * 100) / Math.max(1, hedef - bas))), delta: delta.buffer, bildirim: s.bildirimler.filter((b) => b.ulke === w.oyuncu || b.durdur).slice(0, 8) }, [delta.buffer]);
        const dur = s.durmalar.filter((b) => SESSIZE_ALINAMAZ.has(b.tur) || !sessiz.has(b.tur));
        if (dur.length) { neden = 'olay'; durmalar.push(...dur); break; }
        if (p.birim === 'olay' && w.OL.list().some((x) => w.OL.c.ulke[x] === w.oyuncu)) { neden = 'olay'; break; }
        await this.bekle(); // mesaj döngüsüne dön: "Durdur" aç bırakılmaz (T061)
      }
    } finally { this.calisiyor = false; }
    // tur sonu otomatik kayıt
    if (neden !== 'hata') await this.kaydet(-1, 'otomatik').catch(() => undefined);
    this.yanit(m.id, 'stopped', { neden, durmalar, gun: this.dunya().gun, tarih: tarihMetni(this.dunya().gun), gecen: this.dunya().gun - bas, rapor: this.rapor(bas) });
  }

  private rapor(bas: number) {
    const w = this.dunya();
    const olaylar = w.anlati.filter((a) => a.gun > bas && (a.onem >= 2 || a.ulke === w.oyuncu)).slice(-12).reverse().map((a) => ({ tarih: tarihMetni(a.gun), metin: a.metin, onem: a.onem }));
    return { olaylar };
  }

  /** Kayıt kapsayıcısı: simülasyon baytları + hash dışı anlatı ve tarihçe. */
  paketle(): Uint8Array {
    const w = this.dunya();
    const sim = serilestir(w);
    const ek = new TextEncoder().encode(JSON.stringify({ anlati: w.anlati, tarihce: w.tarihce, anlatiHash: anlatiHash(w) }));
    const out = new Uint8Array(8 + sim.length + ek.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, 0x43534b54, true); dv.setUint32(4, sim.length, true);
    out.set(sim, 8); out.set(ek, 8 + sim.length);
    return out;
  }
  ac(b: Uint8Array): World {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (dv.getUint32(0, true) !== 0x43534b54) throw new Error('Geçersiz kayıt dosyası');
    const n = dv.getUint32(4, true);
    const w = coz(b.subarray(8, 8 + n), this.pkg);
    try { const ek = JSON.parse(new TextDecoder().decode(b.subarray(8 + n))); w.anlati = ek.anlati ?? []; w.tarihce = ek.tarihce ?? []; } catch { /* anlatı yok */ }
    return w;
  }

  async kaydet(id: number, yuva: string) {
    const w = this.dunya();
    const b = this.paketle();
    const bas = await this.kayit.kaydet(yuva, b, { gun: w.gun, etiket: `${w.pkg.ulkeler[w.oyuncu]!.kisa} · ${tarihMetni(w.gun)}`, sandbox: w.mod === 1, ulke: w.oyuncu, zaman: new Date().toISOString() });
    if (id >= 0) this.yanit(id, 'saveResult', bas);
    return bas;
  }

  private async yukle(m: Mesaj) {
    const p = m.p as { yuva?: string; bayt?: ArrayBuffer };
    let b: Uint8Array | null = null;
    if (p.bayt) b = new Uint8Array(p.bayt);
    else if (p.yuva) b = (await this.kayit.yukle(p.yuva))?.veri ?? null;
    if (!b) return this.yanit(m.id, 'error', { kod: 'kayit', ayrinti: 'Geçerli kayıt bulunamadı.' });
    this.w = this.ac(b);
    this.son = serilestir(this.w);
    this.yanit(m.id, 'ready', this.hazir());
  }

  /** Dal: mevcut durumu yeni adla kaydeder; geçmişe dönüş açıkça yeni dal açar. */
  private async dal(m: Mesaj) {
    const p = m.p as { kaynak?: string; ad: string };
    if (p.kaynak) {
      const k = await this.kayit.yukle(p.kaynak);
      if (!k) return this.yanit(m.id, 'error', { kod: 'kayit', ayrinti: 'Kaynak kayıt yok.' });
      this.w = this.ac(k.veri);
    }
    const b = await this.kaydet(-1, p.ad);
    this.yanit(m.id, 'saveResult', b);
  }
}
