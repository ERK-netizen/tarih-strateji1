// Komutanlar ve muharebe kaydı (şartname v1.6, PR-07 ve PR-15): V16-T07, T24–T29, T36, T37.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { BellekDepo } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import { komutan, kara, ortak, diplomasi, onizle, uygula, gunIlerle, senaryoBaslat, serilestir, coz, dunyaHash, hashText, kanonikJson, tarih, S, type Paket, type Emir, type World } from '@ts/engine';
import { ayristir, emirMetni } from '@ts/command';
import { katalogKur } from '../../packages/worker/src/katalog.ts';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';
import { pkg, dunya } from './_ortak.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const benim = (w: World, c = 0) => w.U.list().filter((u) => w.U.c.ulke[u] === c);
const km0 = (w: World, c = 0) => komutan.ulkeKomutanlari(w, c)[0]!;
/** Oyuncunun (0) birliklerinin sınırdaş olduğu ilk yabancı devlet. */
const komsu = (w: World): number => { for (const u of benim(w)) for (const v of w.komsuluk[w.U.c.bolge[u]!]!) if (w.R.c.kontrolEden[v] !== 0) return w.R.c.kontrolEden[v]!; throw new Error('komşu yok'); };

describe('V16-T24 / T25 kişi kaydı: tarihî ve kurgu ayrıdır, aynı kişi iki kez oluşmaz, ayrılan atanamaz', () => {
  test('1914: tarihî komutanlar doğru devlette, yaşam aralığında ve tekil', () => {
    const p = oku('s1914');
    const w = senaryoBaslat(p, 0, 2);
    const ad = (c: string) => komutan.ulkeKomutanlari(w, p.ulkeler.findIndex((u) => u.kod === c)).map((k) => komutan.komutanAdi(w, k));
    expect(ad('OSM')).toEqual(expect.arrayContaining(['Mustafa Kemal', 'Enver Paşa', 'Fevzi Çakmak']));
    expect(ad('GER')).toEqual(expect.arrayContaining(['Paul von Hindenburg', 'Erich Ludendorff']));
    expect(ad('FRA')).toContain('Ferdinand Foch');
    // 1939 kuşağı 1914'te henüz görevde değildir
    expect(ad('GER')).not.toContain('Erwin Rommel');
    const hepsi = w.KM.list().map((k) => komutan.komutanAdi(w, k));
    expect(new Set(hepsi).size).toBe(hepsi.length);
    const yil = tarih(w.gun).y;
    for (const k of w.KM.rows()) {
      expect(w.KM.c.dogum[k]! + 18).toBeLessThanOrEqual(yil);
      expect(w.KM.c.bitis[k]).toBeGreaterThanOrEqual(yil);
      expect([0, 1]).toContain(w.KM.c.kaynak[k]);
      // tarihî kişi katalog satırı taşır, kurgu kişi taşımaz
      expect(w.KM.c.kod[k]! > 0).toBe(w.KM.c.kaynak[k] === 0);
      for (const n of ['saldiri', 'savunma', 'lojistik'] as const) { expect(w.KM.c[n][k]).toBeGreaterThanOrEqual(1); expect(w.KM.c[n][k]).toBeLessThanOrEqual(100); }
    }
  });
  test('2026 ve 750: yalnız kurgu komutan (yaşayan gerçek kişi üretilmez)', () => {
    for (const s of ['s2026', 's750']) { const w = senaryoBaslat(oku(s), 0, 2); expect(w.KM.count()).toBeGreaterThan(0); for (const k of w.KM.rows()) expect(w.KM.c.kaynak[k], s).toBe(1); }
  });
  test('hizmeti biten komutan görevden düşer, birlikleri boşalır ve yeniden atanamaz; kaydı silinmez', () => {
    const w = dunya(0, 0);
    const k = km0(w);
    const id = w.KM.id(k);
    const u = benim(w)[0]!;
    expect(uygula(w, { tur: 'komutanAta', ulke: 0, komutan: id, birlikler: [w.U.id(u)] }).ok).toBe(true);
    expect(komutan.birlikKomutani(w, u)).toBe(k);
    w.KM.c.bitis[k] = tarih(w.gun).y - 1;
    for (let i = 0; i < 32; i++) gunIlerle(w, false); // ay başı gelir
    expect(w.KM.c.durum[k]).toBe(1);
    expect(w.KM.alive[k]).toBe(1); // tarihçe için satır kalır
    expect(komutan.birlikKomutani(w, u)).toBe(-1);
    const kart = onizle(w, { tur: 'komutanAta', ulke: 0, komutan: id, birlikler: [w.U.id(u)] });
    expect(kart.gecerli).toBe(false);
    expect(kart.neden).toMatch(/görevde değil/);
    // aynı ad yeniden üretilmez
    const adlar = w.KM.list().map((x) => komutan.komutanAdi(w, x));
    expect(new Set(adlar).size).toBe(adlar.length);
  });
  test('yabancı devletin komutanı atanamaz', () => {
    const w = dunya(0, 0);
    const yabanci = w.KM.id(km0(w, 1));
    expect(onizle(w, { tur: 'komutanAta', ulke: 0, komutan: yabanci, birlikler: [w.U.id(benim(w)[0]!)] }).gecerli).toBe(false);
  });
});

