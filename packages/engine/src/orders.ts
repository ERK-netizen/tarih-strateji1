// Emir doğrulama, önizleme (plan kartı) ve uygulama. Oyuncu ve karar modülü aynı kuralları kullanır.
import type { World } from './state/world.ts';
import { BAKAN, BAKAN_AD, BK } from './state/world.ts';
import { A, ck, birlikKur, sablonIhtiyac, hatEkle, URUN_MUH, toplamAskeriFabrika, NYUVA } from './state/world.ts';
import { ASKERLIK, EKONOMI, ISGAL, YONETIM, SABLON, TEKNOLOJI, NTEK, PROJE, MAL, BUTCE, TUTUM, EKIPMAN, MALI, K, BAYRAK, NEKIP, tekVar, kademe, AKTIF } from './catalog.ts';
import { S, mulDiv, clamp } from './num/index.ts';
import { uc, savasta, savastaMi, gorus, anlasmaVar, birlikAdi, rotaTip, bildir, anlat, ulkeBirlikleri, iddiaVar, efendi } from './systems/ortak.ts';
import { askerlikAktar, insanGucu, terhis } from './systems/nufus.ts';
import { tekMaliyetHesapla, krediLimiti, ulkeGidaStok, malStok, arastirmaHizi, acikYuva } from './systems/ekonomi.ts';
import { KADEME_MAX } from './katalogEk.ts';
import { tarih } from './calendar/index.ts';
import { TK, TK_AD, ESIK, teklifEkle, anlasmaKur, anlasmaBoz, gerekceBaslat, gerekceSurecte, gerekceVar, savasIlan, savasaKatil, barisKabul, barisUygula, gorusDegis, teklifBolgeleri, ekipmanFiyat, BARIS_TUR, bolgeDegeri, kuklaKur } from './systems/diplomasi.ts';
import { EK_EMIRLER, EK_ALAN } from './emirEk.ts';
import { olaySecimUygula, olayTanim } from './systems/olaylar.ts';
import { tahminiGun } from './systems/kara.ts';
import { trEk, trEkK, trKucuk } from './tr.ts';

export type Emir = { tur: string; ulke: number } & Record<string, unknown>;

export interface Kart {
  gecerli: boolean;
  baslik: string;
  kapsam: string;
  bugun: string[]; // kesin bedel ve rezervasyon
  tahmin: string[]; // aralıklı tahmin
  neden?: string; // başarısızlık nedeni
  iptal: string;
  siyasi?: string;
  uyari?: string[];
}

const n = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? Math.trunc(x) : d);
const arr = (x: unknown): number[] => (Array.isArray(x) ? x.map((v) => n(v, -1)).filter((v) => v >= 0) : []);
export const fmt = (x: number): string => {
  const neg = x < 0; let s = String(Math.abs(Math.trunc(x)));
  let out = '';
  while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
  return (neg ? '−' : '') + s + out;
};
const yuzde = (oranS: number) => `%${Math.floor(oranS / 10_000)}`;
const puan = (p: number) => `${Math.floor(p / 1000)}`;
const uAd = (w: World, c: number) => w.pkg.ulkeler[c]!.kisa;
const bAd = (w: World, r: number) => w.pkg.bolgeler[r]?.ad ?? `#${r}`;

/** Eğitim süresi (gün): şablon tabanı × askerlik yasası; seferberlik planı ve kitle doktrini kısaltır. */
export function egitimGun(w: World, c: number, taban: number): number {
  let g = mulDiv(taban, ASKERLIK[w.C.c.askerlik[c]!]!.egitimSure, S).q;
  if (tekVar(w, c, 'seferberlik')) g = mulDiv(g, 3, 4).q;
  if (tekVar(w, c, 'dok_kitle')) g = mulDiv(g, 7, 10).q;
  return Math.max(10, g);
}

/** İnşa nakit indirimi (S): demiryolu teknolojisi demiryolunu, inşaat tekniği bütün projeleri ucuzlatır. */
function insaIndirim(w: World, c: number, kod: string): number {
  let m = kod === 'demiryolu' && tekVar(w, c, 'demiryolu') ? 750_000 : S;
  if (tekVar(w, c, 'insaat1')) m = mulDiv(m, 85, 100).q;
  return m;
}
const insaSP = (w: World, c: number, sp: number) => (tekVar(w, c, 'insaat1') ? mulDiv(sp, 85, 100).q : sp);

/** Emir türü → bakanlık alanı (oyuncunun elle emri o alanın bakanını görevden alır). */
const EMIR_ALAN: Record<string, number> = {
  vergi: BK.ekonomi, borcAl: BK.ekonomi, borcOde: BK.ekonomi, satinAl: BK.ekonomi, sat: BK.ekonomi, ekonomi: BK.ekonomi, askerlik: BK.ekonomi,
  arastir: BK.arastirma, uretim: BK.uretim, birlikKur: BK.ordu, insa: BK.insa,
};
function elleOncelik(w: World, e: Emir): void {
  const c = e.ulke;
  const b = EMIR_ALAN[e.tur] ?? EK_ALAN[e.tur];
  if (b && (w.C.c.bakan[c]! & b)) {
    w.C.c.bakan[c] = w.C.c.bakan[c]! & ~b;
    const ad = BAKAN_AD[BAKAN[31 - Math.clz32(b)]!];
    bildir(w, 'bakan', `${ad} bakanı görevden alındı: alanı elle yönetiyorsunuz`, c, false);
  }
  // elle hareket emri: cephe otomasyonu bu birliklere 30 gün dokunmaz
  if (e.tur === 'hareket' || e.tur === 'saldir' || e.tur === 'dur') {
    for (const id of (e.birlikler as number[] | undefined) ?? []) { const u = w.U.resolve(id); if (u >= 0) w.U.c.elle[u] = w.gun + 30; }
  }
}

function red(baslik: string, neden: string): Kart { return { gecerli: false, baslik, kapsam: '', bugun: [], tahmin: [], neden, iptal: '—' }; }

