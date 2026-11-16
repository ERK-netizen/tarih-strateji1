// v1.7 R2 doğrulama maddeleri (X-*, R2-CORE/MOVE/INTEL/DIPLO/GOV/NAVAL/SC1914): paketin kendi kabul şartlarının gerçek oyunda sınanması.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { BellekDepo } from '@ts/storage';
import { PROTOKOL_SURUM } from '@ts/protocol';
import {
  senaryoBaslat,
  gunIlerle,
  uygula,
  onizle,
  serilestir,
  coz,
  dunyaHash,
  kanonikJson,
  kara,
  deniz,
  diplomasi,
  ortak,
  v17View,
  v17P2,
  v17P3,
  v17P11,
  v17IndustryBonus,
  S,
  type Paket,
  type World,
} from '@ts/engine';
import { kenarKey } from '../../packages/engine/src/state/world.ts';
import { emptyV17 } from '../../packages/engine/src/v17/state.ts';
import { kurHedefler, OLCUTLER } from '../../packages/engine/src/v17/hedef.ts';
import { Sunucu } from '../../packages/worker/src/sunucu.ts';
import { pkg, dunya } from './_ortak.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const p1914 = oku('s1914');
const kod = (p: Paket, k: string) => p.ulkeler.findIndex((u) => u.kod === k);
const GER = kod(p1914, 'GER');
const yeni = (c = GER, mod = 0): World => senaryoBaslat(JSON.parse(JSON.stringify(p1914)) as Paket, c, mod);
const gunler = (w: World, n: number) => {
  for (let i = 0; i < n; i++) gunIlerle(w, false);
};
const toplamlar = (w: World) => {
  let nufus = 0;
  for (let i = 0; i < w.pop.length; i++) nufus += w.pop[i]!;
  let fab = 0;
  for (let r = 0; r < w.nR; r++) fab += w.R.c.sivilF[r]! + w.R.c.askeriF[r]!;
  const ekip: number[] = Array.from(w.ekip);
  return {
    nufus,
    hazine: Array.from(w.C.c.hazine).slice(0, w.nC),
    fab,
    birlik: w.U.count(),
    hat: w.HT.list().map((s) => [w.HT.c.ulke[s], w.HT.c.urun[s], w.HT.c.fabrika[s], w.HT.c.wip[s]]),
    ekip,
    filo: w.FL.count(),
    kanat: w.KN.count(),
  };
};

