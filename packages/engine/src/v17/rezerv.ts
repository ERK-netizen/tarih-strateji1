/**
 * Maden rezervi: her kaynak yatağının sonlu bir rezervi vardır (başlangıçta nominal çıkarmanın REZERV_YIL yılı).
 * Rezerv oranı %25'in altına inince verim doğrusal düşer; rezerv tükenince çıkarma sıfırdır. Kanonik durum w.v17.resources'tadır.
 */
import type { World } from '../state/world.ts';
import type { V17Resource } from './state.ts';

export const REZERV_YIL = 45;
export const REZERV_ESIK = 250_000; // S ölçekli: kalan oranı bunun altına inince verim düşer
const S = 1_000_000;
export type KaynakTur = 'celik' | 'komur' | 'petrol';
const TUR_NO: Record<KaynakTur, number> = { celik: 0, komur: 1, petrol: 2 };
const ANAHTAR = 'v17RezervDizin';

export const baslangicRezervi = (capacity: number): number => capacity * 365 * REZERV_YIL;

function dizin(w: World): Map<number, V17Resource> {
  let m = w.onbellek.get(ANAHTAR) as Map<number, V17Resource> | undefined;
  if (!m || (m as Map<number, V17Resource> & { n?: number }).n !== w.v17.resources.length) {
    m = new Map();
    for (const q of w.v17.resources) m.set(q.region * 4 + TUR_NO[q.kind], q);
    (m as Map<number, V17Resource> & { n?: number }).n = w.v17.resources.length;
    w.onbellek.set(ANAHTAR, m);
  }
  return m;
}
/** Kalan rezerv oranı (S); yatak yoksa ya da rezerv bilinmiyorsa S. */
export function rezervOrani(q: V17Resource): number {
  if (q.reserve < 0 || q.capacity <= 0) return S;
  return Math.min(S, Math.floor((q.reserve * S) / baslangicRezervi(q.capacity)));
}
/** Çıkarmayı rezerve göre sınırlar ve rezervden düşer; kullanılabilen miktarı döndürür. */
export function rezervdenCikar(w: World, r: number, tur: KaynakTur, miktar: number): number {
  if (miktar <= 0) return 0;
  const q = dizin(w).get(r * 4 + TUR_NO[tur]);
  if (!q || q.reserve < 0) return miktar;
  const oran = rezervOrani(q);
  const izin = oran >= REZERV_ESIK ? miktar : Math.floor((miktar * oran) / REZERV_ESIK);
  const al = Math.min(izin, q.reserve);
  q.reserve -= al;
  return al;
}
