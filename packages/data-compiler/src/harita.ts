// Gerçek dünya geometrisi derleyicisi. Kaynaklar:
//  - Natural Earth 1:50m ülke sınırları (kamu malı) — world-atlas paketi
//  - GeoNames şehirleri (CC BY 4.0) — all-the-cities paketi
// Her ülke, önemli şehirlerinin çevresinde Voronoi hücrelerine bölünür ve ülke sınırına kırpılır.
// Komşuluk 2× çözünürlüklü raster üzerinden bulunur; boğaz ve okyanus geçişleri elle tanımlanır.
// Kayan nokta yalnız burada (derleme zamanı) kullanılır; oyuna tamsayı/sabit sayı yazılır.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoNaturalEarth1, geoArea, geoPath } from 'd3-geo';
import { Delaunay } from 'd3-delaunay';
import polygonClipping from 'polygon-clipping';

const require = createRequire(import.meta.url);
const topoHam = require('world-atlas/countries-50m.json');
// topoloji korunarak sadeleştirme: komşu ülkeler aynı sınır yayını paylaşır
const topo = simplify(presimplify(topoHam), quantile(presimplify(topoHam), 0.42));
const SEHIRLER: Sehir[] = require('all-the-cities');
const iso = require('i18n-iso-countries');
iso.registerLocale(require('i18n-iso-countries/langs/tr.json'));

interface Sehir { name: string; altName: string; country: string; featureCode: string; population: number; loc: { coordinates: [number, number] } }
type P2 = [number, number];
type Ring = P2[];
type MPoly = Ring[][];

const W = 2600;
const R_ERKEN = 2; // raster ölçeği

// ---------- Ülkeler ----------
const ADA_ISO: Record<string, string> = { Somaliland: 'SO', Kosovo: 'XK', 'N. Cyprus': 'KK', 'Siachen Glacier': 'IN' };
const AT: Set<string> = new Set(['AQ', 'TF', 'HM', 'GS', 'BV', 'IO', 'UM', 'PN', 'SH', 'FK', 'AX', 'GG', 'JE', 'IM', 'FO', 'PM', 'WF', 'NF', 'CX', 'CC', 'MF', 'SX', 'BL', 'AI', 'MS', 'VG', 'VI', 'KY', 'TC', 'BM', 'NU', 'CK', 'TK', 'AS', 'GU', 'MP', 'PF', 'NC', 'AW', 'CW', 'GL0']);
// Bağımlı topraklar → egemen ülke (2026)
const BAGLI: Record<string, string> = { GL: 'DK', PR: 'US', NC: 'FR', PF: 'FR', FK: 'GB', EH: 'MA', HK: 'CN', MO: 'CN', GF: 'FR', RE: 'FR', GP: 'FR', MQ: 'FR', YT: 'FR' };
const TR_AD: Record<string, string> = { XK: 'Kosova', KK: 'Kuzey Kıbrıs' };

interface Ulke { iso: string; ad: string; poligon: MPoly; alanKm2: number; lon: number; lat: number }
const feats = (feature(topo, topo.objects.countries) as unknown as { features: { id?: string; properties: { name: string }; geometry: { type: string; coordinates: unknown } }[] }).features;
const projeksiyon = geoNaturalEarth1();
const kara = { type: 'FeatureCollection', features: feats.filter((f) => f.properties.name !== 'Antarctica') };
projeksiyon.fitWidth(W, kara as never);
const sinirlar = geoPath(projeksiyon).bounds(kara as never);
const H = Math.ceil(sinirlar[1][1] - sinirlar[0][1]) + 4;
projeksiyon.translate([projeksiyon.translate()[0], projeksiyon.translate()[1] - sinirlar[0][1] + 2]);
const proj = (lon: number, lat: number): P2 => { const p = projeksiyon([lon, lat])!; return [p[0], p[1]]; };
projeksiyon.clipExtent([[0, 0], [W, 4000]]);

function dp(r0: Ring, eps: number): Ring {
  if (r0.length < 5) return r0;
  const f = r0[0]!, l = r0[r0.length - 1]!;
  if (f[0] === l[0] && f[1] === l[1]) {
    const m = Math.floor(r0.length / 2);
    const a = dpAc(r0.slice(0, m + 1), eps), b = dpAc(r0.slice(m), eps);
    return [...a, ...b.slice(1)];
  }
  return dpAc(r0, eps);
}
function dpAc(r: Ring, eps: number): Ring {
  if (r.length < 3) return r;
  const keep = new Uint8Array(r.length); keep[0] = 1; keep[r.length - 1] = 1;
  const yigin: [number, number][] = [[0, r.length - 1]];
  while (yigin.length) {
    const [a, b] = yigin.pop()!;
    let dmax = 0, im = -1;
    const [ax, ay] = r[a]!, [bx, by] = r[b]!;
    const L = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - r[i]![1]) - (ax - r[i]![0]) * (by - ay)) / L;
      if (d > dmax) { dmax = d; im = i; }
    }
    if (dmax > eps && im > 0) { keep[im] = 1; yigin.push([a, im], [im, b]); }
  }
  return r.filter((_, i) => keep[i]);
}
const halkaAlan = (r: Ring) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i]!, b = r[(i + 1) % r.length]!; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

