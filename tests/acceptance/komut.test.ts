// Bölüm 20: Türkçe komut sistemi (T093A, T094, T119–T123).
import { describe, test, expect } from 'vitest';
import { ayristir, emirMetni, ekle, type Sonuc } from '@ts/command';
import { readFileSync } from 'node:fs';
import { katalogKur } from '../../packages/worker/src/katalog.ts';
import { diplomasi, gunIlerle } from '@ts/engine';
import { dunya } from './_ortak.ts';

const w = dunya(0, 0);
const kat = katalogKur(w);
const tur = (s: Sonuc) => (s.tur === 'emir' ? s.yorum.emir.tur : s.tur === 'belirsiz' ? `belirsiz:${s.secenekler[0]!.emir.tur}` : s.tur);

describe('T119 kip × olumsuzluk matrisi', () => {
  const ws = dunya(0, 0); diplomasi.savasIlan(ws, 0, 2);
  const k = katalogKur(ws);
  const olumlu = ["Tunçkale'ye saldır", "Tunçkale'ye saldırın", "Tunçkale'ye saldırsın", "Tunçkale'ye saldıralım", "Tunçkale'ye saldırmalıyız", "Tunçkale'ye saldırılsın", "Tunçkale'ye saldıracak", "Tunçkale'ye saldırmak istiyorum"];
  for (const m of olumlu) test(`olumlu: ${m}`, () => { const s = ayristir(m, k); expect(['saldir', 'belirsiz:saldir']).toContain(tur(s)); });
  const olumsuz = ["Tunçkale'ye saldırma", "Tunçkale'ye saldırmayın", "Tunçkale'ye saldırmasın", "Tunçkale'ye saldırmayalım", "Tunçkale'ye saldırmamalıyız"];
  for (const m of olumsuz) test(`olumsuz: ${m}`, () => { const s = ayristir(m, k); expect(['bilgi', 'dur']).toContain(tur(s)); });
  test('isim-fiil + istek olumludur: "saldırma emri ver"', () => { expect(tur(ayristir("Tunçkale'ye saldırma emri ver", k))).not.toBe('bilgi'); });
});

describe('T120 hal ekleri rol belirler', () => {
  test('yönelme = hedef, ayrılma = kaynak ülke', () => {
    const s = ayristir("Kızılova'dan her hafta 200 gıda al", kat);
    expect(s.tur).toBe('emir');
    if (s.tur === 'emir') expect(s.yorum.emir).toMatchObject({ tur: 'satinAl', kimden: 3, miktar: 200, kalici: 1 });
  });
  test('bulunma+ki = birlik seçimi', () => {
    const r = kat.birlikler[0]!.bolge;
    const ad = w.pkg.bolgeler[r]!.ad;
    const hedef = w.pkg.bolgeler[w.pkg.bolgeler[r]!.komsu.find((x) => w.R.c.kontrolEden[x] === 0)!]!.ad;
    const s = ayristir(`${ekle(ad, 'bulunmaKi')} birlikler ${ekle(hedef, 'yonelme')} gitsin`, kat);
    expect(s.tur).toBe('emir');
    if (s.tur === 'emir') expect((s.yorum.emir.birlikler as number[]).length).toBe(kat.birlikler.filter((b) => b.bolge === r).length);
  });
  test('ASCII yazım (Türkçe klavyesiz) tanınır', () => { expect(tur(ayristir('kizilova ile ittifak kur', kat))).toBe('teklif'); });
});

describe('T121 soru cümleleri danışmana gider, emir üretmez', () => {
  for (const m of ['Huzur neden düşüyor?', 'ne yapmalıyım', 'Demirhan saldıracak mı', 'savaş nasıl gidiyor', 'Gıda yeterli mi?'])
    test(m, () => expect(ayristir(m, kat).tur).toBe('soru'));
});

