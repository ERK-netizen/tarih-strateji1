import { denizGucu } from './systems/deniz.ts';
import { cepheler, usMesafesi, havaMenzili, ucakKapasitesi, ucakToplam } from './systems/us.ts';
// Ek emirler (şema 7): donanma ve hava kuvvetleri, tabur düzeni, siyaset, demografi, ekonomi ayarları, örtülü diplomasi.
// Her emir için önizleme (dünyayı değiştirmez) ve uygulama; oyuncu ve karar modülü aynı kuralları kullanır.
import type { World } from './state/world.ts';
import { A, cc, NYUVA } from './state/world.ts';
import type { Emir, Kart } from './orders.ts';
import { TABUR, AKTIF, MAX_TABUR, YONETIM, PROJE, NKIMLIK } from './catalog.ts';
import { GEMI, HAVA, DONEM_FIYAT, DENIZ_GOREV, HAVA_GOREV, PARTI, REJIM_AD, EKO_MODEL, TARIM_ODAK, SECIMLI } from './katalogEk.ts';
import { S, mulDiv, clamp } from './num/index.ts';
import { rng, uniformInt, AMAC } from './rng/index.ts';
import { uc, savasta, savastaMi, anlasmaVar, anlat, bildir, efendi, pasif, birlikAdi } from './systems/ortak.ts';
import { birlikIhtiyac } from './systems/ortak.ts';
import { gerekceVar, gorusDegis, kuklaBagimsizlik, anlasmaKur, anlasmaBoz } from './systems/diplomasi.ts';
import { rejimDegistir, secimYap, zulumUygula, kimlikAdi, kimlikHucresi, devrim, partiPay } from './systems/toplum.ts';
import { K } from './catalog.ts';
import { trEkK } from './tr.ts';
import { komutanAdi, komutanYuk, birlikKomutani, etkinNitelik, ulkeKomutanlari, komutanDagit, KOMUTAN_EMIR, EGITIM_AZAMI, EGITIM_PG, EGITIM_ALTIN, EGITIM_ARTIS, NITELIK_TAVAN } from './systems/komutan.ts';

const n = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? Math.trunc(x) : d);
const arr = (x: unknown): number[] => (Array.isArray(x) ? x.map((v) => n(v, -1)).filter((v) => v >= 0) : []);
const fmt = (x: number): string => { let s = String(Math.abs(Math.trunc(x))); let o = ''; while (s.length > 3) { o = '.' + s.slice(-3) + o; s = s.slice(0, -3); } return (x < 0 ? '−' : '') + s + o; };
const red = (baslik: string, neden: string): Kart => ({ gecerli: false, baslik, kapsam: '', bugun: [], tahmin: [], neden, iptal: '—' });
const tamam = (baslik: string, kapsam: string, bugun: string[] = [], tahmin: string[] = [], iptal = 'Geri alınabilir', extra: Partial<Kart> = {}): Kart => ({ gecerli: true, baslik, kapsam, bugun, tahmin, iptal, ...extra });
const uAd = (w: World, c: number) => w.pkg.ulkeler[c]?.kisa ?? '?';
const bAd = (w: World, r: number) => w.pkg.bolgeler[r]?.ad ?? `#${r}`;
const kiyiMi = (w: World, r: number) => !!w.pkg.bolgeler[r]?.kiyi || w.komsuluk[r]!.some((q) => (w.pkg.kenarlar.find((k) => (k.a === r && k.b === q) || (k.a === q && k.b === r))?.tur ?? 0) > 0);
const gemiPR = (w: World, c: number, kod: string) => { const p = PROJE.findIndex((x) => x.kod === kod); let say = 0; for (const s of w.PR.rows()) if (w.PR.c.ulke[s] === c && w.PR.c.tur[s] === p) say++; return { p, say }; };

/** Emir türü → bakanlık alanı biti (oyuncunun elle emri o bakanı görevden alır). */
export const EK_ALAN: Record<string, number> = { gemiInsa: 1 << 2, ucakUret: 1 << 2, tarife: 1 << 0, sub: 1 << 0, ekoModel: 1 << 0, tarimOdak: 1 << 0 };