/** d3-geo yolu (antimeridyen kırpması dahil) → halkalar; çift-tek kuralıyla çokgen. */
function projeEt(geom: { type: string; coordinates: unknown }): MPoly {
  const halkalar: Ring[] = [];
  let cur: Ring = [];
  const ctx = {
    moveTo(x: number, y: number) { if (cur.length > 2) halkalar.push(cur); cur = [[x, y]]; },
    lineTo(x: number, y: number) { cur.push([x, y]); },
    closePath() { if (cur.length > 2) { cur.push([cur[0]![0], cur[0]![1]]); halkalar.push(cur); } cur = []; },
    arc() { /* nokta yok */ },
  };
  geoPath(projeksiyon, ctx as never)({ type: 'Feature', geometry: geom, properties: {} } as never);
  if (cur.length > 2) halkalar.push(cur);
  if (!halkalar.length) return [];
  try {
    return polygonClipping.xor(...(halkalar.map((r) => [r]) as never as [never])) as unknown as MPoly;
  } catch {
    return halkalar.map((r) => [r]);
  }
}

const ulkeHam = new Map<string, Ulke>();
for (const f of feats) {
  const ad = f.properties.name;
  let kod: string | undefined = ADA_ISO[ad] ?? (f.id ? iso.numericToAlpha2(f.id) : undefined);
  if (!kod || AT.has(kod) || ad === 'Antarctica' || ad === 'Indian Ocean Ter.') continue;
  if (kod === 'GL') kod = 'GL';
  const alan = geoArea(f as never) * 6371 * 6371;
  const mp = projeEt(f.geometry);
  if (!mp.length) continue;
  const var_ = ulkeHam.get(kod);
  if (var_) { var_.poligon.push(...mp); var_.alanKm2 += alan; continue; }
  // ağırlık merkezi: en büyük halkanın ortalaması (lon/lat için ters projeksiyon)
  ulkeHam.set(kod, { iso: kod, ad: TR_AD[kod] ?? iso.getName(kod, 'tr') ?? ad, poligon: mp, alanKm2: alan, lon: 0, lat: 0 });
}
// küçük ülkeler: 1.200 km² altı haritada görünmez; en yakın büyük ülkeye katılmaz, düşürülür (deniz)
for (const [k, u] of [...ulkeHam]) if (u.alanKm2 < 1200 && !['SG', 'BH', 'MT'].includes(k)) ulkeHam.delete(k);
for (const u of ulkeHam.values()) {
  let best: Ring | null = null, ba = 0;
  for (const p of u.poligon) { const a = Math.abs(halkaAlan(p[0]!)); if (a > ba) { ba = a; best = p[0]!; } }
  let sx = 0, sy = 0; for (const q of best!) { sx += q[0]; sy += q[1]; }
  const inv = projeksiyon.invert!([sx / best!.length, sy / best!.length])!;
  u.lon = inv[0]; u.lat = inv[1];
}

