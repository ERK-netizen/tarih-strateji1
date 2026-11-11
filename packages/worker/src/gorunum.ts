// Oyuncu görünümleri: arayüze yalnız oyuncunun bilebileceği veriyi gönderir (sis, istihbarat aralığı).
import {
  type World, tarihMetni, ortak, ekonomi, siyaset, nufus, diplomasi, olaylar, bolgeGozlem, istihbaratDuzeyi, aralik, hazineKademe,
  ARAZI, ASKERLIK, EKONOMI, ISGAL, YONETIM, KISILIK, TUTUM, TEKNOLOJI, NTEK, EKIPMAN, AILE_EKIP, TABUR, SABLON, MAL, PROJE, URUN_MUH, A, ANLASMA_TUR, K,
  hc, ST, YB, kara, arastirmaYuvalari, AKTIF, DONEMLER, sablonIhtiyac, TEK_DAL, BAKAN, BAKAN_AD, MOD_TUR, REJIM_AD,
  gelisim, deniz, toplum, kademe, KADEME_MAX, GEMI, HAVA, DENIZ_GOREV, HAVA_GOREV, PARTI, SECIMLI, EKO_MODEL, TARIM_ODAK, DONEM_FIYAT, NKIMLIK, MALI, mulDiv,
} from '@ts/engine';
import { KOL_E, KOL_T } from '@ts/engine';

const U = (w: World) => ortak.uc(w);

const rejimAd = (w: World, c: number): string => REJIM_AD[AKTIF.donem]![w.C.c.rejim[c]!] ?? YONETIM[w.C.c.rejim[c]!]!.ad;

export function ozet(w: World) {
  const P = w.oyuncu;
  const C = w.C.c;
  const g = ekonomi.zorunluGider(w, P);
  const gs = ekonomi.ulkeGidaStok(w, P);
  const stok = gs.stok;
  // ilk günden önce ihtiyaç henüz ölçülmedi: nüfustan tahmin
  const gunluk = gs.gunluk > 0 ? gs.gunluk : Math.floor((ortak.ulkeNufus(w, P) * 1000) / K.gidaKisiGun);
  const ig = nufus.insanGucu(w, P);
  const pu = w.pkg.ulkeler[P]!;
  return {
    gun: w.gun, tarih: tarihMetni(w.gun), oyuncu: P, mod: w.mod, surum: w.surum, bolgeSayisi: ortak.ulkeBolgeleri(w, P, false).length,
    ulke: { ad: pu.ad, kisa: pu.kisa, renk: pu.renk, lider: pu.lider, yonetim: rejimAd(w, P), kisilik: KISILIK[pu.kisilik] },
    hazine: C.hazine[P]!, gelirDun: C.gelirDun[P]!, giderDun: C.giderDun[P]!, aylikGelir: C.g1[P]!,
    hazineGun: g.toplam > 0 ? Math.floor(C.hazine[P]! / Math.max(1, C.giderDun[P]! || g.toplam)) : 999,
    pg: C.pg[P]!, huzur: C.huzur[P]!, mesru: C.mesru[P]!, destek: C.destek[P]!, yorgunluk: C.yorgunluk[P]!,
    gidaGun: gunluk > 0 ? Math.floor(stok / gunluk) : 999, gidaGuvence: ekonomi.ulkeGidaGuvence(w, P, true), gidaStok: stok,
    birlikSayi: ortak.ulkeBirlikleri(w, P).length, birlikSinir: gelisim.birlikSiniri(w, P).sinir,
    insanY: ig.erisimY, insan: ig, savasta: ortak.dusmanlar(w, P),
    vergi: C.vergi[P]!, butce: [C.b0[P]!, C.b1[P]!, C.b2[P]!, C.b3[P]!], askerlik: C.askerlik[P]!, ekonomiYasa: C.ekonomi[P]!, karne: C.karne[P]!, isgalPol: C.isgalPol[P]!,
    otoCephe: C.otoCephe[P]!, otoTakviye: C.otoTakviye[P]!, kaliciGida: C.kaliciGida[P]!, harcamaOran: C.harcamaOran[P]!,
    borc: C.borc[P]!, krediLimit: ekonomi.krediLimiti(w, P), faiz: C.faiz[P]!, muhimmat: C.muhimmat[P]!, yasam: siyaset.yasamDuzeyi(w, P),
    olaylar: w.OL.list().filter((s) => w.OL.c.ulke[s] === P && w.OL.c.gun[s]! <= w.gun).map((s) => {
      const o = olaylar.olayTanim(w, w.OL.c.olay[s]!);
      return { id: w.OL.id(s), baslik: o.baslik, metin: o.metin(w, P, w.OL.c.p1[s]!), secenekler: o.secenekler.map((x) => ({ ad: x.ad, etki: x.etki })), kalan: 30 - (w.gun - w.OL.c.gun[s]!) };
    }),
    teklifler: w.TK.list().filter((s) => w.TK.c.kime[s] === P && w.TK.c.durum[s] === 0).map((s) => teklifOzet(w, s)),
    ayarlar: { yasa: { askerlik: ASKERLIK.map((a) => a.ad), ekonomi: EKONOMI.map((a) => a.ad), isgal: ISGAL.map((a) => a.ad) } },
    baskent: pu.baskent, senaryo: w.pkg.senaryo.ad, paket: w.pkg.kimlik, donem: donemOzet(),
    bakan: C.bakan[P]!, bakanlar: BAKAN.map((b, i) => ({ i, ad: BAKAN_AD[b] })),
    hedef: hedefler(w, P, g.toplam),
    etkiler: w.MOD.list().filter((s) => w.MOD.c.ulke[s] === P && w.MOD.c.bitis[s]! > w.gun).map((s) => ({ tur: MOD_TUR[w.MOD.c.tur[s]!]!, deger: w.MOD.c.deger[s]!, kalan: w.MOD.c.bitis[s]! - w.gun })),
  };
}