describe('R2-CORE kayıt göçü ve değişmezler', () => {
  test("CORE-02/04/05: şema 10 kaydı bir kez 11'e göç eder; nüfus, hazine, fabrika, birlik, hat ve ekipman stoku korunur; yeni şema gidiş-dönüş bayt eşittir", () => {
    const w = yeni();
    gunler(w, 20);
    const b11 = serilestir(w);
    const enc = new TextEncoder().encode(kanonikJson(w.v17));
    const b10 = b11.slice(0, b11.length - 4 - enc.length);
    new DataView(b10.buffer, b10.byteOffset).setUint32(4, 10, true);
    const g = coz(b10, w.pkg);
    expect(toplamlar(g)).toEqual(toplamlar(w));
    expect(g.v17.sites.length).toBeGreaterThan(0);
    expect(g.v17.goals.length).toBe(4);
    // gidiş-dönüş: serialize11 → load11 → serialize11 aynı bayt
    const a = serilestir(g),
      c = serilestir(coz(a, g.pkg));
    expect(Buffer.from(c).equals(Buffer.from(a))).toBe(true);
    // 11 kaydı doğrudan okunur: v17 durumu JSON'dan gelir, yeniden üretilmez
    const k = coz(b11, w.pkg);
    expect(k.v17).toEqual(w.v17);
    // CORE-07: şema 10 ham hash'i ile şema 11 hash'inin eşitliği aranmaz
    expect(dunyaHash(g)).not.toBe(undefined);
  });
  test("CORE-03: şema 9 + harita v1 zinciri (fikstür) şema 11'e çıkar ve gidiş-dönüş eşittir", () => {
    const bayt = new Uint8Array(gunzipSync(readFileSync('tests/corpus/s1914-harita-v1.tsk.gz')));
    const w = coz(bayt, p1914);
    expect(w.v17.sites.length).toBeGreaterThan(0);
    const a = serilestir(w);
    expect(Buffer.from(serilestir(coz(a, w.pkg))).equals(Buffer.from(a))).toBe(true);
  });
  test('CORE-09: aynı gün ikinci kez işleme hedef ve harekât planlarını yeniden uygulamaz', () => {
    const w = yeni();
    gunler(w, 30);
    const once = JSON.stringify(w.v17.goals);
    v17P11(w);
    v17P11(w);
    expect(JSON.stringify(w.v17.goals)).toBe(once);
    const u = w.U.list().find((x) => w.U.c.ulke[x] === GER)!;
    w.C.c.pg[GER] = 500_000;
    const hedef = w.komsuluk[w.U.c.bolge[u]!]![0]!;
    expect(uygula(w, { tur: 'v17Harekat', ulke: GER, birlikler: [w.U.id(u)], hedef, emir: 'intikal' }).ok).toBe(true);
    v17P2(w);
    const n1 = w.v17.stats.ordersExecuted;
    v17P2(w);
    expect(w.v17.stats.ordersExecuted).toBe(n1);
  });
  test('CORE-10: reddedilen emirler hiçbir durumu değiştirmez (hash aynı)', () => {
    const w = yeni();
    gunler(w, 5);
    const h = dunyaHash(w);
    const kotu: Record<string, unknown>[] = [
      { tur: 'v17AgKur', hedef: GER },
      { tur: 'v17AgKur', hedef: -5 },
      { tur: 'v17Operasyon', ag: 999, operasyon: 'bilgi' },
      { tur: 'v17Teklif', hedef: GER, madde: 'ticaret' },
      { tur: 'v17Teklif', hedef: 1, madde: 'yok' },
      { tur: 'v17TeklifYanit', teklif: 9999, yanit: 'accept' },
      { tur: 'v17BakanAta', alan: 'uretim', kisi: 'Yok Kişi' },
      { tur: 'v17BakanAta', alan: 'yokalan', kisi: 'x' },
      { tur: 'v17SehirPolitika', tesis: 99999, politika: 'verim' },
      { tur: 'v17Harekat', birlikler: [], hedef: 0, emir: 'savun' },
      { tur: 'v17SanayiGorevi', model: 'yok', fabrika: 1000 },
      { tur: 'v17SanayiGorevi', model: 'smle_mk3', fabrika: 1000 },
    ];
    for (const e of kotu) {
      expect(uygula(w, { ulke: GER, ...e } as { tur: string; ulke: number }).ok, JSON.stringify(e)).toBe(false);
      expect(dunyaHash(w), JSON.stringify(e)).toBe(h);
    }
  });
  test("CORE-13: 750 ve 1600'de hava kanadı ve 1914 adlı modeli yoktur", () => {
    for (const k of ['s750', 's1600']) {
      const w = senaryoBaslat(oku(k), 0, 2);
      expect(w.KN.count(), k).toBe(0);
      expect(v17View(w).namedModels, k).toEqual([]);
    }
  });
  test('CORE-15: Android manifestinde INTERNET ve RECORD_AUDIO kaldırılmıştır; çalışma zamanı izni eklenmemiştir', () => {
    const xml = readFileSync('apps/android/android/app/src/main/AndroidManifest.xml', 'utf8');
    const izinler = xml.match(/<uses-permission[^>]*>/g) ?? [];
    expect(izinler.length).toBeGreaterThanOrEqual(2);
    for (const i of izinler) expect(i, i).toMatch(/tools:node="remove"/);
    expect(xml).toMatch(/INTERNET/);
    expect(xml).toMatch(/RECORD_AUDIO/);
  });
  test('X-04: v1.7 idari emirleri günü ilerletmez (Worker anlık emir)', async () => {
    const giden: { id: number; t: string; p: any }[] = [];
    const s = new Sunucu(JSON.parse(JSON.stringify(p1914)) as Paket, new BellekDepo(), (m) => giden.push({ id: m.id, t: m.t, p: m.p }));
    const iste = (id: number, t: string, p: unknown) => s.isle({ v: PROTOKOL_SURUM, id, t, p });
    await iste(1, 'init', { oyuncu: GER, mod: 0 });
    const w = s.dunya(),
      gun = w.gun;
    w.C.c.pg[GER] = 900_000;
    w.C.c.hazine[GER] = 5_000_000;
    let id = 2;
    for (const e of [
      { tur: 'v17AgKur', hedef: kod(p1914, 'RUS') },
      { tur: 'v17Teklif', hedef: kod(p1914, 'FRA'), madde: 'ticaret' },
      { tur: 'v17SanayiGorevi', model: 'gew98', fabrika: 1000 },
    ]) {
      await iste(id, 'submit', e);
      expect(giden.find((g) => g.id === id)!.p.sonuc[0], JSON.stringify(e)).toMatchObject({ kabul: true, aninda: true });
      id++;
    }
    expect(w.gun).toBe(gun);
  });
});

