/**
 * Ortak stok defteri (açıklama ve denetim katmanı). Üretim hesabı eski sanayiGunu'nda tek yol olarak kalır; bu defter
 * her günkü çelik/kömür girişini, hat başına tüketimi ve darboğazı kaydeder. Kanonik durumda değildir (hash'e girmez):
 * w.onbellek altında son günün kaydı tutulur, kayıttan yüklemede bir sonraki günde yeniden oluşur.
 */
import type { World } from '../state/world.ts';

export type Darbogaz = 'yok' | 'celik' | 'komur' | 'teknoloji' | 'fabrika';
export interface DefterHat {
  urun: number;
  atanan: number;
  uretilen: number;
  celikTuketim: number;
  komurTuketim: number;
  karsilama: number;
  darbogaz: Darbogaz;
}
export interface DefterUlke {
  gun: number;
  celikOnce: number;
  komurOnce: number;
  celikGelir: number;
  komurGelir: number;
  celikTuketim: number;
  komurTuketim: number;
  celikSonra: number;
  komurSonra: number;
  /** stok tavanı (30 günlük akış) kırpması: önce + gelir − tüketim − kırpma = sonra */
  celikKirpma: number;
  komurKirpma: number;
  hatlar: DefterHat[];
}
const ANAHTAR = 'v17Defter';

function harita(w: World): Map<number, DefterUlke> {
  let m = w.onbellek.get(ANAHTAR) as Map<number, DefterUlke> | undefined;
  if (!m) {
    m = new Map();
    w.onbellek.set(ANAHTAR, m);
  }
  return m;
}
export function defterAc(w: World, c: number, celik: number, komur: number, celikGelir: number, komurGelir: number): DefterUlke {
  const d: DefterUlke = {
    gun: w.gun,
    celikOnce: celik,
    komurOnce: komur,
    celikGelir,
    komurGelir,
    celikTuketim: 0,
    komurTuketim: 0,
    celikSonra: celik,
    komurSonra: komur,
    celikKirpma: 0,
    komurKirpma: 0,
    hatlar: [],
  };
  harita(w).set(c, d);
  return d;
}
export function defterHat(d: DefterUlke, h: DefterHat): void {
  d.hatlar.push(h);
  d.celikTuketim += h.celikTuketim;
  d.komurTuketim += h.komurTuketim;
}
export function defterKapat(d: DefterUlke, celikSonra: number, komurSonra: number): void {
  d.celikSonra = celikSonra;
  d.komurSonra = komurSonra;
  d.celikKirpma = d.celikOnce + d.celikGelir - d.celikTuketim - celikSonra;
  d.komurKirpma = d.komurOnce + d.komurGelir - d.komurTuketim - komurSonra;
}
export function defterOku(w: World, c: number): DefterUlke | undefined {
  return (w.onbellek.get(ANAHTAR) as Map<number, DefterUlke> | undefined)?.get(c);
}