describe('V16-T26 / T27 kapasite ve tek kez uygulanan etki', () => {
  test('kapasite içinde tam etki; aşılınca etki kapasite/yük oranında seyrelir', () => {
    const w = dunya(0, 0);
    const k = km0(w), K = w.KM.c;
    K.saldiri[k] = 80; K.savunma[k] = 60; K.lojistik[k] = 50; K.deneyim[k] = 0; K.kapasite[k] = 2;
    for (const u of benim(w)) w.U.c.komutan[u] = 0;
    const us = benim(w).slice(0, 4);
    w.U.c.komutan[us[0]!] = w.KM.id(k) + 1; w.U.c.komutan[us[1]!] = w.KM.id(k) + 1;
    let c = komutan.komutanCarpan(w, us[0]!, komutan.komutanYuk(w))!;
    expect(c.saldiri).toBe(S + 160_000); // 80 × %0,2
    expect(c.savunma).toBe(S + 120_000);
    expect(c.ikmal).toBe(50_000);
    w.U.c.komutan[us[2]!] = w.KM.id(k) + 1; w.U.c.komutan[us[3]!] = w.KM.id(k) + 1; // 4 birlik, kapasite 2
    c = komutan.komutanCarpan(w, us[0]!, komutan.komutanYuk(w))!;
    expect(c.saldiri).toBe(S + 80_000);
    expect(c.savunma).toBe(S + 60_000);
    // komutansız birlikte etki yok
    w.U.c.komutan[us[3]!] = 0;
    expect(komutan.komutanCarpan(w, us[3]!, komutan.komutanYuk(w))).toBeNull();
  });
  test('muharebede komutan etkisi birlik gücüne tam bir kez çarpılır (kayıttaki güç oranı = çarpan)', () => {
    const kos = (saldiri: number) => {
      const w = dunya(0, 0);
      const D = komsu(w); diplomasi.savasIlan(w, 0, D);
      for (const k of w.KM.rows()) { w.KM.c.saldiri[k] = 1; w.KM.c.savunma[k] = 1; w.KM.c.lojistik[k] = 1; w.KM.c.deneyim[k] = 0; w.KM.c.kapasite[k] = 99; }
      const k = km0(w);
      w.KM.c.saldiri[k] = saldiri;
      for (const u of benim(w)) w.U.c.komutan[u] = w.KM.id(k) + 1;
      // sınırdaki bir birlik düşman bölgesine saldırır
      const u = benim(w).find((x) => w.komsuluk[w.U.c.bolge[x]!]!.some((v) => w.R.c.kontrolEden[v] === D))!;
      const hedef = w.komsuluk[w.U.c.bolge[u]!]!.find((v) => w.R.c.kontrolEden[v] === D)!;
      uygula(w, { tur: 'saldir', ulke: 0, birlikler: [w.U.id(u)], hedef });
      for (let i = 0; i < 12 && !w.muharebeler.some((m) => m.bolge === hedef); i++) gunIlerle(w, false);
      const m = w.muharebeler.find((x) => x.bolge === hedef)!;
      return m.birlikler.find((b) => b.id === w.U.id(u))!.guc;
    };
    const taban = kos(1), guclu = kos(51); // +%10 fark (51 − 1 = 50 puan × %0,2)
    expect(taban).toBeGreaterThan(0);
    const oran = (guclu * 1_000_000) / taban;
    expect(oran).toBeGreaterThan(1_095_000);
    expect(oran).toBeLessThan(1_103_000); // iki kez çarpılsaydı ≈ 1,21 olurdu
  });
});