/** Emri doğrular ve plan kartı üretir. Dünya durumunu değiştirmez (T092). */
export function onizle(w: World, e: Emir): Kart {
  const c = e.ulke;
  const C = w.C.c;
  if (c < 0 || c >= w.nC) return red('Geçersiz', 'Ülke bulunamadı.');
  switch (e.tur) {
    case 'vergi': {
      const yeni = clamp(n(e.oran), 50_000, 500_000);
      const eski = C.vergi[c]!;
      const fark = Math.abs(yeni - eski);
      if (fark === 0) return red('Vergi', `Vergi oranı zaten ${yuzde(eski)}.`);
      if (C.vergiAy[c]! + fark > 50_000) return red('Vergi oranı', `Bu ay vergi oranı en çok 5 puan değişebilir; kalan hak ${Math.floor((50_000 - C.vergiAy[c]!) / 10_000)} puan.`);
      const etki = mulDiv(C.gelirDun[c]!, yeni, Math.max(1, eski)).q;
      const huzur = yeni > 200_000 ? `huzur hedefi −${Math.floor(mulDiv(yeni - 200_000, 40_000, S).q / 1000)}` : 'huzura ek etki yok';
      return { gecerli: true, baslik: 'Vergi oranı', kapsam: `${yuzde(eski)} → ${yuzde(yeni)}`, bugun: [`Günlük vergi geliri ≈ ${fmt(C.gelirDun[c]!)} → ${fmt(etki)} altın`], tahmin: [`30 gün: ${huzur}`], iptal: 'Yeniden değiştirmek aylık 5 puan sınırından düşer', siyasi: yeni > eski ? 'Halk vergi artışından hoşnut değil.' : undefined };
    }
    case 'butce': {
      const p = arr(e.paylar);
      if (p.length !== 4 || p.reduce((a, b) => a + b, 0) !== S) return red('Bütçe', 'Dört kalemin toplamı %100 olmalı.');
      const eski = [C.b0[c]!, C.b1[c]!, C.b2[c]!, C.b3[c]!];
      const deg = p.reduce((s, v, i) => s + Math.abs(v - eski[i]!), 0) / 2;
      if (deg > 100_000) return red('Bütçe', 'Bir ayda bütçe payları toplam en çok 10 puan kayabilir.');
      return { gecerli: true, baslik: 'Bütçe dağılımı', kapsam: BUTCE.map((b, i) => `${b} ${yuzde(p[i]!)}`).join(' · '), bugun: ['Harcama ertesi günden itibaren yeni paylarla'], tahmin: ['Etkiler son ayın gerçek harcamasıyla hesaplanır'], iptal: 'Bedelsiz; aylık 10 puan sınırı' };
    }
    case 'harcama': {
      const o = clamp(n(e.oran), 0, S);
      return { gecerli: true, baslik: 'Politika harcama oranı', kapsam: `Gelir fazlasının ${yuzde(o)}'i politikalara`, bugun: [], tahmin: ['Kalan fazla hazinede birikir'], iptal: 'Bedelsiz' };
    }
    case 'askerlik': {
      const y = clamp(n(e.yasa), 0, ASKERLIK.length - 1);
      if (y === C.askerlik[c]) return red('Askerlik yasası', `Yasa zaten ${ASKERLIK[y]!.ad}.`);
      const law = ASKERLIK[y]!;
      if (C.pg[c]! < 150_000) return red('Askerlik yasası', `150 siyasi güç gerekiyor; mevcut ${puan(C.pg[c]!)}.`);
      if (y === 4 && !savastaMi(w, c)) return red('Askerlik yasası', 'Son çare yalnız savaşta ve başkent tehdidi altında.');
      if (C.destek[c]! < law.destek) return red('Askerlik yasası', `${law.ad} için savaşa destek ${puan(law.destek)} olmalı; mevcut ${puan(C.destek[c]!)}.`);
      if (!savastaMi(w, c) && y > YONETIM[w.C.c.rejim[c]!]!.baris) return red('Askerlik yasası', `Barışta ${YONETIM[w.C.c.rejim[c]!]!.ad} için tavan ${ASKERLIK[YONETIM[w.C.c.rejim[c]!]!.baris]!.ad}.`);
      const ig = insanGucu(w, c);
      const y0 = ASKERLIK[C.askerlik[c]!]!.y, y1 = law.y;
      const aktar = y1 > y0 ? mulDiv(ig.S, y1 - y0, S - y0).q : -mulDiv(ig.Y, y0 - y1, y0).q;
      return { gecerli: true, baslik: 'Askerlik yasası', kapsam: `${ASKERLIK[C.askerlik[c]!]!.ad} → ${law.ad}`, bugun: ['150 siyasi güç', `Çağrılabilir havuz ${aktar >= 0 ? '+' : ''}${fmt(aktar)} kişi`], tahmin: [law.egitimSure > S ? `Eğitim süresi +${Math.floor((law.egitimSure - S) / 10_000)}%` : 'Eğitim süresi değişmez'], iptal: 'Geri almak yeniden 150 PG' };
    }
    case 'ekonomi': {
      const y = clamp(n(e.yasa), 0, EKONOMI.length - 1);
      if (y === C.ekonomi[c]) return red('Ekonomi yasası', 'Zaten yürürlükte.');
      const law = EKONOMI[y]!;
      if (C.pg[c]! < 100_000) return red('Ekonomi yasası', `100 siyasi güç gerekiyor; mevcut ${puan(C.pg[c]!)}.`);
      if (y >= 2 && !savastaMi(w, c) && C.destek[c]! < law.destek) return red('Ekonomi yasası', `${law.ad}: savaş veya destek ≥ ${puan(law.destek)} gerekiyor.`);
      if (y === 3 && !(savastaMi(w, c) && C.destek[c]! >= law.destek)) return red('Ekonomi yasası', 'Topyekûn: savaş ve destek ≥ 80.');
      if (y === 1 && C.destek[c]! < law.destek && !savastaMi(w, c)) return red('Ekonomi yasası', 'Kısmi seferberlik: destek ≥ 25.');
      return { gecerli: true, baslik: 'Ekonomi yasası', kapsam: `${EKONOMI[C.ekonomi[c]!]!.ad} → ${law.ad}`, bugun: ['100 siyasi güç'], tahmin: [`Tüketim malı payı ${yuzde(law.tuketim)}, askerî verim ×${law.askeri / S}`, `Huzur hedefi ${law.huzur >= 0 ? '+' : ''}${law.huzur / 1000}`], iptal: 'Geri almak 100 PG' };
    }
    case 'karne': {
      const acik = n(e.acik) ? 1 : 0;
      return { gecerli: true, baslik: acik ? 'Karne uygula' : 'Karneyi kaldır', kapsam: acik ? 'Sivil gıda tüketimi −%15' : 'Tam tüketime dönüş', bugun: [], tahmin: [acik ? 'Huzur hedefi −5' : 'Huzur hedefi +5'], iptal: 'Bedelsiz' };
    }
    case 'isgalPol': {
      const p = clamp(n(e.pol), 0, 2);
      if (C.pg[c]! < 25_000) return red('İşgal politikası', '25 siyasi güç gerekiyor.');
      const P = ISGAL[p]!;
      return { gecerli: true, baslik: 'İşgal politikası', kapsam: `${ISGAL[C.isgalPol[c]!]!.ad} → ${P.ad}`, bugun: ['25 siyasi güç'], tahmin: [`Erişim tavanı ${yuzde(P.tavan)}, itaat hedefi ${puan(P.hedef)}, direniş hedefi ${puan(P.direnis)}`], iptal: '25 PG' };
    }
    case 'birlikKur': {
      const sab = clamp(n(e.sablon), 0, SABLON.length - 1);
      const adet = clamp(n(e.adet, 1), 1, 10);
      const ih = sablonIhtiyac(sab);
      const ig = insanGucu(w, c);
      const kisi = ih.kisi * adet;
      if (ig.erisimY < kisi) return red(`${adet} × ${SABLON[sab]!.ad}`, `Çağrılabilir insan gücü yetersiz: ${fmt(ig.erisimY)} erişilebilir, ${fmt(kisi)} gerekli. Askerlik yasasını genişletin.`);
      const para = kisi * 25;
      if (C.hazine[c]! < para) return red(`${adet} × ${SABLON[sab]!.ad}`, `Eğitim bedeli ${fmt(para)} altın; hazine ${fmt(C.hazine[c]!)}.`);
      if (ulkeBirlikleri(w, c).length + adet > 60) return red('Birlik', 'Ülke başına birlik sınırı 60.');
      const eksik: string[] = [];
      for (const [aile, gerek] of Object.entries(ih.aile)) {
        let sahip = 0;
        for (let k = 0; k < NEKIP; k++) if (EKIPMAN[k]!.aile === aile) sahip += w.ekip[ck(c, k)]!;
        if (sahip < gerek * adet) eksik.push(`${EKIPMAN.find((x) => x.aile === aile)!.ad}: ${fmt(sahip)}/${fmt(gerek * adet)}`);
      }
      const gun = egitimGun(w, c, ih.egitim);
      const bolge = n(e.bolge, w.pkg.ulkeler[c]!.baskent);
      if (w.R.c.kontrolEden[bolge] !== c) return red('Birlik', `${bAd(w, bolge)} sizin kontrolünüzde değil.`);
      return { gecerli: true, baslik: `${adet} × ${SABLON[sab]!.ad}`, kapsam: `${trEk(bAd(w, bolge), 'de')} eğitim`, bugun: [`${fmt(kisi)} kişi Y havuzundan A statüsüne`, `${fmt(para)} altın eğitim bedeli`], tahmin: [`Hazır olma: ${gun} gün`, ...(eksik.length ? [`Eksik ekipmanla kurulur (${eksik.join('; ')}); takviye depo doldukça`] : ['Ekipman depodan tam'])], iptal: 'Terhis: personel yedeğe (E), ekipman depoya', uyari: eksik.length ? ['Düşük doluluk muharebe gücünü düşürür.'] : undefined };
    }
    case 'hareket': case 'saldir': {
      const bs = arr(e.birlikler).map((id) => w.U.resolve(id)).filter((u) => u >= 0);
      const hedef = n(e.hedef, -1);
      if (hedef < 0 || hedef >= w.nR) return red('Hareket', 'Hedef bölge bulunamadı.');
      if (bs.length === 0) return red('Hareket', 'Seçili birlik yok.');
      const U = uc(w);
      const kontrol = w.R.c.kontrolEden[hedef]!;
      if (e.tur === 'saldir' && !savasta(w, c, kontrol)) return red('Saldırı', `${uAd(w, kontrol)} ile savaşta değilsiniz. Önce savaş ilan edin.`);
      const satir: string[] = [];
      let enUzun = 0;
      for (const u of bs) {
        if (U.ulke![u] !== c) return red('Hareket', `${birlikAdi(w, u)} size ait değil.`);
        if (U.egitimBitis![u]! > w.gun) return red('Hareket', `${birlikAdi(w, u)} eğitimde (${U.egitimBitis![u]! - w.gun} gün).`);
        const y = rotaTip(w, c, 0, U.bolge![u]!, hedef);
        if (!y) return red('Hareket', `${birlikAdi(w, u)} için ${trEk(bAd(w, hedef), 'e')} izinli yol yok (geçiş hakkı veya savaş gerekir).`);
        const gun = tahminiGun(w, u, y.yol);
        enUzun = Math.max(enUzun, gun);
        satir.push(`${birlikAdi(w, u)}: ${y.yol.length - 1} bölge, ≈${gun} gün`);
      }
      return { gecerli: true, baslik: e.tur === 'saldir' ? `Taarruz: ${bAd(w, hedef)}` : `Hareket: ${bAd(w, hedef)}`, kapsam: satir.slice(0, 4).join(' · ') + (satir.length > 4 ? ` +${satir.length - 4}` : ''), bugun: [`${bs.length} birlik`], tahmin: [`Varış ≈ ${enUzun} gün (bugünkü mevsim ve yol; muharebe ve düzensizlik uzatır)`], iptal: '"dur" emriyle bedelsiz', siyasi: e.tur === 'saldir' ? `${uAd(w, kontrol)} kuvvetleriyle muharebe beklenir.` : undefined };
    }
    case 'dur': case 'durus': case 'terhis': {
      const bs = arr(e.birlikler).map((id) => w.U.resolve(id)).filter((u) => u >= 0 && uc(w).ulke![u] === c);
      if (bs.length === 0) return red('Birlik', 'Seçili birlik yok.');
      if (e.tur === 'terhis') {
        if (bs.some((u) => uc(w).muharebe![u])) return red('Terhis', 'Muharebedeki birlik terhis edilemez.');
        if (savastaMi(w, c) && bs.length > 3) return red('Terhis', 'Savaşta genel terhis yapılamaz.');
        return { gecerli: true, baslik: 'Terhis', kapsam: `${bs.length} birlik`, bugun: ['Personel eğitimli yedeğe (E)', 'Ekipman depoya'], tahmin: [], iptal: 'Geri alınamaz' };
      }
      return { gecerli: true, baslik: e.tur === 'dur' ? 'Dur' : 'Duruş', kapsam: `${bs.length} birlik${e.tur === 'durus' ? ` → ${['Hattı tut', 'Esnek savunma', 'Saldırı', 'Garnizon'][clamp(n(e.durus), 0, 3)]}` : ''}`, bugun: [], tahmin: [], iptal: 'Bedelsiz' };
    }
    case 'otoCephe': case 'otoTakviye':
      return { gecerli: true, baslik: e.tur === 'otoCephe' ? 'Cephe otomasyonu' : 'Otomatik takviye', kapsam: n(e.acik) ? 'Açık' : 'Kapalı', bugun: [], tahmin: [e.tur === 'otoCephe' ? 'Birlikleriniz karar modülünün cephe kurallarıyla yerleştirilir' : 'Birlikler eksik personel ve ekipmanı depodan çeker'], iptal: 'Bedelsiz' };
    case 'uretim': {
      const urun = n(e.urun, 0);
      if (urun !== URUN_MUH && (urun < 0 || urun >= NEKIP)) return red('Üretim', 'Ürün bulunamadı.');
      if (urun !== URUN_MUH && EKIPMAN[urun]!.tek && !w.tekBitti[c * NTEK + TEKNOLOJI.findIndex((t) => t.kod === EKIPMAN[urun]!.tek)]) return red('Üretim', `${EKIPMAN[urun]!.ad} için önce araştırma gerekir.`);
      const top = toplamAskeriFabrika(w, c) * 1000;
      const fab = clamp(n(e.fabrika, 1000), 0, top);
      let diger = 0;
      for (const s of w.HT.rows()) if (w.HT.c.ulke[s] === c && w.HT.c.urun[s] !== urun) diger += w.HT.c.fabrika[s]!;
      const ad = urun === URUN_MUH ? 'Mühimmat' : EKIPMAN[urun]!.ad;
      const uyari = diger + fab > top ? [`Atanan fabrikalar (${fmt(Math.floor((diger + fab) / 1000))}) mevcudu (${fmt(top / 1000)}) aşıyor; bütün hatlar orantılı yavaşlar.`] : undefined;
      return { gecerli: true, baslik: `Üretim hattı: ${ad}`, kapsam: `${(fab / 1000).toFixed(1)} askerî fabrika`, bugun: ['Yeni hat verimi %30\'dan başlar; mevcut hat verimini korur'], tahmin: ['Günlük çıktı girdi (çelik/kömür) karşılanma oranıyla sınırlı'], iptal: 'Hat kapatılırsa birikmiş verim kaybolur', uyari };
    }
    case 'arastir': {
      const t = n(e.tek, -1);
      const T = TEKNOLOJI[t];
      if (!T) return red('Araştırma', 'Teknoloji bulunamadı.');
      const L = w.tekBitti[c * NTEK + t]!;
      if (L >= KADEME_MAX) return red('Araştırma', `${kademe(t, L).ad} son kademede.`);
      const hedefAd = kademe(t, L + 1).ad;
      for (let k = 0; k < NYUVA; k++) if (w.arastirma[c * NYUVA + k] === t) return red('Araştırma', `${hedefAd} zaten araştırılıyor.`);
      const eksik = T.on.filter((o) => !w.tekBitti[c * NTEK + TEKNOLOJI.findIndex((x) => x.kod === o)]);
      if (eksik.length) return red('Araştırma', `Ön koşul: ${eksik.map((o) => TEKNOLOJI.find((x) => x.kod === o)!.ad).join(', ')}.`);
      const yv = arastirmaYuvalari(w, c);
      const kapali = T.dislar.find((d) => tekVar(w, c, d) || [...yv.yuva, ...yv.sirada].some((y) => y >= 0 && TEKNOLOJI[y]!.kod === d));
      if (kapali) return red('Araştırma', `${T.ad} ile ${TEKNOLOJI.find((x) => x.kod === kapali)!.ad} birbirini dışlar; bir doktrin seçilir.`);
      const yuva = arastirmaYuvalari(w, c);
      if (yuva.sirada.includes(t)) return red('Araştırma', `${T.ad} zaten sırada (yarın başlar).`);
      const bos = yuva.yuva.indexOf(-1);
      const m = tekMaliyetHesapla(w, c, t);
      const v = Math.max(1, arastirmaHizi(w, c));
      const kalan = Math.max(0, m - w.tekIlerleme[c * NTEK + t]!);
      const yil = kademe(t, L + 1).yil, bugunYil = tarih(w.gun).y;
      return { gecerli: true, baslik: `Araştırma: ${hedefAd}${L > 0 ? ` (${L + 1}. kademe)` : ''}`, kapsam: L > 0 ? `${T.etki} — kademe etkisi büyür` : T.etki, bugun: [bos < 0 ? 'Yuva dolu: en eski araştırmanın yerine geçer (ilerleme korunur)' : `Yuva ${bos + 1}/${acikYuva(w, c)}`], tahmin: [`Süre ≈ ${Math.ceil(kalan / v)} gün (bilim bütçesi ve eğitimle kısalır)`, yil > bugunYil ? `Zamanından önce (${yil}): ${yil - bugunYil} yıl erken, maliyet ×${(1 + 0.12 * Math.floor((yil - bugunYil) / AKTIF.yilOlcek)).toFixed(1)}` : 'Dönem maliyeti'], iptal: 'İlerleme saklanır', uyari: T.dislar.length && L === 0 ? [`Seçilince ${T.dislar.map((d) => TEKNOLOJI.find((x) => x.kod === d)!.ad).join(' ve ')} kapanır.`] : undefined };
    }
    case 'insa': {
      const p = n(e.proje, -1);
      const P = PROJE[p];
      const r = n(e.bolge, -1);
      if (!P) return red('İnşa', 'Proje türü bulunamadı.');
      if (r < 0 || w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c) return red('İnşa', `${bAd(w, r)} sahip olup kontrol ettiğiniz bir bölge değil.`);
      const e2 = w.pkg.bolgeler[r]!.eyalet;
      const eyBolge = w.pkg.eyaletler[e2]!.bolgeler;
      const ort = Math.floor(eyBolge.reduce((s, x) => s + w.R.c.altyapi[x]!, 0) / eyBolge.length);
      const yuva = 1 + Math.floor(ort / 2);
      let mevcut = 0;
      for (const s of w.PR.rows()) if (eyBolge.includes(w.PR.c.bolge[s]!) && !PROJE[w.PR.c.tur[s]!]?.ozel) mevcut++;
      if (mevcut >= yuva) return red('İnşa', `${w.pkg.eyaletler[e2]!.ad} eyaletinde inşa yuvası dolu (${mevcut}/${yuva}).`);
      if (P.ozel) return red('İnşa', 'Gemi ve uçak siparişleri tersane ve uçak emirleriyle verilir.');
      if (P.kod === 'valilik' && w.R.c.valilik[r]) return red('İnşa', 'Bölgede valilik zaten var.');
      if (P.kod === 'kent' && w.R.c.kent[r]! >= 10) return red('İnşa', 'Şehir en üst düzeyde (10).');
      if (P.kod === 'maden' && w.R.c.maden[r]! >= 5) return red('İnşa', 'Maden işletmesi en üst düzeyde (5).');
      if (P.kod === 'maden' && !w.pkg.bolgeler[r]!.celik && !w.pkg.bolgeler[r]!.komur && !w.pkg.bolgeler[r]!.petrol) return red('İnşa', `${bAd(w, r)} bölgesinde maden ya da petrol yatağı yok.`);
      if (P.kod === 'demiryolu' && w.R.c.demiryolu[r]! >= 3) return red('İnşa', 'Demiryolu en üst düzeyde.');
      const indirim = insaIndirim(w, c, P.kod);
      const nakit = mulDiv(P.nakit, indirim, S).q;
      return { gecerli: true, baslik: `${P.ad}: ${bAd(w, r)}`, kapsam: `${fmt(insaSP(w, c, P.sp) / 1000)} SP + ${fmt(nakit)} altın, kademeli`, bugun: ['Peşin ödeme yok; günlük ilerlemeyle harcanır'], tahmin: [`Referans süre ${P.gun} gün; gerçek süre sivil sanayi kapasitesine bağlı`], iptal: 'Harcanan iade edilmez' };
    }
    case 'satinAl': case 'sat': {
      const m = clamp(n(e.mal), 0, MAL.length - 1);
      const miktar = n(e.miktar) * 1000;
      if (miktar <= 0) return red('Ticaret', 'Miktar belirtilmedi.');
      const kim = n(e.kimden, -1);
      const fiyat = w.fiyat[m]!;
      const bedel = mulDiv(miktar, fiyat, 1000).q;
      const ortak: number[] = [];
      for (let d = 0; d < w.nC; d++) if (d !== c && (kim < 0 || kim === d) && gorus(w, d, c) >= (m === MALI.muhimmat ? 60_000 : 20_000) && !savasta(w, c, d)) ortak.push(d);
      if (ortak.length === 0) return red('Ticaret', kim >= 0 ? `${uAd(w, kim)} ile ticaret izni yok: görüşü ${puan(gorus(w, kim, c))}; ${m === MALI.muhimmat ? 60 : 20} gerekiyor.` : 'Ticaret yapılabilecek ülke yok (görüş ≥ 20 gerekir).');
      if (e.tur === 'satinAl' && w.C.c.hazine[c]! < bedel) return red('Satın alma', `Bedel ≈ ${fmt(bedel)} altın; hazine ${fmt(w.C.c.hazine[c]!)}.`);
      if (e.tur === 'sat' && malStok(w, c, m) < miktar) return red('Satış', `Satılabilir ${trKucuk(MAL[m]!.ad)} ${fmt(Math.floor(malStok(w, c, m) / 1000))} birim (gıdada 90 günlük ihtiyaç ayrılır).`);
      return { gecerli: true, baslik: `${e.tur === 'sat' ? 'Satış' : 'Alım'}: ${fmt(miktar / 1000)} ${trKucuk(MAL[m]!.ad)}`, kapsam: `Dünya pazarı (pazartesi temizlenir) · ortaklar: ${ortak.map((d) => uAd(w, d)).join(', ')}`, bugun: [`Referans fiyat ${fmt(fiyat)} altın/birim · ≈ ${fmt(bedel)} altın`, e.tur === 'satinAl' ? 'Bedel temizlemede emanete alınır' : 'Mal temizlemede yola çıkar'], tahmin: ['Teslim 7 gün; eşleşme garanti değildir', n(e.kalici) ? 'Her hafta yinelenir' : 'Tek seferlik'], iptal: 'Temizlemeden önce bedelsiz' };
    }
    case 'teklif': {
      const d = n(e.kime, -1), tip = n(e.tip, -1);
      if (d < 0 || d >= w.nC || d === c) return red('Diplomasi', 'Muhatap ülke bulunamadı.');
      if (!(tip in TK_AD)) return red('Diplomasi', 'Teklif türü bulunamadı.');
      if (savasta(w, c, d)) return red('Diplomasi', `${uAd(w, d)} ile savaştasınız; yalnız barış önerilebilir.`);
      const esik = ESIK[tip] ?? 0;
      const g = gorus(w, d, c);
      if (efendi(w, c) >= 0 && tip === TK.ultimatom) return red('Ültimatom', 'Kukla devlet ültimatom veremez.');
      if (g < esik) return red(TK_AD[tip]!, `İlişki ${puan(g)}; ${trKucuk(TK_AD[tip]!)} teklifi için ${puan(esik)} gerekiyor.`);
      if (tip === TK.devir || tip === TK.ultimatom) {
        const rs = arr(e.bolgeler).filter((r) => r < w.nR && w.R.c.sahip[r] === d);
        if (!rs.length) return red(TK_AD[tip]!, `${uAd(w, d)} topraklarından bölge seçin.`);
        if (rs.includes(w.pkg.ulkeler[d]!.baskent)) return red(TK_AD[tip]!, 'Başkent istenemez.');
        const bedel = n(e.bedel);
        if (tip === TK.devir && bedel > C.hazine[c]!) return red('Toprak devri', `Hazine ${fmt(bedel)} altın için yetmiyor.`);
        const deger = rs.reduce((a, r) => a + bolgeDegeri(w, r), 0);
        return { gecerli: true, baslik: `${TK_AD[tip]}: ${rs.map((r) => bAd(w, r)).join(', ')}`, kapsam: `Muhatap: ${w.pkg.ulkeler[d]!.ad}${tip === TK.devir ? ` · bedel ${fmt(bedel)} altın` : ''}`, bugun: [tip === TK.devir ? 'Bedel kabulde ödenir' : 'Ret hâlinde savaş gerekçesi hazır olur'], tahmin: [`Bölge değeri ${deger}`, tip === TK.ultimatom ? 'Zayıf ve yalnız devletler boyun eğer' : 'İyi ilişki ve yüksek bedel gerekir'], iptal: 'Yanıttan önce geri çekilebilir', siyasi: tip === TK.ultimatom ? 'Muhatabın görüşü −15' : undefined };
      }
      if (tip === TK.kuklaOl) {
        if (efendi(w, d) >= 0) return red('Himaye', `${uAd(w, d)} zaten bir başka devletin himayesinde.`);
        return { gecerli: true, baslik: `Himaye teklifi: ${uAd(w, d)}`, kapsam: 'Kabul ederse kukla devletiniz olur (savaşlarınıza katılır, gelirinin %10\'unu öder)', bugun: [], tahmin: ['Küçük, tehdit altındaki ve size yakın devletler kabul eder'], iptal: 'Yanıttan önce geri çekilebilir' };
      }
      if (tip !== TK.ekipman && anlasmaVar(w, tip, c, d) >= 0) return red(TK_AD[tip]!, 'Bu anlaşma zaten yürürlükte.');
      if (tip === TK.ekipman) {
        const k = n(e.ekip, 0), adet = n(e.adet, 100);
        const f = ekipmanFiyat(k, adet);
        if (w.C.c.hazine[c]! < f) return red('Ekipman alımı', `Bedel ${fmt(f)} altın.`);
        return { gecerli: true, baslik: `Ekipman alımı: ${adet} ${EKIPMAN[k]!.ad}`, kapsam: `Satıcı: ${uAd(w, d)}`, bugun: [`Bedel ${fmt(f)} altın (kabulde)`], tahmin: ['Yanıt ertesi gün; teslim 10 gün'], iptal: 'Yanıttan önce bedelsiz' };
      }
      return { gecerli: true, baslik: `${TK_AD[tip]} teklifi`, kapsam: `Muhatap: ${w.pkg.ulkeler[d]!.ad}`, bugun: ['Bedelsiz'], tahmin: ['Yanıt en erken ertesi gün', `Karşı tarafın size görüşü ${puan(g)}`], iptal: 'Yanıttan önce geri çekilebilir' };
    }
    case 'teklifYanit': {
      const s = w.TK.resolve(n(e.teklif, -1));
      if (s < 0 || w.TK.c.kime[s] !== c || w.TK.c.durum[s] !== 0) return red('Teklif', 'Bekleyen teklif bulunamadı.');
      return { gecerli: true, baslik: `${TK_AD[w.TK.c.tur[s]!]} — ${n(e.kabul) ? 'kabul' : 'ret'}`, kapsam: `${uAd(w, w.TK.c.kimden[s]!)} teklifi`, bugun: [], tahmin: [], iptal: 'Geri alınamaz' };
    }
    case 'gerekce': {
      const d = n(e.hedef, -1);
      if (d < 0 || d === c || d >= w.nC) return red('Gerekçe', 'Hedef ülke bulunamadı.');
      if (savasta(w, c, d)) return red('Gerekçe', 'Zaten savaştasınız.');
      if (gerekceSurecte(w, c, d) >= 0) return red('Gerekçe', gerekceVar(w, c, d) ? 'Gerekçe hazır.' : 'Gerekçe zaten hazırlanıyor.');
      if (anlasmaVar(w, A.ateskes, c, d) >= 0) return red('Gerekçe', 'Ateşkes süresi dolmadı.');
      if (w.C.c.pg[c]! < K.gerekcePG) return red('Gerekçe', `${K.gerekcePG / 1000} siyasi güç gerekiyor.`);
      const iddia = w.pkg.bolgeler.some((_, r) => w.R.c.sahip[r] === d && iddiaVar(w, r, c));
      return { gecerli: true, baslik: `Savaş gerekçesi: ${uAd(w, d)}`, kapsam: iddia ? 'Toprak iddiası üzerinden' : 'Düşmanlık üzerinden', bugun: [`${K.gerekcePG / 1000} siyasi güç`], tahmin: [`Hazır olma: ${K.gerekceGun} gün`, 'Süreç hedef ülkeye ve büyük devletlere görünür'], iptal: 'PG iade edilmez', siyasi: `${uAd(w, d)}'nın size görüşü −10.` };
    }
    case 'savasIlan': {
      const d = n(e.hedef, -1);
      if (d < 0 || d === c || d >= w.nC) return red('Savaş', 'Hedef ülke bulunamadı.');
      if (savasta(w, c, d)) return red('Savaş', 'Zaten savaştasınız.');
      if (anlasmaVar(w, A.ateskes, c, d) >= 0) return red('Savaş', 'Ateşkes yürürlükte (5 yıl).');
      if (anlasmaVar(w, A.ittifak, c, d) >= 0) return red('Savaş', 'Müttefikinize savaş ilan edemezsiniz; önce ittifakı bozun.');
      if (efendi(w, c) >= 0) return red('Savaş', `Kukla devlet kendi başına savaş açamaz (efendi: ${uAd(w, efendi(w, c))}).`);
      const ger = gerekceVar(w, c, d);
      const cagri: string[] = [];
      for (let x = 0; x < w.nC; x++) if (x !== c && x !== d && (anlasmaVar(w, A.ittifak, d, x) >= 0 || anlasmaVar(w, A.garanti, x, d) >= 0)) cagri.push(uAd(w, x));
      return { gecerli: true, baslik: `Savaş ilanı: ${w.pkg.ulkeler[d]!.ad}`, kapsam: ger ? 'Gerekçeli' : 'GEREKÇESİZ', bugun: ger ? [] : ['Huzur −10, savaşa destek −15, ün +20'], tahmin: [cagri.length ? `Savunmaya çağrılabilecekler: ${cagri.join(', ')}` : 'Bilinen garantör veya müttefik yok', 'Ticaret ve saldırmazlık anlaşmaları bozulur'], iptal: 'Geri alınamaz; barış gerekir', siyasi: ger ? 'Diğer devletlerin görüşü −5' : 'Diğer devletlerin görüşü −15' };
    }
    case 'baris': {
      const d = n(e.kime, -1), tur = clamp(n(e.barisTur), 0, 5);
      if (!savasta(w, c, d)) return red('Barış', `${uAd(w, d)} ile savaşta değilsiniz.`);
      const rs = arr(e.bolgeler).filter((r) => r < w.nR);
      const sonuc = barisKabul(w, d, c, tur, rs);
      return { gecerli: true, baslik: `${BARIS_TUR[tur]} önerisi`, kapsam: `${uAd(w, d)}${rs.length ? ` · istenen: ${rs.map((r) => bAd(w, r)).join(', ')}` : ''}`, bugun: [], tahmin: [`Tahmini yanıt: ${sonuc.kabul ? 'kabul' : 'ret'} — ${sonuc.neden}`], iptal: 'Yanıttan önce geri çekilebilir' };
    }
    case 'tutum': {
      const d = n(e.kime, -1), t = clamp(n(e.tutum), 0, 3);
      if (d < 0 || d === c) return red('Tutum', 'Ülke bulunamadı.');
      if (w.tutumKilit[c * w.nC + d]! > w.gun) return red('Tutum', `Tutum ${w.tutumKilit[c * w.nC + d]! - w.gun} gün kilitli.`);
      return { gecerli: true, baslik: `Tutum: ${uAd(w, d)}`, kapsam: TUTUM[t]!, bugun: ['30 gün kilitlenir'], tahmin: [t === 0 ? 'Karşı tarafın görüşü aylık +0,5' : t === 3 ? 'Karşı tarafın görüşü aylık −1' : 'Etkisiz'], iptal: '30 gün sonra' };
    }
    case 'anlasmaBoz': {
      const d = n(e.kime, -1), tip = n(e.tip, -1);
      if (anlasmaVar(w, tip, c, d) < 0) return red('Anlaşma', 'Böyle bir anlaşma yok.');
      return { gecerli: true, baslik: `${TK_AD[tip]} bozulur`, kapsam: uAd(w, d), bugun: [tip === A.ittifak ? 'Güvenilirlik −40' : tip === A.saldirmazlik ? 'Güvenilirlik −20' : 'İhbar'], tahmin: [`${trEkK(uAd(w, d), 'in')} görüşü −15`], iptal: 'Geri alınamaz' };
    }
    case 'borcAl': {
      const m = n(e.miktar);
      const lim = krediLimiti(w, c);
      if (m <= 0) return red('Borç', 'Miktar belirtilmedi.');
      if (m > lim) return red('Borç', `Kredi limiti ${fmt(lim)} altın.`);
      return { gecerli: true, baslik: 'Borçlanma', kapsam: `${fmt(m)} altın`, bugun: [`Yıllık faiz %${(w.C.c.faiz[c]! / 10_000).toFixed(1)}`], tahmin: [`Günlük faiz ≈ ${fmt(mulDiv(m, w.C.c.faiz[c]!, S * 365).q)} altın`], iptal: 'Erken ödeme serbest' };
    }
    case 'borcOde': {
      const m = Math.min(n(e.miktar), w.C.c.borc[c]!, Math.max(0, w.C.c.hazine[c]!));
      if (m <= 0) return red('Borç', 'Ödenecek borç veya nakit yok.');
      return { gecerli: true, baslik: 'Borç ödeme', kapsam: `${fmt(m)} altın`, bugun: [], tahmin: [], iptal: '—' };
    }
    case 'bakan': {
      const alan = n(e.alan, -1);
      const ad = BAKAN[alan];
      if (!ad) return red('Bakanlık', 'Bakanlık bulunamadı.');
      const acik = n(e.acik) ? 1 : 0;
      return { gecerli: true, baslik: `${BAKAN_AD[ad]} bakanı`, kapsam: acik ? 'Göreve başlar: bu alanı ayda bir sizin adınıza planlar' : 'Görevden alınır: alan size geçer', bugun: [], tahmin: [acik ? 'Bu alanda elle verdiğiniz bir emir bakanı yeniden görevden alır.' : 'Önceki bakan kararları yürürlükte kalır.'], iptal: 'Serbest' };
    }
    case 'olaySec': {
      const s = w.OL.resolve(n(e.olay, -1));
      if (s < 0 || w.OL.c.ulke[s] !== c) return red('Olay', 'Bekleyen olay yok.');
      const o = olayTanim(w, w.OL.c.olay[s]!);
      const sec = o.secenekler[n(e.secim)];
      if (!sec) return red('Olay', 'Seçenek yok.');
      return { gecerli: true, baslik: o.baslik, kapsam: sec.ad, bugun: [sec.etki], tahmin: [], iptal: 'Geri alınamaz' };
    }
    case 'kaliciGida':
      return { gecerli: true, baslik: 'Kalıcı emir: gıda güvenliği', kapsam: n(e.acik) ? 'Stok 20 günün altına inerse 14 günlük gıda satın al' : 'Kapalı', bugun: [], tahmin: ['Her pazartesi koşul denetlenir'], iptal: 'Bedelsiz' };
    case 'sandbox': {
      const alan = String(e.alan ?? '');
      const uyari = w.mod !== 1 ? ['Bu kayıt KALICI olarak Sandbox etiketi alır; rekabetçi puan kapanır.'] : undefined;
      return { gecerli: true, baslik: 'Sandbox', kapsam: `${alan}: ${n(e.miktar) >= 0 ? '+' : ''}${fmt(n(e.miktar))}${e.hedefUlke !== undefined ? ` (${uAd(w, n(e.hedefUlke))})` : ''}`, bugun: ['Kaynak doğrudan değiştirilir'], tahmin: [], iptal: 'Ters işlemle', uyari };
    }
    default: {
      const x = EK_EMIRLER[e.tur];
      return x ? x.onizle(w, e) : red('Bilinmeyen emir', `Emir türü tanınmadı: ${e.tur}`);
    }
  }
}

