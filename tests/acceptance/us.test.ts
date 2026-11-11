import { test, expect } from 'vitest';
import { uygula as emir, onizle, diplomasi, us, gunIlerle } from '@ts/engine';
import { dunya } from './_ortak.ts';

test('hava üssü: kapasite, inşa ve cephe menzili', () => {
  const w = dunya(0, 0);
  const kap0 = us.ucakKapasitesi(w, 0);
  expect(kap0).toBeGreaterThan(0);
  expect(us.ucakToplam(w, 0)).toBeLessThanOrEqual(kap0);
  // barışta hiçbir bölge aktif cephe değildir; hava gücü gönderilemez
  expect(us.cepheler(w, 0)).toEqual([]);
  const r = w.pkg.bolgeler.findIndex((_, i) => w.R.c.sahip[i] === 0);
  expect(onizle(w, { tur: 'havaGorev', ulke: 0, gorev: 1, bolge: r }).gecerli).toBe(false);
  expect(onizle(w, { tur: 'donanmaGonder', ulke: 0, bolge: r }).gecerli).toBe(false);
  // savaş sonrası cepheler oluşur
  let d = -1;
  for (let q = 0; q < w.nR && d < 0; q++) if (w.R.c.sahip[q] === 0) for (const z of w.komsuluk[q]!) { const o = w.R.c.sahip[z]!; if (o !== 0 && o >= 0) { d = o; break; } }
  diplomasi.savasIlan(w, 0, d);
  for (let i = 0; i < 30; i++) gunIlerle(w);
  const cp = us.cepheler(w, 0);
  expect(cp.length).toBeGreaterThan(0);
  const x = cp.find((q) => us.usMesafesi(w, 0, q) <= us.havaMenzili());
  if (x !== undefined) expect(emir(w, { tur: 'havaGorev', ulke: 0, gorev: 1, bolge: x }).ok).toBe(true);
});