/** Hedefler (başlangıca göre) ve kriz göstergeleri: oyuncunun ne durumda olduğunu tek bakışta söyler. */
function hedefler(w: World, P: number, zorunlu: number) {
  const C = w.C.c;
  let anaYurt = 0, dusen = 0;
  for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === P && w.pkg.bolgeler[r]!.anaYurt.includes(P)) { anaYurt++; if (w.R.c.kontrolEden[r] !== P) dusen++; }
  const kriz: { ad: string; duzey: 'orta' | 'kotu'; neden: string }[] = [];
  if (C.huzur[P]! < 25_000) kriz.push({ ad: 'İç kriz', duzey: 'kotu', neden: 'Huzur çok düşük: isyan, verim kaybı ve rejim krizi riski.' });
  else if (C.huzur[P]! < 40_000) kriz.push({ ad: 'Toplumsal gerginlik', duzey: 'orta', neden: 'Huzur düşüyor; vergi, gıda ve savaş yorgunluğuna bakın.' });
  if (C.yorgunluk[P]! > 60_000) kriz.push({ ad: 'Savaş yorgunluğu', duzey: 'kotu', neden: 'Halk barış istiyor; başkent düşerse teslim gelir.' });
  else if (C.yorgunluk[P]! > 35_000) kriz.push({ ad: 'Yorgunluk artıyor', duzey: 'orta', neden: 'Uzayan savaş desteği eritiyor.' });
  if (C.gelirDun[P]! > 0 && zorunlu > C.gelirDun[P]!) kriz.push({ ad: 'Bütçe açığı', duzey: C.hazine[P]! < zorunlu * 30 ? 'kotu' : 'orta', neden: `Zorunlu giderler gelirin %${Math.floor((zorunlu * 100) / Math.max(1, C.gelirDun[P]!))}'i; savaşta asker maaşı iki katıdır.` });
  if (dusen > 0) kriz.push({ ad: 'İşgal altında toprak', duzey: dusen * 4 >= anaYurt ? 'kotu' : 'orta', neden: `Ana yurttan ${dusen}/${anaYurt} bölge düşman elinde.` });
  if (C.temerrut[P]! > w.gun) kriz.push({ ad: 'Temerrüt', duzey: 'kotu', neden: 'Borç ödenemedi: kredi kapalı, meşruiyet düşüyor.' });
  return {
    bolge: ortak.ulkeBolgeleri(w, P, false).length, bazBolge: C.bazBolge[P]!, tek: C.tekSay[P]!, bazTek: C.bazTek[P]!,
    savasGunu: C.savasGunu[P]!, maas: C.maas[P]!, anaYurt, dusen, kriz,
    yol: w.olayBayrak.filter((b) => YOL_AD[b]).map((b) => YOL_AD[b]!),
  };
}
/** Tarih bayraklarının oyuncuya görünen adları (seçilen yol). */
const YOL_AD: Record<string, string> = {
  osm_ittifak: 'Gizli Alman ittifakı', osm_tarafsiz: 'Silahlı tarafsızlık', osm_itilaf: 'İtilaf\'a yakınlaşma', osm_goeben: 'Yavuz ve Midilli satın alındı', osm_savasta: 'Osmanlı savaşta',
  osm_tarafsiz_kesin: 'Osmanlı kesin tarafsız', osm_itilaf_savas: 'Osmanlı İtilaf safında', sinirsiz_denizalti: 'Sınırsız denizaltı savaşı', lusitania: 'Lusitania krizi',
  tur_bati: 'Türkiye–Batı ittifakı', tur_tarafsiz: 'Türkiye tarafsız', tur_mihver: 'Türkiye Mihver safında', ukr_masa: 'Ukrayna barış masasında', tayvan_karantina: 'Tayvan karantinası', dhs_kuruldu: 'Doğu Hindistan Şirketi',
};

/** Dönem adları ve görselleri: arayüz şablon, ürün ve tesis adlarını buradan alır. */
export function donemOzet() {
  const d = DONEMLER[AKTIF.donem];
  const aileSimge = (aile: string) => d.simge[aile as keyof typeof d.simge] ?? d.simge.piyade;
  return {
    kod: d.kod, ad: d.ad, terim: d.terim, simge: d.simge,
    sablonlar: SABLON.map((s, i) => {
      const ana = TABUR.find((t) => t.kod === s.taburlar[0]);
      return { i, ad: s.ad, kisa: s.kisa, simge: i === 3 ? d.simge.piyade : aileSimge(ana?.aile ?? 'piyade'), ihtiyac: sablonIhtiyac(i).kisi };
    }),
    ekipman: EKIPMAN.map((e, i) => ({ i, ad: e.ad, aile: e.aile, simge: aileSimge(e.aile) })),
    projeler: PROJE.map((p, i) => ({ i, ad: p.ad, kod: p.kod, ozel: !!p.ozel })),
    mallar: MAL.map((m, i) => ({ i, ad: m.ad })),
    taburlar: TABUR.map((t, i) => ({ i, ad: t.ad, aile: t.aile, kisi: t.kisi })),
  };
}

function teklifOzet(w: World, s: number) {
  const T = w.TK.c;
  const tur = T.tur[s]!;
  let detay = '';
  if (tur === diplomasi.TK.baris) {
    const rs = diplomasi.teklifBolgeleri(w, s);
    detay = `${diplomasi.BARIS_TUR[T.p1[s]!]}${rs.length ? ': ' + rs.map((r) => w.pkg.bolgeler[r]!.ad).join(', ') : ''}`;
  } else if (tur === diplomasi.TK.cagri) detay = 'Müttefikiniz savaşa katılmanızı istiyor';
  else if (tur === diplomasi.TK.ekipman) detay = `${T.p2[s]} ${EKIPMAN[T.p1[s]!]!.ad}`;
  return { id: w.TK.id(s), kimden: T.kimden[s]!, kimdenAd: w.pkg.ulkeler[T.kimden[s]!]!.kisa, tur, ad: diplomasi.TK_AD[tur], detay, gun: T.gun[s]! };
}