/** Emri uygular (P2). Önce yeniden doğrular. Dönüş: başarılı mı. */
export function uygula(w: World, e: Emir): { ok: boolean; neden?: string } {
  const k = onizle(w, e);
  if (!k.gecerli) return { ok: false, neden: k.neden };
  const c = e.ulke;
  const C = w.C.c;
  const U = uc(w);
  if (c === w.oyuncu && w.mod !== 2 && !e.yz) elleOncelik(w, e);
  switch (e.tur) {
    case 'vergi': {
      const yeni = clamp(n(e.oran), 50_000, 500_000);
      C.vergiAy[c] = C.vergiAy[c]! + Math.abs(yeni - C.vergi[c]!);
      C.vergi[c] = yeni; break;
    }
    case 'butce': { const p = arr(e.paylar); C.b0[c] = p[0]!; C.b1[c] = p[1]!; C.b2[c] = p[2]!; C.b3[c] = p[3]!; break; }
    case 'harcama': C.harcamaOran[c] = clamp(n(e.oran), 0, S); break;
    case 'askerlik': {
      const y = n(e.yasa);
      askerlikAktar(w, c, ASKERLIK[C.askerlik[c]!]!.y, ASKERLIK[y]!.y);
      C.askerlik[c] = y; C.pg[c] = C.pg[c]! - 150_000;
      anlat(w, `${w.pkg.ulkeler[c]!.kisa}: askerlik yasası "${ASKERLIK[y]!.ad}" oldu.`, 'yasa', c, 1);
      break;
    }
    case 'ekonomi': C.ekonomi[c] = n(e.yasa); C.pg[c] = C.pg[c]! - 100_000; anlat(w, `${w.pkg.ulkeler[c]!.kisa}: ekonomi "${EKONOMI[n(e.yasa)]!.ad}" düzenine geçti.`, 'yasa', c, 1); break;
    case 'karne': C.karne[c] = n(e.acik) ? 1 : 0; break;
    case 'isgalPol': C.isgalPol[c] = n(e.pol); C.pg[c] = C.pg[c]! - 25_000; break;
    case 'birlikKur': {
      const sab = n(e.sablon), adet = clamp(n(e.adet, 1), 1, 10);
      const ih = sablonIhtiyac(sab);
      const gun = egitimGun(w, c, ih.egitim);
      const bolge = n(e.bolge, w.pkg.ulkeler[c]!.baskent);
      for (let i = 0; i < adet; i++) {
        let no = 1;
        for (const u of w.U.rows()) if (U.ulke![u] === c && U.sablon![u] === sab) no++;
        const ad = `${no + (sab === 0 ? 10 : 0)}. ${SABLON[sab]!.ad}`;
        const u = birlikKur(w, c, sab, bolge, ad, false, gun);
        if (u < 0) return { ok: false, neden: 'İnsan gücü tükendi.' };
        C.hazine[c] = C.hazine[c]! - ih.kisi * 25;
      }
      break;
    }
    case 'hareket': case 'saldir': {
      for (const id of arr(e.birlikler)) {
        const u = w.U.resolve(id);
        if (u < 0) continue;
        U.hedef![u] = n(e.hedef); U.sonraki![u] = -1; U.ilerleme![u] = 0; U.atamaGun![u] = w.gun;
        U.durus![u] = e.tur === 'saldir' ? 2 : 0;
      }
      break;
    }
    case 'dur': for (const id of arr(e.birlikler)) { const u = w.U.resolve(id); if (u >= 0) { U.hedef![u] = -1; U.sonraki![u] = -1; } } break;
    case 'durus': for (const id of arr(e.birlikler)) { const u = w.U.resolve(id); if (u >= 0) U.durus![u] = clamp(n(e.durus), 0, 3); } break;
    case 'terhis': for (const id of arr(e.birlikler)) { const u = w.U.resolve(id); if (u >= 0) terhis(w, u); } break;
    case 'otoCephe': C.otoCephe[c] = n(e.acik) ? 1 : 0; break;
    case 'otoTakviye': C.otoTakviye[c] = n(e.acik) ? 1 : 0; break;
    case 'uretim': {
      const urun = n(e.urun);
      let s = -1;
      for (const x of w.HT.rows()) if (w.HT.c.ulke[x] === c && w.HT.c.urun[x] === urun) s = x;
      const fab = n(e.fabrika, 1000);
      if (fab <= 0) { if (s >= 0) w.HT.release(s); break; }
      if (s < 0) { s = hatEkle(w, c, urun, 0); }
      w.HT.c.fabrika[s] = fab;
      break;
    }
    case 'arastir': {
      const t = n(e.tek);
      const n0 = acikYuva(w, c);
      let bos = -1; for (let k = 0; k < n0; k++) if (w.arastirma[c * NYUVA + k]! < 0) { bos = k; break; }
      if (bos < 0) bos = 0;
      w.arastirma[c * NYUVA + bos] = t;
      w.tekMaliyet[c * NTEK + t] = tekMaliyetHesapla(w, c, t);
      break;
    }
    case 'insa': {
      const p = n(e.proje), r = n(e.bolge);
      const P = PROJE[p]!;
      const s = w.PR.alloc();
      const indirim = insaIndirim(w, c, P.kod);
      w.PR.c.ulke[s] = c; w.PR.c.tur[s] = p; w.PR.c.bolge[s] = r; w.PR.c.spTop[s] = insaSP(w, c, P.sp); w.PR.c.nakitTop[s] = mulDiv(P.nakit, indirim, S).q; w.PR.c.sira[s] = w.gun * 100 + s;
      break;
    }
    case 'satinAl': case 'sat': {
      const s = w.SP.alloc();
      w.SP.c.ulke[s] = c; w.SP.c.mal[s] = n(e.mal); w.SP.c.miktar[s] = n(e.miktar) * 1000; w.SP.c.yon[s] = e.tur === 'sat' ? 1 : 0;
      w.SP.c.karsi[s] = n(e.kimden, -1); w.SP.c.kalici[s] = n(e.kalici) ? n(e.miktar) : 0;
      break;
    }
    case 'teklif': {
      const d = n(e.kime), tip = n(e.tip);
      if (tip === TK.devir || tip === TK.ultimatom) teklifEkle(w, c, d, tip, n(e.bedel), 0, arr(e.bolgeler));
      else teklifEkle(w, c, d, tip, n(e.ekip, 0), n(e.adet, 0));
      if (tip === TK.ultimatom) gorusDegis(w, d, c, -15_000);
      break;
    }
    case 'teklifYanit': {
      const s = w.TK.resolve(n(e.teklif));
      teklifSonuc(w, s, n(e.kabul) === 1);
      break;
    }
    case 'gerekce': gerekceBaslat(w, c, n(e.hedef)); C.pg[c] = C.pg[c]! - K.gerekcePG; break;
    case 'savasIlan': savasIlan(w, c, n(e.hedef)); break;
    case 'baris': {
      teklifEkle(w, c, n(e.kime), TK.baris, n(e.barisTur), 0, arr(e.bolgeler));
      break;
    }
    case 'tutum': w.tutum[c * w.nC + n(e.kime)] = n(e.tutum); w.tutumKilit[c * w.nC + n(e.kime)] = w.gun + 30; break;
    case 'anlasmaBoz': anlasmaBoz(w, n(e.tip), c, n(e.kime), true); gorusDegis(w, n(e.kime), c, -15_000); break;
    case 'borcAl': C.borc[c] = C.borc[c]! + n(e.miktar); C.hazine[c] = C.hazine[c]! + n(e.miktar); break;
    case 'borcOde': { const m = Math.min(n(e.miktar), C.borc[c]!, Math.max(0, C.hazine[c]!)); C.borc[c] = C.borc[c]! - m; C.hazine[c] = C.hazine[c]! - m; break; }
    case 'olaySec': olaySecimUygula(w, w.OL.resolve(n(e.olay)), n(e.secim)); break;
    case 'bakan': { const b = 1 << n(e.alan); C.bakan[c] = n(e.acik) ? C.bakan[c]! | b : C.bakan[c]! & ~b; break; }
    case 'kaliciGida': C.kaliciGida[c] = n(e.acik) ? 1 : 0; break;
    case 'sandbox': sandboxUygula(w, e); break;
    default: EK_EMIRLER[e.tur]?.uygula(w, e);
  }
  return { ok: true };
}

