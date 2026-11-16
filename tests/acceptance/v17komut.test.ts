// v1.7 emirleri (kabine, istihbarat ağı, müzakere, tesis politikası, harekât planı): Türkçe komut, eşdeğer metin, geri çözülme (T123).
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { senaryoBaslat, uygula, onizle, v17View, type Paket, type World } from '@ts/engine';
import { ayristir, emirMetni } from '@ts/command';
import { katalogKur } from '../../packages/worker/src/katalog.ts';

const p1914 = JSON.parse(readFileSync('data/derlenmis/s1914.json', 'utf8')) as Paket;
const kod = (k: string) => p1914.ulkeler.findIndex((u) => u.kod === k);
const GER = kod('GER'),
  RUS = kod('RUS'),
  FRA = kod('FRA');
const yeni = (): World => senaryoBaslat(JSON.parse(JSON.stringify(p1914)) as Paket, GER, 0);

function hazirla() {
  const w = yeni();
  w.C.c.pg[GER] = 900_000;
  w.C.c.hazine[GER] = 5_000_000;
  w.C.c.pg[RUS] = 900_000;
  expect(uygula(w, { tur: 'v17AgKur', ulke: GER, hedef: RUS }).ok).toBe(true);
  // RUS bize müzakere teklifi gönderir (bekleyen teklif)
  expect(uygula(w, { tur: 'v17Teklif', ulke: RUS, hedef: GER, madde: 'ticaret' }).ok).toBe(true);
  return w;
}

describe('T123 v1.7 emirleri: eşdeğer komut metni geri çözülür', () => {
  const w = hazirla();
  const v = v17View(w);
  const kisi = v.availablePoliticians[0]!.ad;
  const ag = v.networks.find((n) => n.target === RUS)!;
  const teklif = v.proposals.find((x) => x.to === GER && x.status === 'pending')!;
  const tesis = v.sites.filter((x) => x.kind === 'askeri')[0]!;
  const bolgeAd = (r: number) => p1914.bolgeler[r]!.ad;
  const kars = p1914.bolgeler.findIndex((b) => b.ad === 'Königsberg' || b.ad === 'Berlin');
  const birlik = w.U.list().find((u) => w.U.c.ulke[u] === GER)!;
  const kat = katalogKur(w, [w.U.id(birlik)]);

  const emirler: Record<string, unknown>[] = [
    { tur: 'v17BakanAta', alan: 'uretim', kisi },
    { tur: 'v17BakanAta', alan: 'ordu', kisi },
    { tur: 'v17BakanAta', alan: 'ekonomi', kisi },
    { tur: 'v17AgKur', hedef: FRA },
    { tur: 'v17SanayiGorevi', model: 'gew98', fabrika: 2000 },
    { tur: 'v17SanayiGorevi', model: 'mg08', fabrika: 1000 },
    { tur: 'v17SanayiGorevi', model: 'mg08', fabrika: 0 },
    { tur: 'v17SanayiGorevi', model: 'etrich_taube', adet: 2 },
    { tur: 'v17Operasyon', ag: ag.id, operasyon: 'bilgi', bolge: -1 },
    { tur: 'v17Operasyon', ag: ag.id, operasyon: 'nufuz', bolge: -1 },
    { tur: 'v17Operasyon', ag: ag.id, operasyon: 'sabotaj', bolge: p1914.bolgeler.findIndex((b) => b.ad === 'Moskova') },
    { tur: 'v17Teklif', hedef: FRA, madde: 'ticaret' },
    { tur: 'v17Teklif', hedef: FRA, madde: 'saldirmazlik' },
    { tur: 'v17Teklif', hedef: FRA, madde: 'garanti' },
    { tur: 'v17TeklifYanit', teklif: teklif.id, yanit: 'accept' },
    { tur: 'v17TeklifYanit', teklif: teklif.id, yanit: 'reject' },
    { tur: 'v17TeklifYanit', teklif: teklif.id, yanit: 'counter' },
    { tur: 'v17SehirPolitika', tesis: tesis.id, politika: 'verim' },
    { tur: 'v17SehirPolitika', tesis: tesis.id, politika: 'istihdam' },
    { tur: 'v17SehirPolitika', tesis: tesis.id, politika: 'normal' },
    { tur: 'v17Harekat', birlikler: [w.U.id(birlik)], hedef: kars, emir: 'savun' },
    { tur: 'v17Harekat', birlikler: [w.U.id(birlik)], hedef: kars, emir: 'taarruz' },
    { tur: 'v17Harekat', birlikler: [w.U.id(birlik)], hedef: kars, emir: 'intikal' },
    { tur: 'v17Harekat', birlikler: [w.U.id(birlik)], hedef: kars, emir: 'garnizon' },
  ];
  for (const [i, e0] of emirler.entries())
    test(`${String(e0.tur)} #${i}`, () => {
      const e = { ulke: GER, ...e0 } as { tur: string; ulke: number } & Record<string, unknown>;
      const m = emirMetni(e, kat);
      expect(m, 'eşdeğer metin eksik').not.toContain('?');
      const s = ayristir(m, kat);
      const t = s.tur === 'emir' ? s.yorum.emir : s.tur === 'belirsiz' ? s.secenekler.find((x) => x.emir.tur === e.tur)?.emir : null;
      expect(t, `${m} → ${s.tur}${s.tur === 'ret' ? `: ${s.neden}` : ''}`).toBeTruthy();
      for (const key of Object.keys(e)) expect(t![key], `${m}: ${key}`).toEqual(e[key]);
    });
  test('serbest Türkçe: teklif numarasız yanıt (tek bekleyen teklif) ve ağsız operasyon reddi', () => {
    const a = ayristir('Müzakere teklifini kabul et', kat);
    expect(a.tur === 'emir' && a.yorum.emir).toMatchObject({ tur: 'v17TeklifYanit', teklif: teklif.id, yanit: 'accept' });
    const b = ayristir('Fransa ağıyla bilgi toplama operasyonu yap', kat);
    expect(b.tur).toBe('ret');
  });
  test('ayrıştırılan emirler önizleme yolundan geçer; kabine ataması ve ağ gerçekten uygulanır', () => {
    const o = onizle(w, { tur: 'v17BakanAta', ulke: GER, alan: 'uretim', kisi });
    expect(o.gecerli, o.neden).toBe(true);
    expect(uygula(w, { tur: 'v17BakanAta', ulke: GER, alan: 'uretim', kisi }).ok).toBe(true);
    expect(v17View(w).ministers.some((m) => m.personKey === kisi && m.portfolio === 'uretim')).toBe(true);
    void bolgeAd;
  });
});