// ---------- Bölge sayısı ----------
function bolgeYogunluk(lon: number, lat: number): { alan: number; kent: number } {
  if (lon > -25 && lon < 45 && lat > 35 && lat < 72) return { alan: 55_000, kent: 2_800_000 }; // Avrupa
  if (lon > 25 && lon < 63 && lat > 12 && lat <= 43) return { alan: 85_000, kent: 3_500_000 }; // Yakın Doğu
  if (lon >= 63 && lon < 150 && lat > -12) return { alan: 140_000, kent: 9_000_000 }; // Asya
  if (lat > 45 && lon >= 45) return { alan: 400_000, kent: 6_000_000 }; // Rusya Asya
  return { alan: 260_000, kent: 6_000_000 };
}
const TAVAN: Record<string, number> = { RU: 29, US: 16, CN: 21, IN: 13, CA: 7, BR: 8, AU: 5, TR: 14, IR: 8, SA: 5, EG: 5, DZ: 5, LY: 3, KZ: 6, MX: 6, AR: 5, ID: 7, CD: 4, SD: 3, FR: 10, DE: 10, GB: 8, IT: 10, ES: 9, UA: 10, PL: 7, JP: 6, PK: 5, GL: 1, GR: 3, MA: 3, UZ: 3, AF: 3, ML: 2, PE: 5, VN: 3 };
/** Tarihî önemi için mutlaka bölge merkezi olacak şehirler (aralık kuralından muaf). */
const ZORUNLU: [string, string][] = [
  ['Venice', 'IT'], ['Florence', 'IT'], ['Velikiy Novgorod', 'RU'], ['Kazan', 'RU'], ['Smolensk', 'RU'], ['Voronezh', 'RU'], ['Nizhniy Novgorod', 'RU'], ['Samarkand', 'UZ'], ['Herat', 'AF'],
  ['Nanjing', 'CN'], ['Lhasa', 'CN'], ['Kashgar', 'CN'], ['Timbuktu', 'ML'], ['Cusco', 'PE'], ['Irákleion', 'GR'], ['Thessaloníki', 'GR'], ['Saint Petersburg', 'RU'], ['Ho Chi Minh City', 'VN'], ['Bologna', 'IT'], ['Simferopol', 'UA'], ['Poznań', 'PL'], ['Oviedo', 'ES'], ['Fès', 'MA'], ['Huế', 'VN'],
];
/** Modern şehir adı düzeltmeleri (ülke:ad → Türkçe/anlamlı ad). */
const DUZELT: Record<string, string> = {
  'LB:Trablus': 'Trablusşam', 'LY:Trablus': 'Trablusgarp', 'IQ:Basrah': 'Basra', 'IR:Kahrīz': 'Kirmanşah', 'EG:Dayrūţ': 'Asyut', "DJ:'Ali Sabieh": 'Cibuti', 'BH:Ar Rifā‘': 'Bahreyn', 'MT:Birkirkara': 'Malta',
  'PH:Budta': 'Mindanao', 'IN:Nowrangapur': 'Orissa', 'PT:Amadora': 'Lizbon', 'CN:Tai’an': 'Şandong', 'CN:Qionghai': 'Hainan', 'CN:Huocheng': 'İli', 'CN:Hegang': 'Heilongjiang', 'CY:Limassol': 'Kıbrıs',
  'GQ:Aconibe': 'Ekvator Ginesi', 'LR:Gbarnga': 'Monrovia', 'SL:Bo': 'Freetown', 'GM:Serekunda': 'Banjul', 'FJ:Lautoka': 'Fiji', 'PR:Bayamón': 'Porto Riko', 'SO:Hargeysa': 'Somali', 'YE:Laḩij': 'Aden',
  'MM:Pathein': 'Rangun', 'GR:Thessaloníki': 'Selanik', 'US:Washington, D.C.': 'Washington', 'KZ:Nur-Sultan': 'Astana', 'AE:Abu Dhabi': 'Abu Dabi', 'Velikiy Novgorod': 'Novgorod', 'CN:Nanjing': 'Nankin',
  'CN:Kashgar': 'Kaşgar', 'UA:Simferopol': 'Kırım', 'ES:Oviedo': 'Asturias', 'MA:Fès': 'Fas', 'GR:Irákleion': 'Girit', 'VN:Huế': 'Hue', 'PL:Poznań': 'Poznań', 'ML:Timbuktu': 'Timbuktu', 'PE:Cusco': 'Cusco',
  'IT:Venice': 'Venedik', 'IT:Florence': 'Floransa', 'UZ:Samarkand': 'Semerkant', 'AF:Herat': 'Herat', 'RU:Velikiy Novgorod': 'Novgorod', 'RU:Nizhniy Novgorod': 'Nijni Novgorod', 'CN:Lhasa': 'Lhasa',
  'CO:Pasto': 'Pasto', 'AU:Townsville': 'Queensland', 'BR:Feira de Santana': 'Bahia', 'NG:Port Harcourt': 'Benin', 'RU:Surgut': 'Surgut', 'IR:Tahran': 'Tahran', 'SA:Khamis Mushait': 'Asir', 'SA:Hafar Al-Batin': 'Necid Kuzeyi',
};

const kentSehir = new Map<string, Sehir[]>();
for (const s of SEHIRLER) {
  if (s.population < 8000) continue;
  if (!['PPL', 'PPLA', 'PPLA2', 'PPLC', 'PPLA3', 'PPLG'].includes(s.featureCode)) continue;
  let k = s.country;
  if (k === 'XK' || k === 'KK') k = s.country;
  (kentSehir.get(k) ?? kentSehir.set(k, []).get(k)!).push(s);
}
for (const l of kentSehir.values()) l.sort((a, b) => (b.featureCode === 'PPLC' ? 1 : 0) - (a.featureCode === 'PPLC' ? 1 : 0) || b.population - a.population);

