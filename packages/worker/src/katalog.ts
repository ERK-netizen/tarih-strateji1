// Oyuncunun gördüğü varlıklardan komut kataloğu (yalnız görünür adlar).
import { type World, TEKNOLOJI, EKIPMAN, MAL, PROJE, SABLON, ASKERLIK, EKONOMI, TABUR, AKTIF, GEMI, HAVA, DENIZ_GOREV, HAVA_GOREV, REJIM_AD, PARTI, EKO_MODEL, TARIM_ODAK, NKIMLIK, ortak, diplomasi, toplum, komutan } from '@ts/engine';
import type { Katalog } from '@ts/command';

export function katalogKur(w: World, secili: number[] = []): Katalog {
  const P = w.oyuncu;
  const U = ortak.uc(w);
  return {
    oyuncu: P,
    ulkeler: w.pkg.ulkeler.map((u) => ({ kod: u.kod, ad: u.ad, kisa: u.kisa, sifat: u.sifat })),
    bolgeler: w.pkg.bolgeler.map((b, r) => {
      const o: Katalog['bolgeler'][number] = { ad: b.ad, kontrol: w.R.c.kontrolEden[r]!, sahip: w.R.c.sahip[r]!, komsu: b.komsu, merkez: b.merkez };
      // oyuncunun bölgelerinde kimlik adları (demografi komutları için)
      if (w.R.c.sahip[r] === P) o.kimlik = b.kimlikAnahtar.slice(0, NKIMLIK).map((_, k) => toplum.kimlikAdi(w, r, k));
      return o;
    }),
    eyaletler: w.pkg.eyaletler.map((e) => ({ ad: e.ad, bolgeler: e.bolgeler })),
    birlikler: w.U.list().filter((u) => U.ulke![u] === P).map((u) => ({ id: w.U.id(u), ad: ortak.birlikAdi(w, u), bolge: U.bolge![u]!, sablon: U.sablon![u]!, hedef: U.hedef![u]! })),
    savastaki: ortak.dusmanlar(w, P),
    teknolojiler: TEKNOLOJI.map((t) => ({ ad: t.ad, esanlam: t.esanlam })),
    ekipman: EKIPMAN.map((e) => ({ ad: e.ad, aile: e.aile })),
    mallar: MAL.map((m) => ({ ad: m.ad, esanlam: m.esanlam })),
    projeler: PROJE.map((p) => ({ ad: p.ad, esanlam: p.esanlam })),
    sablonlar: SABLON.map((s) => ({ ad: s.ad, esanlam: s.esanlam })),
    askerlik: ASKERLIK.map((a) => a.ad),
    ekonomi: EKONOMI.map((a) => a.ad),
    secili,
    teklifler: w.TK.list().filter((s) => w.TK.c.kime[s] === P && w.TK.c.durum[s] === 0).map((s) => ({ id: w.TK.id(s), kimden: w.TK.c.kimden[s]!, tur: w.TK.c.tur[s]!, ad: diplomasi.TK_AD[w.TK.c.tur[s]!] ?? 'Teklif' })),
    vergi: w.C.c.vergi[P]!,
    butce: [w.C.c.b0[P]!, w.C.c.b1[P]!, w.C.c.b2[P]!, w.C.c.b3[P]!],
    askerlikMevcut: w.C.c.askerlik[P]!,
    komutanlar: komutan.ulkeKomutanlari(w, P).map((k) => ({ id: w.KM.id(k), ad: komutan.komutanAdi(w, k) })),
    gemiler: GEMI[AKTIF.donem].map((g) => ({ ad: g.ad, kisa: g.kisa })),
    ucaklar: HAVA[AKTIF.donem].map((h) => ({ ad: h.ad, kisa: h.kisa })),
    denizGorev: [...DENIZ_GOREV],
    havaGorev: [...HAVA_GOREV],
    taburlar: TABUR.map((t) => t.ad),
    rejimler: [...REJIM_AD[AKTIF.donem]],
    partiler: PARTI[AKTIF.donem].map((p) => p.ad),
    ekoModeller: EKO_MODEL.map((m) => m.ad),
    tarimOdaklar: TARIM_ODAK.map((t) => t.ad),
  };
}