export function harita(w: World) {
  const P = w.oyuncu;
  const R = w.R.c;
  const bolgeler = w.pkg.bolgeler.map((b, r) => ({
    k: R.kontrolEden[r]!, s: R.sahip[r]!, kontrol: R.kontrol[r]!, itaat: R.itaat[r]!, direnis: R.direnis[r]!,
    cephe: w.gun - R.sonMuharebe[r]! <= 7 ? 1 : 0, isyan: R.isyan[r]!, guvence: w.E.c.guvence[b.eyalet]!, demiryolu: R.demiryolu[r]!, altyapi: R.altyapi[r]!,
    nufus: bolgeNufus(w, r), fabrika: R.sivilF[r]! + R.askeriF[r]!, uretim: R.uretimDun[r]!,
    istihbarat: R.kontrolEden[r] === P ? 100_000 : istihbaratDuzeyi(w, P, R.kontrolEden[r]!, r),
  }));
  const UU = U(w);
  const birimler: unknown[] = [];
  for (const u of w.U.rows()) {
    if (UU.ulke![u] !== P) continue;
    const s = ortak.birlikIstat(w, u);
    birimler.push({
      id: w.U.id(u), ulke: P, bolge: UU.bolge![u]!, ad: ortak.birlikAdi(w, u), sablon: UU.sablon![u]!, kisi: UU.kisi![u]!, kisiHedef: s.kisiHedef,
      org: s.orgMax > 0 ? Math.floor((UU.org![u]! * 100) / s.orgMax) : 0, guc: s.YS + s.SV, hedef: UU.hedef![u]!, sonraki: UU.sonraki![u]!,
      ilerleme: UU.sonraki![u]! >= 0 ? Math.min(100, Math.floor((UU.ilerleme![u]! / 1000) * 100 / Math.max(1, w.kenarKm.get(UU.bolge![u]! < UU.sonraki![u]! ? UU.bolge![u]! * 4096 + UU.sonraki![u]! : UU.sonraki![u]! * 4096 + UU.bolge![u]!) ?? 150))) : 0,
      muharebe: UU.muharebe![u]!, egitim: UU.egitimBitis![u]! > w.gun ? UU.egitimBitis![u]! - w.gun : 0, durus: UU.durus![u]!, ikmal: Math.floor(ortak.birlikIkmal(w, u).oran / 10_000),
    });
  }
  const yabanci = bolgeGozlem(w, P).filter((g) => g.ulke !== P).map((g) => ({ bolge: g.bolge, ulke: g.ulke, birlik: g.birlik, gucAlt: g.gucAlt, gucUst: g.gucUst, kisiAlt: g.kisiAlt, kisiUst: g.kisiUst, kesin: g.kesin }));
  const savaslar: number[][] = [];
  for (const s of w.SV.rows()) {
    const A_ = ortak.savasUyeleri(w, s, 1), B_ = ortak.savasUyeleri(w, s, 2);
    for (const a of A_) for (const b of B_) savaslar.push([a, b]);
  }
  return { bolgeler, birimler, yabanci, savaslar, ulkeler: w.pkg.ulkeler.map((u) => ({ kisa: u.kisa, renk: u.renk })) };
}

function bolgeNufus(w: World, r: number): number {
  let n = 0;
  for (let k = 0; k < 32; k++) n += w.pop[r * 32 + k]!;
  return n;
}

export function bolge(w: World, r: number) {
  const P = w.oyuncu;
  const b = w.pkg.bolgeler[r]!;
  const R = w.R.c;
  const k = R.kontrolEden[r]!;
  const gorunur = k === P || R.sahip[r] === P || istihbaratDuzeyi(w, P, k, r) >= 50_000;
  const kimlik = b.kimlikAnahtar.map(([ku, inn], i) => ({ ad: ku < 0 ? 'Diğer' : `${w.pkg.kultur[ku]!.ad} · ${w.pkg.inanc[inn]!.ad}`, kisi: w.kim[r * 7 + i]! })).filter((x) => x.kisi > 0);
  const UU = U(w);
  const birlikler = w.U.list().filter((u) => UU.bolge![u] === r && UU.ulke![u] === P).map((u) => {
    const st = ortak.birlikIstat(w, u);
    return {
      id: w.U.id(u), ad: ortak.birlikAdi(w, u), sablon: UU.sablon![u]!, kisi: UU.kisi![u]!, kisiHedef: st.kisiHedef,
      org: st.orgMax > 0 ? Math.floor((UU.org![u]! * 100) / st.orgMax) : 0, guc: Math.floor((st.YS + st.SV) / 1000),
      egitim: UU.egitimBitis![u]! > w.gun ? UU.egitimBitis![u]! - w.gun : 0, muharebe: UU.muharebe![u]!, durus: kara.DURUS[UU.durus![u]!],
      hedefAd: UU.hedef![u]! >= 0 ? w.pkg.bolgeler[UU.hedef![u]!]!.ad : null,
    };
  });
  const yabanci = bolgeGozlem(w, P).filter((g) => g.bolge === r && g.ulke !== P).map((g) => ({ ulke: g.ulke, ad: w.pkg.ulkeler[g.ulke]!.kisa, renk: w.pkg.ulkeler[g.ulke]!.renk, birlik: g.birlik, gucAlt: Math.floor(g.gucAlt / 1000), gucUst: Math.floor(g.gucUst / 1000), kisiAlt: g.kisiAlt, kisiUst: g.kisiUst, kesin: g.kesin }));
  const projeler = w.PR.list().filter((s) => w.PR.c.bolge[s] === r).map((s) => ({ ad: PROJE[w.PR.c.tur[s]!]!.ad, yuzde: Math.floor((w.PR.c.spKul[s]! * 100) / Math.max(1, w.PR.c.spTop[s]!)) }));
  return {
    id: r, ad: b.ad, eyalet: w.pkg.eyaletler[b.eyalet]!.ad, arazi: ARAZI[b.arazi]!.ad, yerlesim: ['Kırsal', 'Kasaba', 'Şehir'][b.yerlesim],
    sahip: R.sahip[r]!, kontrolEden: k, kontrol: R.kontrol[r]!, itaat: R.itaat[r]!, direnis: R.direnis[r]!, mesafe: R.mesafe[r]!,
    nufus: gorunur ? bolgeNufus(w, r) : null, kimlik: gorunur ? kimlik : [],
    uretim: gorunur ? R.uretimDun[r]! : null, sivilF: R.sivilF[r]!, askeriF: R.askeriF[r]!, altyapi: R.altyapi[r]!, demiryolu: R.demiryolu[r]!, sulama: R.sulama[r]!,
    celik: b.celik, komur: b.komur, anaYurt: b.anaYurt.map((u) => w.pkg.ulkeler[u]!.kisa), iddia: w.pkg.ulkeler.map((u, c) => (ortak.iddiaVar(w, r, c) ? u.kisa : '')).filter(Boolean),
    birlikler, yabanci, projeler, vergi: k === P ? R.vergiDun[r]! : null, baskent: w.pkg.ulkeler.findIndex((u) => u.baskent === r),
    sahipAd: w.pkg.ulkeler[R.sahip[r]!]!.ad, kontrolAd: w.pkg.ulkeler[k]!.ad, sahipRenk: w.pkg.ulkeler[R.sahip[r]!]!.renk, kontrolRenk: w.pkg.ulkeler[k]!.renk, isyan: R.isyan[r]!, cephe: w.gun - R.sonMuharebe[r]! <= 7,
    kis: ortak.kisDuzey(w, r), camur: ortak.camurDuzey(w, r),
    kent: R.kent[r]!, maden: R.maden[r]!, kiyi: !!b.kiyi, petrol: b.petrol ? { miktar: b.petrol[0], yil: b.petrol[1] } : null, demPol: R.demPol[r]!,
    komsu: b.komsu,
    insaYuva: (() => { const y = gelisim.insaYuvasi(w, b.eyalet); return { yuva: y.yuva, dolu: gelisim.insaSurenSayi(w, b.eyalet, (t) => !!PROJE[t]?.ozel), bilesen: y.bilesen.filter((x) => x.deger > 0) }; })(),
    // tahkimat: kendi bölgesi kesin, yabancı bölge keşif/istihbarat varsa görünür
    tahkimat: gorunur ? R.tahkimat[r]! : null, tahkimatTavan: k >= 0 ? kara.tahkimatTavan(w, k) : 0, savunma: gorunur ? kara.savunmaCarpan(w, r, 0) : null,
  };
}