interface EkEmir { onizle(w: World, e: Emir): Kart; uygula(w: World, e: Emir): void }
export const EK_EMIRLER: Record<string, EkEmir> = {
  // ---------- Donanma ----------
  gemiInsa: {
    onizle(w, e) {
      const c = e.ulke, k = n(e.sinif, -1), adet = clamp(n(e.adet, 1), 1, 50), r = n(e.bolge, -1);
      const G = GEMI[AKTIF.donem][k];
      if (!G) return red('Tersane', 'Gemi sınıfı bulunamadı.');
      if (r < 0 || w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c) return red('Tersane', 'Tersane kendi kıyı bölgenizde olmalı.');
      if (!kiyiMi(w, r)) return red('Tersane', `${bAd(w, r)} kıyıda değil.`);
      if (w.R.c.tersane[r]! < 1) return red('Tersane', `${bAd(w, r)} bölgesinde tersane yok: önce “Tersane” inşa edin.`);
      const { say } = gemiPR(w, c, 'gemi');
      if (say >= 4) return red('Tersane', 'En çok dört tersane siparişi aynı anda yürür.');
      const bedel = mulDiv(G.bedel * adet, DONEM_FIYAT[AKTIF.donem], 1000).q;
      return tamam(`Tersane: ${adet} ${G.ad}`, `${bAd(w, r)} tersanesi`, [`Bedel ${fmt(bedel)} altın, kademeli`], [`Referans süre ${G.gun} gün (sivil sanayi kapasitesine bağlı)`, `Günlük bakım ${fmt(mulDiv(G.bakim * adet, DONEM_FIYAT[AKTIF.donem], 1000).q)} altın`], 'Harcanan iade edilmez');
    },
    uygula(w, e) {
      const c = e.ulke, k = n(e.sinif), adet = clamp(n(e.adet, 1), 1, 50), r = n(e.bolge);
      const G = GEMI[AKTIF.donem][k]!;
      const { p } = gemiPR(w, c, 'gemi');
      const s = w.PR.alloc();
      w.PR.c.ulke[s] = c; w.PR.c.tur[s] = p; w.PR.c.bolge[s] = r; w.PR.c.alt[s] = k; w.PR.c.adet[s] = adet;
      w.PR.c.spTop[s] = Math.floor((G.gun * K.fabrikaSP * adet) / 3); w.PR.c.nakitTop[s] = mulDiv(G.bedel * adet, DONEM_FIYAT[AKTIF.donem], 1000).q; w.PR.c.sira[s] = w.gun * 100 + s;
    },
  },
  ucakUret: {
    onizle(w, e) {
      const c = e.ulke, k = n(e.tip, -1), filo = clamp(n(e.adet, 1), 1, 40);
      const H = HAVA[AKTIF.donem][k];
      if (!H) return red('Uçak', HAVA[AKTIF.donem].length ? 'Uçak türü bulunamadı.' : 'Bu çağda hava kuvveti yok.');
      const { say } = gemiPR(w, c, 'ucak');
      if (say >= 4) return red('Uçak', 'En çok dört uçak siparişi aynı anda yürür.');
      let bekleyen = 0; { const { p } = gemiPR(w, c, 'ucak'); for (const s of w.PR.rows()) if (w.PR.c.ulke[s] === c && w.PR.c.tur[s] === p) bekleyen += w.PR.c.adet[s]!; }
      const kap = ucakKapasitesi(w, c), simdi = ucakToplam(w, c) + bekleyen;
      if (simdi + filo * 10 > kap) return red('Uçak', `Hava üssü kapasitesi dolu (${fmt(simdi)}/${fmt(kap)} uçak): yeni hava üssü inşa edin.`);
      const bas = w.pkg.ulkeler[c]!.baskent;
      if (w.R.c.kontrolEden[bas] !== c) return red('Uçak', 'Başkent elinizde değil.');
      const bedel = mulDiv(H.bedel * filo, DONEM_FIYAT[AKTIF.donem], 1000).q;
      return tamam(`Uçak siparişi: ${filo} filo ${H.ad}`, `${filo * 10} uçak`, [`Bedel ${fmt(bedel)} altın, kademeli`], [`Referans süre ${H.gun} gün`]);
    },
    uygula(w, e) {
      const c = e.ulke, k = n(e.tip), filo = clamp(n(e.adet, 1), 1, 40);
      const H = HAVA[AKTIF.donem][k]!;
      const { p } = gemiPR(w, c, 'ucak');
      const s = w.PR.alloc();
      w.PR.c.ulke[s] = c; w.PR.c.tur[s] = p; w.PR.c.bolge[s] = w.pkg.ulkeler[c]!.baskent; w.PR.c.alt[s] = k; w.PR.c.adet[s] = filo * 10;
      w.PR.c.spTop[s] = Math.floor((H.gun * K.fabrikaSP * filo) / 4); w.PR.c.nakitTop[s] = mulDiv(H.bedel * filo, DONEM_FIYAT[AKTIF.donem], 1000).q; w.PR.c.sira[s] = w.gun * 100 + s;
    },
  },
  donanmaGorev: {
    onizle(w, e) {
      const g = n(e.gorev, -1);
      if (!DENIZ_GOREV[g]) return red('Donanma', 'Görev bulunamadı.');
      const t = ['Onarım hızlı; düşmana yalnız mevcut filo caydırıcılığı (%40)', 'Düşman filosunu arar: muharebe, deniz geçişi üstünlüğü', 'Üstünseniz düşman ticaretini ve gelirini boğar', 'Denizaltı ve kruvazörlerle düşman deniz ticaretini vurur', 'Eskortlar ticaret yollarını korur (akın kaybı azalır)'][g]!;
      return tamam(`Donanma görevi: ${DENIZ_GOREV[g]}`, t);
    },
    uygula(w, e) { w.C.c.donGorev[e.ulke] = n(e.gorev); },
  },
  havaGorev: {
    onizle(w, e) {
      const g = n(e.gorev, -1), r = n(e.bolge, -1);
      if (HAVA[AKTIF.donem].length === 0) return red('Hava kuvvetleri', 'Bu çağda hava kuvveti yok.');
      if (!HAVA_GOREV[g]) return red('Hava kuvvetleri', 'Görev bulunamadı.');
      if (g > 0 && (r < 0 || r >= w.nR)) return red('Hava kuvvetleri', 'Hedef bölge seçin.');
      if (g > 0) {
        const cp = cepheler(w, e.ulke);
        const dusmanBolge = savasta(w, e.ulke, w.R.c.kontrolEden[r]!);
        if (!cp.includes(r) && !(g === 3 && dusmanBolge)) return red('Hava kuvvetleri', `${bAd(w, r)} aktif cephe değil: hava gücü yalnızca savaşılan cephelere gönderilir.`);
        const m = usMesafesi(w, e.ulke, r);
        if (m > havaMenzili()) return red('Hava kuvvetleri', m >= 999 ? 'Hava üssünüz yok: önce hava üssü inşa edin.' : `${bAd(w, r)} hava üslerinizin menzili dışında (${m} bölge; menzil ${havaMenzili()}). Cepheye yakın hava üssü kurun.`);
      }
      if (g === 3 && !savasta(w, e.ulke, w.R.c.kontrolEden[r]!)) return red('Bombardıman', 'Stratejik bombardıman yalnız savaştığınız devletin bölgesine yapılır.');
      const t = ['Uçaklar üste kalır, onarılır', 'Bölge ve komşularında hava üstünlüğü: kara muharebesine ±%20', 'Yakın destek: bölgedeki taarruz ve savunmaya bombardıman katkısı', 'Sanayi hasarı, huzursuzluk ve savaş yorgunluğu', 'Bölgedeki düşman ordu tahminleri daralır'][g]!;
      return tamam(`Hava görevi: ${HAVA_GOREV[g]}${g > 0 ? ` · ${bAd(w, r)}` : ''}`, t);
    },
    uygula(w, e) { w.C.c.havaGorev[e.ulke] = n(e.gorev); w.C.c.havaBolge[e.ulke] = n(e.gorev) > 0 ? n(e.bolge) : -1; },
  },
  donanmaGonder: {
    onizle(w, e) {
      const r = n(e.bolge, -1);
      if (r < 0 || r >= w.nR) return red('Donanma', 'Hedef cephe bölgesi seçin.');
      if (!kiyiMi(w, r)) return red('Donanma', `${bAd(w, r)} kıyıda değil.`);
      if (!cepheler(w, e.ulke).includes(r)) return red('Donanma', `${bAd(w, r)} aktif cephe değil: donanma yalnızca savaşılan kıyı cephelerine gönderilir.`);
      if (denizGucu(w, e.ulke) <= 0) return red('Donanma', 'Savaşabilir gemi yok.');
      return tamam(`Donanma cepheye: ${bAd(w, r)}`, 'Kıyı bombardımanıyla bölge ve komşularındaki muharebelere destek verir', ['Görev yoksa “Deniz üstünlüğü” görevine geçer'], ['Düşman donanması varsa önce o aranır'], 'Geri alınabilir');
    },
    uygula(w, e) { w.C.c.donBolge[e.ulke] = n(e.bolge) + 1; if (w.C.c.donGorev[e.ulke] === 0) w.C.c.donGorev[e.ulke] = 1; },
  },
  // ---------- Tabur düzeni ----------
  taburEkle: {
    onizle(w, e) {
      const t = n(e.tabur, -1), adet = clamp(n(e.adet, 1), 1, MAX_TABUR);
      const T = TABUR[t];
      if (!T) return red('Tabur', 'Tabur türü bulunamadı.');
      const ids = arr(e.birlikler);
      if (!ids.length) return red('Tabur', 'Birlik seçin.');
      const U = uc(w);
      for (const id of ids) {
        const u = w.U.resolve(id);
        if (u < 0 || U.ulke![u] !== e.ulke) return red('Tabur', 'Birlik bulunamadı.');
        if (U.taburSay![u]! + adet > MAX_TABUR) return red('Tabur', `${birlikAdi(w, u)} en çok ${MAX_TABUR} tabur alır (şimdi ${U.taburSay![u]}).`);
      }
      return tamam(`Tabur ekle: ${adet} ${T.ad}`, `${ids.length} birlik`, [`Yeni ihtiyaç: ${fmt(T.kisi * adet * ids.length)} asker, ${T.adet * adet * ids.length} ${T.aile} teçhizatı`], ['Takviye sistemi asker ve teçhizatı zamanla tamamlar; organizasyon geçici olarak düşer']);
    },
    uygula(w, e) {
      const t = n(e.tabur), adet = clamp(n(e.adet, 1), 1, MAX_TABUR);
      const U = w.U.c as unknown as Record<string, Float64Array>;
      for (const id of arr(e.birlikler)) {
        const u = w.U.resolve(id);
        if (u < 0) continue;
        const eski = birlikIhtiyac(w, u).kisi;
        for (let i = 0; i < adet && U.taburSay![u]! < MAX_TABUR; i++) { U[`t${U.taburSay![u]!}`]![u] = t; U.taburSay![u] = U.taburSay![u]! + 1; }
        const yeni = birlikIhtiyac(w, u).kisi;
        U.org![u] = mulDiv(U.org![u]!, eski, Math.max(1, yeni)).q;
      }
    },
  },
  taburCikar: {
    onizle(w, e) {
      const t = n(e.tabur, -1);
      const ids = arr(e.birlikler);
      if (!TABUR[t] || !ids.length) return red('Tabur', 'Birlik ve tabur türü seçin.');
      const U = uc(w);
      for (const id of ids) {
        const u = w.U.resolve(id);
        if (u < 0 || U.ulke![u] !== e.ulke) return red('Tabur', 'Birlik bulunamadı.');
        let var_ = false; for (let k = 0; k < U.taburSay![u]!; k++) if ((U as unknown as Record<string, Float64Array>)[`t${k}`]![u] === t) var_ = true;
        if (!var_ || U.taburSay![u]! <= 1) return red('Tabur', `${birlikAdi(w, u)} içinde çıkarılabilecek ${TABUR[t]!.ad} yok.`);
      }
      return tamam(`Tabur çıkar: ${TABUR[t]!.ad}`, `${ids.length} birlik`, [], ['Fazla asker birlikte kalır; kayıplarla erir']);
    },
    uygula(w, e) {
      const t = n(e.tabur);
      const U = w.U.c as unknown as Record<string, Float64Array>;
      for (const id of arr(e.birlikler)) {
        const u = w.U.resolve(id);
        if (u < 0) continue;
        const say = U.taburSay![u]!;
        let i = -1; for (let k = say - 1; k >= 0; k--) if (U[`t${k}`]![u] === t) { i = k; break; }
        if (i < 0 || say <= 1) continue;
        for (let k = i; k < say - 1; k++) U[`t${k}`]![u] = U[`t${k + 1}`]![u]!;
        U[`t${say - 1}`]![u] = 0; U.taburSay![u] = say - 1;
      }
    },
  },
  // ---------- Siyaset ----------
  rejim: {
    onizle(w, e) {
      const c = e.ulke, t = n(e.rejim, -1);
      if (!YONETIM[t]) return red('Rejim', 'Rejim türü bulunamadı.');
      if (w.C.c.rejim[c] === t) return red('Rejim', 'Zaten bu rejimdesiniz.');
      if (w.C.c.pg[c]! < 150_000) return red('Rejim', 'Rejim değişikliği 150 siyasi güç ister.');
      if (w.C.c.mesru[c]! < 30_000) return red('Rejim', 'Meşruiyet 30\'un altında: rejim değişikliği iç savaşa döner.');
      if (w.C.c.gecis[c]! > w.gun) return red('Rejim', 'Önceki geçiş dönemi sürüyor.');
      return tamam(`Rejim: ${REJIM_AD[AKTIF.donem][t]}`, `${REJIM_AD[AKTIF.donem][w.C.c.rejim[c]!]} → ${REJIM_AD[AKTIF.donem][t]}`, ['Siyasi güç −150, meşruiyet −15, huzur −8', '180 günlük geçiş dönemi (aylık huzursuzluk)'], [SECIMLI.has(t) ? 'Altı ay içinde seçim' : 'Seçimler kalkar; muhalefet bastırılır', `Yeni rejimin idari verimi: %${Math.floor(YONETIM[t]!.idari / 10_000)}`], 'Geri dönüş yeni bir rejim değişikliği ister');
    },
    uygula(w, e) { rejimDegistir(w, e.ulke, n(e.rejim)); },
  },
  partiDestek: {
    onizle(w, e) {
      const p = n(e.parti, -1);
      if (!PARTI[AKTIF.donem][p]) return red('Parti', 'Parti bulunamadı.');
      if (w.C.c.pg[e.ulke]! < 40_000) return red('Parti', 'Destek kampanyası 40 siyasi güç ister.');
      return tamam(`Parti desteği: ${PARTI[AKTIF.donem][p]!.ad}`, PARTI[AKTIF.donem][p]!.aciklama, ['Siyasi güç −40'], [`Destek +%5 (şimdi %${Math.floor(partiPay(w, e.ulke, p) / 10_000)})`]);
    },
    uygula(w, e) {
      const c = e.ulke, p = n(e.parti);
      w.C.c.pg[c] = w.C.c.pg[c]! - 40_000;
      const k = `parti${p}` as 'parti0';
      w.C.c[k][c] = w.C.c[k][c]! + 50_000;
      let t = 0; for (let i = 0; i < 5; i++) t += partiPay(w, c, i);
      for (let i = 0; i < 5; i++) { const kk = `parti${i}` as 'parti0'; w.C.c[kk][c] = mulDiv(w.C.c[kk][c]!, S, t).q; }
    },
  },
  secimErken: {
    onizle(w, e) {
      if (!SECIMLI.has(w.C.c.rejim[e.ulke]!)) return red('Seçim', 'Bu rejimde seçim yapılmaz.');
      if (w.C.c.pg[e.ulke]! < 60_000) return red('Seçim', 'Erken seçim 60 siyasi güç ister.');
      return tamam('Erken seçim', 'Sandık bugünkü desteklerle kurulur', ['Siyasi güç −60']);
    },
    uygula(w, e) { w.C.c.pg[e.ulke] = w.C.c.pg[e.ulke]! - 60_000; secimYap(w, e.ulke); },
  },
  // ---------- Demografi ----------
  nufusPol: {
    onizle(w, e) {
      const t = n(e.pol, -1);
      const ad = ['Serbest', 'Doğum teşviki', 'Göç teşviki', 'Göç kısıtlaması'][t];
      if (!ad) return red('Nüfus', 'Politika bulunamadı.');
      const t2 = ['Ek bedel yok', 'Doğumlar +%25; bedeli gelirin %1\'i', 'Kentlere yabancı göçmen: nüfus ve işgücü artar, huzur biraz düşer', 'Milliyetçi destek artar; işgücü büyümesi yavaşlar'][t]!;
      return tamam(`Nüfus politikası: ${ad}`, t2);
    },
    uygula(w, e) { w.C.c.nufusPol[e.ulke] = n(e.pol); },
  },
  demografi: {
    onizle(w, e) {
      const c = e.ulke, r = n(e.bolge, -1), ey = n(e.eylem, -1), k = n(e.kimlik, -1);
      if (r < 0 || w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c) return red('Demografi', 'Bölge sizin olmalı.');
      if (ey === 0) return tamam(`Demografi politikası kaldırıldı: ${bAd(w, r)}`, 'Bölgedeki asimilasyon/iskân durur');
      const U = w.pkg.ulkeler[c]!;
      const hedefK = kimlikHucresi(w, r, U.kultur);
      if (ey === 1) {
        if (k < 0 || k >= NKIMLIK || w.kim[r * NKIMLIK + k]! <= 0) return red('Asimilasyon', 'Hedef halk bulunamadı.');
        if (hedefK < 0) return red('Asimilasyon', 'Bölgede sizin kültürünüzden nüfus yok; önce iskân gerekir.');
        if (k === hedefK) return red('Asimilasyon', 'Bu zaten sizin kültürünüz.');
        return tamam(`Asimilasyon: ${kimlikAdi(w, r, k)} · ${bAd(w, r)}`, 'Haftada %0,3 kültürel dönüşüm (dil ve okul politikası)', ['Bölgede direniş artar, ülke huzuru yavaş düşer'], [`Bölgede ${fmt(w.kim[r * NKIMLIK + k]!)} kişi`], 'Kaldırılabilir', { siyasi: 'Akraba devletlerin görüşü aylık düşer' });
      }
      if (ey === 2) {
        if (hedefK < 0) return red('İskân', 'Bölgede kültürünüzün yerleşebileceği bir topluluk yok.');
        if (r === U.baskent) return red('İskân', 'Başkente iskân yapılmaz.');
        return tamam(`İskân: ${bAd(w, r)}`, 'Haftada başkentten nüfusun ‰0,5\'i bölgeye yerleşir', ['Yerleşimci başına 2 altın'], ['Bölgede direniş biraz artar']);
      }
      return red('Demografi', 'Eylem bulunamadı.');
    },
    uygula(w, e) { const r = n(e.bolge), ey = n(e.eylem); w.R.c.demPol[r] = ey; w.R.c.demKim[r] = n(e.kimlik, 0); },
  },
  surgun: zulumEmri('surgun'),
  soykirim: zulumEmri('soykirim'),
  // ---------- Ekonomi ayarları ----------
  ekoModel: {
    onizle(w, e) {
      const t = n(e.model, -1);
      const M = EKO_MODEL[t];
      if (!M) return red('Ekonomi', 'Model bulunamadı.');
      if (w.C.c.model[e.ulke] === t) return red('Ekonomi', 'Zaten bu model.');
      if (w.C.c.pg[e.ulke]! < 60_000) return red('Ekonomi', 'Model değişikliği 60 siyasi güç ister.');
      return tamam(`Ekonomi modeli: ${M.ad}`, M.aciklama, ['Siyasi güç −60'], [`Hizmet %${M.hizmet / 10_000}, sanayi %${M.sanayi / 10_000}, vergi verimi %${M.vergi / 10_000}, inşa hızı %${M.insa / 10_000}`]);
    },
    uygula(w, e) { w.C.c.pg[e.ulke] = w.C.c.pg[e.ulke]! - 60_000; w.C.c.model[e.ulke] = n(e.model); },
  },
  tarife: {
    onizle(w, e) {
      const o = clamp(n(e.oran), 0, 500_000);
      return tamam(`Gümrük tarifesi: %${Math.floor(o / 10_000)}`, 'Yüksek tarife sanayiyi korur ve gümrük geliri getirir; ticaret ve hizmet daralır', [], [`Sanayi +%${Math.floor(Math.min(150_000, o / 3) / 10_000)}, hizmet −%${Math.floor((o * 6) / 10 / 10_000)}`], 'Serbest', { siyasi: o > 250_000 ? 'Ticaret ortaklarının görüşü düşer' : undefined });
    },
    uygula(w, e) { w.C.c.tarife[e.ulke] = clamp(n(e.oran), 0, 500_000); },
  },
  sub: {
    onizle(w, e) {
      const a = n(e.alan, -1), o = clamp(n(e.oran), 0, 150_000);
      if (a !== 0 && a !== 1) return red('Sübvansiyon', 'Alan: tarım ya da sanayi.');
      return tamam(`Sübvansiyon: ${a === 0 ? 'Tarım' : 'Sanayi'} %${Math.floor(o / 10_000)}`, 'Gelirin bu kadarı her gün desteğe gider', [`Günlük ≈ ${fmt(mulDiv(w.C.c.gelirDun[e.ulke]!, o, S).q)} altın`], [a === 0 ? `Tarım verimi +%${Math.floor(Math.min(200_000, o * 2) / 10_000)}` : `Sanayi üretimi +%${Math.floor(Math.min(200_000, (o * 8) / 5) / 10_000)}`]);
    },
    uygula(w, e) { if (n(e.alan) === 0) w.C.c.subTarim[e.ulke] = clamp(n(e.oran), 0, 150_000); else w.C.c.subSanayi[e.ulke] = clamp(n(e.oran), 0, 150_000); },
  },
  tarimOdak: {
    onizle(w, e) {
      const t = n(e.odak, -1);
      const O = TARIM_ODAK[t];
      if (!O) return red('Tarım', 'Odak bulunamadı.');
      return tamam(`Tarım odağı: ${O.ad}`, O.aciklama, [], [`Gıda %${O.gida / 10_000}, ticaret %${O.ticaret / 10_000}, tarım işgücü %${O.isci / 10_000}`]);
    },
    uygula(w, e) { w.C.c.tarimOdak[e.ulke] = n(e.odak); },
  },
  // ---------- Örtülü diplomasi ----------
  ambargo: {
    onizle(w, e) {
      const d = n(e.kime, -1), ac = n(e.acik, 1);
      if (d < 0 || d === e.ulke || d >= w.nC) return red('Ambargo', 'Ülke bulunamadı.');
      const var_ = anlasmaVar(w, A.ambargo, e.ulke, d) >= 0;
      if (ac && var_) return red('Ambargo', 'Ambargo zaten uygulanıyor.');
      if (!ac && !var_) return red('Ambargo', 'Ambargo yok.');
      return tamam(ac ? `Ambargo: ${uAd(w, d)}` : `Ambargo kalkar: ${uAd(w, d)}`, ac ? 'Ticaret anlaşması bozulur; hedefin hizmet geliri düşer' : 'Ticaret serbest', [], [ac ? `${trEkK(uAd(w, d), 'in')} görüşü −20; sizin ticaret geliriniz de biraz azalır` : 'Görüş +5']);
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.kime);
      if (n(e.acik, 1)) { anlasmaBoz(w, A.ticaret, c, d, false); anlasmaKur(w, A.ambargo, c, d); gorusDegis(w, d, c, -20_000); anlat(w, `${w.pkg.ulkeler[c]!.ad}, ${trEkK(uAd(w, d), 'e')} ambargo uyguladı.`, 'diplomasi', c, 2); }
      else { anlasmaBoz(w, A.ambargo, c, d, false); gorusDegis(w, d, c, 5000); }
    },
  },
  sinirOlayi: {
    onizle(w, e) {
      const c = e.ulke, d = n(e.hedef, -1);
      if (d < 0 || d === c || d >= w.nC) return red('Sınır olayı', 'Hedef ülke bulunamadı.');
      if (savasta(w, c, d) || gerekceVar(w, c, d)) return red('Sınır olayı', 'Gerekçe zaten var.');
      if (w.C.c.pg[c]! < 60_000) return red('Sınır olayı', '60 siyasi güç ister.');
      return tamam(`Sınır olayı: ${uAd(w, d)}`, 'Tertip edilmiş sınır çatışması: savaş gerekçesi hemen hazır', ['Siyasi güç −60'], ['%35 olasılıkla tertip ortaya çıkar: bütün devletlerin görüşü −10, ün artar'], 'Geri alınamaz');
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef);
      w.C.c.pg[c] = w.C.c.pg[c]! - 60_000;
      const s = w.GR.alloc(); w.GR.c.ulke[s] = c; w.GR.c.hedef[s] = d; w.GR.c.bitis[s] = w.gun; w.GR.c.hazir[s] = 1;
      gorusDegis(w, d, c, -15_000);
      const ifsa = uniformInt(rng(w.tohum, w.gun, 41, c, d, AMAC.sabotage, 0, 0), 100) < 35;
      if (ifsa) { for (let x = 0; x < w.nC; x++) if (x !== c) gorusDegis(w, x, c, -10_000); w.C.c.un[c] = Math.min(100_000, w.C.c.un[c]! + 15_000); }
      anlat(w, ifsa ? `${trEkK(w.pkg.ulkeler[c]!.ad, 'in')} ${uAd(w, d)} sınırında tertiplediği olay ortaya çıktı.` : `${uAd(w, d)} sınırında silahlı çatışma: ${w.pkg.ulkeler[c]!.kisa} misilleme hakkını saklı tutuyor.`, 'diplomasi', c, 2);
      if (d === w.oyuncu) bildir(w, 'gerekce', `${uAd(w, c)} sınırda olay çıkardı`, d, true);
    },
  },
  yardim: {
    onizle(w, e) {
      const d = n(e.kime, -1), m = n(e.miktar);
      if (d < 0 || d === e.ulke || d >= w.nC || pasif(w, d)) return red('Yardım', 'Ülke bulunamadı.');
      if (m <= 0 || m > w.C.c.hazine[e.ulke]!) return red('Yardım', 'Hazine yetmiyor.');
      if (savasta(w, e.ulke, d)) return red('Yardım', 'Düşmana yardım edilmez.');
      return tamam(`Askerî ve mali yardım: ${uAd(w, d)}`, `${fmt(m)} altın`, [], [`Görüş +${Math.min(25, Math.floor(m / Math.max(1, w.C.c.gelirDun[d]! * 2)) + 3)}`]);
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.kime), m = n(e.miktar);
      w.C.c.hazine[c] = w.C.c.hazine[c]! - m; w.C.c.hazine[d] = w.C.c.hazine[d]! + m;
      gorusDegis(w, d, c, Math.min(25_000, Math.floor(m / Math.max(1, w.C.c.gelirDun[d]! * 2)) * 1000 + 3000));
      anlat(w, `${w.pkg.ulkeler[c]!.kisa}, ${trEkK(uAd(w, d), 'e')} ${fmt(m)} altın yardım gönderdi.`, 'diplomasi', c, 1);
    },
  },
  darbe: {
    onizle(w, e) {
      const c = e.ulke, d = n(e.hedef, -1);
      if (d < 0 || d === c || d >= w.nC || pasif(w, d)) return red('Darbe', 'Hedef ülke bulunamadı.');
      if (w.C.c.pg[c]! < 100_000) return red('Darbe', '100 siyasi güç ister.');
      const bedel = Math.max(100_000, w.C.c.gelirDun[d]! * 30);
      if (w.C.c.hazine[c]! < bedel) return red('Darbe', `Gizli fon ${fmt(bedel)} altın ister.`);
      return tamam(`Darbe desteği: ${uAd(w, d)}`, `Muhalif subay ve partilere gizli destek; hedef rejim sizinkine dönebilir`, [`Siyasi güç −100, ${fmt(bedel)} altın`], [`Başarı olasılığı ≈ %${darbeSans(w, d)}`, 'Başarısızlıkta ifşa: görüş −40, hedef savaş gerekçesi kazanır'], 'Geri alınamaz');
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef);
      const bedel = Math.max(100_000, w.C.c.gelirDun[d]! * 30);
      w.C.c.pg[c] = w.C.c.pg[c]! - 100_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - bedel;
      const u = uniformInt(rng(w.tohum, w.gun, 42, c, d, AMAC.sabotage, 0, 0), 100);
      if (u < darbeSans(w, d)) {
        devrim(w, d, w.C.c.rejim[c]!, w.C.c.iktidar[c]!);
        w.gorus[cc(w, d, c)] = Math.max(w.gorus[cc(w, d, c)]!, 70_000);
        if (d === w.oyuncu) bildir(w, 'siyaset', `${uAd(w, c)} destekli darbe!`, d, true);
      } else {
        gorusDegis(w, d, c, -40_000);
        const s = w.GR.alloc(); w.GR.c.ulke[s] = d; w.GR.c.hedef[s] = c; w.GR.c.bitis[s] = w.gun; w.GR.c.hazir[s] = 1;
        anlat(w, `${trEkK(uAd(w, d), 'de')} ${w.pkg.ulkeler[c]!.kisa} destekli darbe girişimi bastırıldı.`, 'siyaset', d, 2);
      }
    },
  },
  ayrilikci: {
    onizle(w, e) {
      const c = e.ulke, d = n(e.hedef, -1), r = n(e.bolge, -1);
      if (d < 0 || d === c || r < 0 || w.R.c.sahip[r] !== d) return red('Ayrılıkçı destek', 'Hedef ülkenin bir bölgesini seçin.');
      if (w.C.c.pg[c]! < 40_000) return red('Ayrılıkçı destek', '40 siyasi güç ister.');
      return tamam(`Ayrılıkçı desteği: ${bAd(w, r)}`, `${uAd(w, d)} aleyhine silah ve para`, ['Siyasi güç −40, 50.000 altın'], ['Bölgede direniş +30; %30 olasılıkla ifşa (görüş −25)']);
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef), r = n(e.bolge);
      w.C.c.pg[c] = w.C.c.pg[c]! - 40_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - 50_000;
      w.R.c.direnis[r] = Math.min(100_000, w.R.c.direnis[r]! + 30_000);
      if (uniformInt(rng(w.tohum, w.gun, 43, c, r, AMAC.sabotage, 0, 0), 100) < 30) { gorusDegis(w, d, c, -25_000); anlat(w, `${uAd(w, d)}, ${trEkK(w.pkg.ulkeler[c]!.kisa, 'i')} ${bAd(w, r)} ayrılıkçılarını silahlandırmakla suçladı.`, 'diplomasi', d, 2); }
    },
  },
  // ---------- İstihbarat ----------
  casusluk: {
    onizle(w, e) {
      const d = n(e.hedef, -1);
      if (d < 0 || d === e.ulke || d >= w.nC || pasif(w, d)) return red('Casusluk', 'Hedef ülke bulunamadı.');
      if (w.C.c.pg[e.ulke]! < 20_000) return red('Casusluk', '20 siyasi güç ister.');
      if (w.C.c.hazine[e.ulke]! < 10_000) return red('İstihbarat', 'Gizli fon için hazine yetersiz.');
      return tamam(`Bilgi toplama: ${uAd(w, d)}`, 'Ajan ağı hazine, ordu, rejim ve huzur bilgisi getirir', ['Siyasi güç −20, 10.000 altın'], ['%20 olasılıkla ajan yakalanır (görüş −10)'], 'Geri alınamaz');
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef);
      w.C.c.pg[c] = w.C.c.pg[c]! - 20_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - 10_000;
      if (uniformInt(rng(w.tohum, w.gun, 44, c, d, AMAC.sabotage, 0, 0), 100) < 20) { gorusDegis(w, d, c, -10_000); anlat(w, `${uAd(w, d)}, ${trEkK(w.pkg.ulkeler[c]!.kisa, 'in')} ajanını yakaladı.`, 'diplomasi', c, 1); return; }
      let birlik = 0; for (const u of w.U.rows()) if (w.U.c.ulke[u] === d) birlik++;
      anlat(w, `İstihbarat raporu — ${uAd(w, d)}: hazine ${fmt(w.C.c.hazine[d]!)}, ${birlik} birlik, rejim ${REJIM_AD[AKTIF.donem][w.C.c.rejim[d]!] ?? '?'}, meşruiyet %${Math.floor(w.C.c.mesru[d]! / 1000)}, huzur %${Math.floor(w.C.c.huzur[d]! / 1000)}.`, 'diplomasi', c, 3);
    },
  },
  suikast: {
    onizle(w, e) {
      const d = n(e.hedef, -1);
      if (d < 0 || d === e.ulke || d >= w.nC || pasif(w, d)) return red('Suikast', 'Hedef ülke bulunamadı.');
      if (w.C.c.pg[e.ulke]! < 80_000) return red('Suikast', '80 siyasi güç ister.');
      if (w.C.c.hazine[e.ulke]! < 60_000) return red('İstihbarat', 'Gizli fon için hazine yetersiz.');
      return tamam(`Suikast: ${uAd(w, d)} lideri`, 'Tetikçi tutulur; başarılıysa hedefte meşruiyet ve huzur çöker', ['Siyasi güç −80, 60.000 altın'], ['Başarı ≈ %35', 'Başarısızlıkta ifşa: görüş −50, hedef savaş gerekçesi kazanır'], 'Geri alınamaz');
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef);
      w.C.c.pg[c] = w.C.c.pg[c]! - 80_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - 60_000;
      if (uniformInt(rng(w.tohum, w.gun, 45, c, d, AMAC.sabotage, 0, 0), 100) < 35) {
        w.C.c.mesru[d] = Math.max(0, w.C.c.mesru[d]! - 15_000); w.C.c.huzur[d] = Math.max(0, w.C.c.huzur[d]! - 10_000);
        anlat(w, `${uAd(w, d)} lideri suikasta uğradı; iç karışıklık başladı.`, 'siyaset', d, 3);
        if (d === w.oyuncu) bildir(w, 'siyaset', 'Liderimize suikast!', d, true);
      } else {
        gorusDegis(w, d, c, -50_000);
        const s = w.GR.alloc(); w.GR.c.ulke[s] = d; w.GR.c.hedef[s] = c; w.GR.c.bitis[s] = w.gun; w.GR.c.hazir[s] = 1;
        anlat(w, `${uAd(w, d)}, ${trEkK(w.pkg.ulkeler[c]!.kisa, 'in')} suikast girişimini ortaya çıkardı.`, 'diplomasi', d, 3);
      }
    },
  },
  sabotaj: {
    onizle(w, e) {
      const d = n(e.hedef, -1), r = n(e.bolge, -1);
      if (d < 0 || d === e.ulke || r < 0 || w.R.c.sahip[r] !== d) return red('Gizli saldırı', 'Hedef ülkenin bir bölgesini seçin.');
      if (w.C.c.pg[e.ulke]! < 40_000) return red('Gizli saldırı', '40 siyasi güç ister.');
      if (w.C.c.hazine[e.ulke]! < 40_000) return red('İstihbarat', 'Gizli fon için hazine yetersiz.');
      return tamam(`Gizli saldırı: ${bAd(w, r)}`, 'Kimliği bilinmeyen sabotaj: tahkimat çöker, direniş artar, fabrikalar aksar', ['Siyasi güç −40, 40.000 altın'], ['Başarı ≈ %55; %25 ifşa (görüş −25)']);
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef), r = n(e.bolge);
      w.C.c.pg[c] = w.C.c.pg[c]! - 40_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - 40_000;
      if (uniformInt(rng(w.tohum, w.gun, 46, c, r, AMAC.sabotage, 0, 0), 100) < 55) {
        w.R.c.tahkimat[r] = 0; w.R.c.direnis[r] = Math.min(100_000, w.R.c.direnis[r]! + 20_000);
        anlat(w, `${bAd(w, r)}'da bilinmeyen kişilerce sabotaj: tahkimat ve tesisler zarar gördü.`, 'siyaset', d, 2);
      }
      if (uniformInt(rng(w.tohum, w.gun, 47, c, r, AMAC.sabotage, 1, 0), 100) < 25) { gorusDegis(w, d, c, -25_000); anlat(w, `${uAd(w, d)}, ${bAd(w, r)} sabotajının arkasında ${trEkK(w.pkg.ulkeler[c]!.kisa, 'in')} olduğunu açıkladı.`, 'diplomasi', d, 2); }
    },
  },
  iliskiBozma: {
    onizle(w, e) {
      const a = n(e.hedef, -1), b = n(e.hedef2, -1);
      if (a < 0 || b < 0 || a === b || a >= w.nC || b >= w.nC || a === e.ulke || b === e.ulke || pasif(w, a) || pasif(w, b)) return red('İlişki bozma', 'İki farklı yabancı ülke seçin.');
      if (w.C.c.pg[e.ulke]! < 40_000) return red('İlişki bozma', '40 siyasi güç ister.');
      if (w.C.c.hazine[e.ulke]! < 30_000) return red('İstihbarat', 'Gizli fon için hazine yetersiz.');
      return tamam(`İlişki bozma: ${uAd(w, a)} – ${uAd(w, b)}`, 'Sahte belge ve provokasyonla iki ülkenin görüşü kötüleşir', ['Siyasi güç −40, 30.000 altın'], ['İki ülkenin karşılıklı görüşü −30; %25 ifşa (ikisi de bizden uzaklaşır)']);
    },
    uygula(w, e) {
      const c = e.ulke, a = n(e.hedef), b = n(e.hedef2);
      w.C.c.pg[c] = w.C.c.pg[c]! - 40_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - 30_000;
      gorusDegis(w, a, b, -30_000); gorusDegis(w, b, a, -30_000);
      anlat(w, `${uAd(w, a)} ile ${uAd(w, b)} arasında gerginlik: karşılıklı suçlamalar.`, 'diplomasi', a, 2);
      if (uniformInt(rng(w.tohum, w.gun, 48, c, a * 64 + b, AMAC.sabotage, 0, 0), 100) < 25) { gorusDegis(w, a, c, -20_000); gorusDegis(w, b, c, -20_000); }
    },
  },
  isyan: {
    onizle(w, e) {
      const d = n(e.hedef, -1);
      if (d < 0 || d === e.ulke || d >= w.nC || pasif(w, d)) return red('İsyan', 'Hedef ülke bulunamadı.');
      if (w.C.c.pg[e.ulke]! < 70_000) return red('İsyan', '70 siyasi güç ister.');
      if (w.C.c.hazine[e.ulke]! < 70_000) return red('İstihbarat', 'Gizli fon için hazine yetersiz.');
      return tamam(`İsyan kışkırtma: ${uAd(w, d)}`, 'Hedefin bölgelerinde silah ve para dağıtılır', ['Siyasi güç −70, 70.000 altın'], ['Direniş +15 (en huzursuz üç bölge), huzur −5; %30 ifşa (görüş −35)'], 'Geri alınamaz');
    },
    uygula(w, e) {
      const c = e.ulke, d = n(e.hedef);
      w.C.c.pg[c] = w.C.c.pg[c]! - 70_000; w.C.c.hazine[c] = w.C.c.hazine[c]! - 70_000;
      const bol: number[] = []; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === d) bol.push(r);
      bol.sort((x, y) => w.R.c.direnis[y]! - w.R.c.direnis[x]! || x - y);
      for (const r of bol.slice(0, 3)) w.R.c.direnis[r] = Math.min(100_000, w.R.c.direnis[r]! + 15_000);
      w.C.c.huzur[d] = Math.max(0, w.C.c.huzur[d]! - 5_000);
      anlat(w, `${uAd(w, d)}'da isyan ateşi yükseldi.`, 'siyaset', d, 3);
      if (uniformInt(rng(w.tohum, w.gun, 49, c, d, AMAC.sabotage, 0, 0), 100) < 30) { gorusDegis(w, d, c, -35_000); }
    },
  },
  bagimsizlik: {
    onizle(w, e) {
      const f = efendi(w, e.ulke);
      if (f < 0) return red('Bağımsızlık', 'Kukla devlet değilsiniz.');
      return tamam(`Bağımsızlık ilanı`, `${uAd(w, f)} himayesinden çıkış`, [], [`${trEkK(uAd(w, f), 'in')} görüşü −40; efendi savaş açabilir`], 'Geri alınamaz');
    },
    uygula(w, e) { kuklaBagimsizlik(w, e.ulke); },
  },
};

