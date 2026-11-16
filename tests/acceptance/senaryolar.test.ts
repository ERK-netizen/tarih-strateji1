// Gerçek dünya senaryoları: derlenmiş paketler, belirlenimcilik, kayıt dönüşü ve paket eşlemesi.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { senaryoBaslat, gunIlerle, serilestir, coz, dunyaHash, kayitPaketi, onizle, ortak, type Paket } from '@ts/engine';
import { BellekDepo } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const OZET = JSON.parse(readFileSync('data/derlenmis/senaryolar.json', 'utf8')) as { kimlik: string; oneCikan: { i: number }[] }[];
const GEO = JSON.parse(readFileSync('data/derlenmis/dunya-geo.json', 'utf8')) as { poligon: unknown[] };

describe('Beş tarihî senaryo', () => {
  test('senaryo listesi beş dönemi içerir ve her paket ortak geometriyle aynı bölge sayısındadır', () => {
    expect(OZET.map((s) => s.kimlik)).toEqual(['s750', 's1600', 's1914', 's1939', 's2026']);
    for (const s of OZET) expect(oku(s.kimlik).bolgeler.length).toBe(GEO.poligon.length);
  });
  for (const s of OZET) {
    test(`${s.kimlik}: adlar dolu, her bölgenin sahibi var, başkentler kendi topraklarında`, () => {
      const p = oku(s.kimlik);
      for (const b of p.bolgeler) { expect(b.ad.trim().length).toBeGreaterThan(1); expect(b.sahip).toBeGreaterThanOrEqual(0); }
      for (const [i, u] of p.ulkeler.entries()) {
        expect(u.ad.trim().length, u.kod).toBeGreaterThan(2);
        if (!u.pasif) { expect(u.lider.trim().length, u.kod).toBeGreaterThan(1); expect(p.bolgeler[u.baskent]!.sahip, `${u.kod} başkenti`).toBe(i); }
      }
    });
    test(`${s.kimlik}: aynı tohumla iki koşu aynı hash; kayıt dönüşü kesintisiz`, () => {
      const P = s.oneCikan[0]!.i;
      const a = senaryoBaslat(oku(s.kimlik), P, 0), b = senaryoBaslat(oku(s.kimlik), P, 0);
      for (let i = 0; i < 4; i++) { gunIlerle(a); gunIlerle(b); }
      expect(dunyaHash(a)).toBe(dunyaHash(b));
      const bayt = serilestir(a);
      expect(kayitPaketi(bayt)).toEqual({ kimlik: s.kimlik, surum: a.pkg.surum });
      const c = coz(bayt, a.pkg);
      expect(dunyaHash(c)).toBe(dunyaHash(a));
      gunIlerle(a); gunIlerle(c);
      expect(dunyaHash(c)).toBe(dunyaHash(a));
    }, 30_000);
  }
  test('hareket önizlemesi yol boyunca gerçek hız kuralıyla gün tahmin eder (modern çağ hızlı)', () => {
    const w = senaryoBaslat(oku('s2026'), OZET[4]!.oneCikan[0]!.i, 0);
    const P = w.oyuncu;
    const U = ortak.uc(w);
    const u = ortak.ulkeBirlikleri(w, P).find((x) => U.egitimBitis![x]! <= w.gun && w.pkg.bolgeler[U.bolge![x]!]!.komsu.some((q) => w.R.c.kontrolEden[q] === P))!;
    const r = U.bolge![u]!;
    const hedef = w.pkg.bolgeler[r]!.komsu.find((q) => w.R.c.kontrolEden[q] === P)!;
    const k = onizle(w, { tur: 'hareket', ulke: P, birlikler: [w.U.id(u)], hedef });
    expect(k.gecerli, k.neden).toBe(true);
    const gun = Number(/≈ (\d+) gün/.exec(k.tahmin!.join(' '))![1]);
    expect(gun).toBeGreaterThanOrEqual(1);
    expect(gun).toBeLessThan(20);
  });
});

describe('Worker: senaryo paketi arayüzden gelir', () => {
  test('init paketle başlar; kayıt başka pakete aitse yükleme "paket" hatasıyla doğru kimliği bildirir', async () => {
    const depo = new BellekDepo();
    const giden: { t: string; p: any }[] = [];
    const s1 = new Sunucu(null, depo, (m) => giden.push({ t: m.t, p: m.p }));
    await s1.isle({ v: PROTOKOL_SURUM, id: 1, t: 'init', p: { oyuncu: OZET[2]!.oneCikan[0]!.i, mod: 0, paket: oku('s1914') } });
    expect(giden.at(-1)!.t).toBe('ready');
    await s1.isle({ v: PROTOKOL_SURUM, id: 2, t: 'save', p: { yuva: 'deneme' } });
    expect(giden.at(-1)!.p.paket).toBe('s1914');
    const s2 = new Sunucu(oku('s1939'), depo, (m) => giden.push({ t: m.t, p: m.p }));
    await s2.isle({ v: PROTOKOL_SURUM, id: 3, t: 'load', p: { yuva: 'deneme' } });
    expect(giden.at(-1)!.t).toBe('error');
    expect(giden.at(-1)!.p).toMatchObject({ kod: 'paket', paket: 's1914' });
    await s2.isle({ v: PROTOKOL_SURUM, id: 4, t: 'load', p: { yuva: 'deneme', paket: oku('s1914') } });
    expect(giden.at(-1)!.t).toBe('ready');
    expect(giden.at(-1)!.p.paket).toBe('s1914@3.0.0');
  }, 30_000);
});
