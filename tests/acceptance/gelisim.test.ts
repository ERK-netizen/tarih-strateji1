import { describe, it, expect } from 'vitest';
import { dunya, ilerle } from './_ortak.ts';
import { insaYuvasi, birlikSiniri, tekCarpan, siyasiKisilik } from '../../packages/engine/src/systems/gelisim.ts';
import { siyasiKisiler } from '../../packages/engine/src/siyasiKisiler.ts';

describe('v1.6 gelişim', () => {
  it('Şehir ve altyapı geliştikçe inşa yuvası artar', () => {
    const w = dunya(0);
    const r = w.pkg.ulkeler[0]!.baskent, e = w.pkg.bolgeler[r]!.eyalet;
    const once = insaYuvasi(w, e).yuva;
    w.R.c.kent[r] = Math.min(10, w.R.c.kent[r]! + 4);
    for (const x of w.pkg.eyaletler[e]!.bolgeler) w.R.c.altyapi[x] = Math.min(10, w.R.c.altyapi[x]! + 2);
    expect(insaYuvasi(w, e).yuva).toBeGreaterThan(once);
  });
  it('Birlik sınırı ülke geliştikçe artar', () => {
    const w = dunya(0);
    const once = birlikSiniri(w, 0).sinir;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === 0) { w.R.c.kent[r] = Math.min(10, w.R.c.kent[r]! + 3); w.R.c.sivilF[r] = w.R.c.sivilF[r]! + 2; }
    expect(birlikSiniri(w, 0).sinir).toBeGreaterThan(once);
  });
  it('Teknoloji muharebe çarpanlarını iyileştirir; kayıp ve alınan hasar azalır', () => {
    const w = dunya(0);
    const a = tekCarpan(w, 0);
    for (let i = 0; i < 36; i++) w.tekBitti[0 * (w.tekBitti.length / w.nC) + i] = 6;
    const b = tekCarpan(w, 0);
    expect(b.saldiri).toBeGreaterThan(a.saldiri);
    expect(b.savunma).toBeGreaterThan(a.savunma);
    expect(b.dayanim).toBeLessThan(a.dayanim);
    expect(b.kayip).toBeLessThan(a.kayip);
  });
  it('Siyasi kişilik görev yılı dışında başa geçmez ve her ülkede çiftlenmez', () => {
    const w = dunya(0);
    const k = siyasiKisilik(w, 0);
    expect(k.kisiler.every((x) => !x.basta || x.aktif)).toBe(true);
    const adlar = siyasiKisiler('buyuk').map((x) => x.kod + x.ad);
    expect(new Set(adlar).size).toBe(adlar.length);
    ilerle(w, 3);
  });
});