describe('V16-T07 / T28 daimî emir: aynı gün yürürlükte, koşul tutmazsa komutan gerekçeyle durur', () => {
  test('ikmal eşiği tutmayan taarruz durdurulur ve neden bildirilir; emir gün ilerletmeden kayıtlıdır', async () => {
    const giden: { id: number; t: string; p: any }[] = [];
    const s = new Sunucu(pkg, new BellekDepo(), (m) => giden.push({ id: m.id, t: m.t, p: m.p }));
    const iste = (id: number, t: string, p: unknown) => s.isle({ v: PROTOKOL_SURUM, id, t, p });
    await iste(1, 'init', { oyuncu: 0, mod: 0 });
    const w = s.dunya(), gun = w.gun;
    const D = komsu(w); diplomasi.savasIlan(w, 0, D);
    const k = km0(w), id = w.KM.id(k);
    for (const u of benim(w)) w.U.c.komutan[u] = id + 1;
    await iste(2, 'submit', { tur: 'komutanEmir', komutan: id, emir: 0, ikmalEsik: 1_000_000, orgEsik: 0 });
    expect(giden.find((g) => g.id === 2)!.p.sonuc[0]).toMatchObject({ kabul: true, aninda: true });
    expect(w.gun).toBe(gun);
    expect(w.KM.c.ikmalEsik[k]).toBe(1_000_000);
    // ikmal %100'ün altındaki birlik saldırı emri alır
    const u = benim(w).find((x) => w.komsuluk[w.U.c.bolge[x]!]!.some((v) => w.R.c.kontrolEden[v] === D))!;
    const hedef = w.komsuluk[w.U.c.bolge[u]!]!.find((v) => w.R.c.kontrolEden[v] === D)!;
    w.U.c.gida[u] = 0; w.U.c.muhimmatS[u] = 0;
    expect(ortak.birlikIkmal(w, u).oran).toBeLessThan(1_000_000);
    uygula(w, { tur: 'saldir', ulke: 0, birlikler: [w.U.id(u)], hedef });
    expect(w.U.c.hedef[u]).toBe(hedef);
    komutan.komutanGunu(w);
    expect(w.U.c.hedef[u]).toBe(-1);
    expect(w.anlati.some((a) => /taarruzu durdurdu: ikmal/.test(a.metin))).toBe(true);
  });
  test('"savun" emri otomasyonun taarruzunu iptal eder, oyuncunun elle emrine dokunmaz', () => {
    const w = dunya(0, 0);
    const D = komsu(w); diplomasi.savasIlan(w, 0, D);
    const k = km0(w);
    uygula(w, { tur: 'komutanEmir', ulke: 0, komutan: w.KM.id(k), emir: 1, ikmalEsik: 0, orgEsik: 0 });
    const sinir = benim(w).filter((x) => w.komsuluk[w.U.c.bolge[x]!]!.some((v) => w.R.c.kontrolEden[v] === D));
    const [a, b] = [sinir[0]!, sinir[1] ?? sinir[0]!];
    for (const u of [a, b]) w.U.c.komutan[u] = w.KM.id(k) + 1;
    const hedef = (u: number) => w.komsuluk[w.U.c.bolge[u]!]!.find((v) => w.R.c.kontrolEden[v] === D)!;
    // a: otomasyon (elle önceliği yok), b: oyuncunun elle emri
    w.U.c.hedef[a] = hedef(a); w.U.c.elle[a] = 0;
    komutan.komutanGunu(w);
    expect(w.U.c.hedef[a]).toBe(-1);
    if (b !== a) { w.U.c.hedef[b] = hedef(b); w.U.c.elle[b] = w.gun + 30; komutan.komutanGunu(w); expect(w.U.c.hedef[b]).toBe(hedef(b)); }
  });
});

