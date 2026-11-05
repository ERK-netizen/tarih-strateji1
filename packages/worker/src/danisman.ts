// Bölüm 21: kural tabanlı danışman. Soru cümleleri emir üretmez; buraya gelir (bölüm 20.3).
import { type World, acikla, ortak, ekonomi, diplomasi, nufus, TEKNOLOJI } from '@ts/engine';
import { ozet } from './gorunum.ts';

export interface Cevap { baslik: string; paragraflar: string[]; oneriler: string[] }

const pt = (v: number) => (v / 1000).toFixed(0);
const fmt = (x: number) => String(Math.trunc(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function danis(w: World, konu: string, ulke?: number, bolge?: number): Cevap {
  const P = w.oyuncu;
  const o = ozet(w);
  switch (konu) {
    case 'huzur': {
      const a = acikla(w, `huzur:${P}`, P);
      const neg = a.satirlar.filter((s) => (s.isaret ?? 0) < 0).slice(0, 3);
      return {
        baslik: `Huzur ${a.deger}`,
        paragraflar: [`Huzuru en çok aşağı çeken etkenler: ${neg.map((s) => `${s.ad.toLowerCase()} (${s.deger})`).join(', ') || 'belirgin bir olumsuz etken yok'}.`, a.not ?? ''],
        oneriler: [
          ...(o.vergi > 200_000 ? ['Vergiyi %20\'ye indir'] : []),
          ...(o.gidaGuvence < 800_000 ? ['500 gıda satın al'] : []),
          'Sosyal harcamaya %35 ayır',
        ].slice(0, 3),
      };
    }
    case 'gida': {
      const a = acikla(w, `gida:${P}`, P);
      return {
        baslik: `Gıda: ${a.deger}`,
        paragraflar: [a.satirlar.map((s) => `${s.ad}: ${s.deger}`).join(' · '), a.not ?? ''],
        oneriler: o.gidaGun < 30 ? ['Her hafta 300 gıda satın al', 'Karne uygula', 'Gıda azalınca otomatik satın al'] : o.gidaGun > 150 ? ['Her hafta 200 gıda sat'] : ['Gıda azalınca otomatik satın al'],
      };
    }
    case 'hazine': {
      const a = acikla(w, `gelir:${P}`, P);
      const tavsiye: string[] = [];
      if (o.hazineGun < 60) tavsiye.push('Vergiyi 2 puan artır', `${fmt(Math.min(o.krediLimit, 2_000_000))} borç al`);
      else tavsiye.push('Akyurt\'a sivil fabrika inşa et'.replace('Akyurt', w.pkg.bolgeler[w.pkg.ulkeler[P]!.baskent]!.ad));
      return { baslik: a.baslik, paragraflar: [`${a.deger}. Hazine bu hızla ${o.hazineGun >= 999 ? 'tükenmez' : `${o.hazineGun} gün yeter`}.`, a.satirlar.map((s) => `${s.ad}: ${s.deger}`).join(' · ')], oneriler: tavsiye };
    }
    case 'ordu': {
      const b = ortak.ulkeBirlikleri(w, P);
      const ig = nufus.insanGucu(w, P);
      let eksikKisi = 0, dusukOrg = 0;
      const U = ortak.uc(w);
      for (const u of b) { const s = ortak.birlikIstat(w, u); eksikKisi += Math.max(0, s.kisiHedef - U.kisi![u]!); if (U.org![u]! * 2 < s.orgMax) dusukOrg++; }
      return {
        baslik: `Ordu: ${b.length} birlik`,
        paragraflar: [`Personel açığı ${fmt(eksikKisi)} kişi; organizasyonu yarının altında ${dusukOrg} birlik var. Erişilebilir çağrılabilir insan gücü ${fmt(ig.erisimY)}, eğitimli yedek ${fmt(ig.E)}.`,
          `Depoda ${fmt(w.ekip[P * 8]! + w.ekip[P * 8 + 1]! + w.ekip[P * 8 + 2]!)} piyade silahı ve ${fmt(Math.floor(w.C.c.muhimmat[P]! / 1000))} birim mühimmat var.`],
        oneriler: ig.erisimY < 20_000 ? ['Askerlik yasasını kapsamlı yap'] : ['2 piyade tümeni kur', 'Mühimmat üretimine 4 fabrika ayır'],
      };
    }
    case 'savas': {
      const d = ortak.dusmanlar(w, P);
      if (!d.length) return { baslik: 'Barış', paragraflar: ['Şu anda kimseyle savaşta değilsiniz.'], oneriler: [] };
      return {
        baslik: 'Savaş durumu',
        paragraflar: d.map((x) => {
          const s = diplomasi.savasSkoru(w, P, x);
          const W = diplomasi.istekliligi(w, x, P);
          return `${w.pkg.ulkeler[x]!.kisa}: savaş skoru ${s >= 0 ? '+' : ''}${pt(s)}; karşı tarafın barışa istekliliği %${Math.floor(W / 10_000)} (beyaz barış %15, tavizli %25 ister). Taviz bütçesi ${diplomasi.tavizButcesi(w, x, P)} puan.${s >= 20_000 ? ' Üstünsünüz: Diplomasi panelinde “Toprak iste…” ile tavizli barış önerebilirsiniz.' : ''}`;
        }),
        oneriler: d.filter((x) => diplomasi.savasSkoru(w, P, x) < 20_000).map((x) => `${w.pkg.ulkeler[x]!.kisa} ile beyaz barış öner`).slice(0, 2),
      };
    }
    case 'tehdit': {
      const kartlar = w.pkg.ulkeler.map((_, c) => c).filter((c) => c !== P).map((c) => ({ c, t: diplomasi.tehditPuani(w, P, c, 0) })).sort((a, b) => b.t.puan - a.t.puan);
      return {
        baslik: 'Rakip niyetleri',
        paragraflar: kartlar.map(({ c, t }) => `${w.pkg.ulkeler[c]!.kisa}: ${t.puan >= 60_000 ? 'YÜKSEK' : t.puan >= 30_000 ? 'orta' : 'düşük'} tehdit (${t.bilesen.filter((b) => b.deger > 0).map((b) => b.ad.toLowerCase()).join(', ') || 'kamu sinyali yok'}).`),
        oneriler: kartlar[0] && kartlar[0].t.puan >= 30_000 ? [`${w.pkg.ulkeler[kartlar[0].c]!.kisa}'a saldırmazlık paktı öner`] : [],
      };
    }
    case 'oneri': case 'genel': return oneriler(w);
    case 'sanayi': {
      const e = ekonomi.etkinFabrika(w, P);
      return { baslik: 'Sanayi', paragraflar: [`Etkin sivil fabrika ${(e.sivil / 1000).toFixed(1)}, askerî ${(e.askeri / 1000).toFixed(1)}. Günlük çelik ${(w.C.c.celikDun[P]! / 1000).toFixed(1)}, kömür ${(w.C.c.komurDun[P]! / 1000).toFixed(1)} birim.`, 'Çelik veya kömür yetmezse hatlar orantılı yavaşlar; dışarıdan haftalık alım ayarlayabilirsiniz.'], oneriler: w.C.c.celikDun[P]! < 1000 ? ['Her hafta 20 çelik satın al'] : ['Seri üretimi araştır'] };
    }
    case 'arastirma': {
      const bos = [0, 1, 2].filter((k) => w.arastirma[P * 3 + k]! < 0).length;
      const uygun = TEKNOLOJI.filter((t, i) => !w.tekBitti[P * TEKNOLOJI.length + i] && t.on.every((x) => w.tekBitti[P * TEKNOLOJI.length + TEKNOLOJI.findIndex((y) => y.kod === x)])).slice(0, 3);
      return { baslik: `Araştırma: ${bos} boş yuva`, paragraflar: [`Bilim bütçesi araştırma hızını en çok %50 artırır.`], oneriler: uygun.map((t) => `${t.ad} araştır`) };
    }
    case 'diplomasi': case 'ulke': {
      const hedef = ulke ?? -1;
      if (hedef >= 0 && hedef !== P) {
        const g = w.gorus[hedef * w.nC + P]!;
        return { baslik: w.pkg.ulkeler[hedef]!.ad, paragraflar: [`Bize görüşü ${pt(g)}. Ticaret 20, saldırmazlık 40, geçiş/ekipman 60, ittifak 80 ister.`], oneriler: g >= 40_000 ? [`${w.pkg.ulkeler[hedef]!.kisa} ile saldırmazlık paktı öner`] : [`${w.pkg.ulkeler[hedef]!.kisa}'a dostane tutum al`] };
      }
      return { baslik: 'Diplomasi', paragraflar: w.pkg.ulkeler.map((u, c) => (c === P ? '' : `${u.kisa}: bize görüşü ${pt(w.gorus[c * w.nC + P]!)}`)).filter(Boolean), oneriler: [] };
    }
    case 'bolge': {
      if (bolge === undefined) break;
      const a = acikla(w, `kontrol:${bolge}`, P);
      return { baslik: a.baslik, paragraflar: [a.deger, a.not ?? ''], oneriler: [] };
    }
  }
  return oneriler(w);
}

function oneriler(w: World): Cevap {
  const P = w.oyuncu;
  const o = ozet(w);
  const p: string[] = [];
  const t: string[] = [];
  if (o.olaylar.length) p.push(`Bekleyen ${o.olaylar.length} karar var: ${o.olaylar.map((x) => x.baslik).join(', ')}.`);
  if (o.teklifler.length) p.push(`Yanıt bekleyen ${o.teklifler.length} teklif var.`);
  if (o.gidaGun < 30) { p.push(`Gıda stoku ${o.gidaGun} güne indi.`); t.push('Her hafta 300 gıda satın al'); }
  if (o.hazineGun < 60) { p.push(`Hazine ${o.hazineGun} günlük giderle tükenecek.`); t.push('Vergiyi 2 puan artır'); }
  if ([0, 1, 2].some((k) => w.arastirma[P * 3 + k]! < 0)) { p.push('Boş araştırma yuvası var.'); t.push('Seri üretimi araştır'); }
  if (o.savasta.length) { p.push(`Savaştasınız: ${o.savasta.map((d) => w.pkg.ulkeler[d]!.kisa).join(', ')}. Cephe durumunu "savaş nasıl gidiyor?" diye sorabilirsiniz.`); if (!o.otoCephe) t.push('Cepheyi otomatik yönet'); }
  const tehdit = w.pkg.ulkeler.map((_, c) => c).filter((c) => c !== P && diplomasi.gerekceSurecte(w, c, P) >= 0);
  if (tehdit.length) { p.push(`${tehdit.map((c) => w.pkg.ulkeler[c]!.kisa).join(', ')} size karşı savaş gerekçesi hazırlıyor.`); t.push('2 piyade tümeni kur'); }
  if (!p.length) p.push('Acil bir sorun görünmüyor. Ekonomiyi büyütmek için fabrika inşa edebilir, ilişkileri geliştirebilir veya bir hedef ülke seçip gerekçe hazırlayabilirsiniz.');
  return { baslik: 'Danışman', paragraflar: p, oneriler: t.slice(0, 3) };
}
