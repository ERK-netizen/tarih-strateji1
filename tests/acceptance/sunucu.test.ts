// Worker çekirdeği, protokol, kayıt deposu, performans.
import { describe, test, expect } from 'vitest';
import { BellekDepo, KayitDeposu } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import { gunIlerle } from '@ts/engine';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';
import { pkg, dunya } from './_ortak.ts';

function kur() {
  const giden: { t: string; p: any; aktar?: Transferable[] }[] = [];
  const depo = new BellekDepo();
  let s!: Sunucu;
  const bekle = async () => { await Promise.resolve(); if (giden.filter((m) => m.t === 'dayCommitted').length === 3) s.durdurIstek = true; };
  s = new Sunucu(pkg, depo, (m, aktar) => giden.push({ t: m.t, p: m.p, aktar }), bekle);
  const iste = (t: string, p: unknown, id = 1) => s.isle({ v: PROTOKOL_SURUM, id, t, p });
  return { s, giden, depo, iste };
}

describe('5.3 Worker protokolü', () => {
  test('bilinmeyen tür ve yanlış sürüm error üretir, sessizce yutulmaz', async () => {
    const { s, giden } = kur();
    await s.isle({ v: PROTOKOL_SURUM, id: 5, t: 'uydurma', p: null });
    await s.isle({ v: 99, id: 6, t: 'init', p: {} });
    expect(giden.map((g) => g.t)).toEqual(['error', 'error']);
  });
  test('T061 Durdur bir sonraki gün sınırında uygulanır', async () => {
    const { giden, iste } = kur();
    await iste('init', { oyuncu: 0, mod: 0 });
    await iste('advance', { birim: 'yil', adet: 1, sessiz: [] }, 2);
    const gun = giden.filter((g) => g.t === 'dayCommitted').length;
    const dur = giden.find((g) => g.t === 'stopped')!;
    expect(gun).toBe(3);
    expect(['kullanici', 'olay']).toContain(dur.p.neden);
  });
  test('T067 günlük delta ayrı ArrayBuffer olarak aktarılır; dünya tamponları aktarılmaz', async () => {
    const { s, giden, iste } = kur();
    await iste('init', { oyuncu: 0, mod: 0 });
    await iste('advance', { birim: 'gun', adet: 2, sessiz: [] }, 2);
    const d = giden.find((g) => g.t === 'dayCommitted')!;
    expect(d.aktar).toHaveLength(1);
    expect(d.aktar![0]).toBe(d.p.delta);
    expect(s.dunya().pop.buffer).not.toBe(d.p.delta);
    expect(s.dunya().pop.length).toBeGreaterThan(0);
  });
  test('komut → önizleme kartı ve eşdeğer komut', async () => {
    const { giden, iste } = kur();
    await iste('init', { oyuncu: 0, mod: 0 });
    await iste('command', { metin: '2 piyade tümeni kur' }, 3);
    const r = giden.find((g) => g.t === 'commandResult')!.p;
    expect(r.sonuc.tur).toBe('emir');
    expect(r.ek.gecerli).toBe(true);
    expect(r.ek.esdeger).toBe('2 piyade tümeni kur');
  });
  test('Gözlemci modunda emir reddedilir', async () => {
    const { giden, iste } = kur();
    await iste('init', { oyuncu: 0, mod: 2 });
    await iste('submit', { tur: 'vergi', oran: 200_000 }, 4);
    expect(giden.find((g) => g.t === 'orderResult')!.p.kabul).toBe(false);
  });
});

describe('24.1 kayıt deposu (nesil + A/B başlık)', () => {
  test('T117 kesilen yazım bir önceki geçerli nesle döner', async () => {
    const d = new BellekDepo();
    const k = new KayitDeposu(d);
    const meta = { gun: 1, etiket: 'x', sandbox: false, ulke: 0, zaman: '2026-11-04T00:00:00Z' };
    await k.kaydet('y', new Uint8Array([1, 2, 3]), meta);
    d.bozuk.add('y.g000002');
    await expect(k.kaydet('y', new Uint8Array([4, 5, 6, 7]), meta)).rejects.toThrow();
    const r = await k.yukle('y');
    expect([...r!.veri]).toEqual([1, 2, 3]);
    expect(r!.baslik.nesil).toBe(1);
  });
  test('T118 başlık var ama nesil dosyası bozuk → özet tutmaz, eski nesil', async () => {
    const d = new BellekDepo();
    const k = new KayitDeposu(d);
    const meta = { gun: 1, etiket: 'x', sandbox: false, ulke: 0, zaman: '2026-11-04T00:00:00Z' };
    await k.kaydet('y', new Uint8Array([1, 1, 1]), meta);
    await k.kaydet('y', new Uint8Array([2, 2, 2]), meta);
    d.m.set('y.g000002', new Uint8Array([9, 9, 9]));
    expect([...(await k.yukle('y'))!.veri]).toEqual([1, 1, 1]);
  });
  test('tam kayıt kapsayıcısı: kaydet → yükle aynı hash ve Kronik', async () => {
    const { s, iste } = kur();
    await iste('init', { oyuncu: 1, mod: 0 });
    for (let i = 0; i < 20; i++) gunIlerle(s.dunya());
    const h = (await import('@ts/engine')).dunyaHash(s.dunya());
    const kronik = s.dunya().anlati.length;
    await s.kaydet(-1, 'deneme');
    await iste('load', { yuva: 'deneme' }, 9);
    expect((await import('@ts/engine')).dunyaHash(s.dunya())).toBe(h);
    expect(s.dunya().anlati.length).toBe(kronik);
  });
});

describe('26 performans', () => {
  test('T116 bir yıllık atlama Node\'da 6 saniyenin altında', () => {
    const w = dunya();
    const t0 = performance.now();
    for (let i = 0; i < 365; i++) gunIlerle(w);
    expect(performance.now() - t0).toBeLessThan(6000);
  });
});