function darbeSans(w: World, d: number): number {
  // meşruiyeti düşük, huzursuz ve askerî ya da tek parti rejimleri kırılgandır
  const C = w.C.c;
  return clamp(55 - Math.floor(C.mesru[d]! / 2000) - Math.floor(C.huzur[d]! / 4000) + (C.rejim[d] === 4 ? 10 : 0) + (savastaMi(w, d) ? 5 : 0), 5, 70);
}

function zulumEmri(tur: 'surgun' | 'soykirim'): EkEmir {
  return {
    onizle(w, e) {
      const c = e.ulke, r = n(e.bolge, -1), k = n(e.kimlik, -1);
      const baslik = tur === 'surgun' ? 'Sürgün' : 'Soykırım';
      if (r < 0 || w.R.c.sahip[r] !== c || w.R.c.kontrolEden[r] !== c) return red(baslik, 'Bölge sizin elinizde olmalı.');
      if (k < 0 || k >= NKIMLIK || w.kim[r * NKIMLIK + k]! <= 0) return red(baslik, 'Hedef halk bulunamadı.');
      const U = w.pkg.ulkeler[c]!;
      const [ku] = w.pkg.bolgeler[r]!.kimlikAnahtar[k] ?? [-1];
      if (ku === U.kultur) return red(baslik, 'Devletin kendi halkı hedef alınamaz.');
      const nn = w.kim[r * NKIMLIK + k]!;
      const olu = tur === 'surgun' ? mulDiv(nn, 105_000, S).q : mulDiv(nn, 850_000, S).q;
      return tamam(`${baslik}: ${kimlikAdi(w, r, k)} · ${bAd(w, r)}`, tur === 'surgun' ? `${fmt(mulDiv(nn, 700_000, S).q)} kişi zorla yurdundan sürülür` : 'İnsanlığa karşı suç: halkın toplu imhası',
        [`Tahmini ölüm: ${fmt(olu)}`, tur === 'surgun' ? 'Meşruiyet −10, huzur −5, bölgede direniş +40' : 'Meşruiyet −30, huzur −15, bölgede direniş +80'],
        [tur === 'surgun' ? 'Akraba devletlerin görüşü −40, bütün devletlerin −10; akraba devletler savaş gerekçesi kazanır' : 'Bütün devletlerin görüşü −30, akrabaların −80; dünya savaş gerekçesi kazanır; ticaret kopar, demokrasiler ambargo uygular; kayıt kalıcıdır'],
        'Geri alınamaz', { uyari: [tur === 'surgun' ? 'Bu bir zorla yerinden etme suçudur; tarih bunu unutmaz.' : 'Bu bir soykırımdır; tarih ve dünya bunu unutmaz.'] });
    },
    uygula(w, e) { zulumUygula(w, e.ulke, n(e.bolge), n(e.kimlik), tur); },
  };
}

