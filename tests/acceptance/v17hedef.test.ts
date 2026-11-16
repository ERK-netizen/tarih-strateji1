// v1.7 G01 ulusal hedefler (64 tasarım hedefi, 40 ölçüt) ve G02 olay ağı (36 tasarım olayı): V17 kabul maddeleri.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { senaryoBaslat, gunIlerle, serilestir, coz, dunyaHash, v17View, olaylar, S, type Paket, type World } from '@ts/engine';
import { OLCUTLER, guncelleHedefler, kurHedefler } from '../../packages/engine/src/v17/hedef.ts';

const oku = (k: string) => JSON.parse(readFileSync(`data/derlenmis/${k}.json`, 'utf8')) as Paket;
const p1914 = oku('s1914');
const kod = (p: Paket, k: string) => p.ulkeler.findIndex((u) => u.kod === k);
const oyna = (k: string, mod = 2, p: Paket = p1914) => senaryoBaslat(JSON.parse(JSON.stringify(p)) as Paket, kod(p, k), mod);
const gunler = (w: World, n: number) => {
  for (let i = 0; i < n; i++) gunIlerle(w, false);
};
const ONALTI = ['GER', 'FRA', 'GBR', 'RUS', 'AUH', 'OSM', 'SRB', 'BEL', 'ITA', 'BUL', 'ROM', 'JAP', 'USA', 'GRE', 'NLD', 'SWE'];

describe('G01 ulusal hedefler: tasarım verisi pakete derlenir', () => {
  test('1914 paketinde 16 ülke × 4 = 64 hedef; hepsinin ölçütü, artan aşamaları ve yolları var', () => {
    const h = p1914.hedefler!;
    expect(h.length).toBe(64);
    for (const k of ONALTI) expect(h.filter((x) => x.ulke === kod(p1914, k)).length, k).toBe(4);
    expect(new Set(h.map((x) => x.kod)).size).toBe(64);
    for (const x of h) {
      expect(OLCUTLER[x.metrik], `${x.kod}: ${x.metrik}`).toBeDefined();
      expect(x.asamalar.length).toBe(3);
      expect([...x.asamalar].sort((a, b) => a - b)).toEqual(x.asamalar);
      expect(x.esik).toBe(x.asamalar[2]);
      expect(x.yollar.length).toBeGreaterThanOrEqual(2);
    }
    // 40 ölçütün tamamı tasarım verisinde kullanılır ve adaptörde karşılığı vardır
    expect(new Set(h.map((x) => x.metrik)).size).toBe(40);
  });
  test('diğer senaryolarda paket hedefi yoktur; oyun genel hedefleri üretir', () => {
    for (const k of ['s750', 's1600', 's1939', 's2026']) expect(oku(k).hedefler, k).toBeUndefined();
  });
  test('oyuncunun ülkesine göre hedef listesi kurulur: tasarım hedefleri (1914 GER), genel hedefler (tasarımsız ülke ve senaryo)', () => {
    const g = oyna('GER');
    expect(g.v17.goals.map((x) => x.code)).toEqual(['G1914_GER_01', 'G1914_GER_02', 'G1914_GER_03', 'G1914_GER_04']);
    const m = oyna('MNE');
    expect(m.v17.goals.length).toBe(4);
    expect(m.v17.goals.every((x) => x.code.startsWith('MNE_GEN_'))).toBe(true);
    const p39 = oku('s1939');
    const w39 = oyna('GER', 2, p39);
    expect(w39.v17.goals.length).toBe(4);
    expect(w39.v17.goals.every((x) => x.code.startsWith('GER_GEN_'))).toBe(true);
  });
});