// Türkçe adlar (başkent ve önemli şehirler)
const TR_SEHIR: Record<string, string> = {
  Istanbul: 'İstanbul', Izmir: 'İzmir', Moscow: 'Moskova', 'Saint Petersburg': 'St. Petersburg', Vienna: 'Viyana', Athens: 'Atina', Rome: 'Roma', London: 'Londra', Warsaw: 'Varşova',
  Prague: 'Prag', Budapest: 'Budapeşte', Bucharest: 'Bükreş', Sofia: 'Sofya', Belgrade: 'Belgrad', Cairo: 'Kahire', Baghdad: 'Bağdat', Damascus: 'Şam', Tehran: 'Tahran',
  Jerusalem: 'Kudüs', Aleppo: 'Halep', Mosul: 'Musul', Thessaloniki: 'Selanik', Tbilisi: 'Tiflis', Baku: 'Bakü', Yerevan: 'Erivan', Kyiv: 'Kiev', Kiev: 'Kiev', Munich: 'Münih',
  Cologne: 'Köln', Brussels: 'Brüksel', Lisbon: 'Lizbon', Naples: 'Napoli', Venice: 'Venedik', Florence: 'Floransa', Geneva: 'Cenevre', Copenhagen: 'Kopenhag', Stockholm: 'Stokholm',
  Beijing: 'Pekin', Shanghai: 'Şanghay', 'New Delhi': 'Yeni Delhi', Delhi: 'Delhi', Mumbai: 'Bombay', Kolkata: 'Kalküta', Algiers: 'Cezayir', Tunis: 'Tunus', Tripoli: 'Trablus',
  Beirut: 'Beyrut', Riyadh: 'Riyad', Mecca: 'Mekke', Medina: 'Medine', Kabul: 'Kâbil', Tashkent: 'Taşkent', Samarkand: 'Semerkant', Bukhara: 'Buhara', Kazan: 'Kazan',
  'Mexico City': 'Meksiko', Havana: 'Havana', Bern: 'Bern', Zurich: 'Zürih', Hamburg: 'Hamburg', Berlin: 'Berlin', Paris: 'Paris', Madrid: 'Madrid', Seville: 'Sevilla',
  Krakow: 'Krakov', Kraków: 'Krakov', Lviv: 'Lviv', Odesa: 'Odessa', Kharkiv: 'Harkov', Minsk: 'Minsk', Vilnius: 'Vilnius', Riga: 'Riga', Tallinn: 'Tallinn', Helsinki: 'Helsinki',
  Oslo: 'Oslo', Dublin: 'Dublin', Edinburgh: 'Edinburg', Amsterdam: 'Amsterdam', Antwerpen: 'Anvers', Marseille: 'Marsilya', Lyon: 'Lyon', Milan: 'Milano', Turin: 'Torino', Genoa: 'Cenova',
  Palermo: 'Palermo', Sarajevo: 'Saraybosna', Skopje: 'Üsküp', Tirana: 'Tiran', Chisinau: 'Kişinev', Astrakhan: 'Astrahan', Volgograd: 'Volgograd', Isfahan: 'İsfahan', Tabriz: 'Tebriz',
  Basra: 'Basra', Alexandria: 'İskenderiye', Khartoum: 'Hartum', 'Addis Ababa': 'Addis Ababa', Nicosia: 'Lefkoşa', Kuwait: 'Kuveyt', 'Kuwait City': 'Kuveyt', Doha: 'Doha',
  Muscat: 'Maskat', "Sana'a": 'San’a', Sanaa: 'San’a', Aden: 'Aden', Jeddah: 'Cidde', Karachi: 'Karaçi', Lahore: 'Lahor', Dhaka: 'Dakka', Tokyo: 'Tokyo', Seoul: 'Seul',
  'Ho Chi Minh City': 'Saygon', Hanoi: 'Hanoi', Bangkok: 'Bangkok', Jakarta: 'Cakarta', Manila: 'Manila', Rabat: 'Rabat', Casablanca: 'Kazablanka', Marrakesh: 'Marakeş', Fes: 'Fas',
  Ankara: 'Ankara', Bursa: 'Bursa', Konya: 'Konya', Adana: 'Adana', Trabzon: 'Trabzon', Erzurum: 'Erzurum', Diyarbakir: 'Diyarbakır', Edirne: 'Edirne', Antalya: 'Antalya', Samsun: 'Samsun',
  Kayseri: 'Kayseri', Sivas: 'Sivas', Van: 'Van', Gaziantep: 'Antep', Sanliurfa: 'Urfa', Malatya: 'Malatya', Eskisehir: 'Eskişehir', Balikesir: 'Balıkesir', Canakkale: 'Çanakkale',
};

interface Bolge { ad: string; iso: string; lon: number; lat: number; x: number; y: number; poligon: MPoly; alanKm2: number; nufus: number; kent: number; arazi: number; kiyi: boolean }
const bolgeler: Bolge[] = [];

function mesafeKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function noktaIcinde(p: P2, mp: MPoly): boolean {
  let ic = false;
  for (const poly of mp) for (const r of poly) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i]!, [xj, yj] = r[j]!;
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) ic = !ic;
    }
  }
  return ic;
}