export function birlikler(w: World) {
  const P = w.oyuncu;
  const UU = U(w);
  return w.U.list().filter((u) => UU.ulke![u] === P).map((u) => {
    const s = ortak.birlikIstat(w, u);
    const ik = ortak.birlikIkmal(w, u);
    const aile = Object.entries(s.aileIhtiyac).map(([a, gerek]) => {
      let sahip = 0;
      for (const k of AILE_EKIP[a]!) sahip += UU[KOL_E[k]!]![u]!;
      return { ad: EKIPMAN[AILE_EKIP[a]![0]!]!.ad.replace(/ I$/, ''), sahip, gerek };
    });
    const taburlar: string[] = [];
    for (let k = 0; k < UU.taburSay![u]!; k++) taburlar.push(TABUR[UU[KOL_T[k]!]![u]!]!.ad);
    return {
      id: w.U.id(u), ad: ortak.birlikAdi(w, u), sablon: SABLON[UU.sablon![u]!]!.ad, bolge: UU.bolge![u]!, bolgeAd: w.pkg.bolgeler[UU.bolge![u]!]!.ad,
      hedef: UU.hedef![u]!, hedefAd: UU.hedef![u]! >= 0 ? w.pkg.bolgeler[UU.hedef![u]!]!.ad : null, durus: kara.DURUS[UU.durus![u]!],
      kisi: UU.kisi![u]!, kisiHedef: s.kisiHedef, org: UU.org![u]!, orgMax: s.orgMax, YS: s.YS, SV: s.SV, YR: s.YR, dolu: s.dolu, genislik: s.genislik, hiz: s.hiz,
      deneyim: UU.deneyim![u]!, ikmalGida: ik.gida, ikmalMuh: ik.muh, muharebe: UU.muharebe![u]!, egitim: UU.egitimBitis![u]! > w.gun ? UU.egitimBitis![u]! - w.gun : 0,
      aile, taburlar, savasGun: UU.savasGun![u]!, neden: yavasNeden(w, u, s, ik),
    };
  });
}

/** Birlik neden ilerlemiyor / neden zayıf? Oyuncuya tek satırlık açıklama. */
function yavasNeden(w: World, u: number, s: ReturnType<typeof ortak.birlikIstat>, ik: ReturnType<typeof ortak.birlikIkmal>): string | null {
  const UU = U(w);
  const c = UU.ulke![u]!, r = UU.bolge![u]!, h = UU.hedef![u]!;
  const n: string[] = [];
  if (s.orgMax > 0 && UU.org![u]! * 10 < s.orgMax) n.push('organizasyon çok düşük: yarı hızla ilerler');
  if (ik.gida < 300_000) n.push('erzak kesik: ikmal yolu yok ya da depolar boş');
  else if (ik.muh < 300_000) n.push('cephane az: saldırı yarı güçte');
  if (h >= 0 && h !== r) {
    const sonraki = w.komsuluk[r]!.includes(h) ? h : -1;
    if (sonraki >= 0 && !ortak.denizGecer(w, c, r, h)) n.push('düşman donanması deniz geçişini kapatıyor');
    const k = w.R.c.kontrolEden[sonraki >= 0 ? sonraki : h]!;
    if (ortak.savasta(w, c, k)) n.push('düşman toprağında ilerleme yavaş (keşif, yerel direniş)');
    if (ortak.camurDuzey(w, r) >= 2) n.push('çamur mevsimi');
    if (ortak.kisDuzey(w, r) >= 2) n.push('ağır kış');
  }
  if (UU.muharebe![u]! && w.R.c.tahkimat[h >= 0 ? h : r]! > 200_000) n.push('karşı taraf tahkim edilmiş: topçu hazırlığı gerekir');
  return n.length ? n.join(' · ') : null;
}