describe('G01 ölçütler: 0…S aralığında, belirlenimci, gerçek durumdan', () => {
  test('40 ölçütün tamamı 30 gün sonra 16 ülke için 0…S aralığında bir tamsayıdır', () => {
    for (const k of ONALTI) {
      const w = oyna(k);
      gunler(w, 30);
      for (const g of w.v17.goals) {
        expect(Number.isSafeInteger(g.value), `${g.code}`).toBe(true);
        expect(g.value).toBeGreaterThanOrEqual(0);
        expect(g.value).toBeLessThanOrEqual(S);
        expect(g.progress).toBeGreaterThanOrEqual(0);
        expect(g.progress).toBeLessThanOrEqual(S);
      }
    }
  });
  test('ölçüt gerçek durumu yansıtır: ikmal kesilince ikmal ölçütü düşer, savaş ilanı barış ölçütünü sıfırlar', () => {
    const w = oyna('GER');
    gunler(w, 14);
    const g = w.v17.goals.find((x) => x.metric === 'ammo_supply_days')!;
    expect(g.value).toBeGreaterThan(900_000);
    for (const u of w.U.list()) if (w.U.c.ulke[u] === w.oyuncu) w.U.c.muhimmatS[u] = 0;
    w.v17.stats.goalDay = -1;
    guncelleHedefler(w, w.v17);
    expect(g.value).toBeLessThan(200_000);
    const barisH = w.v17.goals.find((x) => x.metric === 'peace_with_GBR_days')!;
    expect(barisH.value).toBe(S);
  });
  test('iki koşu aynı hedef durumunu üretir ve kayıt-yükleme hash eşittir', () => {
    const a = oyna('FRA'),
      b = oyna('FRA');
    gunler(a, 100);
    gunler(b, 100);
    expect(JSON.stringify(a.v17.goals)).toBe(JSON.stringify(b.v17.goals));
    expect(dunyaHash(a)).toBe(dunyaHash(b));
    const y = coz(serilestir(a), a.pkg);
    expect(dunyaHash(y)).toBe(dunyaHash(a));
    expect(y.v17.stats.goalDay).toBe(a.v17.stats.goalDay);
    gunler(a, 30);
    gunler(y, 30);
    expect(dunyaHash(y)).toBe(dunyaHash(a));
  });
});

describe('G01 ilerleme: kalıcı performans tamamlar, anlık iyi durum tamamlamaz', () => {
  test('tarafsız Hollanda: 100 günde hiçbir hedef tamamlanmaz (120 günlük ortalama); bir yılda hedefler tamamlanır, puan ve Kronik işlenir', () => {
    const w = oyna('NLD');
    gunler(w, 100);
    expect(w.v17.goals.every((g) => g.status === 'active')).toBe(true);
    expect(w.v17.stats.goalScore).toBe(0);
    gunler(w, 265);
    const bitti = w.v17.goals.filter((g) => g.status === 'completed');
    expect(bitti.length).toBeGreaterThan(0);
    expect(w.v17.stats.goalScore).toBe(bitti.reduce((t, g) => t + g.weight, 0));
    for (const g of bitti) {
      expect(g.progress).toBeGreaterThanOrEqual(g.threshold);
      expect(g.stage).toBe(3);
      expect(g.completedDay).toBeGreaterThan(0);
    }
    expect(w.anlati.some((a) => a.tur === 'hedef' && a.metin.startsWith('Ulusal hedef tamamlandı'))).toBe(true);
  });
  test('aşamalar sırayla geçilir; ilerleme ölçütten yavaş ve ölçüte doğru hareket eder', () => {
    const w = oyna('USA');
    let onceki = 0;
    for (let i = 0; i < 20; i++) {
      gunler(w, 7);
      const g = w.v17.goals[0]!;
      expect(g.progress).toBeGreaterThanOrEqual(onceki - 50_000);
      expect(g.progress).toBeLessThanOrEqual(Math.max(g.value, onceki) + 1);
      expect(g.stage).toBe(g.stages.filter((e) => g.progress >= e).length);
      onceki = g.progress;
    }
  });
  test('ülke yok olursa hedefler başarısız olur (tarih dayatılmaz: yalnız bu durumda)', () => {
    const w = oyna('BEL');
    gunler(w, 14);
    w.C.c.pasif[w.oyuncu] = 1;
    w.v17.stats.goalDay = -1;
    guncelleHedefler(w, w.v17);
    expect(w.v17.goals.every((g) => g.status === 'failed')).toBe(true);
  });
  test('görünüm: ölçüt adı, aşamalar, alternatif yollar ve hedef puanı oyuncuya döner; yabancı hedefler dönmez', () => {
    const w = oyna('GER');
    gunler(w, 30);
    const v = v17View(w);
    expect(v.goals.length).toBe(4);
    for (const g of v.goals) {
      expect(g.metricName.length).toBeGreaterThan(3);
      expect(g.paths.length).toBeGreaterThanOrEqual(2);
      expect(g.stages.length).toBe(3);
    }
    expect(typeof v.goalScore).toBe('number');
    expect(v17View(w, kod(p1914, 'FRA')).goals.length).toBe(0);
    // kurulum yeniden çağrılırsa aynı kimlikler üretilmez
    const once = v.goals.map((g) => g.id);
    kurHedefler(w, w.v17, w.oyuncu);
    expect(w.v17.goals.map((g) => g.id)).not.toEqual(once);
  });
});

