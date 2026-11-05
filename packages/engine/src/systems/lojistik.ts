// Bölüm 14: tek fiziksel ağ, ortak kenar kapasitesi, tek rota (1A) tahsisi, transit ve varış.
import type { World } from '../state/world.ts';
import { ck, kenarKey, T_GIDA, T_MUH, T_EKIP, T_KISI, T_PARA, T_MAL, H_EYALET, H_BIRLIK, H_ULKE, hc } from '../state/world.ts';
import { EKIPMAN, AILE_EKIP, K, ST, YB, MUHIMMAT } from '../catalog.ts';
import { S, mulDiv, mulRatio, largestRemainder, clamp } from '../num/index.ts';
import { uc, rotaTip, dostBolge, kenarKapasite, birlikGidaGun, birlikMuhimmatGunU, birlikIhtiyac, anlat } from './ortak.ts';
import { askerCek, kokenEkle } from '../state/world.ts';
import { malEkle, eyaletDengeTalepleri, enYakinEyalet } from './ekonomi.ts';
import { hashV1 } from '../hash/index.ts';

export interface Talep {
  sinif: number; // 0 acil sivil, 1 cephe ikmali, 4 diğer ikmal
  tur: number; alt: number; miktar: number; ulke: number;
  kaynakTip: number; kaynakId: number; kaynakBolge: number;
  hedefTip: number; hedefId: number; hedefBolge: number;
  agirlik: number; // milibirim taşıma / birim miktar (S değil, 1000 = 1)
}

/** P4: zamanlanmış varışlar. Düşman kontrolündeki varış el konur. */
export function varislar(w: World): void {
  const T = w.T.c;
  const U = uc(w);
  for (const t of w.T.list()) {
    if (T.varis[t]! > w.gun) continue;
    const tur = T.tur[t]!, m = T.miktar[t]!, c = T.ulke[t]!;
    const ht = T.hedefTip[t]!, hid = T.hedefId[t]!;
    if (tur === T_PARA) { w.C.c.hazine[c] = w.C.c.hazine[c]! + m; w.C.c.gelirAy[c] = w.C.c.gelirAy[c]! + m; }
    else if (tur === T_MAL) malEkle(w, c, T.alt[t]!, m);
    else if (ht === H_EYALET) {
      const e = hid;
      const d = w.depo[e]!;
      if (w.R.c.kontrolEden[d] === c) w.E.c.gida[e] = w.E.c.gida[e]! + m;
      else {
        const el = w.R.c.kontrolEden[d]!;
        const e2 = enYakinEyalet(w, el, d);
        if (e2 >= 0) w.E.c.gida[e2] = w.E.c.gida[e2]! + m;
      }
    } else if (ht === H_ULKE) {
      if (tur === T_EKIP) w.ekip[ck(c, T.alt[t]!)] = w.ekip[ck(c, T.alt[t]!)]! + m;
      else if (tur === T_MUH) w.C.c.muhimmat[c] = w.C.c.muhimmat[c]! + m;
    } else if (ht === H_BIRLIK) {
      const u = w.U.resolve(hid);
      if (u >= 0) {
        if (tur === T_GIDA) U.gida![u] = U.gida![u]! + m;
        else if (tur === T_MUH) U.muhimmatS![u] = U.muhimmatS![u]! + m;
        else if (tur === T_EKIP) U[`e${T.alt[t]!}`]![u] = U[`e${T.alt[t]!}`]![u]! + m;
        else if (tur === T_KISI) {
          const ey = new Array<number>(w.nE).fill(0); ey[T.alt[t]!] = m;
          kokenEkle(w, u, ey); U.kisi![u] = U.kisi![u]! + m;
        }
      } else {
        // birlik yok: ekipman depoya döner, personel E'ye, gıda/mühimmat kaybolur
        if (tur === T_EKIP) w.ekip[ck(c, T.alt[t]!)] = w.ekip[ck(c, T.alt[t]!)]! + m;
        else if (tur === T_KISI) personelGeriDon(w, T.alt[t]!, m);
      }
    }
    w.T.release(t);
  }
}

function personelGeriDon(w: World, e: number, m: number): void {
  const rs = w.pkg.eyaletler[e]!.bolgeler;
  const ag = rs.map((r) => w.pop[hc(r, YB.ASKER, ST.A)]!);
  const p = largestRemainder(Math.min(m, ag.reduce((a, b) => a + b, 0)), ag);
  rs.forEach((r, i) => {
    w.pop[hc(r, YB.ASKER, ST.A)] = w.pop[hc(r, YB.ASKER, ST.A)]! - p[i]!;
    w.pop[hc(r, YB.ASKER, ST.E)] = w.pop[hc(r, YB.ASKER, ST.E)]! + p[i]!;
  });
}