function sandboxUygula(w: World, e: Emir): void {
  w.mod = 1; // kalıcı etiket
  const c = e.hedefUlke !== undefined ? n(e.hedefUlke) : e.ulke;
  const m = n(e.miktar);
  const C = w.C.c;
  const alan = String(e.alan);
  if (alan === 'hazine') C.hazine[c] = Math.max(0, C.hazine[c]! + m);
  else if (alan === 'pg') C.pg[c] = clamp(C.pg[c]! + m * 1000, 0, 500_000);
  else if (alan === 'gida') { const e2 = w.pkg.bolgeler[w.pkg.ulkeler[c]!.baskent]!.eyalet; w.E.c.gida[e2] = Math.max(0, w.E.c.gida[e2]! + m * 1000); }
  else if (alan === 'muhimmat') C.muhimmat[c] = Math.max(0, C.muhimmat[c]! + m * 1000);
  else if (alan === 'celik') C.celik[c] = Math.max(0, C.celik[c]! + m * 1000);
  else if (alan === 'komur') C.komur[c] = Math.max(0, C.komur[c]! + m * 1000);
  else if (alan === 'huzur') C.huzur[c] = clamp(C.huzur[c]! + m * 1000, 0, 100_000);
  else if (alan === 'destek') C.destek[c] = clamp(C.destek[c]! + m * 1000, 0, 100_000);
  else if (alan === 'mesru') C.mesru[c] = clamp(C.mesru[c]! + m * 1000, 0, 100_000);
  else if (alan === 'insan') {
    // Sandbox insan gücü: S havuzundan Y'ye (nüfus yaratılmaz)
    for (let r = 0; r < w.nR && m > 0; r++) {
      if (w.R.c.sahip[r] !== c) continue;
      const hs = r * 32 + 9, hy = r * 32 + 10;
      const a = Math.min(w.pop[hs]!, Math.floor(m / 4));
      w.pop[hs] = w.pop[hs]! - a; w.pop[hy] = w.pop[hy]! + a;
    }
  } else if (alan.startsWith('ekip')) {
    const k = n(Number(alan.slice(4)), 0);
    w.ekip[ck(c, k)] = Math.max(0, w.ekip[ck(c, k)]! + m);
  } else if (alan === 'gorus') {
    const d = n(e.kime, -1);
    if (d >= 0) w.gorus[d * w.nC + c] = clamp(w.gorus[d * w.nC + c]! + m * 1000, 0, 100_000);
  }
  anlat(w, `Sandbox: ${w.pkg.ulkeler[c]!.kisa} ${alan} ${m >= 0 ? '+' : ''}${fmt(m)}.`, 'sandbox', c, 0);
}

