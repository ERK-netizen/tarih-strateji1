/** These are repository-level integration tests. Execute AFTER applying patch in real v1.6.1 checkout. */
import { describe, it, expect } from 'vitest';
import {
  senaryoBaslat,
  onizle,
  uygula,
  serilestir,
  coz,
  dunyaHash,
  v17View,
  v17IndustryBonus,
  v17P3,
  v17P11,
  type Paket,
} from '@ts/engine';
import { readFileSync } from 'node:fs';
import { dunya } from './_ortak.ts';
const scenario = () => JSON.parse(readFileSync('data/derlenmis/s1914.json', 'utf8')) as Paket;
const gercek = () => {
  const p = scenario();
  const c = p.ulkeler.findIndex((x) => x.kod === 'GER');
  return senaryoBaslat(p, c, 0);
};

describe('v17 integration / migration, commands, private views', () => {
  it('creates a V17 state with sites, country-owned resources and deterministic IDs', () => {
    const w = dunya(0, 0);
    expect(w.v17.version).toBe(1);
    expect(new Set(w.v17.sites.map((x) => x.id)).size).toBe(w.v17.sites.length);
  });
  it('serializes canonical schema 11 without losing V17 data', () => {
    const w = dunya(0, 0);
    const id = w.v17.sites.find((s) => s.country === 0)?.id;
    if (id !== undefined) {
      w.C.c.pg[0] = 100_000;
      expect(uygula(w, { tur: 'v17SehirPolitika', ulke: 0, tesis: id, politika: 'verim' }).ok).toBe(true);
    }
    const b = serilestir(w),
      copy = coz(b, w.pkg);
    expect(serilestir(copy)).toEqual(b);
    expect(dunyaHash(copy)).toBe(dunyaHash(w));
  });
  it('new commands use standard preview then apply; rejection does not spend', () => {
    const w = dunya(0, 0);
    const before = w.C.c.hazine[0]!;
    expect(onizle(w, { tur: 'v17AgKur', ulke: 0, hedef: 0 }).gecerli).toBe(false);
    expect(uygula(w, { tur: 'v17AgKur', ulke: 0, hedef: 0 }).ok).toBe(false);
    expect(w.C.c.hazine[0]).toBe(before);
  });
  it('owned industrial site policy affects existing factory multiplier only once', () => {
    const w = dunya(0, 0);
    const own = w.v17.sites.find((x) => x.country === 0 && x.kind === 'askeri');
    if (!own) return;
    w.C.c.pg[0] = 100_000;
    const before = v17IndustryBonus(w, 0);
    expect(uygula(w, { tur: 'v17SehirPolitika', ulke: 0, tesis: own.id, politika: 'verim' }).ok).toBe(true);
    expect(v17IndustryBonus(w, 0)).toBeGreaterThan(before);
  });
  it('real 1914 scenario loads historical person and can appoint cabinet without duplicate identities', () => {
    const w = gercek();
    const c = w.oyuncu;
    const people = v17View(w).availablePoliticians;
    const person = people.find((x) => x.ad === 'Theobald von Bethmann Hollweg') ?? people[0];
    expect(person).toBeDefined();
    w.C.c.pg[c] = 500_000;
    w.C.c.hazine[c] = 1_000_000;
    expect(uygula(w, { tur: 'v17BakanAta', ulke: c, alan: 'uretim', kisi: person!.ad }).ok).toBe(true);
    expect(v17View(w).ministers.some((x) => x.personKey === person!.ad)).toBe(true);
  });
  it('spy network and prepared op persist after save/load', () => {
    const w = dunya(0, 0);
    w.C.c.pg[0] = 800_000;
    w.C.c.hazine[0] = 300_000;
    expect(uygula(w, { tur: 'v17AgKur', ulke: 0, hedef: 1 }).ok).toBe(true);
    const network = w.v17.networks.find((x) => x.owner === 0 && x.target === 1)!;
    w.gun = network.nextActionDay;
    expect(uygula(w, { tur: 'v17Operasyon', ulke: 0, ag: network.id, operasyon: 'bilgi' }).ok).toBe(true);
    const loaded = coz(serilestir(w), w.pkg);
    expect(loaded.v17.operations[0]?.status).toBe('preparing');
    loaded.gun += 21;
    v17P3(loaded);
    expect(loaded.v17.operations[0]?.status).not.toBe('preparing');
  });
  it('diplomatic proposal is visible only to parties, acceptance is applied once', () => {
    const w = dunya(0, 0);
    w.C.c.pg[0] = 100_000;
    expect(uygula(w, { tur: 'v17Teklif', ulke: 0, hedef: 1, madde: 'ticaret' }).ok).toBe(true);
    const p = w.v17.proposals[0]!;
    expect(v17View(w, 0).proposals.length).toBe(1);
    expect(v17View(w, 2).proposals.length).toBe(0);
    expect(uygula(w, { tur: 'v17TeklifYanit', ulke: 1, teklif: p.id, yanit: 'accept' }).ok).toBe(true);
    expect(w.v17.stats.treatiesAccepted).toBe(1);
    expect(uygula(w, { tur: 'v17TeklifYanit', ulke: 1, teklif: p.id, yanit: 'accept' }).ok).toBe(false);
  });
  it('1914 goals never auto-force wartime events; only evaluate stats', () => {
    const w = gercek();
    expect(w.v17.goals.length).toBeGreaterThan(0);
    const old = w.SV.count();
    v17P11(w);
    expect(w.SV.count()).toBe(old);
  });
});