// ---------- Komutanlar (şema 9, v1.6 PR-07) ----------
/** Emirdeki komutanı çözer: oyuncunun görevdeki komutanı olmalı (ölü ya da yabancı komutan atanamaz; V16-T24). */
function komutanCoz(w: World, e: Emir): { k: number; neden?: string } {
  const k = w.KM.resolve(n(e.komutan, -1));
  if (k < 0 || w.KM.c.ulke[k] !== e.ulke) return { k: -1, neden: 'Komutan bulunamadı.' };
  if (w.KM.c.durum[k] !== 0) return { k: -1, neden: `${komutanAdi(w, k)} artık görevde değil.` };
  return { k };
}
EK_EMIRLER.komutanAta = {
  onizle(w, e) {
    const ids = arr(e.birlikler);
    if (!ids.length) return red('Komutan', 'Önce birlik seçin.');
    const U = uc(w);
    for (const id of ids) { const u = w.U.resolve(id); if (u < 0 || U.ulke![u] !== e.ulke) return red('Komutan', 'Birlik bulunamadı.'); }
    if (n(e.komutan, -1) < 0) return tamam('Komutandan ayır', `${ids.length} birlik komutansız kalır`, [], ['Komutan etkisi kalkar']);
    const { k, neden } = komutanCoz(w, e);
    if (k < 0) return red('Komutan', neden!);
    const K = w.KM.c;
    const yuk = komutanYuk(w);
    let ek = 0; for (const id of ids) if (birlikKomutani(w, w.U.resolve(id)) !== k) ek++;
    const yeni = yuk[k]! + ek, kap = K.kapasite[k]!;
    const d = K.deneyim[k]!;
    return tamam(`Komutan ata: ${komutanAdi(w, k)}`, `${ids.length} birlik · yük ${yeni}/${kap}`,
      [`Taarruz ${etkinNitelik(K.saldiri[k]!, d)}, savunma ${etkinNitelik(K.savunma[k]!, d)}, lojistik ${etkinNitelik(K.lojistik[k]!, d)}`],
      [yeni > kap ? `Kapasite aşılıyor: etki %${Math.floor((kap * 100) / yeni)} oranına seyrelir` : 'Tam etki: taarruz/savunma en çok +%20, ikmal verimi en çok +%10', 'Etki ilk muharebede uygulanır'],
      'Yeniden atanabilir', yeni > kap ? { uyari: ['Komutanın kapasitesi aşılıyor.'] } : {});
  },
  uygula(w, e) {
    const U = uc(w);
    const k = n(e.komutan, -1) < 0 ? -1 : w.KM.resolve(n(e.komutan));
    for (const id of arr(e.birlikler)) { const u = w.U.resolve(id); if (u >= 0) U.komutan![u] = k < 0 ? 0 : w.KM.id(k) + 1; }
  },
};
EK_EMIRLER.komutanEmir = {
  onizle(w, e) {
    const { k, neden } = komutanCoz(w, e);
    if (k < 0) return red('Komutan emri', neden!);
    const em = n(e.emir, -1), ik = n(e.ikmalEsik, 0), og = n(e.orgEsik, 0);
    if (!KOMUTAN_EMIR[em]) return red('Komutan emri', 'Emir: serbest, savun ya da taarruz.');
    if (ik < 0 || ik > S || og < 0 || og > S) return red('Komutan emri', 'Eşikler %0–100 arasında olmalı.');
    const kosul = [ik > 0 ? `ikmal %${Math.floor(ik / 10_000)} altındaysa taarruz etmez` : '', og > 0 ? `organizasyon %${Math.floor(og / 10_000)} altındaysa taarruz etmez` : ''].filter(Boolean);
    return tamam(`${komutanAdi(w, k)}: ${KOMUTAN_EMIR[em]}`, kosul.length ? kosul.join('; ') : 'Koşulsuz', ['Emir bugün yürürlüğe girer'],
      [em === 1 ? 'Otomasyonun verdiği taarruzlar iptal edilir; elle verdiğiniz emirler geçerlidir' : 'Koşul tutmazsa komutan taarruzu durdurur ve gerekçesini bildirir']);
  },
  uygula(w, e) {
    const k = w.KM.resolve(n(e.komutan));
    w.KM.c.emir[k] = n(e.emir); w.KM.c.ikmalEsik[k] = n(e.ikmalEsik, 0); w.KM.c.orgEsik[k] = n(e.orgEsik, 0);
  },
};
EK_EMIRLER.komutanEgit = {
  onizle(w, e) {
    const { k, neden } = komutanCoz(w, e);
    if (k < 0) return red('Kurmay eğitimi', neden!);
    const K = w.KM.c, c = e.ulke;
    if (K.egitim[k]! >= EGITIM_AZAMI) return red('Kurmay eğitimi', `${komutanAdi(w, k)} en çok ${EGITIM_AZAMI} kez eğitilebilir.`);
    if (w.C.c.pg[c]! < EGITIM_PG) return red('Kurmay eğitimi', `${EGITIM_PG / 1000} siyasi güç ister.`);
    if (w.C.c.hazine[c]! < EGITIM_ALTIN) return red('Kurmay eğitimi', `Bedel ${fmt(EGITIM_ALTIN)} altın; hazine yetersiz.`);
    return tamam(`Kurmay eğitimi: ${komutanAdi(w, k)}`, `${K.egitim[k]! + 1}/${EGITIM_AZAMI}. eğitim`, [`Siyasi güç −${EGITIM_PG / 1000}, ${fmt(EGITIM_ALTIN)} altın`],
      [`Taarruz, savunma ve lojistik +${EGITIM_ARTIS} (tavan ${NITELIK_TAVAN})`], 'Geri alınamaz');
  },
  uygula(w, e) {
    const k = w.KM.resolve(n(e.komutan)), K = w.KM.c, c = e.ulke;
    w.C.c.pg[c] = w.C.c.pg[c]! - EGITIM_PG; w.C.c.hazine[c] = w.C.c.hazine[c]! - EGITIM_ALTIN;
    K.saldiri[k] = Math.min(NITELIK_TAVAN, K.saldiri[k]! + EGITIM_ARTIS); K.savunma[k] = Math.min(NITELIK_TAVAN, K.savunma[k]! + EGITIM_ARTIS);
    K.lojistik[k] = Math.min(NITELIK_TAVAN, K.lojistik[k]! + EGITIM_ARTIS); K.egitim[k] = K.egitim[k]! + 1;
    K.kapasite[k] = 6 + Math.floor(K.lojistik[k]! / 20);
  },
};
EK_EMIRLER.komutanOto = {
  onizle(w, e) {
    if (!ulkeKomutanlari(w, e.ulke).length) return red('Komutanlar', 'Görevde komutan yok.');
    let bos = 0; const U = uc(w);
    for (const u of w.U.rows()) if (U.ulke![u] === e.ulke && birlikKomutani(w, u) < 0) bos++;
    if (!bos) return red('Komutanlar', 'Komutansız birlik yok.');
    return tamam('Komutanları dağıt', `${bos} komutansız birlik`, [], ['En yetenekli komutandan başlanır; kapasite aşılmaz', 'Aynı bölgedeki birlikler aynı komutana verilir']);
  },
  uygula(w, e) { komutanDagit(w, e.ulke); },
};
void NYUVA;