/** Teklif sonucunu uygular (kabul/ret). */
export function teklifSonuc(w: World, s: number, kabul: boolean): void {
  if (s < 0) return;
  const T = w.TK.c;
  const a = T.kimden[s]!, b = T.kime[s]!, tur = T.tur[s]!;
  T.durum[s] = kabul ? 1 : 2;
  const adA = w.pkg.ulkeler[a]!.kisa, adB = w.pkg.ulkeler[b]!.kisa;
  if (!kabul) {
    anlat(w, `${adB}, ${trEkK(adA, 'in')} ${trKucuk(TK_AD[tur]!)} teklifini reddetti.`, 'diplomasi', a, 1);
    if (a === w.oyuncu) bildir(w, 'teklif', `${adB} reddetti: ${TK_AD[tur]}`, a, false);
    if (tur === TK.ultimatom) {
      // reddedilen ültimatom: savaş gerekçesi hazır
      const g = w.GR.alloc(); w.GR.c.ulke[g] = a; w.GR.c.hedef[g] = b; w.GR.c.bitis[g] = w.gun; w.GR.c.hazir[g] = 1;
    }
    if (tur === TK.cagri) {
      // çağrıya uymamak ittifakı zedeler
      anlasmaBoz(w, A.ittifak, b, a, true); anlasmaBoz(w, A.garanti, b, a, true);
      gorusDegis(w, a, b, -30_000);
    }
    // ret hafızası: 180 gün aynı teklif yinelenmez (aylık temizlik)
    T.gun[s] = w.gun;
    return;
  }
  if (tur === TK.ticaret || tur === TK.saldirmazlik || tur === TK.ittifak) anlasmaKur(w, tur, a, b);
  else if (tur === TK.gecis) anlasmaKur(w, A.gecis, b, a); // b, a'ya geçiş verir
  else if (tur === TK.garanti) anlasmaKur(w, A.garanti, a, b);
  else if (tur === TK.cagri) {
    const sv = T.p1[s]!;
    if (w.SV.alive[sv]) savasaKatil(w, sv, b, T.p2[s]! === 1 ? 1 : 0);
  } else if (tur === TK.baris) {
    // teslim önerisinde öneren kaybeden taraftır
    if (T.p1[s] === 5) barisUygula(w, b, a, 2, teklifBolgeleri(w, s));
    else barisUygula(w, a, b, T.p1[s]!, teklifBolgeleri(w, s));
  } else if (tur === TK.devir || tur === TK.ultimatom) {
    const bedel = tur === TK.devir ? Math.min(T.p1[s]!, Math.max(0, w.C.c.hazine[a]!)) : 0;
    w.C.c.hazine[a] = w.C.c.hazine[a]! - bedel; w.C.c.hazine[b] = w.C.c.hazine[b]! + bedel;
    for (const r of teklifBolgeleri(w, s)) {
      if (w.R.c.sahip[r] !== b) continue;
      w.R.c.sahip[r] = a; w.R.c.kontrolEden[r] = a; w.R.c.kontrol[r] = Math.min(w.R.c.kontrol[r]!, 40_000); w.R.c.itaat[r] = 0; w.R.c.anaYurtGun[r] = 0;
    }
    w.rotaEpoch++;
    anlat(w, `${w.pkg.ulkeler[b]!.ad}, ${teklifBolgeleri(w, s).map((r) => w.pkg.bolgeler[r]!.ad).join(', ')} bölgelerini ${trEkK(w.pkg.ulkeler[a]!.kisa, 'e')} ${tur === TK.devir ? 'devretti' : 'bıraktı (ültimatom)'}.`, 'diplomasi', a, 3);
  } else if (tur === TK.kuklaOl) {
    kuklaKur(w, a, b);
  } else if (tur === TK.ekipman) {
    const k = T.p1[s]!, adet = T.p2[s]!;
    const f = ekipmanFiyat(k, adet);
    const ver = Math.min(adet, w.ekip[ck(b, k)]!);
    if (ver > 0 && w.C.c.hazine[a]! >= f) {
      w.ekip[ck(b, k)] = w.ekip[ck(b, k)]! - ver;
      w.C.c.hazine[a] = w.C.c.hazine[a]! - f; w.C.c.hazine[b] = w.C.c.hazine[b]! + f;
      const t = w.T.alloc();
      w.T.c.tur[t] = 2; w.T.c.alt[t] = k; w.T.c.miktar[t] = ver; w.T.c.ulke[t] = a; w.T.c.hedefTip[t] = 2; w.T.c.hedefId[t] = a; w.T.c.varis[t] = w.gun + 10; w.T.c.konum[t] = w.pkg.ulkeler[a]!.baskent;
    }
  }
  if (tur !== TK.baris && tur !== TK.cagri) { gorusDegis(w, a, b, 5000); gorusDegis(w, b, a, 5000); }
  anlat(w, `${adB}, ${adA} ile ${trKucuk(TK_AD[tur]!)} için anlaştı.`, 'diplomasi', a, tur === TK.ittifak || tur === TK.cagri ? 2 : 1);
  if (a === w.oyuncu) bildir(w, 'teklif', `${adB} kabul etti: ${TK_AD[tur]}`, a, tur === TK.baris);
  w.TK.release(s);
}

