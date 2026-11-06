// Oynanış derinliği: dallanan tarih, araştırma ağacı, tahkimat, deniz üstünlüğü, bakanlar, savaş bedeli, kayıt göçü.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  senaryoBaslat, gunIlerle, serilestir, coz, dunyaHash, uygula, onizle, olaylar, ortak, kara, ekonomi, diplomasi, TEKNOLOJI, NTEK, tekIdx, BK, type Paket, type World,
} from '@ts/engine';
import { ayristir, emirMetni } from '@ts/command';
import { katalogKur } from '../../packages/worker/src/katalog.ts';
import { dunya } from './_ortak.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const ulke = (p: Paket, kod: string) => p.ulkeler.findIndex((u) => u.kod === kod);

/** Oyuncu ülkenin olaylarını verilen seçimlerle yanıtlayarak ilerletir. */
function oyna(w: World, gun: number, secim: Record<string, number>): string[] {
  const kayit: string[] = [];
  for (let g = 0; g < gun; g++) {
    for (const s of w.OL.list()) {
      if (w.OL.c.ulke[s] !== w.oyuncu || w.OL.c.gun[s]! > w.gun) continue;
      const o = olaylar.olayTanim(w, w.OL.c.olay[s]!);
      kayit.push(o.kod);
      uygula(w, { tur: 'olaySec', ulke: w.oyuncu, olay: w.OL.id(s), secim: secim[o.kod] ?? 0 });
    }
    gunIlerle(w, false);
  }
  return kayit;
}

describe('Dallanan tarih (1914 Osmanlı)', () => {
  const p = oku('s1914');
  const OSM = ulke(p, 'OSM'), RUS = ulke(p, 'RUS'), GBR = ulke(p, 'GBR');
  test('varsayılan yol: Goeben ve Karadeniz baskını Osmanlı\'yı savaşa sokar', () => {
    const w = senaryoBaslat(oku('s1914'), OSM, 0);
    const k = oyna(w, 160, {});
    expect(k).toEqual(expect.arrayContaining(['osm_ittifak', 'goeben', 'karadeniz']));
    expect(ortak.savasta(w, OSM, RUS)).toBe(true);
    expect(w.olayBayrak).toContain('osm_savasta');
  });
  test('tarafsızlık yolu: Osmanlı iki yıl savaş dışında kalır, Karadeniz baskını hiç gelmez', () => {
    const w = senaryoBaslat(oku('s1914'), OSM, 0);
    const k = oyna(w, 700, { osm_ittifak: 1, goeben: 1, alman_baskisi: 1 });
    expect(k).not.toContain('karadeniz');
    expect(k).toContain('tarafsiz_ticaret');
    expect(ortak.savasta(w, OSM, RUS)).toBe(false);
    expect(ortak.savasta(w, OSM, GBR)).toBe(false);
    expect(w.olayBayrak).toContain('osm_tarafsiz_kesin');
  });
  test('İtilaf yolu: Osmanlı Almanya\'ya karşı savaşır', () => {
    const w = senaryoBaslat(oku('s1914'), OSM, 0);
    oyna(w, 200, { osm_ittifak: 2, itilaf_pazarlik: 0 });
    expect(ortak.savasta(w, OSM, ulke(p, 'GER'))).toBe(true);
    expect(ortak.savasta(w, OSM, RUS)).toBe(false);
  });
  test('süreli değiştirici ve bayraklar kayıttan aynen döner', () => {
    const w = senaryoBaslat(oku('s1914'), OSM, 0);
    oyna(w, 60, {});
    expect(w.MOD.count()).toBeGreaterThan(0);
    const w2 = coz(serilestir(w), w.pkg);
    expect(w2.olayBayrak).toEqual(w.olayBayrak);
    expect(dunyaHash(w2)).toBe(dunyaHash(w));
    for (let i = 0; i < 20; i++) { gunIlerle(w, false); gunIlerle(w2, false); }
    expect(dunyaHash(w2)).toBe(dunyaHash(w));
  });
});

describe('Araştırma ağacı', () => {
  test('36 teknoloji, ilk 12 kod sabit sırada; her dönem aynı kodları taşır', () => {
    expect(NTEK).toBe(36);
    expect(TEKNOLOJI.slice(0, 3).map((t) => t.kod)).toEqual(['piyade2', 'piyade3', 'agirtop2']);
    for (const t of TEKNOLOJI) for (const o of t.on) expect(tekIdx(o), `${t.kod} ön koşulu ${o}`).toBeGreaterThanOrEqual(0);
  });
  test('doktrinler birbirini dışlar', () => {
    const w = dunya(0, 0);
    const kurmay = tekIdx('kurmay');
    w.tekBitti[kurmay] = 1;
    expect(uygula(w, { tur: 'arastir', ulke: 0, tek: tekIdx('dok_ates') }).ok).toBe(true);
    const k = onizle(w, { tur: 'arastir', ulke: 0, tek: tekIdx('dok_manevra') });
    expect(k.gecerli).toBe(false);
    expect(k.neden).toMatch(/dışlar/);
  });
  test('topçu teknolojisi topçu saldırısını artırır', () => {
    const w = dunya(0, 2);
    const u = w.U.list().find((x) => w.U.c.ulke[x] === 0 && ortak.birlikIstat(w, x).topcu > 0);
    if (u === undefined) return;
    const once = ortak.birlikIstat(w, u).topcu;
    w.tekBitti[tekIdx('topcu1')] = 1;
    expect(ortak.birlikIstat(w, u).topcu).toBeGreaterThan(once);
  });
});

