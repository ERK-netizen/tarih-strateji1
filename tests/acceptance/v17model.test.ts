// v1.7: adlı model üretimi eski üretim hattına bağlıdır; çıktı artmaz, yalnız ad ve toplam yazılır (R04/R10, çifte üretim yok).
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ck as ckAnahtar } from '../../packages/engine/src/state/world.ts';
import { senaryoBaslat, gunIlerle, uygula, onizle, serilestir, coz, dunyaHash, kuvvet, v17View, EKIPMAN, type Paket, type World } from '@ts/engine';

const p1914 = JSON.parse(readFileSync('data/derlenmis/s1914.json', 'utf8')) as Paket;
const kod = (k: string) => p1914.ulkeler.findIndex((u) => u.kod === k);
const GER = kod('GER'), GBR = kod('GBR'), FRA = kod('FRA');
const yeni = (c = GER): World => senaryoBaslat(JSON.parse(JSON.stringify(p1914)) as Paket, c, 0);
const gunler = (w: World, n: number) => { for (let i = 0; i < n; i++) gunIlerle(w, false); };
const urun = (k: string) => EKIPMAN.findIndex((e) => e.kod === k);
const ck = (w: World, c: number, u: number): number => w.ekip[ckAnahtar(c, u)]!;

describe('v1.7 adlı model üretimi', () => {
  test('kapı: ülke ve yıl; başka ülkenin modeli ve henüz çıkmamış model reddedilir; aile desteği yoksa reddedilir', () => {
    const w = yeni();
    expect(onizle(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'gew98', fabrika: 1000 }).gecerli).toBe(true);
    const bas = onizle(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'smle_mk3', fabrika: 1000 });
    expect(bas.gecerli).toBe(false); expect(bas.neden).toMatch(/ülke ve yılda kullanılamaz/);
    expect(onizle(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'fokker_e1', adet: 1 }).gecerli).toBe(false); // 1915
    expect(onizle(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'yok' }).gecerli).toBe(false);
    const f = yeni(FRA); f.gun += 1200; // 1917
    const t = onizle(f, { tur: 'v17SanayiGorevi', ulke: FRA, model: 'renault_ft', fabrika: 1000 });
    expect(t.gecerli).toBe(false); expect(t.neden).toMatch(/üretim hattı yok/);
  });
  test('çifte üretim yok: adlı emir eski "uretim" emriyle aynı hat, aynı stok ve aynı hat tablosunu üretir', () => {
    const a = yeni(), b = yeni();
    const u = urun('psil1');
    expect(uygula(a, { tur: 'uretim', ulke: GER, urun: u, fabrika: 2000 }).ok).toBe(true);
    expect(uygula(b, { tur: 'v17SanayiGorevi', ulke: GER, model: 'gew98', fabrika: 2000 }).ok).toBe(true);
    gunler(a, 90); gunler(b, 90);
    expect(Number.isFinite(ck(a, GER, u))).toBe(true);
    expect(ck(b, GER, u)).toBe(ck(a, GER, u));
    const hat = (w: World) => w.HT.list().filter((s) => w.HT.c.ulke[s] === GER).map((s) => [w.HT.c.urun[s], w.HT.c.fabrika[s], w.HT.c.verim[s], w.HT.c.wip[s]]);
    expect(hat(b)).toEqual(hat(a));
    expect(a.C.c.celik[GER]).toBe(b.C.c.celik[GER]);
    const satir = b.v17.modelLines.find((l) => l.country === GER)!;
    expect(satir.modelId).toBe('gew98');
    expect(satir.produced).toBeGreaterThan(0);
    // adlı toplam, eski hattın gerçek çıktısını aşamaz: stok artışı + silahlandırmada kullanılan ≥ üretilen; en azından stok farkı kadar
    expect(b.v17.modelLines.length).toBe(1);
  });
  test('aynı ürün için tek adlı hat: yeni model eskisinin adını devralır, toplam sıfırdan sayılır', () => {
    const w = yeni();
    expect(uygula(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'gew98', fabrika: 1500 }).ok).toBe(true);
    gunler(w, 40);
    const once = w.v17.modelLines[0]!.produced;
    expect(once).toBeGreaterThan(0);
    // kapı: Gewehr dışındaki tüfek yoktur; aynı model yeniden verilirse hat yenilenir
    expect(uygula(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'gew98', fabrika: 1500 }).ok).toBe(true);
    expect(w.v17.modelLines.length).toBe(1);
    expect(w.v17.modelLines[0]!.produced).toBe(0);
    expect(w.HT.list().filter((s) => w.HT.c.ulke[s] === GER && w.HT.c.urun[s] === urun('psil1')).length).toBe(1);
  });
  test('farklı ürünler ayrı adlı hat tutar; fabrika 0 eski hattı da durdurur', () => {
    const w = yeni();
    expect(uygula(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'gew98', fabrika: 1000 }).ok).toBe(true);
    expect(uygula(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'mg08', fabrika: 1000 }).ok).toBe(true);
    expect(w.v17.modelLines.map((l) => l.modelId).sort()).toEqual(['gew98', 'mg08']);
    expect(uygula(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'mg08', fabrika: 0 }).ok).toBe(true);
    expect(w.HT.list().some((s) => w.HT.c.ulke[s] === GER && w.HT.c.urun[s] === urun('mt'))).toBe(false);
  });
  test('uçak modeli eski uçak siparişini açar; teslim edilen uçaklar modele yazılır', () => {
    const w = yeni(GBR);
    w.C.c.hazine[GBR] = 5_000_000_000;
    const o = onizle(w, { tur: 'v17SanayiGorevi', ulke: GBR, model: 'be2', adet: 2 });
    expect(o.gecerli, o.neden).toBe(true);
    const proje0 = w.PR.count();
    expect(uygula(w, { tur: 'v17SanayiGorevi', ulke: GBR, model: 'be2', adet: 2 }).ok).toBe(true);
    expect(w.PR.count()).toBe(proje0 + 1);
    const ucak0 = w.C.c.h2[GBR]!;
    kuvvet.ucakTeslim(w, GBR, 2, 7);
    expect(w.C.c.h2[GBR]).toBe(ucak0 + 7);
    expect(w.v17.modelLines.find((l) => l.modelId === 'be2')!.produced).toBe(7);
  });
  test('görünüm, kayıt ve yeniden oynatma: adlı hat kayıttan döner; hash eşittir', () => {
    const w = yeni();
    uygula(w, { tur: 'v17SanayiGorevi', ulke: GER, model: 'gew98', fabrika: 1000 });
    gunler(w, 30);
    const v = v17View(w);
    expect(v.modelLines.length).toBe(1);
    expect(v.modelLines[0]!.modelName).toBe('Gewehr 98');
    const y = coz(serilestir(w), w.pkg);
    expect(y.v17.modelLines).toEqual(w.v17.modelLines);
    gunler(w, 20); gunler(y, 20);
    expect(dunyaHash(y)).toBe(dunyaHash(w));
  });
});