const ulkeler = [...ulkeHam.values()].sort((a, b) => a.iso.localeCompare(b.iso));
for (const u of ulkeler) {
  const tumAday = (kentSehir.get(u.iso) ?? []).filter((s) => noktaIcinde(proj(...s.loc.coordinates), u.poligon));
  const zorunlu = ZORUNLU.filter(([, k]) => k === u.iso).map(([ad]) => SEHIRLER.filter((c) => c.country === u.iso && (c.name === ad || c.altName.split(',').includes(ad))).sort((a, b) => b.population - a.population)[0]).filter((c): c is Sehir => !!c);
  const adaylar = [...zorunlu, ...tumAday.filter((c) => !zorunlu.includes(c))];
  const kentNufus = adaylar.reduce((s, c) => s + c.population, 0);
  const y = bolgeYogunluk(u.lon, u.lat);
  let k = Math.round(Math.sqrt((u.alanKm2 / y.alan) * Math.max(0.3, kentNufus / y.kent)));
  k = Math.max(1, Math.min(TAVAN[u.iso] ?? 9, k));
  if (u.alanKm2 < 25_000) k = 1;
  const zSay = ZORUNLU.filter(([, z]) => z === u.iso).length;
  if (zSay) k = Math.max(k, zSay + 1);
  // tohumlar: başkent önce, nüfusa göre, aralıklı
  const alanPx = u.poligon.reduce((s, p) => s + Math.abs(halkaAlan(p[0]!)), 0);
  let dmin = 0.62 * Math.sqrt(alanPx / k);
  const secilen: Sehir[] = [];
  // zorunlu şehirler tavanı aşmaz; başkent korunur, ardından zorunlular
  const bas = adaylar.find((c) => c.featureCode === 'PPLC');
  if (bas) secilen.push(bas);
  for (const z of zorunlu) if (!secilen.includes(z)) secilen.push(z);
  for (let tur = 0; tur < 4 && secilen.length < k; tur++) {
    for (const s of adaylar) {
      if (secilen.length >= k) break;
      if (secilen.includes(s)) continue;
      const p = proj(...s.loc.coordinates);
      if (secilen.every((t) => { const q = proj(...t.loc.coordinates); return Math.hypot(p[0] - q[0], p[1] - q[1]) >= dmin; })) secilen.push(s);
    }
    dmin *= 0.7;
  }
  if (secilen.length === 0) {
    // şehir verisi yok: ülke ağırlık merkezi
    secilen.push({ name: u.ad, altName: '', country: u.iso, featureCode: 'PPLC', population: 50_000, loc: { coordinates: [u.lon, u.lat] } });
  }
  const tohum = secilen.map((s) => proj(...s.loc.coordinates));
  let hucreler: MPoly[];
  if (tohum.length === 1) hucreler = [u.poligon];
  else {
    const xs = u.poligon.flatMap((p) => p[0]!.map((q) => q[0])), ys = u.poligon.flatMap((p) => p[0]!.map((q) => q[1]));
    const v = Delaunay.from(tohum).voronoi([Math.min(...xs) - 5, Math.min(...ys) - 5, Math.max(...xs) + 5, Math.max(...ys) + 5]);
    hucreler = tohum.map((_, i) => {
      const c = v.cellPolygon(i) as unknown as Ring;
      if (!c) return [];
      try { return polygonClipping.intersection([c] as never, u.poligon as never) as unknown as MPoly; } catch { return []; }
    });
  }
  hucreler.forEach((hp, i) => {
    if (!hp.length) return;
    const s = secilen[i]!;
    // kent nüfusu: hücredeki şehirler
    let kentP = 0;
    for (const c of adaylar) if (noktaIcinde(proj(...c.loc.coordinates), hp)) kentP += c.population;
    const alan = (u.alanKm2 * hp.reduce((t, p) => t + Math.abs(halkaAlan(p[0]!)) - p.slice(1).reduce((z, h) => z + Math.abs(halkaAlan(h)), 0), 0)) / Math.max(1, alanPx);
    const [x, yy] = tohum[i]!;
    bolgeler.push({ ad: DUZELT[`${u.iso}:${TR_SEHIR[s.name] ?? s.name}`] ?? DUZELT[`${u.iso}:${s.name}`] ?? TR_SEHIR[s.name] ?? s.name, iso: u.iso, lon: s.loc.coordinates[0], lat: s.loc.coordinates[1], x, y: yy, poligon: hp, alanKm2: Math.round(alan), nufus: 0, kent: Math.max(kentP, s.population), arazi: 0, kiyi: false });
  });
}

// ---------- Raster ve komşuluk ----------
const RW = W * R_ERKEN, RH = H * R_ERKEN;
const izgara = new Int16Array(RW * RH).fill(-1);
function doldur(mp: MPoly, id: number): void {
  const kenar: [number, number, number, number][] = [];
  let ymin = Infinity, ymax = -Infinity;
  for (const poly of mp) for (const r of poly) for (let i = 0; i < r.length; i++) {
    const a = r[i]!, b = r[(i + 1) % r.length]!;
    kenar.push([a[0] * R_ERKEN, a[1] * R_ERKEN, b[0] * R_ERKEN, b[1] * R_ERKEN]);
    ymin = Math.min(ymin, a[1] * R_ERKEN); ymax = Math.max(ymax, a[1] * R_ERKEN);
  }
  for (let y = Math.max(0, Math.floor(ymin)); y <= Math.min(RH - 1, Math.ceil(ymax)); y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (const [x1, y1, x2, y2] of kenar) if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1));
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k]! - 0.5)); x <= Math.min(RW - 1, Math.floor(xs[k + 1]! - 0.5)); x++) izgara[y * RW + x] = id;
    }
  }
}
bolgeler.forEach((b, i) => doldur(b.poligon, i));
const sinir = new Map<number, number>();
const kiyiSay = new Int32Array(bolgeler.length);
const pikselSay = new Int32Array(bolgeler.length);
for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
  const a = izgara[y * RW + x]!;
  if (a < 0) continue;
  pikselSay[a]!++;
  for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
    if (x + dx >= RW || y + dy >= RH) continue;
    const b = izgara[(y + dy) * RW + x + dx]!;
    if (b === a) continue;
    if (b < 0) { kiyiSay[a]!++; continue; }
    const key = Math.min(a, b) * 4096 + Math.max(a, b);
    sinir.set(key, (sinir.get(key) ?? 0) + 1);
  }
  if (x > 0 && izgara[y * RW + x - 1]! < 0) kiyiSay[a]!++;
  if (y > 0 && izgara[(y - 1) * RW + x]! < 0) kiyiSay[a]!++;
}
bolgeler.forEach((b, i) => { b.kiyi = kiyiSay[i]! > 2; });

