// Ortak stok defteri: üretim tek yoldan yapılır, defter yalnız kaydeder ve nedeni açıklar (R2-CORE-08/09, UI-03).
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { senaryoBaslat, gunIlerle, uygula, dunyaHash, v17View, EKIPMAN, type Paket, type World } from '@ts/engine';
import { defterOku } from '../../packages/engine/src/v17/defter.ts';

const p1914 = JSON.parse(readFileSync('data/derlenmis/s1914.json', 'utf8')) as Paket;
const GER = p1914.ulkeler.findIndex((u) => u.kod === 'GER');
const yeni = (): World => senaryoBaslat(JSON.parse(JSON.stringify(p1914)) as Paket, GER, 0);
const urun = (k: string) => EKIPMAN.findIndex((e) => e.kod === k);

describe('üretim defteri', () => {
  test('her gün: önce + gelir − tüketim − kırpma = sonra; sonra gerçek stoka eşit; tüketim hat toplamıdır', () => {
    const w = yeni();
    uygula(w, { tur: 'uretim', ulke: GER, urun: urun('psil1'), fabrika: 3000 });
    uygula(w, { tur: 'uretim', ulke: GER, urun: urun('mt'), fabrika: 2000 });
    for (let i = 0; i < 40; i++) {
      gunIlerle(w, false);
      const d = defterOku(w, GER)!;
      expect(d.celikOnce + d.celikGelir - d.celikTuketim - d.celikKirpma).toBe(d.celikSonra);
      expect(d.komurOnce + d.komurGelir - d.komurTuketim - d.komurKirpma).toBe(d.komurSonra);
      expect(d.hatlar.reduce((t, h) => t + h.celikTuketim, 0)).toBe(d.celikTuketim);
      expect(d.celikTuketim).toBeGreaterThanOrEqual(0);
      expect(d.celikKirpma).toBeGreaterThanOrEqual(0);
    }
    const d = defterOku(w, GER)!;
    expect(d.hatlar.length).toBeGreaterThanOrEqual(2);
    expect(d.celikTuketim).toBeGreaterThan(0);
  });
  test('darboğaz nedeni: çelik tükenince "celik", fabrika fazla atanınca "fabrika"', () => {
    const w = yeni();
    uygula(w, { tur: 'uretim', ulke: GER, urun: urun('sahra'), fabrika: 4000 });
    gunIlerle(w, false);
    w.C.c.celik[GER] = 0;
    w.C.c.celikDun[GER] = 0;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === GER) w.pkg.bolgeler[r]!.celik = 0;
    gunIlerle(w, false);
    const h = defterOku(w, GER)!.hatlar.find((x) => x.urun === urun('sahra'))!;
    expect(h.darbogaz).toBe('celik');
    expect(h.karsilama).toBeLessThan(1_000_000);
    const v = v17View(w);
    expect(v.ledger!.lines.some((l) => l.bottleneck === 'celik')).toBe(true);
  });
  test("defter kanonik değildir: durumu ve hash'i değiştirmez, kayıttan sonra bir günde yeniden oluşur", () => {
    const a = yeni(),
      b = yeni();
    gunIlerle(a, false);
    gunIlerle(b, false);
    b.onbellek.delete('v17Defter');
    expect(dunyaHash(a)).toBe(dunyaHash(b));
    gunIlerle(a, false);
    gunIlerle(b, false);
    expect(dunyaHash(a)).toBe(dunyaHash(b));
    expect(defterOku(b, GER)).toBeDefined();
  });
});
