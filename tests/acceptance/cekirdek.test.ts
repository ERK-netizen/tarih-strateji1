// Bölüm 6: sayı sözleşmesi, rastlantı, hash, kimlik.
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { mulRatio, divRatio, mulDiv, sqrtInt, roundHalfEven, largestRemainder, S, sayac, rng, combatR, uniformInt, hashV1, Table, gunNo, tarih, ayEkle } from '@ts/engine';

describe('6.2 aritmetik', () => {
  test('mulRatio şartname örneği: 7.300.000.000.123 × 1,25', () => {
    expect(mulRatio(7_300_000_000_123, 1_250_000)).toEqual({ q: 9_125_000_000_153, rem: 750_000 });
  });
  test('mulRatio BigInt ile aynı (özellik)', () => {
    fc.assert(fc.property(fc.integer({ min: -9e12, max: 9e12 }), fc.integer({ min: 0, max: 9e8 }), (a, r) => {
      const p = BigInt(a) * BigInt(r);
      const { q, rem } = mulRatio(a, r);
      return BigInt(q) * BigInt(S) + BigInt(rem) === p;
    }), { numRuns: 2000 });
  });
  test('divRatio ve mulDiv taban doğruluğu', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 9e12 }), fc.integer({ min: 1000, max: 9e8 }), (a, r) => BigInt(divRatio(a, r)) === (BigInt(a) * BigInt(S)) / BigInt(r)), { numRuns: 1000 });
    fc.assert(fc.property(fc.integer({ min: 0, max: 9e12 }), fc.integer({ min: 0, max: 9e6 }), fc.integer({ min: 1, max: 9e9 }), (a, b, d) => { const e = (BigInt(a) * BigInt(b)) / BigInt(d); fc.pre(e <= BigInt(Number.MAX_SAFE_INTEGER)); return BigInt(mulDiv(a, b, d).q) === e; }), { numRuns: 1000 });
  });
  test('sqrtInt tam kare denetimi', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 16e12 }), (x) => { const r = sqrtInt(x); return r * r <= x && (r + 1) * (r + 1) > x; }), { numRuns: 2000 });
  });
  test('roundHalfEven', () => {
    expect([roundHalfEven(5, 2), roundHalfEven(7, 2), roundHalfEven(-5, 2), roundHalfEven(10, 4)]).toEqual([2, 4, -2, 2]);
  });
  test('largestRemainder toplamı korur', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1e9 }), fc.array(fc.integer({ min: 0, max: 1e7 }), { minLength: 1, maxLength: 9 }), (t, w) => {
      const p = largestRemainder(t, w);
      return w.reduce((a, b) => a + b, 0) === 0 || p.reduce((a, b) => a + b, 0) === t;
    }));
  });
});

describe('6.5 rastlantı rng.v1', () => {
  test('sabit test vektörleri', () => {
    const v = JSON.parse(readFileSync('tests/acceptance/rng.v1.json', 'utf8')) as { anahtar: number[]; cikti: number }[];
    for (const x of v) expect(rng(...(x.anahtar as [number, number, number, number, number, number, number, number]))).toBe(x.cikti);
  });
  test('T097 muharebe çarpanı r ∈ [0,85; 1,15]', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffffffff }), (u) => { const r = combatR(u); return r >= 850_000 && r <= 1_150_000; }));
    expect(combatR(0)).toBe(850_000);
    expect(combatR(0xffffffff)).toBe(1_150_000);
    expect(uniformInt(0xffffffff, 10)).toBe(9);
  });
});

describe('6.6–6.7 hash ve kimlik', () => {
  test('hash.v1 kararlı ve hassas', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    expect(hashV1(a)).toBe(hashV1(new Uint8Array([1, 2, 3, 4, 5])));
    expect(hashV1(a)).not.toBe(hashV1(new Uint8Array([1, 2, 3, 4, 6])));
    expect(hashV1(a)).toMatch(/^[0-9a-f]{16}$/);
  });
  test('T010 silinen yuva yeniden kullanılınca eski kimlik geçersiz', () => {
    const t = new Table('t', [['x', 'f64']] as const, 2);
    const s = t.alloc(); const id = t.id(s);
    t.release(s);
    const s2 = t.alloc();
    expect(s2).toBe(s);
    expect(t.resolve(id)).toBe(-1);
    expect(t.resolve(t.id(s2))).toBe(s2);
  });
  test('6.4 takvim: ay atlaması son güne kırpılır, gidiş-dönüş', () => {
    const g = gunNo({ y: 1916, m: 1, d: 31 });
    expect(tarih(ayEkle(g, 1))).toEqual({ y: 1916, m: 2, d: 29 });
    expect(tarih(gunNo({ y: 1914, m: 6, d: 28 }))).toEqual({ y: 1914, m: 6, d: 28 });
  });
  test('T101 soğuk yol sayacı başlangıçta tanımlı', () => { expect(typeof sayac.sogukYol).toBe('number'); });
});