describe('V16-T29 deneyim ve kurmay eğitimi: bedelli ve tavanlı', () => {
  test('deneyim niteliği tavana kalan yolun en çok yarısı kadar yükseltir', () => {
    expect(komutan.etkinNitelik(50, 0)).toBe(50);
    expect(komutan.etkinNitelik(50, 100_000)).toBe(72); // 50 + (95 − 50)/2
    expect(komutan.etkinNitelik(95, 100_000)).toBe(95);
    expect(komutan.etkinNitelik(99, 100_000)).toBe(95);
  });
  test('kurmay eğitimi siyasi güç ve altın ister, en çok 3 kez verilir, nitelik 95 tavanını aşmaz', () => {
    const w = dunya(0, 0);
    const k = km0(w), id = w.KM.id(k), K = w.KM.c;
    w.C.c.pg[0] = 0;
    expect(onizle(w, { tur: 'komutanEgit', ulke: 0, komutan: id }).gecerli).toBe(false);
    w.C.c.pg[0] = 500_000; w.C.c.hazine[0] = 100;
    expect(onizle(w, { tur: 'komutanEgit', ulke: 0, komutan: id }).gecerli).toBe(false);
    w.C.c.hazine[0] = 10_000_000;
    K.saldiri[k] = 93; K.savunma[k] = 40; K.lojistik[k] = 40;
    for (let i = 0; i < 3; i++) expect(uygula(w, { tur: 'komutanEgit', ulke: 0, komutan: id }).ok).toBe(true);
    expect(K.saldiri[k]).toBe(95);
    expect(K.savunma[k]).toBe(52);
    expect(w.C.c.pg[0]).toBe(500_000 - 3 * komutan.EGITIM_PG);
    expect(w.C.c.hazine[0]).toBe(10_000_000 - 3 * komutan.EGITIM_ALTIN);
    expect(uygula(w, { tur: 'komutanEgit', ulke: 0, komutan: id }).ok).toBe(false);
  });
  test('muharebe komutana deneyim kazandırır', () => {
    const w = dunya(0, 0);
    const D = komsu(w); diplomasi.savasIlan(w, 0, D);
    for (const k of w.KM.rows()) w.KM.c.deneyim[k] = 0;
    for (let i = 0; i < 60; i++) gunIlerle(w, false);
    if (w.muharebeler.length > 0) expect(w.KM.list().some((k) => w.KM.c.deneyim[k]! > 0)).toBe(true);
  });
});

