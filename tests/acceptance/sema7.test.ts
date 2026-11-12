// Şema 7 sistemleri: donanma ve hava, tabur kapasitesi, rejim/parti/seçim, demografi ve zulüm, teknoloji kademeleri,
// teslim/ilhak/kukla, ekonomi ayarları, petrol, şehir büyümesi ve kayıt göçü (T300–T312).
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  senaryoBaslat, gunIlerle, uygula, onizle, diplomasi, ortak, deniz, toplum, ekonomi, kademe, TEKNOLOJI, NTEK, KADEME_MAX, serilestir, coz, dunyaHash,
  A, S, NKIMLIK, MAX_TABUR, PROJE, GEMI, AKTIF, type Paket, type World,
} from '@ts/engine';
import { dunya } from './_ortak.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const ulke = (p: Paket, kod: string) => p.ulkeler.findIndex((u) => u.kod === kod);
const emir = (w: World, e: Record<string, unknown>) => uygula(w, e as { tur: string; ulke: number });
const toplamGemi = (w: World, c: number) => [0, 1, 2, 3, 4].reduce((t, k) => t + deniz.gemiSay(w, c, k), 0);

describe('T300–T302 donanma ve hava kuvvetleri (1914)', () => {
  const p = oku('s1914');
  const GER = ulke(p, 'GER'), GBR = ulke(p, 'GBR');
  test('T300 kıyı devletleri filoyla başlar; kara devleti filosuzdur', () => {
    const w = senaryoBaslat(p, GER, 0);
    expect(toplamGemi(w, GBR)).toBeGreaterThan(toplamGemi(w, GER));
    expect(deniz.denizGucu(w, GBR)).toBeGreaterThan(0);
    const SRB = ulke(p, 'SRB');
    expect(toplamGemi(w, SRB)).toBe(0);
  });
  test('T301 filo muharebesi iki tarafa kayıp verdirir; üstün taraf abluka kurar', () => {
    const w = senaryoBaslat(p, GER, 0);
    diplomasi.savasIlan(w, GER, GBR);
    w.C.c.donGorev[GER] = 1; w.C.c.donGorev[GBR] = 2;
    const g0 = toplamGemi(w, GER), b0 = toplamGemi(w, GBR);
    for (let i = 0; i < 120; i++) { w.gun += 7; w.C.c.gHasar[GER] = 0; w.C.c.gHasar[GBR] = 0; deniz.denizHaftasi(w); }
    expect(toplamGemi(w, GER)).toBeLessThan(g0);
    expect(toplamGemi(w, GBR)).toBeLessThan(b0);
    expect(w.anlati.some((a) => a.metin.startsWith('Deniz muharebesi'))).toBe(true);
    expect(w.C.c.abluka[GER]).toBeGreaterThan(0);
    expect(w.C.c.abluka[GBR]).toBe(0);
  });
  test('T302 tersane ve uçak siparişi proje olarak açılır; görevler emirle değişir', () => {
    const w = senaryoBaslat(p, GER, 0);
    const kiyi = w.pkg.bolgeler.findIndex((b, r) => b.kiyi && b.anaYurt.includes(GER) && w.R.c.sahip[r] === GER);
    expect(kiyi).toBeGreaterThanOrEqual(0);
    expect(emir(w, { tur: 'gemiInsa', ulke: GER, sinif: 2, adet: 3, bolge: kiyi }).ok).toBe(true);
    const gemiP = PROJE.findIndex((x) => x.kod === 'gemi');
    const s = w.PR.list().find((x) => w.PR.c.ulke[x] === GER && w.PR.c.tur[x] === gemiP)!;
    expect(w.PR.c.adet[s]).toBe(3);
    expect(emir(w, { tur: 'ucakUret', ulke: GER, tip: 0, adet: 2 }).ok).toBe(true);
    // iç bölgede tersane olmaz
    const ic = w.pkg.bolgeler.findIndex((b, r) => !b.kiyi && w.R.c.sahip[r] === GER && !w.komsuluk[r]!.some((q) => w.pkg.bolgeler[q]!.kiyi));
    if (ic >= 0) expect(onizle(w, { tur: 'gemiInsa', ulke: GER, sinif: 0, adet: 1, bolge: ic }).gecerli).toBe(false);
    expect(emir(w, { tur: 'donanmaGorev', ulke: GER, gorev: 3 }).ok).toBe(true);
    expect(w.C.c.donGorev[GER]).toBe(3);
    // aktif cephe olmayan bölgeye hava gücü gönderilemez (v1.7)
    expect(onizle(w, { tur: 'havaGorev', ulke: GER, gorev: 1, bolge: kiyi }).gecerli).toBe(false);
    expect(emir(w, { tur: 'havaGorev', ulke: GER, gorev: 0, bolge: -1 }).ok).toBe(true);
  });
});