export function diplomasiG(w: World) {
  const P = w.oyuncu;
  const ulkeler = w.pkg.ulkeler.map((u, c) => {
    if (c === P) return null;
    const anl: string[] = [];
    for (const s of w.AN.rows()) {
      const a = w.AN.c.a[s]!, b = w.AN.c.b[s]!;
      if ((a === P && b === c) || (a === c && b === P)) {
        const t = w.AN.c.tur[s]!;
        const ad = ['Ticaret', 'Saldırmazlık', 'Geçiş hakkı', 'Garanti', 'İttifak', 'Ateşkes', 'Tazminat'][t]!;
        anl.push(t === A.garanti ? (a === P ? `Garanti veriyoruz` : `Garantörümüz`) : t === A.gecis ? (a === P ? 'Geçiş veriyoruz' : 'Geçiş hakkımız var') : t === A.tazminat ? (a === P ? 'Tazminat ödüyoruz' : 'Tazminat alıyoruz')
          : t === A.kukla ? (a === P ? 'Kuklamız' : 'Efendimiz') : t === A.ambargo ? (a === P ? 'Ambargo' : 'Bize ambargo uyguluyor') : ad);
      }
    }
    // istihbarat aralığıyla ordu
    let gucAlt = 0, gucUst = 0;
    for (const g of bolgeGozlem(w, P)) if (g.ulke === c) { gucAlt += g.gucAlt; gucUst += g.gucUst; }
    // sınır yığınağı oranı (aralığın ortası) — bizim sınır bölgelerimize komşu bölgelerdeki gücü
    let yigin = 0;
    for (const g of bolgeGozlem(w, P)) if (g.ulke === c && w.komsuluk[g.bolge]!.some((r) => w.R.c.kontrolEden[r] === P)) yigin += Math.floor((g.gucAlt + g.gucUst) / 2);
    const benim = ortak.kuvvet(w, P);
    const t = diplomasi.tehditPuani(w, P, c, benim > 0 ? Math.floor((yigin * 1_000_000) / benim) : 0);
    const kendiAnl: string[] = [];
    for (const s of w.AN.rows()) {
      const a = w.AN.c.a[s]!, b = w.AN.c.b[s]!;
      if ((a === c || b === c) && a !== P && b !== P && w.AN.c.tur[s] !== A.ateskes) kendiAnl.push(`${ANLASMA_TUR[w.AN.c.tur[s]!]}: ${w.pkg.ulkeler[a === c ? b : a]!.kisa}`);
    }
    return {
      id: c, ad: u.ad, kisa: u.kisa, renk: u.renk, lider: u.lider, yonetim: rejimAd(w, c), kisilik: KISILIK[u.kisilik],
      gorusBize: w.gorus[c * w.nC + P]!, gorusumuz: w.gorus[P * w.nC + c]!, tutumumuz: TUTUM[w.tutum[P * w.nC + c]!], tutumlari: TUTUM[w.tutum[c * w.nC + P]!],
      anlasmalar: anl, digerAnlasmalar: kendiAnl, savasta: ortak.savasta(w, P, c),
      gerekceBize: diplomasi.gerekceSurecte(w, c, P) >= 0, gerekceBizim: diplomasi.gerekceSurecte(w, P, c) >= 0 ? (diplomasi.gerekceVar(w, P, c) ? 'hazır' : 'hazırlanıyor') : null,
      tehdit: t.puan, tehditBilesen: t.bilesen, hazine: hazineKademe(w, c), gucAlt, gucUst, istihbarat: istihbaratDuzeyi(w, P, c),
      guvenilir: w.C.c.guvenilir[c]!, un: w.C.c.un[c]!, savastaMi: ortak.dusmanlar(w, c).map((d) => w.pkg.ulkeler[d]!.kisa),
      skor: ortak.savasta(w, P, c) ? diplomasi.savasSkoru(w, P, c) : null, isteklilikleri: ortak.savasta(w, P, c) ? diplomasi.istekliligi(w, c, P) : null,
      tavizButcesi: ortak.savasta(w, P, c) ? diplomasi.tavizButcesi(w, c, P) : null,
    };
  }).filter((x) => x !== null);
  const giden = w.TK.list().filter((s) => w.TK.c.kimden[s] === P && w.TK.c.durum[s] === 0).map((s) => teklifOzet(w, s));
  const gelen = w.TK.list().filter((s) => w.TK.c.kime[s] === P && w.TK.c.durum[s] === 0).map((s) => teklifOzet(w, s));
  const esikler = Object.entries(diplomasi.ESIK).map(([t, e]) => ({ tur: Number(t), ad: diplomasi.TK_AD[Number(t)], esik: e }));
  return { ulkeler, giden, gelen, esikler };
}

export function ekonomiG(w: World) {
  const P = w.oyuncu;
  const C = w.C.c;
  const ef = ekonomi.etkinFabrika(w, P);
  const hatlar = w.HT.list().filter((s) => w.HT.c.ulke[s] === P).map((s) => ({
    urun: w.HT.c.urun[s]!, ad: w.HT.c.urun[s] === URUN_MUH ? 'Mühimmat' : EKIPMAN[w.HT.c.urun[s]!]!.ad, fabrika: w.HT.c.fabrika[s]!, verim: w.HT.c.verim[s]!,
  }));
  const projeler = w.PR.list().filter((s) => w.PR.c.ulke[s] === P).map((s) => ({ ad: PROJE[w.PR.c.tur[s]!]!.ad, bolge: w.pkg.bolgeler[w.PR.c.bolge[s]!]!.ad, yuzde: Math.floor((w.PR.c.spKul[s]! * 100) / Math.max(1, w.PR.c.spTop[s]!)) }));
  const siparis = w.SP.list().filter((s) => w.SP.c.ulke[s] === P).map((s) => ({ mal: MAL[w.SP.c.mal[s]!]!.ad, yon: w.SP.c.yon[s] ? 'Satış' : 'Alım', miktar: Math.floor(w.SP.c.miktar[s]! / 1000), kalici: w.SP.c.kalici[s]! }));
  const ekip = EKIPMAN.map((e, k) => ({ ad: e.ad, stok: w.ekip[P * EKIPMAN.length + k]!, kilitli: !!e.tek && !w.tekBitti[P * NTEK + TEKNOLOJI.findIndex((t) => t.kod === e.tek)] }));
  return {
    sivilF: ef.sivil, askeriF: ef.askeri, toplamAskeri: (() => { let n = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === P) n += w.R.c.askeriF[r]!; return n * 1000; })(),
    spDun: C.spDun[P]!, hatlar, projeler, siparis, ekip, muhimmat: C.muhimmat[P]!, celik: C.celik[P]!, komur: C.komur[P]!, celikDun: C.celikDun[P]!, komurDun: C.komurDun[P]!,
    fiyat: MAL.map((m, i) => ({ ad: m.ad, fiyat: w.fiyat[i]!, p0: m.p0, hacim: w.pazarHacim[i]! })), tuketimYet: C.tuketimYet[P]!,
    gider: ekonomi.zorunluGider(w, P), gelirDun: C.gelirDun[P]!, g1: C.g1[P]!, g2: C.g2[P]!, g3: C.g3[P]!,
    egitim: C.egitim[P]!, kapasite: siyaset.yonetimKapasitesi(w, P),
    model: C.model[P]!, modeller: EKO_MODEL.map((m, i) => ({ i, ad: m.ad, aciklama: m.aciklama, hizmet: m.hizmet, sanayi: m.sanayi, vergi: m.vergi, insa: m.insa })),
    tarife: C.tarife[P]!, subTarim: C.subTarim[P]!, subSanayi: C.subSanayi[P]!, tarimOdak: C.tarimOdak[P]!, odaklar: TARIM_ODAK.map((t, i) => ({ i, ad: t.ad, aciklama: t.aciklama })),
    petrol: C.petrol[P]!, petrolDun: C.petrolDun[P]!, petrolIht: C.petrolIht[P]!,
    kent: (() => { let n = 0, top = 0, mx = 0, maden = 0; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === P) { n++; top += w.R.c.kent[r]!; mx = Math.max(mx, w.R.c.kent[r]!); maden += w.R.c.maden[r]!; } return { ort: n ? Math.round((top * 10) / n) / 10 : 0, enBuyuk: mx, maden }; })(),
    sehirler: (() => { const l: { r: number; ad: string; kent: number; fabrika: number }[] = []; for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === P && w.R.c.kent[r]! >= 3) l.push({ r, ad: w.pkg.bolgeler[r]!.ad, kent: w.R.c.kent[r]!, fabrika: w.R.c.sivilF[r]! + w.R.c.askeriF[r]! }); return l.sort((a, b) => b.kent - a.kent || b.fabrika - a.fabrika).slice(0, 8); })(),
  };
}