/** Birlik için yoldaki miktarlar. */
function yoldaki(w: World): Map<number, { gida: number; muh: number; kisi: number; ekip: number[] }> {
  const m = new Map<number, { gida: number; muh: number; kisi: number; ekip: number[] }>();
  const T = w.T.c;
  for (const t of w.T.rows()) {
    if (T.hedefTip[t] !== H_BIRLIK) continue;
    const id = T.hedefId[t]!;
    let o = m.get(id);
    if (!o) { o = { gida: 0, muh: 0, kisi: 0, ekip: new Array<number>(EKIPMAN.length).fill(0) }; m.set(id, o); }
    if (T.tur[t] === T_GIDA) o.gida += T.miktar[t]!;
    else if (T.tur[t] === T_MUH) o.muh += T.miktar[t]!;
    else if (T.tur[t] === T_KISI) o.kisi += T.miktar[t]!;
    else if (T.tur[t] === T_EKIP) o.ekip[T.alt[t]!]! += T.miktar[t]!;
  }
  return m;
}

function baskentKaynak(w: World, c: number): number {
  const b = w.pkg.ulkeler[c]!.baskent;
  if (w.R.c.kontrolEden[b] === c) return b;
  const e = enYakinEyalet(w, c, b);
  return e >= 0 ? w.depo[e]! : -1;
}

/** P6: talepleri topla. */
export function talepTopla(w: World): Talep[] {
  const U = uc(w);
  const out: Talep[] = [];
  const yol = yoldaki(w);
  for (const u of w.U.list()) {
    const c = U.ulke![u]!;
    const r = U.bolge![u]!;
    const id = w.U.id(u);
    const y = yol.get(id) ?? { gida: 0, muh: 0, kisi: 0, ekip: new Array<number>(EKIPMAN.length).fill(0) };
    const cephe = U.muharebe![u]! === 1 || w.gun - w.R.c.sonMuharebe[r]! <= 7;
    const sinif = cephe ? 1 : 4;
    // gıda: en yakın kendi eyalet deposu
    const gHedef = birlikGidaGun(w, u) * K.birlikErzakGun;
    const gAcik = gHedef - U.gida![u]! - y.gida;
    if (gAcik > 0) {
      const e = enYakinEyalet(w, c, r);
      if (e >= 0) out.push({ sinif, tur: T_GIDA, alt: 0, miktar: gAcik, ulke: c, kaynakTip: H_EYALET, kaynakId: e, kaynakBolge: w.depo[e]!, hedefTip: H_BIRLIK, hedefId: id, hedefBolge: r, agirlik: 1000 });
    }
    const kb = baskentKaynak(w, c);
    if (kb < 0) continue;
    const mHedef = birlikMuhimmatGunU(w, u) * 7;
    const mAcik = mHedef - U.muhimmatS![u]! - y.muh;
    if (mAcik > 0) out.push({ sinif, tur: T_MUH, alt: 0, miktar: mAcik, ulke: c, kaynakTip: H_ULKE, kaynakId: c, kaynakBolge: kb, hedefTip: H_BIRLIK, hedefId: id, hedefBolge: r, agirlik: MUHIMMAT.agirlik });
    if (!w.C.c.otoTakviye[c]) continue;
    const ih = birlikIhtiyac(w, u);
    for (const [aile, gerek] of Object.entries(ih.aile)) {
      let sahip = 0;
      for (const k of AILE_EKIP[aile]!) sahip += U[`e${k}`]![u]! + y.ekip[k]!;
      let acik = gerek - sahip;
      // en iyi nesilden başla
      const turler = AILE_EKIP[aile]!;
      for (let q = turler.length - 1; q >= 0 && acik > 0; q--) {
        const k = turler[q]!;
        if (w.ekip[ck(c, k)]! <= 0) continue;
        out.push({ sinif: 4, tur: T_EKIP, alt: k, miktar: acik, ulke: c, kaynakTip: H_ULKE, kaynakId: c, kaynakBolge: kb, hedefTip: H_BIRLIK, hedefId: id, hedefBolge: r, agirlik: EKIPMAN[k]!.agirlik * 1000 });
        acik -= Math.min(acik, w.ekip[ck(c, k)]!);
      }
    }
    const kAcik = ih.kisi - U.kisi![u]! - y.kisi;
    if (kAcik > 0 && U.muharebe![u]! === 0) {
      out.push({ sinif: 4, tur: T_KISI, alt: -1, miktar: Math.min(kAcik, 600), ulke: c, kaynakTip: H_ULKE, kaynakId: c, kaynakBolge: kb, hedefTip: H_BIRLIK, hedefId: id, hedefBolge: r, agirlik: 10 });
    }
  }
  for (const d of eyaletDengeTalepleri(w)) {
    out.push({ sinif: 0, tur: T_GIDA, alt: 0, miktar: d.miktar, ulke: d.c, kaynakTip: H_EYALET, kaynakId: d.kaynakE, kaynakBolge: w.depo[d.kaynakE]!, hedefTip: H_EYALET, hedefId: d.hedefE, hedefBolge: w.depo[d.hedefE]!, agirlik: 1000 });
  }
  return out;
}

