// "Neden?" ekranı: her önemli göstergenin bileşenleri. Sis altındaki kesin değer sızdırılmaz.
import type { World } from '../state/world.ts';
import { huzurHedefi, mesruHedefi, destekHedefi, pgGeliri, kontrolHedefi, yonetimKapasitesi, yasamDuzeyi } from '../systems/siyaset.ts';
import { bolgeVergi, zorunluGider, ulkeGidaStok, ulkeGidaGuvence, isgalErisim, tarimUretim } from '../systems/ekonomi.ts';
import { ISGAL } from '../catalog.ts';
import { fmt } from '../orders.ts';

export interface Aciklama { baslik: string; deger: string; satirlar: { ad: string; deger: string; isaret?: number }[]; not?: string }

const p = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v / 1000).toFixed(1).replace('.', ',')}`;
const yz = (s: number) => `%${(s / 10_000).toFixed(1).replace('.', ',')}`;
const pt = (v: number) => (v / 1000).toFixed(1).replace('.', ',');

export function acikla(w: World, kimlik: string, gozlemci: number): Aciklama {
  const [tur, a] = kimlik.split(':');
  const n = Number(a ?? gozlemci);
  const C = w.C.c;
  switch (tur) {
    case 'huzur': {
      const h = huzurHedefi(w, n);
      return { baslik: 'Huzur', deger: `${pt(C.huzur[n]!)} → hedef ${pt(h.hedef)}`, satirlar: h.bilesen.map((b) => ({ ad: b.ad, deger: p(b.deger), isaret: Math.sign(b.deger) })), not: 'Huzur hedefe ayda en çok 3 puan yaklaşır. 40 altı PG −%25; 25 altı grev ve isyan adayı.' };
    }
    case 'mesru': {
      const h = mesruHedefi(w, n);
      return { baslik: 'Meşruiyet', deger: `${pt(C.mesru[n]!)} → hedef ${pt(h.hedef)}`, satirlar: h.bilesen.map((b) => ({ ad: b.ad, deger: p(b.deger), isaret: Math.sign(b.deger) })) };
    }
    case 'destek': {
      const h = destekHedefi(w, n);
      return { baslik: 'Savaşa destek', deger: `${pt(C.destek[n]!)} → hedef ${pt(h.hedef)}`, satirlar: h.bilesen.map((b) => ({ ad: b.ad, deger: p(b.deger), isaret: Math.sign(b.deger) })), not: 'Askerlik ve ekonomi yasaları destek eşiklerine bağlıdır.' };
    }
    case 'pg': {
      const g = pgGeliri(w, n);
      return { baslik: 'Siyasi güç geliri (aylık)', deger: pt(g.gelir), satirlar: g.bilesen.map((b, i) => ({ ad: b.ad, deger: i === 0 ? pt(b.deger) : `×${(b.deger / 1_000_000).toFixed(2)}` })), not: 'Tavan 500.' };
    }
    case 'gelir': {
      let top = 0, taban = 0;
      const sat: { ad: string; deger: string }[] = [];
      const bol: { ad: string; v: number }[] = [];
      for (let r = 0; r < w.nR; r++) {
        if (w.R.c.kontrolEden[r] !== n) continue;
        const v = bolgeVergi(w, n, r);
        top += v.vergi; taban += v.taban;
        bol.push({ ad: w.pkg.bolgeler[r]!.ad + (w.R.c.sahip[r] !== n ? ' (işgal)' : ''), v: v.vergi });
      }
      const g = zorunluGider(w, n);
      sat.push({ ad: 'Vergi tabanı (katma değer)', deger: `${fmt(taban)} altın/gün` });
      sat.push({ ad: 'Vergi oranı', deger: yz(C.vergi[n]!) });
      sat.push({ ad: 'Günlük vergi', deger: `${fmt(top)}` });
      bol.sort((x, y) => y.v - x.v);
      for (const b of bol.slice(0, 5)) sat.push({ ad: `  ${b.ad}`, deger: fmt(b.v) });
      sat.push({ ad: 'Borç servisi', deger: `−${fmt(g.borc)}` }, { ad: 'Personel', deger: `−${fmt(g.personel)}` }, { ad: 'Ekipman bakımı', deger: `−${fmt(g.bakim)}` }, { ad: 'İdare', deger: `−${fmt(g.idari)}` });
      return { baslik: 'Hazine akışı', deger: `${fmt(C.gelirDun[n]!)} gelir / ${fmt(C.giderDun[n]!)} gider`, satirlar: sat, not: 'Vergi = taban × oran × idari verim × huzur × erişim (kontrol veya işgal itaati) × yönetim kapasitesi.' };
    }
    case 'gida': {
      const { stok, gunluk } = ulkeGidaStok(w, n);
      const sat = w.pkg.eyaletler.map((e, i) => ({ e, i })).filter(({ e }) => e.ulke === n).map(({ e, i }) => ({ ad: e.ad, deger: `${fmt(Math.floor(w.E.c.gida[i]! / 1000))} birim · ${w.E.c.ihtiyacDun[i]! > 0 ? Math.floor(w.E.c.gida[i]! / w.E.c.ihtiyacDun[i]!) : '∞'} gün · güvence ${yz(w.E.c.guvence[i]!)}` }));
      let uretim = 0;
      for (let r = 0; r < w.nR; r++) if (w.R.c.sahip[r] === n && w.R.c.kontrolEden[r] === n) uretim += w.R.c.uretimDun[r]!;
      sat.unshift({ ad: 'Günlük üretim / ihtiyaç', deger: `${fmt(Math.floor(uretim / 1000))} / ${fmt(Math.floor(gunluk / 1000))} birim` });
      return { baslik: 'Gıda', deger: `${fmt(Math.floor(stok / 1000))} birim (${gunluk > 0 ? Math.floor(stok / gunluk) : '∞'} gün), güvence ${yz(ulkeGidaGuvence(w, n))}`, satirlar: sat, not: '1 birim = 30.000 kişi-gün. Güvence 0,60 altında doğal büyüme yarıya iner; 0,40 altında ek ölüm başlar.' };
    }
    case 'kontrol': {
      const r = n;
      const h = kontrolHedefi(w, r);
      return { baslik: `Kontrol: ${w.pkg.bolgeler[r]!.ad}`, deger: `${pt(w.R.c.kontrol[r]!)} → hedef ${pt(h.hedef)}`, satirlar: h.bilesen.map((b) => ({ ad: b.ad, deger: p(b.deger), isaret: Math.sign(b.deger) })), not: 'Vergi ve asker alma erişimi = kontrol/100. Artış ayda en çok 3, düşüş en çok 10 puan.' };
    }
    case 'itaat': {
      const r = n;
      const k = w.R.c.kontrolEden[r]!;
      const pol = ISGAL[C.isgalPol[k]!]!;
      return { baslik: `İşgal: ${w.pkg.bolgeler[r]!.ad}`, deger: `İtaat ${pt(w.R.c.itaat[r]!)} · direniş ${pt(w.R.c.direnis[r]!)}`, satirlar: [{ ad: 'Politika', deger: pol.ad }, { ad: 'Erişim tavanı', deger: yz(pol.tavan) }, { ad: 'Gerçek erişim', deger: yz(isgalErisim(w, r)) }, { ad: 'Süre', deger: `${w.R.c.isgalGun[r]} gün` }], not: 'Erişim = tavan × (0,25 + 0,75 × itaat/100). Direniş 60 üstünde sabotaj riski.' };
    }
    case 'kapasite': {
      const k = yonetimKapasitesi(w, n);
      return { baslik: 'Yönetim kapasitesi', deger: `${pt(k.kullanim)} / ${pt(k.kapasite)}`, satirlar: [{ ad: 'Ana yurt bölgesi', deger: '1' }, { ad: 'Diğer sahip olunan', deger: '2' }, { ad: 'İşgal ettiğimiz yabancı bölge', deger: '1,5' }, { ad: 'Düşman işgalindeki kendi bölgemiz', deger: '0,5' }], not: 'Aşım tahsilatı, PG geliri, huzur ve kontrolü düşürür.' };
    }
    case 'yasam': return { baslik: 'Yaşam düzeyi', deger: pt(yasamDuzeyi(w, n)), satirlar: [{ ad: 'Gıda (%45)', deger: yz(Math.min(1_000_000, ulkeGidaGuvence(w, n))) }, { ad: 'Tüketim malı (%35)', deger: yz(Math.min(1_000_000, C.tuketimYet[n]!)) }, { ad: 'İstihdam (%15)', deger: '' }, { ad: 'Sosyal (%5)', deger: '' }] };
    case 'tarim': return { baslik: `Tarım: ${w.pkg.bolgeler[n]!.ad}`, deger: `${fmt(Math.floor(tarimUretim(w, n) / 1000))} birim/gün`, satirlar: [{ ad: 'Alan', deger: String(w.pkg.bolgeler[n]!.alan) }, { ad: 'Sulama', deger: String(w.R.c.sulama[n]) }, { ad: 'Tarım işçisi', deger: fmt(w.R.c.isTarim[n]!) }] };
  }
  return { baslik: 'Bilinmiyor', deger: '', satirlar: [] };
}
