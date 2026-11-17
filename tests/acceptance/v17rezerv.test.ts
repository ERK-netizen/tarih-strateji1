// Maden rezervi: sonlu yataklar, %25 altında doğrusal düşüş, tükenince sıfır; ilk yıllarda üretim değişmez.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { senaryoBaslat, gunIlerle, serilestir, coz, dunyaHash, v17View, type Paket, type World } from '@ts/engine';
import { rezervdenCikar, rezervOrani, baslangicRezervi, REZERV_ESIK } from '../../packages/engine/src/v17/rezerv.ts';

const p1914 = JSON.parse(readFileSync('data/derlenmis/s1914.json', 'utf8')) as Paket;
const yeni = (c = 0): World => senaryoBaslat(JSON.parse(JSON.stringify(p1914)) as Paket, c, 2);
const gunler = (w: World, n: number) => {
  for (let i = 0; i < n; i++) gunIlerle(w, false);
};

describe('maden rezervi', () => {
  test('her yatak başlangıçta nominal çıkarmanın 45 yılı kadar rezervle kurulur', () => {
    const w = yeni();
    expect(w.v17.resources.length).toBeGreaterThan(100);
    for (const q of w.v17.resources) {
      expect(q.reserve).toBe(baslangicRezervi(q.capacity));
      expect(rezervOrani(q)).toBe(1_000_000);
    }
  });
  test('ilk 90 günde üretim rezervli ve rezervsiz (sınırsız) dünyada birebir aynıdır', () => {
    const a = yeni(),
      b = yeni();
    for (const q of b.v17.resources) q.reserve = -1;
    gunler(a, 90);
    gunler(b, 90);
    for (let c = 0; c < a.nC; c++) {
      expect(a.C.c.celik[c]).toBe(b.C.c.celik[c]);
      expect(a.C.c.komur[c]).toBe(b.C.c.komur[c]);
      expect(a.C.c.petrol[c]).toBe(b.C.c.petrol[c]);
    }
  });
  test('çıkarma rezerve göre sınırlanır: eşik üstünde tam, altında doğrusal, tükenince sıfır; rezerv eksiye düşmez', () => {
    const w = yeni();
    const q = w.v17.resources.find((x) => x.kind === 'komur')!;
    const taban = baslangicRezervi(q.capacity);
    expect(rezervdenCikar(w, q.region, 'komur', 1000)).toBe(1000);
    expect(q.reserve).toBe(taban - 1000);
    q.reserve = Math.floor((taban * REZERV_ESIK) / 2 / 1_000_000); // eşiğin yarısı → verim %50
    const once = q.reserve;
    const oran = rezervOrani(q);
    const beklenen = Math.floor((1000 * oran) / REZERV_ESIK);
    expect(Math.abs(beklenen - 500)).toBeLessThanOrEqual(1);
    expect(rezervdenCikar(w, q.region, 'komur', 1000)).toBe(beklenen);
    expect(q.reserve).toBe(once - beklenen);
    q.reserve = 3;
    expect(rezervdenCikar(w, q.region, 'komur', 1_000_000)).toBeLessThanOrEqual(3);
    expect(q.reserve).toBeGreaterThanOrEqual(0);
    q.reserve = 0;
    expect(rezervdenCikar(w, q.region, 'komur', 1000)).toBe(0);
    expect(rezervdenCikar(w, 0, 'celik', 0)).toBe(0);
  });
  test('tükenen bölgenin üretimi düşer; ülke toplamı yatağın payı kadar azalır', () => {
    const a = yeni(),
      b = yeni();
    const c = 0;
    const yatak = (w: World) => w.v17.resources.filter((q) => w.R.c.kontrolEden[q.region] === c && q.kind === 'komur');
    expect(yatak(a).length).toBeGreaterThan(0);
    for (const q of yatak(b)) q.reserve = 0;
    gunler(a, 30);
    gunler(b, 30);
    expect(b.C.c.komurDun[c]!).toBeLessThan(a.C.c.komurDun[c]!);
  });
  test('kayıt ve yükleme rezervi korur; görünüm kalan oranı verir; kayıttan sonra devam hash eşittir', () => {
    const w = yeni();
    gunler(w, 20);
    const y = coz(serilestir(w), w.pkg);
    expect(y.v17.resources.map((q) => q.reserve)).toEqual(w.v17.resources.map((q) => q.reserve));
    gunler(w, 10);
    gunler(y, 10);
    expect(dunyaHash(y)).toBe(dunyaHash(w));
    const v = v17View(w);
    expect(v.resources.length).toBeGreaterThan(0);
    for (const r of v.resources) {
      expect(r.remaining).toBeGreaterThan(0);
      expect(r.remaining).toBeLessThanOrEqual(1_000_000);
      expect(r.regionName.length).toBeGreaterThan(0);
    }
  });
});