function kaynakStok(w: World, t: Talep): number {
  if (t.tur === T_GIDA) return w.E.c.gida[t.kaynakId]!;
  if (t.tur === T_MUH) return w.C.c.muhimmat[t.ulke]!;
  if (t.tur === T_EKIP) return w.ekip[ck(t.ulke, t.alt)]!;
  if (t.tur === T_KISI) {
    let y = 0;
    for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === t.ulke && w.R.c.kontrolEden[r] === t.ulke) y += mulDiv(w.pop[hc(r, YB.ASKER, ST.Y)]!, w.R.c.kontrol[r]!, 100_000).q;
    return y;
  }
  return 0;
}
function stokAnahtar(t: Talep): string { return `${t.tur}:${t.alt}:${t.kaynakTip}:${t.kaynakId}:${t.ulke}`; }

export interface TahsisSonuc { olcek: number[]; rotalar: ({ yol: number[]; km: number } | null)[]; acik: number }

/** Tek rota tahsisi (14.2): sınıf sırası, kaynak stoğu ve kenar darboğazıyla orantılı küçültme, atomik rezervasyon. */
export function tahsis(w: World, talepler: Talep[]): TahsisSonuc {
  const n = talepler.length;
  const rotalar = talepler.map((t) => rotaTip(w, t.ulke, 1, t.kaynakBolge, t.hedefBolge));
  // önbellek anahtarı (7.4): rota epoch'u, talep vektörü, kapasite vektörü, stok uygunluğu
  let anahtar = '';
  if (!w.ayarlar.onbellekKapali) {
    const parca: number[] = [w.rotaEpoch];
    for (const t of talepler) parca.push(t.sinif, t.tur, t.alt, t.miktar, t.kaynakBolge, t.hedefBolge, t.ulke, kaynakStok(w, t));
    for (const k of w.pkg.kenarlar) parca.push(kenarKapasite(w, k.a, k.b));
    anahtar = hashV1(new Uint8Array(new Float64Array(parca).buffer));
    const on = w.onbellek.get('tahsis') as { anahtar: string; olcek: number[] } | undefined;
    if (on && on.anahtar === anahtar) return { olcek: on.olcek, rotalar, acik: 0 };
  }
  const kalan = new Map<number, number>();
  for (const k of w.pkg.kenarlar) kalan.set(kenarKey(k.a, k.b), kenarKapasite(w, k.a, k.b));
  const stokKalan = new Map<string, number>();
  const olcek = new Array<number>(n).fill(0);
  let acik = 0;
  for (const sinif of [0, 1, 2, 3, 4, 5]) {
    const idx = talepler.map((t, i) => i).filter((i) => talepler[i]!.sinif === sinif && rotalar[i] !== null);
    if (idx.length === 0) continue;
    // kaynak stoğu oranı
    const stokIst = new Map<string, number>();
    for (const i of idx) { const k = stokAnahtar(talepler[i]!); stokIst.set(k, (stokIst.get(k) ?? 0) + talepler[i]!.miktar); }
    const stokOran = new Map<string, number>();
    for (const [k, ist] of stokIst) {
      const t = talepler[idx.find((i) => stokAnahtar(talepler[i]!) === k)!]!;
      const mevcut = stokKalan.get(k) ?? kaynakStok(w, t);
      stokKalan.set(k, mevcut);
      stokOran.set(k, ist <= mevcut ? S : mulDiv(mevcut, S, ist).q);
    }
    // kenar yükü
    const yuk = new Map<number, number>();
    for (const i of idx) {
      const t = talepler[i]!;
      const y = rotalar[i]!.yol;
      const ag = mulDiv(t.miktar, t.agirlik, 1000).q;
      for (let k = 0; k + 1 < y.length; k++) { const key = kenarKey(y[k]!, y[k + 1]!); yuk.set(key, (yuk.get(key) ?? 0) + ag); }
    }
    const kenarOran = new Map<number, number>();
    for (const [key, l] of yuk) { const c = kalan.get(key) ?? 0; kenarOran.set(key, l <= c ? S : mulDiv(c, S, l).q); }
    for (const i of idx) {
      const t = talepler[i]!;
      const y = rotalar[i]!.yol;
      let o = stokOran.get(stokAnahtar(t))!;
      for (let k = 0; k + 1 < y.length; k++) o = Math.min(o, kenarOran.get(kenarKey(y[k]!, y[k + 1]!))!);
      olcek[i] = o;
    }
    // atomik rezervasyon
    for (const i of idx) {
      const t = talepler[i]!;
      const m = mulRatio(t.miktar, olcek[i]!).q;
      const k = stokAnahtar(t);
      stokKalan.set(k, stokKalan.get(k)! - m);
      const y = rotalar[i]!.yol;
      const ag = mulDiv(m, t.agirlik, 1000).q;
      for (let q = 0; q + 1 < y.length; q++) { const key = kenarKey(y[q]!, y[q + 1]!); kalan.set(key, (kalan.get(key) ?? 0) - ag); }
      acik += t.miktar - m;
    }
  }
  if (anahtar) w.onbellek.set('tahsis', { anahtar, olcek });
  return { olcek, rotalar, acik };
}