describe('T303 tabur kapasitesi', () => {
  test('birlik 12 taburu aşamaz; eklenen tabur ihtiyacı büyütür', () => {
    const w = dunya(0, 0);
    const u = w.U.list().find((x) => w.U.c.ulke[x] === 0)!;
    const id = w.U.id(u);
    const say0 = w.U.c.taburSay[u]!;
    const ih0 = ortak.birlikIhtiyac(w, u).kisi;
    expect(emir(w, { tur: 'taburEkle', ulke: 0, birlikler: [id], tabur: 0, adet: 2 }).ok).toBe(true);
    expect(w.U.c.taburSay[u]).toBe(say0 + 2);
    expect(ortak.birlikIhtiyac(w, u).kisi).toBeGreaterThan(ih0);
    expect(onizle(w, { tur: 'taburEkle', ulke: 0, birlikler: [id], tabur: 0, adet: MAX_TABUR }).gecerli).toBe(false);
    expect(emir(w, { tur: 'taburCikar', ulke: 0, birlikler: [id], tabur: 0 }).ok).toBe(true);
    expect(w.U.c.taburSay[u]).toBe(say0 + 1);
  });
});

describe('T304–T305 siyaset: rejim, parti, seçim', () => {
  test('T304 rejim değişikliği bedelli ve geçiş dönemlidir', () => {
    const w = dunya(0, 0);
    w.C.c.pg[0] = 300_000; w.C.c.mesru[0] = 60_000;
    const eski = w.C.c.rejim[0]!;
    const yeni = eski === 2 ? 1 : 2;
    expect(emir(w, { tur: 'rejim', ulke: 0, rejim: yeni }).ok).toBe(true);
    expect(w.C.c.rejim[0]).toBe(yeni);
    expect(w.C.c.gecis[0]).toBeGreaterThan(w.gun);
    expect(w.C.c.pg[0]).toBeLessThan(300_000);
    // geçiş sürerken yeni değişiklik yok
    expect(onizle(w, { tur: 'rejim', ulke: 0, rejim: eski }).gecerli).toBe(false);
  });
  test('T305 parti desteği payı artırır; erken seçim en güçlü partiyi iktidara getirir', () => {
    const w = dunya(0, 0);
    w.C.c.rejim[0] = 2; w.C.c.pg[0] = 500_000;
    const p0 = toplum.partiPay(w, 0, 3);
    expect(emir(w, { tur: 'partiDestek', ulke: 0, parti: 3 }).ok).toBe(true);
    expect(toplum.partiPay(w, 0, 3)).toBeGreaterThan(p0);
    let pay = [0, 1, 2, 3, 4].map((i) => toplum.partiPay(w, 0, i));
    expect(pay.reduce((a, b) => a + b, 0)).toBeGreaterThan(S - 10);
    for (let i = 0; i < 6; i++) emir(w, { tur: 'partiDestek', ulke: 0, parti: 3 });
    pay = [0, 1, 2, 3, 4].map((i) => toplum.partiPay(w, 0, i));
    const en = pay.indexOf(Math.max(...pay));
    expect(emir(w, { tur: 'secimErken', ulke: 0 }).ok).toBe(true);
    expect(w.C.c.iktidar[0]).toBe(en);
    expect(w.anlati.some((a) => a.metin.includes('seçimleri'))).toBe(true);
  });
});