export interface Kenar { a: number; b: number; km: number; sinir: number; tur: number } // tur: 0 kara, 1 boğaz, 2 okyanus
const kenarlar: Kenar[] = [];
for (const [key, n] of sinir) {
  if (n < 2) continue;
  const a = Math.floor(key / 4096), b = key % 4096;
  kenarlar.push({ a, b, km: Math.max(40, Math.round(mesafeKm([bolgeler[a]!.lon, bolgeler[a]!.lat], [bolgeler[b]!.lon, bolgeler[b]!.lat]))), sinir: Math.round(n / R_ERKEN), tur: 0 });
}

// ---------- Deniz geçişleri ----------
function bolgeBul(sehir: string, ulke: string): number {
  const s = SEHIRLER.filter((c) => c.country === ulke && (c.name === sehir || c.altName.split(',').includes(sehir))).sort((a, b) => b.population - a.population)[0];
  const lonlat: [number, number] | null = s ? s.loc.coordinates : null;
  if (lonlat) {
    const [x, y] = proj(...lonlat);
    const r = izgara[Math.floor(y * R_ERKEN) * RW + Math.floor(x * R_ERKEN)]!;
    if (r >= 0 && bolgeler[r]!.iso === ulke) return r;
  }
  let best = -1, bd = Infinity;
  bolgeler.forEach((b, i) => {
    if (b.iso !== ulke) return;
    const d = lonlat ? mesafeKm(lonlat, [b.lon, b.lat]) : 0;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
const BOGAZ: [string, string, string, string][] = [
  ['Dover', 'GB', 'Calais', 'FR'], ['London', 'GB', 'Antwerpen', 'BE'], ['Holyhead', 'GB', 'Dublin', 'IE'], ['Belfast', 'GB', 'Glasgow', 'GB'],
  ['Algeciras', 'ES', 'Tangier', 'MA'], ['Messina', 'IT', 'Reggio Calabria', 'IT'], ['Palermo', 'IT', 'Tunis', 'TN'], ['Cagliari', 'IT', 'Rome', 'IT'], ['Bastia', 'FR', 'Livorno', 'IT'], ['Ajaccio', 'FR', 'Sassari', 'IT'],
  ['Copenhagen', 'DK', 'Malmö', 'SE'], ['Helsingborg', 'SE', 'Helsingør', 'DK'], ['Aarhus', 'DK', 'Gothenburg', 'SE'], ['Helsinki', 'FI', 'Tallinn', 'EE'], ['Turku', 'FI', 'Stockholm', 'SE'],
  ['Istanbul', 'TR', 'Izmit', 'TR'], ['Çanakkale', 'TR', 'Edirne', 'TR'], ['Kerch', 'UA', 'Krasnodar', 'RU'], ['Nicosia', 'CY', 'Mersin', 'TR'], ['Heraklion', 'GR', 'Athens', 'GR'], ['Rhodes', 'GR', 'Izmir', 'TR'],
  ['Valletta', 'MT', 'Syracuse', 'IT'], ['Palma', 'ES', 'Barcelona', 'ES'], ['Brindisi', 'IT', 'Vlorë', 'AL'], ['Jeddah', 'SA', 'Port Sudan', 'SD'], ['Aden', 'YE', 'Djibouti', 'DJ'], ['Bandar Abbas', 'IR', 'Muscat', 'OM'],
  ['Kuwait City', 'KW', 'Basra', 'IQ'], ['Manama', 'BH', 'Dammam', 'SA'], ['Jaffna', 'LK', 'Chennai', 'IN'], ['Fukuoka', 'JP', 'Busan', 'KR'], ['Kitakyushu', 'JP', 'Hiroshima', 'JP'], ['Sapporo', 'JP', 'Sendai', 'JP'],
  ['Taipei', 'TW', 'Fuzhou', 'CN'], ['Haikou', 'CN', 'Zhanjiang', 'CN'], ['Singapore', 'SG', 'Johor Bahru', 'MY'], ['Medan', 'ID', 'Kuala Lumpur', 'MY'], ['Palembang', 'ID', 'Jakarta', 'ID'], ['Manila', 'PH', 'Kota Kinabalu', 'MY'],
  ['Darwin', 'AU', 'Dili', 'TL'], ['Cairns', 'AU', 'Port Moresby', 'PG'], ['Hobart', 'AU', 'Melbourne', 'AU'], ['Auckland', 'NZ', 'Sydney', 'AU'], ['Havana', 'CU', 'Miami', 'US'], ['Kingston', 'JM', 'Santiago de Cuba', 'CU'],
  ['Santo Domingo', 'DO', 'San Juan', 'PR'], ['Antananarivo', 'MG', 'Maputo', 'MZ'], ['Zanzibar', 'TZ', 'Dar es Salaam', 'TZ'], ['Reykjavík', 'IS', 'Glasgow', 'GB'], ['Nuuk', 'GL', 'Reykjavík', 'IS'],
  ['Anchorage', 'US', 'Vancouver', 'CA'], ['Yuzhno-Sakhalinsk', 'RU', 'Sapporo', 'JP'], ['Vladivostok', 'RU', 'Niigata', 'JP'], ['Bergen', 'NO', 'Aberdeen', 'GB'],
];
const OKYANUS: [string, string, string, string][] = [
  ['New York City', 'US', 'Liverpool', 'GB'], ['New York City', 'US', 'Brest', 'FR'], ['Halifax', 'CA', 'Liverpool', 'GB'], ['Rio de Janeiro', 'BR', 'Lisbon', 'PT'], ['Recife', 'BR', 'Dakar', 'SN'],
  ['Buenos Aires', 'AR', 'Cádiz', 'ES'], ['Havana', 'CU', 'Cádiz', 'ES'], ['Cape Town', 'ZA', 'Lisbon', 'PT'], ['Cape Town', 'ZA', 'Perth', 'AU'], ['Mumbai', 'IN', 'Aden', 'YE'], ['Mumbai', 'IN', 'Mombasa', 'KE'],
  ['Colombo', 'LK', 'Singapore', 'SG'], ['Hong Kong', 'HK', 'Manila', 'PH'], ['Shanghai', 'CN', 'Nagasaki', 'JP'], ['San Francisco', 'US', 'Tokyo', 'JP'], ['Los Angeles', 'US', 'Sydney', 'AU'],
  ['Lima', 'PE', 'Panama City', 'PA'], ['Jakarta', 'ID', 'Perth', 'AU'], ['Lagos', 'NG', 'Lisbon', 'PT'], ['Valparaíso', 'CL', 'Sydney', 'AU'], ['Murmansk', 'RU', 'Tromsø', 'NO'],
  ['Alexandria', 'EG', 'Marseille', 'FR'], ['Algiers', 'DZ', 'Marseille', 'FR'], ['Tripoli', 'LY', 'Syracuse', 'IT'], ['Beirut', 'LB', 'Nicosia', 'CY'], ['Alexandria', 'EG', 'Heraklion', 'GR'],
];
const mevcut = new Set(kenarlar.map((k) => k.a * 4096 + k.b));
for (const [liste, tur] of [[BOGAZ, 1], [OKYANUS, 2]] as const) {
  for (const [s1, u1, s2, u2] of liste) {
    const a = bolgeBul(s1, u1 === 'HK' ? 'CN' : u1 === 'PR' ? 'US' : u1), b = bolgeBul(s2, u2 === 'HK' ? 'CN' : u2 === 'PR' ? 'US' : u2);
    if (a < 0 || b < 0 || a === b) continue;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (mevcut.has(lo * 4096 + hi)) continue;
    mevcut.add(lo * 4096 + hi);
    const km = Math.round(mesafeKm([bolgeler[a]!.lon, bolgeler[a]!.lat], [bolgeler[b]!.lon, bolgeler[b]!.lat]) * (tur === 2 ? 1.1 : 1.3));
    kenarlar.push({ a: lo, b: hi, km: Math.max(60, km), sinir: tur === 1 ? 6 : 4, tur });
  }
}
// adalar: hâlâ komşusuz kalan bölge en yakın bölgeye boğazla bağlanır
const komsu: number[][] = bolgeler.map(() => []);
for (const k of kenarlar) { komsu[k.a]!.push(k.b); komsu[k.b]!.push(k.a); }
bolgeler.forEach((b, i) => {
  if (komsu[i]!.length) return;
  let best = -1, bd = Infinity;
  bolgeler.forEach((c, j) => { if (j === i) return; const d = mesafeKm([b.lon, b.lat], [c.lon, c.lat]); if (d < bd) { bd = d; best = j; } });
  kenarlar.push({ a: Math.min(i, best), b: Math.max(i, best), km: Math.round(bd * 1.3), sinir: 3, tur: 1 });
  komsu[i]!.push(best); komsu[best]!.push(i);
});
// ana kara bağlantısı: her bileşen en yakın bileşene bağlanır (okyanus)
{
  const bil = new Int32Array(bolgeler.length).fill(-1);
  let nb = 0;
  for (let i = 0; i < bolgeler.length; i++) {
    if (bil[i]! >= 0) continue;
    const st = [i]; bil[i] = nb;
    while (st.length) { const x = st.pop()!; for (const y of komsu[x]!) if (bil[y]! < 0) { bil[y] = nb; st.push(y); } }
    nb++;
  }
  for (let c = 1; c < nb; c++) {
    let best: [number, number, number] | null = null;
    for (let i = 0; i < bolgeler.length; i++) if (bil[i] === c && bolgeler[i]!.kiyi) for (let j = 0; j < bolgeler.length; j++) if (bil[j] === 0 && bolgeler[j]!.kiyi) {
      const d = mesafeKm([bolgeler[i]!.lon, bolgeler[i]!.lat], [bolgeler[j]!.lon, bolgeler[j]!.lat]);
      if (!best || d < best[2]) best = [i, j, d];
    }
    if (best) { kenarlar.push({ a: Math.min(best[0], best[1]), b: Math.max(best[0], best[1]), km: Math.round(best[2] * 1.2), sinir: 3, tur: 2 }); for (let i = 0; i < bolgeler.length; i++) if (bil[i] === c) bil[i] = 0; }
  }
}

// ---------- Arazi ve nüfus ----------
const kutu = (lon: number, lat: number, l1: number, l2: number, a1: number, a2: number) => lon >= l1 && lon <= l2 && lat >= a1 && lat <= a2;
function araziBul(b: Bolge): number {
  const { lon, lat } = b;
  const dag = [[5, 16, 45.3, 47.6], [-2.5, 3, 42, 43.2], [38, 50, 40.5, 44], [44, 57, 27, 37], [38, 45, 37, 41.5], [75, 102, 27, 38], [-79, -63, -40, 8], [-122, -104, 35, 55], [-9, 2, 30, 36.5],
    [22, 27, 45, 49.5], [19, 24, 41, 44], [36, 41, 7, 14], [61, 73, 31, 38], [68, 86, 37, 45], [5, 14, 59, 70], [-6, -3.5, 56.5, 58.8]];
  const col = [[-17, 33, 16, 30], [35, 58, 16, 30], [90, 115, 38, 46], [52, 68, 37, 44], [69, 73, 24, 29], [118, 145, -31, -20], [12, 25, 28, -18], [-71, -68, -27, -18], [-117, -108, 31, 37], [52, 62, 28, 35]];
  const bat = [[24, 31, 51, 53], [29, 32, 6, 10], [46, 48, 30.5, 32], [88, 91, 21, 24]];
  if (dag.some((k) => kutu(lon, lat, k[0]!, k[1]!, k[2]!, k[3]!))) return 3;
  if (col.some((k) => kutu(lon, lat, k[0]!, k[1]!, Math.min(k[2]!, k[3]!), Math.max(k[2]!, k[3]!)))) return 5;
  if (bat.some((k) => kutu(lon, lat, k[0]!, k[1]!, k[2]!, k[3]!))) return 4;
  if ((lat > 55 && lat < 68 && (lon > 10 || lon < -50)) || (Math.abs(lat) < 8 && ((lon > 10 && lon < 30) || (lon > -75 && lon < -50) || (lon > 95 && lon < 125)))) return 1;
  if (kutu(lon, lat, 30, 38, 37, 41) || kutu(lon, lat, -7, -1, 38.5, 42) || kutu(lon, lat, 14, 19, 40, 46) || kutu(lon, lat, 100, 115, 22, 32)) return 2;
  return 0;
}
function kirsalYogunluk(b: Bolge): number {
  const { lon, lat } = b;
  if (lon > 65 && lon < 92 && lat > 5 && lat < 35) return 220; // Güney Asya
  if (lon > 100 && lon < 125 && lat > 20 && lat < 42) return 150; // Çin çekirdeği
  if (lon > 125 && lon < 146 && lat > 30 && lat < 45) return 120; // Japonya-Kore
  if (lon > 95 && lon < 125 && lat > -10 && lat <= 20) return 90; // GD Asya
  if (lon > -12 && lon < 40 && lat > 36 && lat < 60) return 45; // Avrupa
  if (lat >= 60 || (lat > 50 && lon > 60)) return 2;
  if (lon > -20 && lon < 52 && lat > -35 && lat < 15) return 35; // Sahraaltı
  if (lon < -30) return 12; // Amerika
  if (lon > 110 && lat < -10) return 1; // Avustralya
  return 25;
}
for (const b of bolgeler) {
  b.arazi = araziBul(b);
  let r = b.alanKm2 * kirsalYogunluk(b);
  if (b.arazi === 5) r = Math.floor(r * 0.08);
  if (b.arazi === 3) r = Math.floor(r * 0.5);
  b.nufus = Math.round(b.kent + r);
}

// ---------- Çıktı ----------
const yuv = (x: number) => Math.round(x * 10) / 10;
const cikti = {
  surum: 1, kaynak: 'Natural Earth 1:50m (kamu malı) · GeoNames (CC BY 4.0)', gen: W, yuk: H,
  bolgeler: bolgeler.map((b, i) => ({
    ad: b.ad, iso: b.iso, lon: yuv(b.lon), lat: yuv(b.lat), x: yuv(b.x), y: yuv(b.y), alanKm2: b.alanKm2, nufus: b.nufus, kent: b.kent, arazi: b.arazi, kiyi: b.kiyi,
    komsu: [...new Set(kenarlar.filter((k) => k.a === i || k.b === i).map((k) => (k.a === i ? k.b : k.a)))].sort((a, c) => a - c),
    poligon: b.poligon.flatMap((poly) => poly.filter((r) => r.length >= 4 && (Math.abs(halkaAlan(r)) > 0.25 || b.poligon.length === 1)).map((r) => r.flatMap(([x, y]) => [yuv(x), yuv(y)]))),
  })),
  kenarlar,
  ulkeler: Object.fromEntries(ulkeler.map((u) => [u.iso, { ad: u.ad, lon: yuv(u.lon), lat: yuv(u.lat) }])),
};
const kok = join(dirname(fileURLToPath(import.meta.url)), '../../..');
mkdirSync(join(kok, 'data/derlenmis'), { recursive: true });
writeFileSync(join(kok, 'data/derlenmis/harita.json'), JSON.stringify(cikti));
const tur = [0, 0, 0]; for (const k of kenarlar) tur[k.tur]!++;
console.log(`harita: ${bolgeler.length} bölge, ${ulkeler.length} ülke, kenar kara/boğaz/okyanus ${tur.join('/')}, ${W}×${H}`);