/** P6–P7: tahsis sonucunu sevkiyata çevirir (kaynaktan düşer, transit yaratır). */
export function sevkiyat(w: World, talepler: Talep[], s: TahsisSonuc): void {
  const U = uc(w);
  talepler.forEach((t, i) => {
    const y = s.rotalar[i];
    if (!y) return;
    let m = mulRatio(t.miktar, s.olcek[i]!).q;
    if (m <= 0) return;
    // kaynaktan gerçek düşüm (stok her zaman ayrı sınırdır, T048)
    m = Math.min(m, kaynakStok(w, t));
    if (m <= 0) return;
    const hizli = y.yol.every((r) => w.R.c.demiryolu[r]! >= 1);
    const hiz = hizli ? 300 : 100;
    const gun = Math.max(1, Math.floor((y.km + hiz - 1) / hiz));
    const yeni = (tur: number, alt: number, miktar: number) => {
      const x = w.T.alloc();
      w.T.c.tur[x] = tur; w.T.c.alt[x] = alt; w.T.c.miktar[x] = miktar; w.T.c.ulke[x] = t.ulke;
      w.T.c.hedefTip[x] = t.hedefTip; w.T.c.hedefId[x] = t.hedefId; w.T.c.varis[x] = w.gun + gun; w.T.c.konum[x] = t.hedefBolge;
    };
    if (t.tur === T_GIDA) { w.E.c.gida[t.kaynakId] = w.E.c.gida[t.kaynakId]! - m; yeni(T_GIDA, 0, m); }
    else if (t.tur === T_MUH) { w.C.c.muhimmat[t.ulke] = w.C.c.muhimmat[t.ulke]! - m; yeni(T_MUH, 0, m); }
    else if (t.tur === T_EKIP) { w.ekip[ck(t.ulke, t.alt)] = w.ekip[ck(t.ulke, t.alt)]! - m; yeni(T_EKIP, t.alt, m); }
    else if (t.tur === T_KISI) {
      const ey = askerCek(w, t.ulke, m);
      if (!ey) return;
      ey.forEach((n, e) => { if (n > 0) yeni(T_KISI, e, n); });
    }
  });
  void U; void clamp; void anlat;
}

export function lojistikGunu(w: World): { acik: number } {
  const t = talepTopla(w);
  const s = tahsis(w, t);
  sevkiyat(w, t, s);
  return { acik: s.acik };
}

/** Korunum için yoldaki gıda toplamı. */
export function yoldakiGida(w: World): number {
  let n = 0;
  for (const t of w.T.rows()) if (w.T.c.tur[t] === T_GIDA) n += w.T.c.miktar[t]!;
  return n;
}