describe('T306–T307 demografi ve zulüm', () => {
  const p = oku('s1914');
  const GER = ulke(p, 'GER');
  const posen = p.bolgeler.findIndex((b) => b.ad === 'Posen');
  test('T306 sürgün nüfusu korur: çıkanlar ölü ya da başka bölgede; ağır diplomatik sonuç', () => {
    const w = senaryoBaslat(p, GER, 0);
    const k = w.pkg.bolgeler[posen]!.kimlikAnahtar.findIndex(([ku]) => ku >= 0 && ku !== w.pkg.ulkeler[GER]!.kultur);
    expect(k).toBeGreaterThanOrEqual(0);
    const n0 = w.kim[posen * NKIMLIK + k]!;
    const olum0 = w.sayac.ekOlum;
    const mesru0 = w.C.c.mesru[GER]!;
    expect(onizle(w, { tur: 'surgun', ulke: GER, bolge: posen, kimlik: k }).uyari?.length).toBeGreaterThan(0);
    expect(emir(w, { tur: 'surgun', ulke: GER, bolge: posen, kimlik: k }).ok).toBe(true);
    expect(w.kim[posen * NKIMLIK + k]!).toBeLessThan(n0 / 2);
    expect(w.sayac.ekOlum).toBeGreaterThan(olum0);
    expect(w.C.c.zulum[GER]).toBeGreaterThan(0);
    expect(w.C.c.mesru[GER]).toBeLessThan(mesru0);
    // nüfus ve köken muhasebesi tutarlı kalır (bütünlük denetimi günlük fazda çalışır)
    gunIlerle(w, false);
  });
  test('T307 kendi halkına zulüm reddedilir; asimilasyon haftalık kültür dönüştürür', () => {
    const w = senaryoBaslat(p, GER, 0);
    const kendi = w.pkg.bolgeler[posen]!.kimlikAnahtar.findIndex(([ku]) => ku === w.pkg.ulkeler[GER]!.kultur);
    expect(onizle(w, { tur: 'soykirim', ulke: GER, bolge: posen, kimlik: kendi }).gecerli).toBe(false);
    const yab = w.pkg.bolgeler[posen]!.kimlikAnahtar.findIndex(([ku]) => ku >= 0 && ku !== w.pkg.ulkeler[GER]!.kultur);
    expect(emir(w, { tur: 'demografi', ulke: GER, bolge: posen, eylem: 1, kimlik: yab }).ok).toBe(true);
    const n0 = w.kim[posen * NKIMLIK + kendi]!;
    for (let i = 0; i < 4; i++) toplum.demografiHaftasi(w);
    expect(w.kim[posen * NKIMLIK + kendi]!).toBeGreaterThan(n0);
  });
});

describe('T308 teknoloji kademeleri', () => {
  test('1914 hatları 12 kademede bugüne ve geleceğe uzanır', () => {
    const w = senaryoBaslat(oku('s1914'), 0, 0);
    void w;
    const t = TEKNOLOJI.findIndex((x) => x.kod === 'sanayi1');
    expect(KADEME_MAX).toBe(12);
    expect(kademe(t, 1).yil).toBeLessThan(1920);
    expect(kademe(t, KADEME_MAX).yil).toBeGreaterThanOrEqual(2020);
    const adlar = new Set(Array.from({ length: KADEME_MAX }, (_, L) => kademe(t, L + 1).ad));
    expect(adlar.size).toBe(KADEME_MAX);
  });
  test('kademe tamamlanınca bir sonraki araştırılabilir; maliyet kademeyle artar', () => {
    const w = dunya(0, 0);
    const t = TEKNOLOJI.findIndex((x) => x.kod === 'sanayi1');
    w.tekBitti[t] = 1;
    const m1 = ekonomi.tekMaliyetHesapla(w, 0, t);
    w.tekBitti[t] = 5;
    const m5 = ekonomi.tekMaliyetHesapla(w, 0, t);
    expect(m5).toBeGreaterThan(m1 * 3);
    expect(emir(w, { tur: 'arastir', ulke: 0, tek: t }).ok).toBe(true);
    w.tekBitti[t] = KADEME_MAX;
    expect(onizle(w, { tur: 'arastir', ulke: 0, tek: t }).gecerli).toBe(false);
    void NTEK;
  });
});

describe('T309–T310 barış türleri', () => {
  test('T309 teslim işgal edilenleri devreder ama başkenti devretmez', () => {
    const w = dunya(0, 0);
    diplomasi.savasIlan(w, 0, 2);
    const bas = w.pkg.ulkeler[2]!.baskent;
    const rs = w.pkg.bolgeler.map((_, r) => r).filter((r) => w.R.c.sahip[r] === 2).slice(0, 3);
    if (!rs.includes(bas)) rs.push(bas);
    for (const r of rs) w.R.c.kontrolEden[r] = 0;
    diplomasi.barisUygula(w, 0, 2, 2, rs);
    for (const r of rs) expect(w.R.c.sahip[r]).toBe(r === bas ? 2 : 0);
    expect(ortak.savasta(w, 0, 2)).toBe(false);
  });
  test('T310 kukla devlet: efendi büyük olmalı; kukla savaş ilan edemez; tam ilhak devleti yıkar', () => {
    const w = dunya(0, 0);
    diplomasi.savasIlan(w, 0, 1);
    // küçük devlet büyüğü kukla yapamaz
    const buyuk = diplomasi.ulkeBuyuklugu(w, 0) >= diplomasi.ulkeBuyuklugu(w, 1) ? 0 : 1, kucuk = 1 - buyuk;
    expect(diplomasi.barisKabul(w, buyuk, kucuk, 4, []).kabul).toBe(false);
    diplomasi.barisUygula(w, buyuk, kucuk, 4, []);
    expect(ortak.efendi(w, kucuk)).toBe(buyuk);
    expect(onizle(w, { tur: 'savasIlan', ulke: kucuk, hedef: 3 }).gecerli).toBe(false);
    const w2 = dunya(0, 0);
    diplomasi.savasIlan(w2, 0, 1);
    diplomasi.barisUygula(w2, 0, 1, 3, []);
    expect(w2.C.c.pasif[1]).toBe(1);
    expect(w2.pkg.bolgeler.some((_, r) => w2.R.c.sahip[r] === 1)).toBe(false);
    gunIlerle(w2, false);
  });
});