/** Kuyruğa al (onaylı emir). P2'de sırayla işlenir. */
/** Yuvaların, kuyruktaki araştırma emirleri uygulandıktan sonraki hâli (önizleme ve arayüz için). */
export function arastirmaYuvalari(w: World, c: number): { yuva: number[]; sirada: number[] } {
  const yuva = Array.from({ length: acikYuva(w, c) }, (_, k) => w.arastirma[c * NYUVA + k]!);
  const sirada: number[] = [];
  for (const k of w.kuyruk) {
    const e = k.emir as Emir;
    if (e.tur !== 'arastir' || e.ulke !== c) continue;
    const t = Number(e.tek);
    if (yuva.includes(t)) continue;
    let b = yuva.indexOf(-1);
    if (b < 0) b = 0;
    yuva[b] = t; sirada.push(t);
  }
  return { yuva, sirada };
}

export function kuyrugaAl(w: World, e: Emir): void {
  w.kuyruk.push({ sira: w.emirSira++, emir: e });
}

export const EMIR_TURLERI = ['vergi', 'butce', 'harcama', 'askerlik', 'ekonomi', 'karne', 'isgalPol', 'birlikKur', 'hareket', 'saldir', 'dur', 'durus', 'terhis', 'otoCephe', 'otoTakviye', 'uretim', 'arastir', 'insa', 'satinAl', 'sat', 'teklif', 'teklifYanit', 'gerekce', 'savasIlan', 'baris', 'tutum', 'anlasmaBoz', 'borcAl', 'borcOde', 'olaySec', 'kaliciGida', 'sandbox'] as const;
void BAYRAK; void ulkeGidaStok; void savastaMi;
