import { test, expect } from 'vitest';
import { ayristir } from '@ts/command';
import { katalogKur } from '../../packages/worker/src/katalog.ts';
import { hazirKomutlar, hazirKomutSayisi } from '../../packages/ui/src/hazirKomutlar.ts';
import { dunya } from './_ortak.ts';
const w = dunya(0, 0);
const kat = katalogKur(w);
const ctx = { komsu: 'Kızılova', dusman: 'Demirhan', bolge: 'Akyurt', sablon: 'piyade tümeni' };
test('en az 50 hazır komut vardır', () => { expect(hazirKomutSayisi(ctx)).toBeGreaterThanOrEqual(50); });
test('hazır komutların tamamı ayrıştırılır', () => {
  const kotu: string[] = [];
  for (const g of hazirKomutlar(ctx)) for (const m of g.komutlar) { const s = ayristir(m, kat); if (s.tur === 'ret') kotu.push(`${m} → ${(s as any).neden ?? ''}`); }
  expect(kotu).toEqual([]);
});