describe('T311 ekonomi ayarları, petrol ve şehirler', () => {
  test('model, tarife, sübvansiyon ve tarım odağı emirle değişir', () => {
    const w = dunya(0, 0);
    w.C.c.pg[0] = 300_000;
    expect(emir(w, { tur: 'ekoModel', ulke: 0, model: 3 }).ok).toBe(true);
    expect(w.C.c.model[0]).toBe(3);
    expect(emir(w, { tur: 'tarife', ulke: 0, oran: 250_000 }).ok).toBe(true);
    expect(w.C.c.tarife[0]).toBe(250_000);
    expect(emir(w, { tur: 'sub', ulke: 0, alan: 1, oran: 50_000 }).ok).toBe(true);
    expect(w.C.c.subSanayi[0]).toBe(50_000);
    expect(emir(w, { tur: 'tarimOdak', ulke: 0, odak: 1 }).ok).toBe(true);
    expect(w.C.c.tarimOdak[0]).toBe(1);
  });
  test('donanmalı devlet petrol yedeğiyle başlar ve petrol pazarda alınıp satılır', () => {
    const p = oku('s1914');
    const GBR = ulke(p, 'GBR');
    const w = senaryoBaslat(p, GBR, 0);
    gunIlerle(w, false);
    expect(w.C.c.petrolIht[GBR]).toBeGreaterThan(0);
    expect(w.C.c.petrol[GBR]).toBeGreaterThan(w.C.c.petrolIht[GBR]! * 60);
    expect(ekonomi.malStok(w, GBR, 4)).toBeGreaterThanOrEqual(0);
  });
  test('şehir imarı şehir düzeyini artırır; bedelsiz fabrika vermez (K-45)', () => {
    const w = dunya(0, 0);
    const r = w.pkg.ulkeler[0]!.baskent;
    const k0 = w.R.c.kent[r]!, f0 = w.R.c.sivilF[r]!;
    const kent = PROJE.findIndex((x) => x.kod === 'kent');
    expect(emir(w, { tur: 'insa', ulke: 0, proje: kent, bolge: r }).ok).toBe(true);
    const s = w.PR.list().find((x) => w.PR.c.tur[x] === kent)!;
    w.PR.c.spKul[s] = w.PR.c.spTop[s]!; w.PR.c.nakitKul[s] = w.PR.c.nakitTop[s]!;
    for (let i = 0; i < 3 && w.PR.list().includes(s); i++) gunIlerle(w, false);
    expect(w.R.c.kent[r]).toBe(k0 + 1);
    expect(w.R.c.sivilF[r]).toBe(f0);
  });
});

describe('T312 şema 7 kaydı ve belirlenimcilik', () => {
  test('1914: 60 gün sonra kayıt-yükleme hash eşit; iki koşu aynı', () => {
    const p = oku('s1914');
    const a = senaryoBaslat(p, 0, 2), b = senaryoBaslat(oku('s1914'), 0, 2);
    for (let i = 0; i < 60; i++) { gunIlerle(a, false); gunIlerle(b, false); }
    expect(dunyaHash(a)).toBe(dunyaHash(b));
    const c = coz(serilestir(a), oku('s1914'));
    expect(dunyaHash(c)).toBe(dunyaHash(a));
    for (let i = 0; i < 10; i++) { gunIlerle(a, false); gunIlerle(c, false); }
    expect(dunyaHash(c)).toBe(dunyaHash(a));
    void A; void GEMI; void AKTIF;
  });
});