export function arastirmaG(w: World) {
  const P = w.oyuncu;
  const hiz = ekonomi.arastirmaHizi(w, P);
  const yv = arastirmaYuvalari(w, P);
  return {
    hiz, yuvalar: yv.yuva, sirada: yv.sirada,
    askTek: (() => { const t = gelisim.askeriTek(w, P), c = gelisim.tekCarpan(w, P); const yz = (x: number) => Math.round((x - 1_000_000) / 10_000); return { ...t, saldiri: yz(c.saldiri), savunma: yz(c.savunma), dayanim: -yz(c.dayanim), kayip: -yz(c.kayip) }; })(),
    teknolojiler: TEKNOLOJI.map((t, i) => {
      const bitti = w.tekBitti[P * NTEK + i]! >= 1;
      const maliyet = w.tekMaliyet[P * NTEK + i]! || ekonomi.tekMaliyetHesapla(w, P, i);
      const ilerleme = w.tekIlerleme[P * NTEK + i]!;
      const onUygun = t.on.every((o) => w.tekBitti[P * NTEK + TEKNOLOJI.findIndex((x) => x.kod === o)]);
      const arastiriliyor = yv.yuva.includes(i);
      // doktrin dışlaması: seçilmiş (bitmiş ya da süren) bir doktrin ötekileri kapatır
      const kapatan = t.dislar.map((d) => TEKNOLOJI.findIndex((x) => x.kod === d)).find((j) => j >= 0 && (w.tekBitti[P * NTEK + j]! >= 1 || yv.yuva.includes(j) || yv.sirada.includes(j)));
      const L = w.tekBitti[P * NTEK + i]!;
      const simdi = L >= 1 ? kademe(i, L) : { ad: t.ad, yil: t.yil };
      const sonraki = L < KADEME_MAX ? kademe(i, L + 1) : null;
      return {
        i, ad: t.ad, yil: t.yil, etki: t.etki, dal: t.dal, doktrin: t.dislar.length > 0, kapali: kapatan !== undefined ? TEKNOLOJI[kapatan]!.ad : null,
        on: t.on.map((o) => TEKNOLOJI.find((x) => x.kod === o)!.ad), bitti, arastiriliyor, sirada: yv.sirada.includes(i), uygun: onUygun && kapatan === undefined,
        yuzde: Math.min(100, Math.floor((ilerleme * 100) / Math.max(1, maliyet))), kalanGun: Math.ceil(Math.max(0, maliyet - ilerleme) / Math.max(1, hiz)),
        erken: (sonraki?.yil ?? t.yil) > tarihYil(w), seviye: L, enUst: KADEME_MAX, simdiAd: simdi.ad, simdiYil: simdi.yil,
        sonrakiAd: sonraki?.ad ?? null, sonrakiYil: sonraki?.yil ?? null, son: L >= KADEME_MAX,
      };
    }),
    dallar: TEK_DAL,
    bitenSay: w.C.c.tekSay[P]!,
    kademeToplam: (() => { let n = 0; for (let i = 0; i < NTEK; i++) n += w.tekBitti[P * NTEK + i]!; return n; })(), kademeEnUst: NTEK * KADEME_MAX,
    enIleri: (() => { let b = 0; for (let i = 1; i < NTEK; i++) if (w.tekBitti[P * NTEK + i]! > w.tekBitti[P * NTEK + b]!) b = i; const L = w.tekBitti[P * NTEK + b]!; return L >= 1 ? { ...kademe(b, L), seviye: L } : null; })(),
    bilimOrani: ekonomi.bilimOrani(w, P), yil: tarihYil(w),
  };
}
const tarihYil = (w: World): number => Number(/\d{3,4}$/.exec(tarihMetni(w.gun))?.[0] ?? w.pkg.senaryo.baslangic.y);

