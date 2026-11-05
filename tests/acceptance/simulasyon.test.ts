// Belirlenimcilik, korunum, köken muhasebesi, faz hattı, kayıt/yeniden oynatma.
import { describe, test, expect } from 'vitest';
import { gunIlerle, serilestir, coz, dunyaHash, anlatiHash, onizle, kokenDenetim, toplamNufus, hc, ST, YB, NKIMLIK, NHUCRE, sayac, nufus, ortak, kuyrugaAl } from '@ts/engine';
import { dunya, ilerle, pkg } from './_ortak.ts';

describe('belirlenimcilik', () => {
  test('aynı tohum ve emirler aynı günlük hash dizisini üretir', () => {
    const a = ilerle(dunya(), 120), b = ilerle(dunya(), 120);
    expect(a).toEqual(b);
  });
  test('farklı tohum farklı sonuç', () => {
    const w = dunya(); w.tohum = 7;
    expect(ilerle(w, 60).at(-1)).not.toBe(ilerle(dunya(), 60).at(-1));
  });
  test('kayıt → yükleme → devam aynı hash (yeniden oynatma)', () => {
    const w = dunya();
    ilerle(w, 75);
    const w2 = coz(serilestir(w), pkg);
    expect(dunyaHash(w2)).toBe(dunyaHash(w));
    expect(ilerle(w2, 60)).toEqual(ilerle(w, 60));
  });
  test('T114 zorlaTamYol açık/kapalı aynı hash', () => {
    const a = dunya(); const b = dunya(); b.ayarlar.zorlaTamYol = true;
    expect(ilerle(a, 90)).toEqual(ilerle(b, 90));
  });
  test('T115 tahsis önbelleği kapalı/açık aynı hash', () => {
    const a = dunya(); const b = dunya(); b.ayarlar.onbellekKapali = true;
    expect(ilerle(a, 90)).toEqual(ilerle(b, 90));
  });
  test('T096 anlatı hash\'i simülasyon hash\'inden ayrı', () => {
    const w = dunya(); ilerle(w, 10);
    const h = dunyaHash(w), a = anlatiHash(w);
    w.anlati.push({ gun: w.gun, metin: 'deneme', tur: 'x', ulke: 0, onem: 0 });
    expect(dunyaHash(w)).toBe(h);
    expect(anlatiHash(w)).not.toBe(a);
  });
  test('T092 önizleme dünya hash\'ini değiştirmez', () => {
    const w = dunya(0, 0); ilerle(w, 5);
    const h = dunyaHash(w);
    for (const e of [{ tur: 'birlikKur', sablon: 0, adet: 2 }, { tur: 'vergi', oran: 200_000 }, { tur: 'savasIlan', hedef: 2 }, { tur: 'arastir', tek: 5 }, { tur: 'baris', kime: 2, barisTur: 0 }]) onizle(w, { ulke: 0, ...e });
    expect(dunyaHash(w)).toBe(h);
  });
});

describe('korunum ve muhasebe', () => {
  test('nüfus korunumu ve köken defteri 400 gün boyunca (savaş dâhil)', () => {
    const w = dunya();
    const n0 = toplamNufus(w);
    ilerle(w, 400);
    expect(toplamNufus(w)).toBe(n0 + w.sayac.dogum - w.sayac.dogalOlum - w.sayac.askerOlum - w.sayac.ekOlum);
    expect(kokenDenetim(w)).toBeNull();
    // savaş çıkmış ve kayıp verilmiş olmalı (yayılmacı imparatorluk + kriz)
    expect(w.sayac.askerOlum).toBeGreaterThan(0);
  });
  test('T102 köken: birlik partileri + ulusal defter + yoldaki = A hücreleri', () => {
    const w = dunya(); ilerle(w, 200);
    expect(kokenDenetim(w)).toBeNull();
    const U = ortak.uc(w);
    for (const u of w.U.rows()) { let p = 0; for (let k = 0; k < 8; k++) if (U[`ok${k}`]![u]) p++; expect(p).toBeLessThanOrEqual(8); }
  });
  test('T103 kimlik hücresi üst sınırı ve toplam = nüfus', () => {
    const w = dunya(); ilerle(w, 60);
    for (let r = 0; r < w.nR; r++) {
      let n = 0, k = 0;
      for (let i = 0; i < NHUCRE; i++) n += w.pop[r * NHUCRE + i]!;
      for (let i = 0; i < NKIMLIK; i++) k += w.kim[r * NKIMLIK + i]!;
      expect(k).toBe(n);
      expect(pkg.bolgeler[r]!.kimlikAnahtar.length).toBeLessThanOrEqual(7);
    }
  });
  test('T024 negatif nüfus hücresi yoktur; çocuk bandında S/Y/E yoktur', () => {
    const w = dunya(); ilerle(w, 365);
    for (let i = 0; i < w.pop.length; i++) expect(w.pop[i]).toBeGreaterThanOrEqual(0);
    for (let r = 0; r < w.nR; r++) for (const s of [ST.S, ST.Y, ST.E]) expect(w.pop[hc(r, YB.COCUK, s)]).toBe(0);
  });
  test('T104–T105 aylık kohort ve doğal akış nüfusu yalnız doğum−ölüm kadar değiştirir', () => {
    const w = dunya();
    const once = toplamNufus(w), d0 = w.sayac.dogum, o0 = w.sayac.dogalOlum;
    let cocuk0 = 0, asker0 = 0;
    for (let r = 0; r < w.nR; r++) { cocuk0 += w.pop[hc(r, YB.COCUK, ST.O)]!; asker0 += w.pop[hc(r, YB.ASKER, ST.Y)]! + w.pop[hc(r, YB.ASKER, ST.S)]!; }
    nufus.aylikNufus(w);
    expect(toplamNufus(w) - once).toBe((w.sayac.dogum - d0) - (w.sayac.dogalOlum - o0));
    let asker1 = 0;
    for (let r = 0; r < w.nR; r++) asker1 += w.pop[hc(r, YB.ASKER, ST.Y)]! + w.pop[hc(r, YB.ASKER, ST.S)]!;
    expect(asker1).not.toBe(asker0); // giriş ve çıkış gerçekleşti
    expect(cocuk0).toBeGreaterThan(0);
  });
  test('T101 standart fixture günlük hatta soğuk yol (BigInt) sayısı 0', () => {
    const w = dunya();
    const once = sayac.sogukYol;
    ilerle(w, 120);
    expect(sayac.sogukYol - once).toBe(0);
  });
  test('askerlik yasası aktarımı yalnız S↔Y değiştirir (10.4)', () => {
    const w = dunya();
    const a = nufus.insanGucu(w, 0);
    nufus.askerlikAktar(w, 0, 125_000, 250_000);
    const b = nufus.insanGucu(w, 0);
    expect(a.S + a.Y).toBe(b.S + b.Y);
    expect(b.Y).toBeGreaterThan(a.Y);
    expect([b.E, b.A, b.R]).toEqual([a.E, a.A, a.R]);
  });
  test('emir kuyruğu P2\'de işler: vergi değişimi ertesi gün', () => {
    const w = dunya(0, 0);
    kuyrugaAl(w, { tur: 'vergi', ulke: 0, oran: 160_000 });
    expect(w.C.c.vergi[0]).toBe(140_000);
    gunIlerle(w);
    expect(w.C.c.vergi[0]).toBe(160_000);
  });
});