describe('T122 tanınmayan komut: ret + en yakın üç seçenek', () => {
  test('uçak gemisi inşa et', () => {
    const s = ayristir('uçak gemisi inşa et', kat);
    expect(s.tur).toBe('ret');
    if (s.tur === 'ret') { expect(s.oneriler).toHaveLength(3); expect(s.tanimsiz).toBe(true); }
  });
  test('anlamsız metin', () => { expect(ayristir('lorem ipsum dolor', kat).tur).toBe('ret'); });
});

describe('T093A/T094 güven eşiği ve kabul kümesi', () => {
  test('güven < 0,80 → uygulanabilir emir değil, en çok üç yorum çipi', () => {
    const s = ayristir("Kızılova'ya saldır", kat);
    expect(s.tur).toBe('belirsiz');
    if (s.tur === 'belirsiz') expect(s.secenekler.length).toBeLessThanOrEqual(3);
  });
  const kume = JSON.parse(readFileSync('tests/corpus/komutlar.json', 'utf8')) as { metin: string; tur: string }[];
  test(`Türkçe kabul kümesi (${kume.length} cümle) ≥ %90 doğru tür`, () => {
    let dogru = 0;
    const yanlis: string[] = [];
    for (const k of kume) { const t = tur(ayristir(k.metin, kat)); if (t === k.tur || t === `belirsiz:${k.tur}`) dogru++; else yanlis.push(`${k.metin} → ${t}`); }
    expect(dogru / kume.length, yanlis.join('\n')).toBeGreaterThanOrEqual(0.9);
  });
});

describe('T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür', () => {
  const ws = dunya(0, 0); diplomasi.savasIlan(ws, 0, 2); gunIlerle(ws);
  const k = katalogKur(ws);
  const u = k.birlikler[0]!.id;
  const hedef = ws.pkg.bolgeler.findIndex((b, i) => ws.R.c.kontrolEden[i] === 2);
  const emirler = [
    { tur: 'vergi', ulke: 0, oran: 180_000 }, { tur: 'askerlik', ulke: 0, yasa: 2 }, { tur: 'ekonomi', ulke: 0, yasa: 2 }, { tur: 'karne', ulke: 0, acik: 1 },
    { tur: 'birlikKur', ulke: 0, sablon: 0, adet: 2 }, { tur: 'hareket', ulke: 0, birlikler: [u], hedef: k.birlikler[0]!.bolge === 1 ? 2 : 1 },
    { tur: 'saldir', ulke: 0, birlikler: [u], hedef }, { tur: 'arastir', ulke: 0, tek: 5 }, { tur: 'insa', ulke: 0, proje: 1, bolge: 0 },
    { tur: 'satinAl', ulke: 0, mal: 0, miktar: 300, kalici: 0 }, { tur: 'sat', ulke: 0, mal: 2, miktar: 50, kalici: 1 },
    { tur: 'teklif', ulke: 0, kime: 3, tip: 1 }, { tur: 'gerekce', ulke: 0, hedef: 3 }, { tur: 'savasIlan', ulke: 0, hedef: 3 },
    { tur: 'baris', ulke: 0, kime: 2, barisTur: 0, bolgeler: [] }, { tur: 'tutum', ulke: 0, kime: 2, tutum: 3 }, { tur: 'borcAl', ulke: 0, miktar: 1_000_000 },
    { tur: 'otoCephe', ulke: 0, acik: 1 }, { tur: 'uretim', ulke: 0, urun: 100, fabrika: 3000 }, { tur: 'sandbox', ulke: 0, alan: 'hazine', miktar: 500_000 },
    { tur: 'isgalPol', ulke: 0, pol: 2 },
  ];
  for (const e of emirler) test(e.tur, () => {
    const m = emirMetni(e, k);
    const s = ayristir(m, k);
    const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
    expect(t, `${m} → ${s.tur}`).toBeTruthy();
    expect(t!.tur).toBe(e.tur);
    for (const key of Object.keys(e).filter((x) => !['ulke', 'birlikler', 'kalici', 'bolgeler'].includes(x))) expect(t![key], `${m}: ${key}`).toEqual((e as Record<string, unknown>)[key]);
  });
});