describe('T123c komutan emirlerinin eşdeğer komutu aynı emre geri çözülür', () => {
  const ws = dunya(0, 0);
  const k = katalogKur(ws);
  const u = k.birlikler[0]!.id, u2 = k.birlikler[1]!.id;
  const kid = k.komutanlar![0]!.id;
  const emirler: Record<string, unknown>[] = [
    { tur: 'komutanAta', komutan: kid, birlikler: [u] }, { tur: 'komutanAta', komutan: kid, birlikler: [u, u2] }, { tur: 'komutanAta', komutan: -1, birlikler: [u] },
    { tur: 'komutanEmir', komutan: kid, emir: 0, ikmalEsik: 700_000, orgEsik: 0 }, { tur: 'komutanEmir', komutan: kid, emir: 1, ikmalEsik: 0, orgEsik: 0 },
    { tur: 'komutanEmir', komutan: kid, emir: 2, ikmalEsik: 600_000, orgEsik: 400_000 }, { tur: 'komutanEmir', komutan: kid, emir: 0, ikmalEsik: 0, orgEsik: 500_000 },
    { tur: 'komutanEgit', komutan: kid }, { tur: 'komutanOto' },
  ];
  for (const [i, e0] of emirler.entries()) test(`${String(e0.tur)} #${i}`, () => {
    const e = { ulke: 0, ...e0 } as { tur: string; ulke: number } & Record<string, unknown>;
    const m = emirMetni(e, k);
    const s = ayristir(m, k);
    const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
    expect(t, `${m} → ${s.tur}${s.tur === 'ret' ? `: ${s.neden}` : ''}`).toBeTruthy();
    for (const key of Object.keys(e)) expect(t![key], `${m}: ${key}`).toEqual(e[key]);
  });
  test('serbest Türkçe: "seçili birliklere … ata" ve "… ikmal %70 altında saldırmasın"', () => {
    const ad = k.komutanlar![0]!.ad;
    const kat = katalogKur(ws, [u]);
    const a = ayristir(`Seçili birliklere ${ad} komutanını ata`, kat);
    expect(a.tur === 'emir' && a.yorum.emir.tur).toBe('komutanAta');
    const b = ayristir(`Komutan ${ad} ikmal %70 altında saldırmasın`, kat);
    expect(b.tur === 'emir' && b.yorum.emir).toMatchObject({ tur: 'komutanEmir', komutan: kid, ikmalEsik: 700_000 });
  });
});

describe('V16-T36 / T37 muharebe kaydı: motorun tek sonucu, yeniden oynatma belirlenimci', () => {
  const kos = () => {
    const w = dunya(0, 2);
    const D = komsu(w); diplomasi.savasIlan(w, 0, D);
    for (let i = 0; i < 90; i++) gunIlerle(w, false);
    return w;
  };
  test('kayıt hash dışıdır: okumak ya da silmek dünya hash\'ini değiştirmez; kayıplar kayıtla tutarlıdır', () => {
    const w = kos();
    expect(w.muharebeler.length).toBeGreaterThan(0);
    const h = dunyaHash(w);
    const kopya = JSON.parse(JSON.stringify(w.muharebeler));
    expect(dunyaHash(w)).toBe(h);
    for (const m of w.muharebeler) {
      expect(m.birlikler.some((b) => b.taraf === 0)).toBe(true);
      expect(m.birlikler.some((b) => b.taraf === 1)).toBe(true);
      expect([0, 1, 2]).toContain(m.sonuc);
      for (const b of m.birlikler) { expect(b.orgSonra).toBeLessThanOrEqual(b.orgOnce); expect(b.kisiSonra).toBeLessThanOrEqual(b.kisiOnce); expect(b.kisiSonra).toBeGreaterThanOrEqual(0); }
    }
    w.muharebeler = [];
    expect(dunyaHash(w)).toBe(h);
    expect(kopya.length).toBeGreaterThan(0);
    expect(w.muharebeler.length).toBeLessThanOrEqual(kara.MUHAREBE_KAYIT_AZAMI);
  });
  test('aynı tohum ve emirlerle iki koşu aynı muharebe kayıtlarını ve aynı kayıt hash\'ini üretir', () => {
    const a = kos(), b = kos();
    expect(hashText(kanonikJson(a.muharebeler))).toBe(hashText(kanonikJson(b.muharebeler)));
    expect(dunyaHash(a)).toBe(dunyaHash(b));
  });
  test('şema 9 kaydı komutanları ve atamaları korur', () => {
    const w = kos();
    const y = coz(serilestir(w), w.pkg);
    expect(dunyaHash(y)).toBe(dunyaHash(w));
    expect(y.KM.count()).toBe(w.KM.count());
    expect(y.komutanAd).toEqual(w.komutanAd);
    for (const u of w.U.rows()) expect(y.U.c.komutan[u]).toBe(w.U.c.komutan[u]);
  });
});