/** Deniz ve hava kuvvetleri: sınıf sayıları, görevler, siparişler, petrol. Düşman donanması kaba tahminle. */
export function kuvvetG(w: World) {
  const P = w.oyuncu;
  const C = w.C.c;
  const d = AKTIF.donem;
  const fiyat = DONEM_FIYAT[d];
  const siparis = w.PR.list().filter((s) => w.PR.c.ulke[s] === P && (PROJE[w.PR.c.tur[s]!]!.kod === 'gemi' || PROJE[w.PR.c.tur[s]!]!.kod === 'ucak')).map((s) => {
    const gemi = PROJE[w.PR.c.tur[s]!]!.kod === 'gemi';
    const ad = gemi ? GEMI[d][w.PR.c.alt[s]!]?.ad : HAVA[d][w.PR.c.alt[s]!]?.ad;
    return { gemi, ad: ad ?? '?', adet: w.PR.c.adet[s]!, bolge: w.pkg.bolgeler[w.PR.c.bolge[s]!]!.ad, yuzde: Math.floor((w.PR.c.spKul[s]! * 100) / Math.max(1, w.PR.c.spTop[s]!)) };
  });
  const dusman = ortak.dusmanlar(w, P);
  const yaklas = (v: number) => (v <= 0 ? 0 : Math.round(v / 100) * 100);
  // tersaneler: ana yurt ve sanayisi büyük kıyılar önce
  const kiyilar = w.pkg.bolgeler.map((b, r) => ({ r, ad: b.ad, k: !!b.kiyi, ana: b.anaYurt.includes(P) ? 1 : 0, f: w.R.c.sivilF[r]! + w.R.c.askeriF[r]! }))
    .filter((x) => x.k && w.R.c.sahip[x.r] === P && w.R.c.kontrolEden[x.r] === P).sort((a, b) => b.ana - a.ana || b.f - a.f || a.r - b.r).map((x) => ({ r: x.r, ad: x.ad }));
  const yakit = deniz.yakitIhtiyaci(w, P);
  return {
    gemiler: GEMI[d].map((g, k) => ({ k, ad: g.ad, sayi: deniz.gemiSay(w, P, k), guc: g.guc, akin: g.akin, koruma: g.koruma, bedel: mulDiv(g.bedel, fiyat, 1000).q, gun: g.gun, bakim: mulDiv(g.bakim, fiyat, 1000).q })),
    ucaklar: HAVA[d].map((h, k) => ({ k, ad: h.ad, sayi: deniz.ucakSay(w, P, k), hava: h.hava, destek: h.destek, bomba: h.bomba, bedel: mulDiv(h.bedel, fiyat, 1000).q, gun: h.gun, bakim: mulDiv(h.bakim, fiyat, 1000).q })),
    donGorev: C.donGorev[P]!, denizGorevler: [...DENIZ_GOREV], havaGorev: C.havaGorev[P]!, havaBolge: C.havaBolge[P]!, havaBolgeAd: C.havaBolge[P]! >= 0 ? w.pkg.bolgeler[C.havaBolge[P]!]!.ad : null, havaGorevler: [...HAVA_GOREV],
    denizGuc: deniz.denizGucu(w, P), akinGuc: deniz.akinGucu(w, P), korumaGuc: deniz.korumaGucu(w, P), gHasar: C.gHasar[P]!, hHasar: C.hHasar[P]!,
    havaGuc: deniz.havaGucu(w, P, 'hava'), destekGuc: deniz.havaGucu(w, P, 'destek'), bombaGuc: deniz.havaGucu(w, P, 'bomba'),
    abluka: C.abluka[P]!, akinKayip: C.akinKayip[P]!, denizKapali: C.denizK[P]!, dusmanDeniz: yaklas(dusman.reduce((t, c) => t + deniz.denizGucu(w, c), 0)),
    bakim: deniz.kuvvetBakimi(w, P), siparis, kiyilar, havaVar: HAVA[d].length > 0,
    petrol: { stok: C.petrol[P]!, uretim: C.petrolDun[P]!, ihtiyac: C.petrolIht[P]!, yakit: deniz.yakitCarpan(w, P), filo: yakit.filo, hava: yakit.hava, ordu: yakit.ordu, sanayi: yakit.sanayi, fiyat: w.fiyat[MALI.petrol] ?? 0 },
    cepheler: (() => { const s = new Set<number>(); for (let r = 0; r < w.nR; r++) if (w.gun - w.R.c.sonMuharebe[r]! <= 14 && (w.R.c.kontrolEden[r] === P || dusman.includes(w.R.c.kontrolEden[r]!))) s.add(r); return [...s].map((r) => ({ r, ad: w.pkg.bolgeler[r]!.ad, bizim: w.R.c.kontrolEden[r] === P })); })(),
  };
}

/** Siyaset ve toplum: rejim, partiler, seçim, nüfus politikası, bölge bölge kimlikler ve demografi politikaları. */
export function siyasetG(w: World) {
  const P = w.oyuncu;
  const C = w.C.c;
  const d = AKTIF.donem;
  const pu = w.pkg.ulkeler[P]!;
  const bolgeler: { r: number; ad: string; nufus: number; demPol: number; demKim: number; kimlik: { k: number; ad: string; kisi: number; bizim: boolean }[] }[] = [];
  for (let r = 0; r < w.nR; r++) {
    if (w.R.c.sahip[r] !== P || w.R.c.kontrolEden[r] !== P) continue;
    const b = w.pkg.bolgeler[r]!;
    const kim = b.kimlikAnahtar.slice(0, NKIMLIK).map(([ku], k) => ({ k, ad: toplum.kimlikAdi(w, r, k), kisi: w.kim[r * NKIMLIK + k]!, bizim: ku === pu.kultur })).filter((x) => x.kisi > 0);
    const top = kim.reduce((t, x) => t + x.kisi, 0);
    const yabanci = kim.filter((x) => !x.bizim).reduce((t, x) => t + x.kisi, 0);
    if (yabanci * 20 < top && w.R.c.demPol[r] === 0) continue; // %5'ten az azınlık: listelenmez
    bolgeler.push({ r, ad: b.ad, nufus: top, demPol: w.R.c.demPol[r]!, demKim: w.R.c.demKim[r]!, kimlik: kim.sort((a, c) => c.kisi - a.kisi) });
  }
  bolgeler.sort((a, b) => b.kimlik.filter((x) => !x.bizim).reduce((t, x) => t + x.kisi, 0) - a.kimlik.filter((x) => !x.bizim).reduce((t, x) => t + x.kisi, 0));
  return {
    rejim: C.rejim[P]!, rejimAd: rejimAd(w, P), rejimler: REJIM_AD[d].map((ad, i) => ({ i, ad, idari: YONETIM[i]?.idari ?? 0, secimli: SECIMLI.has(i) })),
    partiler: PARTI[d].map((p, i) => ({ i, ad: p.ad, renk: p.renk, aciklama: p.aciklama, pay: toplum.partiPay(w, P, i), etki: p.etki })),
    kisiler: (() => { const k = gelisim.siyasiKisilik(w, P); return { bas: k.bas ? k.bas.ad : null, liste: k.kisiler.map((x) => ({ ad: x.ad, gorev: x.gorev, rol: x.rol, parti: x.parti, aktif: x.aktif, iktidarda: x.iktidarda, basta: x.basta, bas: x.bas, bit: x.bit, idare: x.idare, askerlik: x.askerlik, ekonomi: x.ekonomi, diplomasi: x.diplomasi })), lider: w.pkg.ulkeler[P]!.lider }; })(),
    iktidar: C.iktidar[P]!, secim: C.secim[P]! > 0 ? tarihMetni(C.secim[P]!) : null, secimGun: C.secim[P]! > 0 ? C.secim[P]! - w.gun : null, secimli: SECIMLI.has(C.rejim[P]!),
    gecis: C.gecis[P]! > w.gun ? C.gecis[P]! - w.gun : 0, nufusPol: C.nufusPol[P]!, zulum: C.zulum[P]!, pg: C.pg[P]!, mesru: C.mesru[P]!, huzur: C.huzur[P]!,
    bolgeler: bolgeler.slice(0, 40),
  };
}