describe('R2-MOVE hareket ve ETA (fikstür dünya)', () => {
  /** r → a → b zinciri: hepsi oyuncunun (0) kontrolünde, kara kenarı; r'de oyuncunun bir birliği. */
  const zincir = (w: World) => {
    const U = ortak.uc(w);
    for (const u of w.U.list()) {
      if (U.ulke![u] !== 0) continue;
      const r = U.bolge![u]!;
      for (const a of w.komsuluk[r]!) {
        if (w.R.c.kontrolEden[a] !== 0 || ortak.kenarTur(w, r, a) !== 0) continue;
        for (const b of w.komsuluk[a]!)
          if (b !== r && w.R.c.kontrolEden[b] === 0 && ortak.kenarTur(w, a, b) === 0 && !w.komsuluk[r]!.includes(b)) return { u, r, a, b };
      }
    }
    throw new Error('zincir yok');
  };
  const km = (w: World, x: number, y: number, v: number) => {
    w.kenarKm.set(kenarKey(x, y), v);
    w.rotaEpoch++;
  };

  test('MOVE-01: iki kısa kenar (barışta) bir günde geçilir', () => {
    const w = dunya(0, 2);
    const { u, r, a, b } = zincir(w);
    const U = ortak.uc(w);
    km(w, r, a, 10);
    km(w, a, b, 10);
    U.hedef![u] = b;
    U.egitimBitis![u] = 0;
    kara.hareketGunu(w);
    expect(U.bolge![u]).toBe(b);
  });
  test('MOVE-02: uzun kenarda kısmi ilerleme korunur ve aynı gün tekrarı biriktirir', () => {
    const w = dunya(0, 2);
    const { u, r, a } = zincir(w);
    const U = ortak.uc(w);
    km(w, r, a, 5000);
    U.hedef![u] = a;
    U.egitimBitis![u] = 0;
    kara.hareketGunu(w);
    const ilk = U.ilerleme![u]!;
    expect(ilk).toBeGreaterThan(0);
    expect(U.bolge![u]).toBe(r);
    kara.hareketGunu(w);
    expect(U.ilerleme![u]!).toBeGreaterThanOrEqual(ilk * 2 - 2);
  });
  test('MOVE-03: savunulan düşman bölgesi çok kenarlı geçişi durdurur ve muharebe üretir', () => {
    const w = dunya(0, 0);
    const U = ortak.uc(w);
    let bulundu = false;
    for (const u of w.U.list()) {
      if (U.ulke![u] !== 0) continue;
      for (const v of w.komsuluk[U.bolge![u]!]!) {
        const d = w.R.c.kontrolEden[v]!;
        if (d === 0 || d < 0 || ortak.kenarTur(w, U.bolge![u]!, v) !== 0) continue;
        if (!w.U.list().some((x) => U.ulke![x] === d && U.bolge![x] === v)) continue;
        diplomasi.savasIlan(w, 0, d);
        U.hedef![u] = v;
        U.egitimBitis![u] = 0;
        const muh = kara.hareketGunu(w);
        expect(muh.some((m) => m.bolge === v && m.saldiran.includes(u))).toBe(true);
        expect(U.bolge![u]).not.toBe(v);
        bulundu = true;
        break;
      }
      if (bulundu) break;
    }
    expect(bulundu).toBe(true);
  });
  test('MOVE-05: kesin rotada tahmini gün ile gerçek gün sayısı eşittir', () => {
    const w = dunya(0, 2);
    const { u, r, a, b } = zincir(w);
    const U = ortak.uc(w);
    km(w, r, a, 160);
    km(w, a, b, 140);
    U.hedef![u] = b;
    U.egitimBitis![u] = 0;
    const tahmin = kara.tahminiGun(w, u, [r, a, b]);
    let gun = 0;
    while (U.bolge![u] !== b && gun < 60) {
      kara.hareketGunu(w);
      gun++;
      w.gun++;
    }
    expect(U.bolge![u]).toBe(b);
    expect(gun).toBe(tahmin);
  });
});