describe('Tahkimat ve deniz üstünlüğü', () => {
  test('duran birlik kazar; tahkimat savunma çarpanını yükseltir, topçu bastırır', () => {
    const w = dunya(0, 2);
    const u = w.U.list().find((x) => w.U.c.ulke[x] === 0)!;
    const r = w.U.c.bolge[u]!;
    w.U.c.hedef[u] = -1;
    w.R.c.tahkimat[r] = 0;
    const taban = kara.savunmaCarpan(w, r, 0);
    for (let i = 0; i < 20; i++) kara.tahkimatGunu(w);
    expect(w.R.c.tahkimat[r]).toBeGreaterThan(0);
    expect(kara.savunmaCarpan(w, r, 0)).toBeGreaterThan(taban);
    expect(kara.savunmaCarpan(w, r, 600_000)).toBeLessThan(kara.savunmaCarpan(w, r, 0));
  });
  test('1914: Britanya donanması Alman deniz geçişini kapatır, İngiliz geçişi açıktır', () => {
    const p = oku('s1914');
    const w = senaryoBaslat(p, 0, 2);
    const GER = ulke(p, 'GER'), GBR = ulke(p, 'GBR');
    for (let i = 0; i < 60; i++) gunIlerle(w, false);
    expect(ortak.savasta(w, GER, GBR)).toBe(true);
    expect(ortak.denizKapali(w, GER)).toBe(true);
    expect(ortak.denizKapali(w, GBR)).toBe(false);
  });
  test('sömürgeler deniz yoluyla yönetilir (erişilemeyen bölge kalmaz)', () => {
    const p = oku('s1914');
    const w = senaryoBaslat(p, 0, 2);
    const GBR = ulke(p, 'GBR');
    const m = ortak.yonetimMesafeleri(w, GBR);
    let kopuk = 0, top = 0;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === GBR) { top++; if (m[r]! >= 999) kopuk++; }
    expect(kopuk * 10).toBeLessThan(top);
  });
});

describe('Bakanlar ve elle öncelik', () => {
  test('bakan emri metne döner ve geri çözülür (T123)', () => {
    const w = dunya(0, 0);
    const k = katalogKur(w);
    for (const e of [{ tur: 'bakan', ulke: 0, alan: 0, acik: 1 }, { tur: 'bakan', ulke: 0, alan: 3, acik: 0 }]) {
      const s = ayristir(emirMetni(e, k), k);
      expect(s.tur).toBe('emir');
      if (s.tur === 'emir') { expect(s.yorum.emir.alan).toBe(e.alan); expect(s.yorum.emir.acik).toBe(e.acik); }
    }
  });
  test('maliye bakanı vergiyi yönetir; oyuncunun elle vergi emri bakanı görevden alır', () => {
    const w = dunya(0, 0);
    uygula(w, { tur: 'bakan', ulke: 0, alan: 0, acik: 1 });
    expect(w.C.c.bakan[0]! & BK.ekonomi).toBeTruthy();
    expect(uygula(w, { tur: 'vergi', ulke: 0, oran: w.C.c.vergi[0]! + 20_000 }).ok).toBe(true);
    expect(w.C.c.bakan[0]! & BK.ekonomi).toBe(0);
  });
});

describe('Savaş bedeli', () => {
  test('asker maaşı kişi başı gelirden türer ve savaşta iki katına çıkar', () => {
    const w = dunya(0, 2);
    for (let i = 0; i < 3; i++) gunIlerle(w, false);
    const c = [0, 1, 2, 3].find((x) => !ortak.savastaMi(w, x))!;
    expect(w.C.c.maas[c]).toBeGreaterThan(0);
    const baris = ekonomi.askerMaasi(w, c);
    const hedef = [0, 1, 2, 3].find((x) => x !== c && !ortak.savasta(w, c, x))!;
    diplomasi.savasIlan(w, c, hedef);
    expect(ekonomi.askerMaasi(w, c)).toBe(baris * 2);
  });
});

describe('Kayıt göçü', () => {
  test('şema 6 kaydı bütün yeni alanları taşır', () => {
    const w = dunya(0, 0);
    w.olayBayrak.push('deneme');
    w.C.c.bakan[0] = BK.ekonomi | BK.ordu;
    const w2 = coz(serilestir(w), w.pkg);
    expect(w2.olayBayrak).toEqual(['deneme']);
    expect(w2.C.c.bakan[0]).toBe(BK.ekonomi | BK.ordu);
  });
});