/** Bölüm 22: devlet istatistikleri (kendi ülkesi kesin, yabancılar sisli). */
export function istatistik(w: World, c: number) {
  const P = w.oyuncu;
  const kesin = c === P || w.mod === 2;
  const C = w.C.c;
  const ig = nufus.insanGucu(w, c);
  const ordu = siyaset.orduGucu(w, c);
  const I = istihbaratDuzeyi(w, P, c);
  const ar = (v: number, alan: number) => (kesin ? { alt: v, ust: v } : (() => { const a = aralik(w, P, 1000 + c, v, I, alan); return { alt: a.alt, ust: a.ust }; })());
  let nufusT = 0, kentli = 0;
  for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === c) { const n = bolgeNufus(w, r); nufusT += n; if (w.pkg.bolgeler[r]!.yerlesim > 0) kentli += n; }
  const { stok, gunluk } = ekonomi.ulkeGidaStok(w, c);
  let celik = 0, komur = 0, fab = 0, askF = 0, va = 0;
  for (let r = 0; r < w.nR; r++) if (w.R.c.kontrolEden[r] === c) { celik += w.pkg.bolgeler[r]!.celik; komur += w.pkg.bolgeler[r]!.komur; fab += w.R.c.sivilF[r]!; askF += w.R.c.askeriF[r]!; va += w.R.c.vaDun[r]!; }
  const seri = w.tarihce.map((t) => ({ gun: t.gun, d: t.ulke[c]! }));
  return {
    id: c, ad: w.pkg.ulkeler[c]!.ad, kesin, istihbarat: I,
    gruplar: [
      { ad: 'Devlet', satir: [
        ['Yönetim', rejimAd(w, c)], ['Lider', w.pkg.ulkeler[c]!.lider], ['Kişilik', KISILIK[w.pkg.ulkeler[c]!.kisilik]!],
        ['Siyasi güç', kesin ? (C.pg[c]! / 1000).toFixed(0) : '—'], ['Meşruiyet', (C.mesru[c]! / 1000).toFixed(1)], ['Huzur', (C.huzur[c]! / 1000).toFixed(1)],
        ['Savaşa destek', (C.destek[c]! / 1000).toFixed(1)], ['Savaş yorgunluğu', (C.yorgunluk[c]! / 1000).toFixed(1)], ['Güvenilirlik', (C.guvenilir[c]! / 1000).toFixed(0)], ['Saldırganlık ünü', (C.un[c]! / 1000).toFixed(0)],
      ] },
      { ad: 'Nüfus', satir: [
        ['Toplam nüfus', fmtR(ar(nufusT, 3))], ['Kentli oranı', `%${nufusT ? Math.floor((kentli * 100) / nufusT) : 0}`], ['Bölge (kontrol/sahip)', `${ortak.ulkeBolgeleri(w, c).length}/${ortak.ulkeBolgeleri(w, c, false).length}`],
        ['Çağrılabilir (Y)', kesin ? fmt(ig.Y) : fmtR(ar(ig.Y, 4))], ['Eğitimli yedek (E)', kesin ? fmt(ig.E) : '—'], ['Askerde (A)', fmtR(ar(ig.A, 5))], ['Yaralı (W)', kesin ? fmt(ig.W) : '—'], ['Esir (P)', fmt(ig.P)], ['Askerî ölü (toplam)', fmt(C.olu[c]! + C.olumAy[c]!)],
        ['Yaşam düzeyi', kesin ? (siyaset.yasamDuzeyi(w, c) / 1000).toFixed(1) : '—'], ['Askerlik yasası', ASKERLIK[C.askerlik[c]!]!.ad],
      ] },
      { ad: 'Ekonomi', satir: [
        ['Hazine', kesin ? fmt(C.hazine[c]!) : hazineKademe(w, c)], ['Aylık gelir', kesin ? fmt(C.g1[c]!) : fmtR(ar(C.g1[c]!, 6))], ['Günlük katma değer', kesin ? fmt(va) : fmtR(ar(va, 7))], ['Vergi oranı', `%${C.vergi[c]! / 10_000}`],
        ['Borç', kesin ? fmt(C.borc[c]!) : '—'], ['Ekonomi yasası', EKONOMI[C.ekonomi[c]!]!.ad], ['Sivil / askerî fabrika', `${fab} / ${askF}`], ['Çelik / kömür (birim/gün)', `${(celik / 1000).toFixed(1)} / ${(komur / 1000).toFixed(1)}`],
        ['Tüketim malı yeterliliği', kesin ? `%${Math.floor(C.tuketimYet[c]! / 10_000)}` : '—'], ['Eğitim', (C.egitim[c]! / 1000).toFixed(1)],
      ] },
      { ad: 'Gıda', satir: [['Stok', kesin ? `${fmt(Math.floor(stok / 1000))} birim` : '—'], ['Günlük ihtiyaç', `${fmt(Math.floor(gunluk / 1000))} birim`], ['Stok süresi', kesin ? `${gunluk > 0 ? Math.floor(stok / gunluk) : '∞'} gün` : '—'], ['Güvence (ay)', `%${Math.floor(ekonomi.ulkeGidaGuvence(w, c) / 10_000)}`], ['Karne', C.karne[c] ? 'Var' : 'Yok']] },
      { ad: 'Ordu', satir: [['Birlik sayısı', kesin ? String(ordu.tumen) : fmtR(ar(ordu.tumen, 8))], ['Personel', fmtR(ar(ordu.kisi, 9))], ['Saldırı gücü', fmtR(ar(Math.floor(ordu.ys / 1000), 10))], ['Savunma gücü', fmtR(ar(Math.floor(ordu.sv / 1000), 11))], ['Mühimmat stoku', kesin ? `${fmt(Math.floor(C.muhimmat[c]! / 1000))} birim` : '—'], ['Savaşta olduğu', ortak.dusmanlar(w, c).map((d) => w.pkg.ulkeler[d]!.kisa).join(', ') || '—']] },
    ],
    seri: kesin ? seri : [],
  };
}

const fmt = (x: number) => String(Math.trunc(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtR = (a: { alt: number; ust: number }) => (a.alt === a.ust ? fmt(a.alt) : `${fmt(a.alt)}–${fmt(a.ust)}`);

export function kronik(w: World, hepsi: boolean) {
  const P = w.oyuncu;
  return w.anlati.filter((a) => hepsi || a.onem >= 1 || a.ulke === P).slice(-250).map((a) => ({ gun: a.gun, tarih: tarihMetni(a.gun), metin: a.metin, tur: a.tur, ulke: a.ulke, onem: a.onem }));
}

export function sabitler() {
  return { K, YB, ST, hc: hc(0, 0, 0) };
}