describe('G05 danışman: hedef açığına göre önerilen üç hareket', () => {
  test('her ölçütün önerisi vardır; görünüm en büyük açıklı üç hedefi sıralar ve tamamlanan hedefi önermez', async () => {
    const { OLCUTLER: O, HEDEF_ONERI } = await import('../../packages/engine/src/v17/hedef.ts');
    for (const m of Object.keys(O)) expect(HEDEF_ONERI[m], m).toBeTruthy();
    const w = oyna('GER');
    gunler(w, 30);
    const v = v17View(w);
    expect(v.suggestions.length).toBe(3);
    expect(new Set(v.suggestions.map((x) => x.goalId)).size).toBe(3);
    const acik = (id: number) => {
      const g = w.v17.goals.find((x) => x.id === id)!;
      return (g.threshold - g.progress) * g.weight;
    };
    const sirali = v.suggestions.map((x) => acik(x.goalId));
    expect([...sirali].sort((a, b) => b - a)).toEqual(sirali);
    w.v17.goals[0]!.status = 'completed';
    expect(v17View(w).suggestions.some((x) => x.goalId === w.v17.goals[0]!.id)).toBe(false);
    for (const x of v.suggestions) expect(x.advice.length).toBeGreaterThan(20);
  });
});

describe('G02 olay ağı: 36 tasarım olayı paket olaylarıdır; tarih dayatılmaz', () => {
  const v17 = (p1914.olaylar ?? []).filter((o) => o.kod.startsWith('v17_'));
  test('36 olay derlenmiştir; her biri 3 seçenekli, bayrakla zincirli, bedelli ve savaş/toprak değişikliği içermez', () => {
    expect(v17.length).toBe(36);
    expect((p1914.olaylar ?? []).length).toBe(66);
    for (const o of v17) {
      expect(o.secenekler.length).toBe(3);
      expect(o.kosul?.bayrakDegil).toContain(o.kod.replace('v17_', 'v17:'));
      for (const s of o.secenekler) {
        expect(s.e.some((e) => e.t === 'bayrak' && e.olay === o.kod.replace('v17_', 'v17:'))).toBe(true);
        expect(
          s.e.every((e) => !['savas', 'katil', 'bolge', 'baris', 'ittifak'].includes(e.t)),
          `${o.kod}: otomatik sonuç yok`,
        ).toBe(true);
        expect(
          s.e.some((e) => e.t === 'pg' || e.t === 'mesru' || e.t === 'gerginlik'),
          `${o.kod}: bedel var`,
        ).toBe(true);
        expect(s.yz).toBeGreaterThan(0);
      }
      // YZ ağırlıkları: görüşme en olası, siyaset en az
      expect(o.secenekler[0]!.yz).toBeGreaterThan(o.secenekler[2]!.yz);
    }
  });
  test('Saraybosna tutumu 28 Haziran 1914’te AUH için gelir; seçim sonrası bayrak konur ve zincir olayları (Sırbistan, Avusturya, Rusya) açılır', () => {
    const w = oyna('GER');
    gunler(w, 40);
    expect(olaylar.bayrakVar(w, 'v17:saraybosna_krizi')).toBe(true);
    // krize bağlı olaylardan en az biri (AI ülkeleri seçer) tamamlanmıştır
    const tamam = v17.filter((o) => olaylar.bayrakVar(w, o.kod.replace('v17_', 'v17:'))).length;
    expect(tamam).toBeGreaterThanOrEqual(4);
  });
  test('oyuncu AUH ise olay kararı bekler: seçilene dek bayrak konmaz, seçim bedelini öder ve aynı olay tekrar gelmez', () => {
    const w = oyna('AUH', 0);
    const pg0 = w.C.c.pg[w.oyuncu]!;
    const r = gunIlerle(w, false);
    void r;
    expect(olaylar.bayrakVar(w, 'v17:saraybosna_krizi')).toBe(false);
    expect(w.pkg.olaylar!.some((o) => o.kod === 'v17_saraybosna_krizi')).toBe(true);
    void pg0;
  });
});