describe('R2-INTEL / DIPLO / GOV / NAVAL / SC1914', () => {
  test('INTEL-04: sabotaj başarıyla biterse gerçek tesis hasarı oluşur; başarısızsa hasar değişmez', () => {
    let basari = 0,
      basarisiz = 0;
    for (let tohum = 0; tohum < 40 && (!basari || !basarisiz); tohum++) {
      const w = yeni();
      w.tohum += tohum;
      const RUS = kod(p1914, 'RUS');
      w.C.c.pg[GER] = 900_000;
      w.C.c.hazine[GER] = 5_000_000;
      uygula(w, { tur: 'v17AgKur', ulke: GER, hedef: RUS });
      const ag = w.v17.networks[0]!;
      ag.nextActionDay = w.gun;
      const bolge = (() => {
        for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === RUS) return r;
        return -1;
      })();
      const o = uygula(w, { tur: 'v17Operasyon', ulke: GER, ag: ag.id, operasyon: 'sabotaj', bolge });
      expect(o.ok).toBe(true);
      const once = w.R.c.hasar[bolge]!;
      w.gun += 21;
      v17P3(w);
      const op = w.v17.operations[0]!;
      if (op.status === 'completed') {
        basari++;
        expect(w.R.c.hasar[bolge]).toBe(Math.min(500_000, once + 75_000));
      } else {
        basarisiz++;
        expect(w.R.c.hasar[bolge]).toBe(once);
      }
    }
    expect(basari).toBeGreaterThan(0);
    expect(basarisiz).toBeGreaterThan(0);
  });
  test('DIPLO-01/06: karşı teklif yeni revizyon üretir, eski kayıt değişmez; aynı teklif iki kez antlaşma kurmaz', () => {
    const w = yeni();
    w.C.c.pg[GER] = 900_000;
    w.C.c.pg[1] = 900_000;
    expect(uygula(w, { tur: 'v17Teklif', ulke: GER, hedef: 1, madde: 'ticaret' }).ok).toBe(true);
    const ilk = w.v17.proposals[0]!;
    expect(uygula(w, { tur: 'v17TeklifYanit', ulke: 1, teklif: ilk.id, yanit: 'counter' }).ok).toBe(true);
    expect(w.v17.proposals.length).toBe(2);
    const yeniT = w.v17.proposals[1]!;
    expect(ilk.status).toBe('countered');
    expect(ilk.revision).toBe(1);
    expect(yeniT.revision).toBe(2);
    expect(yeniT.parentId).toBe(ilk.id);
    expect(yeniT.from).toBe(1);
    expect(yeniT.to).toBe(GER);
    expect(uygula(w, { tur: 'v17TeklifYanit', ulke: 1, teklif: ilk.id, yanit: 'accept' }).ok).toBe(false);
    expect(uygula(w, { tur: 'v17TeklifYanit', ulke: GER, teklif: yeniT.id, yanit: 'accept' }).ok).toBe(true);
    expect(w.v17.stats.treatiesAccepted).toBe(1);
    expect(uygula(w, { tur: 'v17TeklifYanit', ulke: GER, teklif: yeniT.id, yanit: 'accept' }).ok).toBe(false);
  });
  test('GOV-01/02/03/04: bir makamda tek bakan; kişi tek bakanlıkta; bakan bedelsiz değil; beceri sınırlı etkiyi değiştirir', () => {
    const w = yeni();
    w.C.c.pg[GER] = 900_000;
    w.C.c.hazine[GER] = 50_000_000;
    const kisiler = v17View(w).availablePoliticians.map((x) => x.ad);
    expect(kisiler.length).toBeGreaterThanOrEqual(3);
    const pg0 = w.C.c.pg[GER]!,
      hz0 = w.C.c.hazine[GER]!;
    expect(uygula(w, { tur: 'v17BakanAta', ulke: GER, alan: 'uretim', kisi: kisiler[0] }).ok).toBe(true);
    expect(w.C.c.pg[GER]).toBe(pg0 - 20_000);
    expect(w.C.c.hazine[GER]).toBe(hz0 - 5000);
    expect(uygula(w, { tur: 'v17BakanAta', ulke: GER, alan: 'uretim', kisi: kisiler[1] }).ok).toBe(true);
    expect(w.v17.ministers.filter((m) => m.country === GER && m.portfolio === 'uretim').length).toBe(1);
    expect(onizle(w, { tur: 'v17BakanAta', ulke: GER, alan: 'ordu', kisi: kisiler[1] }).gecerli).toBe(false);
    // beceri etkisi: aynı bütçede, daha becerikli bakanla fabrika bonusu daha yüksek; üst sınır %15
    const sonuc = kisiler.map((k) => {
      const x = yeni();
      x.C.c.pg[GER] = 900_000;
      x.C.c.hazine[GER] = 50_000_000;
      uygula(x, { tur: 'v17BakanAta', ulke: GER, alan: 'uretim', kisi: k });
      return { beceri: x.v17.ministers[0]!.skill, bonus: v17IndustryBonus(x, GER) };
    });
    const en = sonuc.reduce((a, b) => (b.beceri > a.beceri ? b : a)),
      az = sonuc.reduce((a, b) => (b.beceri < a.beceri ? b : a));
    expect(en.beceri).toBeGreaterThan(az.beceri);
    expect(en.bonus).toBeGreaterThan(az.bonus);
    for (const r of sonuc) {
      expect(r.bonus).toBeLessThanOrEqual(150_000);
      expect(r.bonus).toBeGreaterThanOrEqual(0);
    }
  });
  test('NAVAL-03: kömürle çalışan 1914 donanması petrol kıtlığında yalnız sınırlı güç yitirir', () => {
    const w = yeni(kod(p1914, 'GBR'));
    const f = deniz.denizGucu(w, kod(p1914, 'GBR'));
    w.C.c.petrol[kod(p1914, 'GBR')] = 0;
    w.C.c.petrolIht[kod(p1914, 'GBR')] = 5000;
    const g = deniz.denizGucu(w, kod(p1914, 'GBR'));
    expect(g).toBeGreaterThanOrEqual(Math.floor(f * 0.79));
    expect(g).toBeGreaterThan(0);
  });
  test('SC1914-02/03: tarafsız Osmanlı için otomatik Karadeniz savaşı yoktur; Belçika ihlali olmadan Britanya savaş ilanı tetiklenmez (olay koşulları)', () => {
    const ol = p1914.olaylar!;
    const kdz = ol.find((o) => o.kod === 'karadeniz')!;
    expect(kdz.kosul?.bayrak).toContain('osm_goeben');
    expect(kdz.kosul?.bayrakDegil).toContain('osm_tarafsiz_kesin');
    expect(kdz.kosul?.barista).toBeDefined();
    const brit = ol.find((o) => o.kod === 'britanya')!;
    const GBR = kod(p1914, 'GBR'),
      BEL = kod(p1914, 'BEL');
    expect(brit.kosul?.savasta).toEqual([GER, BEL]);
    expect(brit.ulke).toBe(GBR);
    // v1.7 olayları hiçbir koşulda savaş ilan etmez
    for (const o of ol.filter((x) => x.kod.startsWith('v17_')))
      for (const sec of o.secenekler) expect(sec.e.some((e) => e.t === 'savas' || e.t === 'katil')).toBe(false);
  });
  test('SC1914-07/08: 62 ülkenin hepsi için hedef kurulur (16 tasarım + genel); hedef durumu kanonik dünyadan hesaplanır', () => {
    const w = yeni();
    let tasarim = 0,
      genel = 0;
    for (let c = 0; c < w.nC; c++) {
      if (ortak.pasif(w, c)) continue;
      const s = emptyV17();
      kurHedefler(w, s, c);
      expect(s.goals.length, p1914.ulkeler[c]!.kod).toBe(4);
      for (const g of s.goals) expect(OLCUTLER[g.metric]).toBeDefined();
      if (s.goals[0]!.code.startsWith('G1914_')) tasarim++;
      else genel++;
    }
    expect(tasarim).toBe(16);
    expect(genel).toBe(w.pkg.ulkeler.filter((_, c) => !ortak.pasif(w, c)).length - 16);
    expect(S).toBe(1_000_000);
  });
});
void pkg;
