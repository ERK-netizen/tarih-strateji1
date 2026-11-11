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
    { tur: 'birlikKur', ulke: 0, sablon: 0, adet: 2 }, { tur: 'birlikKur', ulke: 0, sablon: 1, adet: 3, bolge: ws.pkg.bolgeler.findIndex((b, i) => ws.R.c.kontrolEden[i] === 0 && i !== ws.pkg.ulkeler[0]!.baskent) }, { tur: 'hareket', ulke: 0, birlikler: [u], hedef: k.birlikler[0]!.bolge === 1 ? 2 : 1 },
    { tur: 'saldir', ulke: 0, birlikler: [u], hedef }, { tur: 'arastir', ulke: 0, tek: 5 }, { tur: 'insa', ulke: 0, proje: 1, bolge: 0 },
    { tur: 'satinAl', ulke: 0, mal: 0, miktar: 300, kalici: 0 }, { tur: 'sat', ulke: 0, mal: 2, miktar: 50, kalici: 1 },
    { tur: 'teklif', ulke: 0, kime: 3, tip: 1 }, { tur: 'gerekce', ulke: 0, hedef: 3 }, { tur: 'savasIlan', ulke: 0, hedef: 3 },
    { tur: 'baris', ulke: 0, kime: 2, barisTur: 0, bolgeler: [] }, { tur: 'tutum', ulke: 0, kime: 2, tutum: 3 }, { tur: 'borcAl', ulke: 0, miktar: 1_000_000 },
    { tur: 'otoCephe', ulke: 0, acik: 1 }, { tur: 'uretim', ulke: 0, urun: 100, fabrika: 3000 }, { tur: 'sandbox', ulke: 0, alan: 'hazine', miktar: 500_000 },
    { tur: 'isgalPol', ulke: 0, pol: 2 },
  ];
  for (const [i, e] of emirler.entries()) test(`${e.tur} #${i}`, () => {
    const m = emirMetni(e, k);
    const s = ayristir(m, k);
    const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
    expect(t, `${m} → ${s.tur}`).toBeTruthy();
    expect(t!.tur).toBe(e.tur);
    for (const key of Object.keys(e).filter((x) => !['ulke', 'birlikler', 'kalici', 'bolgeler'].includes(x))) expect(t![key], `${m}: ${key}`).toEqual((e as Record<string, unknown>)[key]);
  });
});

describe('T123b şema 7 emirlerinin eşdeğer komutu aynı emre geri çözülür', () => {
  const ws = dunya(0, 0); diplomasi.savasIlan(ws, 0, 2); gunIlerle(ws);
  const k = katalogKur(ws);
  const u = k.birlikler[0]!.id;
  const kiyi = ws.pkg.bolgeler.findIndex((b, i) => ws.R.c.sahip[i] === 0 && b.kiyi);
  const kizil = ws.pkg.bolgeler.map((_, i) => i).filter((i) => ws.R.c.sahip[i] === 3 && i !== ws.pkg.ulkeler[3]!.baskent).slice(0, 2);
  const emirler: Record<string, unknown>[] = [
    { tur: 'gemiInsa', sinif: 2, adet: 3, bolge: kiyi < 0 ? 0 : kiyi }, { tur: 'ucakUret', tip: 1, adet: 2 },
    { tur: 'donanmaGonder', bolge: kiyi < 0 ? 0 : kiyi }, { tur: 'donanmaGorev', gorev: 0 }, { tur: 'donanmaGorev', gorev: 1 }, { tur: 'donanmaGorev', gorev: 2 }, { tur: 'donanmaGorev', gorev: 3 }, { tur: 'donanmaGorev', gorev: 4 },
    { tur: 'havaGorev', gorev: 0, bolge: -1 }, { tur: 'havaGorev', gorev: 1, bolge: 12 }, { tur: 'havaGorev', gorev: 2, bolge: 13 }, { tur: 'havaGorev', gorev: 3, bolge: 14 }, { tur: 'havaGorev', gorev: 4, bolge: 12 },
    { tur: 'taburEkle', birlikler: [u], tabur: 1, adet: 2 }, { tur: 'taburCikar', birlikler: [u], tabur: 0 },
    { tur: 'rejim', rejim: 2 }, { tur: 'rejim', rejim: 4 }, { tur: 'partiDestek', parti: 3 }, { tur: 'partiDestek', parti: 0 }, { tur: 'secimErken' },
    { tur: 'nufusPol', pol: 0 }, { tur: 'nufusPol', pol: 1 }, { tur: 'nufusPol', pol: 2 }, { tur: 'nufusPol', pol: 3 },
    { tur: 'demografi', bolge: 2, eylem: 1, kimlik: 1 }, { tur: 'demografi', bolge: 2, eylem: 2, kimlik: 0 }, { tur: 'demografi', bolge: 2, eylem: 0, kimlik: 0 },
    { tur: 'surgun', bolge: 2, kimlik: 1 }, { tur: 'soykirim', bolge: 3, kimlik: 2 },
    { tur: 'ekoModel', model: 0 }, { tur: 'ekoModel', model: 3 }, { tur: 'tarife', oran: 250_000 }, { tur: 'sub', alan: 0, oran: 50_000 }, { tur: 'sub', alan: 1, oran: 100_000 },
    { tur: 'tarimOdak', odak: 1 }, { tur: 'tarimOdak', odak: 2 },
    { tur: 'ambargo', kime: 3, acik: 1 }, { tur: 'ambargo', kime: 3, acik: 0 }, { tur: 'sinirOlayi', hedef: 3 }, { tur: 'yardim', kime: 1, miktar: 50_000 },
    { tur: 'darbe', hedef: 3 }, { tur: 'casusluk', hedef: 3 }, { tur: 'suikast', hedef: 3 }, { tur: 'sabotaj', hedef: ws.R.c.sahip[12]!, bolge: 12 }, { tur: 'isyan', hedef: 3 }, { tur: 'iliskiBozma', hedef: 1, hedef2: 3 }, { tur: 'ayrilikci', hedef: 2, bolge: 12 }, { tur: 'bagimsizlik' },
    { tur: 'baris', kime: 2, barisTur: 3, bolgeler: [] }, { tur: 'baris', kime: 2, barisTur: 4, bolgeler: [12] }, { tur: 'baris', kime: 2, barisTur: 5, bolgeler: [2] },
    { tur: 'teklif', kime: 3, tip: 15, bolgeler: kizil, bedel: 100_000 }, { tur: 'teklif', kime: 3, tip: 16, bolgeler: kizil }, { tur: 'teklif', kime: 1, tip: 17 },
  ];
  for (const [i, e0] of emirler.entries()) test(`${String(e0.tur)} #${i}`, () => {
    const e = { ulke: 0, ...e0 } as { tur: string; ulke: number } & Record<string, unknown>;
    const m = emirMetni(e, k);
    const s = ayristir(m, k);
    const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
    expect(t, `${m} → ${s.tur}${s.tur === 'ret' ? `: ${s.neden}` : ''}`).toBeTruthy();
    for (const key of Object.keys(e)) expect(t![key], `${m}: ${key}`).toEqual(e[key]);
  });
});
